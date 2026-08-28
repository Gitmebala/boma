import { Link, Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/lib/ThemeContext';
import { space } from '@/lib/theme';

export default function NotFoundScreen() {
  const { colors } = useTheme();
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <Text variant="h2">This screen doesn't exist.</Text>
        <Link href="/" style={{ marginTop: space.lg }}>
          <Text variant="bodyMed" tone="accent">Go back home</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
});
