import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useAuth } from '@/lib/AuthContext';
import { useFarm } from '@/lib/FarmContext';
import { useTheme } from '@/lib/ThemeContext';

/** Matches the logo artwork's own background so the handover from the native
 *  splash to this screen is seamless — no flash of a different colour. */
const BRAND_CREAM = '#F2F2E3';

export default function Index() {
  const { session, initializing } = useAuth();
  const { farm, loading: farmLoading } = useFarm();
  const { colors } = useTheme();

  const pulse = useSharedValue(0.65);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.65, { duration: 900, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  if (initializing || (session && farmLoading)) {
    return (
      <View style={[styles.center, { backgroundColor: BRAND_CREAM }]}>
        <Animated.View style={pulseStyle}>
          <Image
            source={require('@/assets/images/boma-logo.png')}
            style={styles.logo}
            contentFit="contain"
            transition={200}
          />
        </Animated.View>
      </View>
    );
  }

  if (!session) return <Redirect href="/(onboarding)/language" />;
  if (!farm) return <Redirect href="/(onboarding)/farm-type" />;
  return <Redirect href="/(tabs)/home" />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 200, height: 200 },
});
