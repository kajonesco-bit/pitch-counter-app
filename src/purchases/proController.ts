import { PRO_PRODUCT_ID } from '../model/entitlements';
import { StoreAdapter, StoreError, StoreProduct, StorePurchase } from './types';

export type ProStatus =
  | 'idle' // not started yet
  | 'loading' // connecting / loading the price
  | 'ready' // price loaded, can buy
  | 'unavailable' // App Store not reachable or product missing; can retry
  | 'purchasing'
  | 'pending' // waiting for approval (Ask to Buy / Strong Customer Authentication)
  | 'restoring';

export type ProSnapshot = {
  status: ProStatus;
  product: StoreProduct | null;
  /** A short message for the paywall, or null. */
  message: string | null;
};

/** What the controller needs from the rest of the app. */
export type ProControllerDeps = {
  store: StoreAdapter;
  isPro: () => boolean;
  grantPro: (transactionId?: string) => void;
  productId?: string;
};

export const MESSAGES = {
  unavailable: 'The App Store isn’t available right now. Check your connection and try again.',
  pending: 'Your purchase is waiting for approval. Pro unlocks automatically once it’s approved.',
  restored: 'Pitch Counter Pro has been restored. Thank you!',
  nothingToRestore: 'No Pitch Counter Pro purchase was found for this Apple Account.',
  restoreFailed: 'Couldn’t restore purchases. Check your connection and try again.',
  purchaseFailed: 'The purchase didn’t go through. You have not been charged.',
} as const;

/**
 * Runs the Pro purchase: loads the localized price, buys, handles pending,
 * cancelled and failed purchases, and restores. Pro is granted only from a
 * purchase the App Store reports as purchased; the transaction is finished
 * after Pro has been saved, so a crash in between just replays it next launch.
 */
export function createProController({ store, isPro, grantPro, productId = PRO_PRODUCT_ID }: ProControllerDeps) {
  let snapshot: ProSnapshot = { status: 'idle', product: null, message: null };
  const listeners = new Set<() => void>();
  let unsubscribe: (() => void)[] = [];
  let connected = false;

  function set(changes: Partial<ProSnapshot>) {
    snapshot = { ...snapshot, ...changes };
    listeners.forEach((l) => l());
  }

  function settledStatus(): ProStatus {
    return snapshot.product ? 'ready' : 'unavailable';
  }

  async function grantFrom(purchase: StorePurchase) {
    grantPro(purchase.transactionId);
    try {
      await store.finish(purchase);
    } catch {
      // Not fatal: StoreKit will offer the transaction again and we finish it then.
    }
  }

  async function handlePurchase(purchase: StorePurchase) {
    if (purchase.productId !== productId) return;
    if (purchase.state === 'pending') {
      set({ status: 'pending', message: MESSAGES.pending });
      return;
    }
    if (purchase.state !== 'purchased') return;
    await grantFrom(purchase);
    set({ status: settledStatus(), message: null });
  }

  async function handleError(error: StoreError) {
    switch (error.kind) {
      case 'cancelled':
        set({ status: settledStatus(), message: null });
        return;
      case 'pending':
        set({ status: 'pending', message: MESSAGES.pending });
        return;
      case 'already-owned':
        await refreshOwnership();
        set({ status: settledStatus(), message: isPro() ? MESSAGES.restored : MESSAGES.purchaseFailed });
        return;
      case 'network':
      case 'unavailable':
        set({ status: settledStatus(), message: MESSAGES.unavailable });
        return;
      default:
        set({ status: settledStatus(), message: MESSAGES.purchaseFailed });
    }
  }

  /** Grants Pro if the Apple Account owns it. Returns true if found. */
  async function refreshOwnership(): Promise<boolean> {
    const owned = await store.ownedPurchases();
    const pro = owned.find((p) => p.productId === productId && p.state === 'purchased');
    if (pro) await grantFrom(pro);
    return !!pro;
  }

  async function ensureConnected() {
    if (connected) return;
    await store.connect();
    connected = true;
    unsubscribe = [
      store.onPurchase((p) => {
        void handlePurchase(p);
      }),
      store.onError((e) => {
        void handleError(e);
      }),
    ];
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,

    /** Connect, load the price and check whether this Apple Account already owns Pro. Safe to call again to retry. */
    async start() {
      if (snapshot.status === 'loading') return;
      set({ status: 'loading', message: null });
      try {
        await ensureConnected();
        const product = await store.fetchProduct(productId);
        set({ product });
        try {
          await refreshOwnership();
        } catch {
          // Price loaded but ownership check failed: keep any Pro already saved on the phone.
        }
        set({ status: product ? 'ready' : 'unavailable', message: product ? null : MESSAGES.unavailable });
      } catch {
        set({ status: 'unavailable', message: MESSAGES.unavailable });
      }
    },

    async buy() {
      if (isPro() || !snapshot.product || snapshot.status === 'purchasing') return;
      set({ status: 'purchasing', message: null });
      try {
        await store.requestPurchase(productId);
      } catch (error) {
        await handleError(toStoreError(error));
      }
    },

    async restore() {
      set({ status: 'restoring', message: null });
      try {
        await ensureConnected();
        await store.restore();
        const found = await refreshOwnership();
        set({ status: settledStatus(), message: found || isPro() ? MESSAGES.restored : MESSAGES.nothingToRestore });
      } catch {
        set({ status: settledStatus(), message: MESSAGES.restoreFailed });
      }
    },

    clearMessage() {
      if (snapshot.message) set({ message: null });
    },

    async stop() {
      unsubscribe.forEach((u) => u());
      unsubscribe = [];
      if (connected) await store.disconnect();
      connected = false;
    },
  };
}

export type ProController = ReturnType<typeof createProController>;

/** Errors thrown directly (not via the listener) are converted the same way. */
export function toStoreError(error: unknown): StoreError {
  if (error && typeof error === 'object' && 'kind' in error) return error as StoreError;
  return { kind: 'other', message: error instanceof Error ? error.message : String(error) };
}
