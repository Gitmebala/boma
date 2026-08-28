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
