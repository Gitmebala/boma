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
      <Tabs.Screen name="reports" />

      {/* Off-bar destinations. The bar holds the five things a farmer does
          daily; settings and the community hub are reached from in-page
          affordances so they don't compete with them for a permanent slot. */}
      <Tabs.Screen name="more" options={{ href: null }} />
      <Tabs.Screen name="hub" options={{ href: null }} />
    </Tabs>
  );
}
