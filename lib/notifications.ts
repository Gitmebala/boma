import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Registers this device for push notifications and stores the Expo push
 * token against the signed-in user + active farm. Requires a development
 * or production build — Expo Go on Android dropped remote push support as
 * of SDK 53, so this silently no-ops there rather than erroring; the alert
 * feed on Home still works either way, it just won't reach the lock screen.
 */
export async function registerForPushNotifications(userId: string, farmId: string): Promise<{ ok: boolean; reason?: string }> {
  if (!Device.isDevice) return { ok: false, reason: 'Push notifications need a physical device.' };

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Boma alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 100, 200],
      lightColor: '#115238',
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return { ok: false, reason: 'Notification permission was not granted.' };

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  let token: string;
  try {
    token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
  } catch (e: any) {
    // Expected in Expo Go on Android (SDK 53+) — needs a dev/prod build instead.
    return { ok: false, reason: 'Push tokens need a development build, not Expo Go.' };
  }

  await supabase.from('push_tokens').upsert(
    { user_id: userId, farm_id: farmId, expo_push_token: token, device_name: Device.modelName ?? 'Unknown device' },
    { onConflict: 'user_id,expo_push_token' }
  );

  return { ok: true };
}

/**
 * Local vaccine reminders.
 *
 * Push tokens were registered but nothing anywhere ever sent or scheduled a
 * notification — so "vaccine due" only existed if the farmer happened to
 * open the app that day. These are scheduled ON the device (no server, no
 * SMS budget): every undone vaccination in the next 14 days gets a 7am
 * reminder. Re-run on each Home load; we clear our own before rescheduling
 * so they never duplicate.
 */
export async function scheduleVaccineReminders(farmId: string): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    const { data: flocks } = await supabase
      .from('flocks')
      .select('id, flock_code')
      .eq('farm_id', farmId)
      .not('status', 'in', '("Closed","Sold Out")');
    const ids = (flocks ?? []).map((f) => f.id);
    if (!ids.length) return;

    const today = new Date().toISOString().slice(0, 10);
    const horizon = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
    const { data: vax } = await supabase
      .from('vaccinations')
      .select('id, vaccine_name, due_date, flock_id')
      .in('flock_id', ids)
      .eq('done', false)
      .gte('due_date', today)
      .lte('due_date', horizon);

    // Remove only reminders we own — never someone else's scheduled items.
    const existing = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      existing
        .filter((n) => n.content.data?.kind === 'vaccine')
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );

    const codeFor = new Map((flocks ?? []).map((f) => [f.id, f.flock_code]));
    for (const v of vax ?? []) {
      const fireAt = new Date(`${v.due_date}T07:00:00`);
      if (fireAt.getTime() <= Date.now()) continue;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${v.vaccine_name} due today`,
          body: `${codeFor.get(v.flock_id) ?? 'Your batch'}: give it this morning, then mark it done in Boma.`,
          data: { kind: 'vaccine', vaccinationId: v.id },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt },
      });
    }
  } catch {
    // Reminders are best-effort — a scheduling failure must never break Home.
  }
}
