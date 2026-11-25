import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { colors } from '../components/ui';
import { appStateStore, proController } from '../state/useApp';

export default function RootLayout() {
  useEffect(() => {
    // First start of 1.2: protect reports that were already signed before anything else happens.
    appStateStore().getState();
    // Load the Pro price and confirm any earlier purchase in the background.
    void proController().start();
  }, []);

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
        <Stack.Screen name="privacy" options={{ title: 'Privacy Policy' }} />
        <Stack.Screen name="pro" options={{ title: 'Pitch Counter Pro', presentation: 'modal' }} />
        <Stack.Screen name="game/[id]/index" options={{ title: 'Game' }} />
        <Stack.Screen name="game/[id]/review" options={{ title: 'Review & Sign' }} />
        <Stack.Screen
          name="game/[id]/sign"
          // A normal full screen, not a swipe-down sheet: the sheet's own drag
          // gesture cancels finger touches, which cut signature lines short.
          // Swipe-back is off so a stroke near the left edge cannot leave the screen.
          options={{ title: 'Coach Signature', gestureEnabled: false, fullScreenGestureEnabled: false }}
        />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
