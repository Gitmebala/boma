import { Tabs } from 'expo-router';
import { TabBar } from '@/components/navigation/TabBar';
import { useTheme } from '@/lib/ThemeContext';

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="flocks" />
      <Tabs.Screen name="log" />
      <Tabs.Screen name="money" />
      <Tabs.Screen name="more" />
      {/* Reached from the Home community banner, not a bottom-bar slot — the
          bar only has room for 5 without crowding the center Log button. */}
      <Tabs.Screen name="hub" options={{ href: null }} />
    </Tabs>
  );
}
