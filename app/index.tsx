import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, Easing } from 'react-native-reanimated';
import { useAuth } from '@/lib/AuthContext';
import { useFarm } from '@/lib/FarmContext';
import { useTheme } from '@/lib/ThemeContext';
import { Text } from '@/components/ui/Text';

export default function Index() {
  const { session, initializing } = useAuth();
  const { farm, loading: farmLoading } = useFarm();
  const { colors } = useTheme();

  const pulse = useSharedValue(0.5);
  useEffect(() => {
    pulse.value = withRepeat(withSequence(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }),
      withTiming(0.5, { duration: 900, easing: Easing.inOut(Easing.sin) })
    ), -1, true);
  }, []);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  if (initializing || (session && farmLoading)) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Animated.View style={pulseStyle}>
          <Text variant="hero" tone="accent">Boma</Text>
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
});
