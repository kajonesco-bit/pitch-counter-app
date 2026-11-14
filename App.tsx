import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import GameFormScreen from './src/screens/GameFormScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <GameFormScreen />
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
