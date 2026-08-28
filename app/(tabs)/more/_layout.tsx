import { Stack } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';

export default function MoreLayout() {
  const { colors } = useTheme();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' }} />;
}
