import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

/**
 * Receipt capture and storage.
 *
 * The `receipts` bucket is private and its storage policies key off the first
 * folder segment of the object name:
 *
 *     bucket_id = 'receipts' AND is_farm_member(foldername(name)[1]::uuid)
 *
 * so every object MUST be stored at `<farm_id>/<file>` or the upload is
 * rejected. Because the bucket is private we keep that object path in
 * `receipts.file_url` and mint a short-lived signed URL at display time —
 * storing a URL would bake in an expiry and rot.
 */

export const RECEIPT_BUCKET = 'receipts';

/** What a receipt can hang off. `related_table` is NOT NULL in the schema. */
export type ReceiptRelation = 'expenses' | 'sales' | 'general';

export interface ReceiptAsset {
  uri: string;
  base64: string;
  mimeType: string;
  fileSize?: number;
}

// ---------------------------------------------------------------------------
// Picking
// ---------------------------------------------------------------------------

/**
 * Photos are captured small on purpose: a receipt only has to be legible, and
 * farmers are on metered data with cheap phones. Quality 0.5 keeps a readable
 * page around a few hundred KB rather than several MB.
 */
const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  quality: 0.5,
  base64: true,
  exif: false,
};

export type PickResult =
  | { ok: true; asset: ReceiptAsset }
  | { ok: false; reason: 'cancelled' | 'permission' | 'unreadable' };

export async function captureReceipt(source: 'camera' | 'library'): Promise<PickResult> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) return { ok: false, reason: 'permission' };

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS)
      : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);

  if (result.canceled || !result.assets?.length) return { ok: false, reason: 'cancelled' };

  const a = result.assets[0];
  if (!a.base64) return { ok: false, reason: 'unreadable' };

  return {
    ok: true,
    asset: {
      uri: a.uri,
      base64: a.base64,
      mimeType: a.mimeType ?? 'image/jpeg',
      fileSize: a.fileSize,
    },
  };
}

// ---------------------------------------------------------------------------
// Base64 -> bytes
// ---------------------------------------------------------------------------
// Supabase Storage needs binary. React Native has no dependable global atob
// across engines, and pulling a package in for twenty lines isn't worth the
// dependency, so decode it here. Table is built once at module load.

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_LOOKUP = (() => {
  const t = new Uint8Array(256);
  for (let i = 0; i < B64_CHARS.length; i++) t[B64_CHARS.charCodeAt(i)] = i;
  return t;
})();

export function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const len = clean.length;
  const byteLength = Math.floor((len * 3) / 4);
  const bytes = new Uint8Array(byteLength);

  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const e1 = B64_LOOKUP[clean.charCodeAt(i)];
    const e2 = B64_LOOKUP[clean.charCodeAt(i + 1)];
    const e3 = B64_LOOKUP[clean.charCodeAt(i + 2)];
    const e4 = B64_LOOKUP[clean.charCodeAt(i + 3)];

    if (p < byteLength) bytes[p++] = (e1 << 2) | (e2 >> 4);
    if (p < byteLength) bytes[p++] = ((e2 & 15) << 4) | (e3 >> 2);
    if (p < byteLength) bytes[p++] = ((e3 & 3) << 6) | e4;
  }
  return bytes;
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

function extensionFor(mime: string): string {
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('heic')) return 'heic';
  return 'jpg';
}

export interface UploadArgs {
  farmId: string;
  userId?: string | null;
  asset: ReceiptAsset;
  relatedTable: ReceiptRelation;
  relatedId?: string | null;
  description?: string | null;
  amount?: number | null;
}

export type UploadResult =
  | { ok: true; path: string; receiptId: string }
  | { ok: false; error: string };

/**
 * Uploads the image, then records the row. Deliberately in that order: a
 * receipts row whose file is missing is worse than an orphaned object, since
 * the row is what the farmer sees listed. If the row insert fails we remove
 * the object again so we don't leave paid-for storage behind.
 */
export async function uploadReceipt({
  farmId,
  userId,
  asset,
  relatedTable,
  relatedId,
  description,
  amount,
}: UploadArgs): Promise<UploadResult> {
  const ext = extensionFor(asset.mimeType);
  // Path must start with the farm id — the storage policy checks exactly this.
  const path = `${farmId}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(RECEIPT_BUCKET)
    .upload(path, base64ToBytes(asset.base64), {
      contentType: asset.mimeType,
      upsert: false,
    });

  if (uploadError) return { ok: false, error: uploadError.message };

  const { data, error: rowError } = await supabase
    .from('receipts')
    .insert({
      farm_id: farmId,
      related_table: relatedTable,
      related_id: relatedId ?? null,
      description: description || null,
      amount: amount ?? null,
      file_url: path,
      uploaded_by: userId ?? null,
    })
    .select('id')
    .single();

  if (rowError) {
    await supabase.storage.from(RECEIPT_BUCKET).remove([path]).catch(() => {});
    return { ok: false, error: rowError.message };
  }

  return { ok: true, path, receiptId: data.id };
}

// ---------------------------------------------------------------------------
// Viewing
// ---------------------------------------------------------------------------

/** Signed URLs for a private bucket. One round trip for a whole screen. */
export async function signReceiptUrls(
  paths: string[],
  expiresInSeconds = 60 * 60
): Promise<Record<string, string>> {
  const objectPaths = paths.filter((p) => p && !p.startsWith('http'));
  if (!objectPaths.length) return {};

  const { data, error } = await supabase.storage
    .from(RECEIPT_BUCKET)
    .createSignedUrls(objectPaths, expiresInSeconds);

  if (error || !data) return {};

  const map: Record<string, string> = {};
  data.forEach((entry) => {
    if (entry.signedUrl && entry.path) map[entry.path] = entry.signedUrl;
  });
  return map;
}

export async function signReceiptUrl(path: string, expiresInSeconds = 60 * 60): Promise<string | null> {
  // Legacy rows may already hold a full URL rather than an object path.
  if (!path) return null;
  if (path.startsWith('http')) return path;

  const { data, error } = await supabase.storage
    .from(RECEIPT_BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  return error ? null : (data?.signedUrl ?? null);
}
