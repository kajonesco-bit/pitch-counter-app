import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { colors } from '../components/ui';

export default function RootLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerTintColor: colors.blue,
          headerTitleStyle: { color: colors.text },
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Pitch Counter' }} />
        <Stack.Screen name="game/[id]/index" options={{ title: 'Game' }} />
        <Stack.Screen name="game/[id]/review" options={{ title: 'Review & Sign' }} />
        <Stack.Screen
          name="game/[id]/sign"
          options={{ title: 'Coach Signature', presentation: 'modal', gestureEnabled: false }}
        />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
