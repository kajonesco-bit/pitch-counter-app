import { File, Paths } from 'expo-file-system';

import { looksLikeAppState } from '../model/entitlements';
import { AppStateRepository } from '../state/appStateStore';

/** The app's own state, in one small file in the app's private documents folder. */
export function createAppStateFile(): AppStateRepository {
  const file = new File(Paths.document, 'appState.json');
  return {
    load() {
      if (!file.exists) return null;
      try {
        const parsed = JSON.parse(file.textSync());
        return looksLikeAppState(parsed) ? parsed : null;
      } catch {
        return null;
      }
    },
    save(state) {
      const temp = new File(Paths.document, 'appState.json.tmp');
      temp.writeSync(JSON.stringify(state));
      temp.moveSync(file, { overwrite: true });
    },
  };
}
