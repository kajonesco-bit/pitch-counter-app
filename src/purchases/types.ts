// The small slice of the App Store that the app uses. The real version wraps
// expo-iap (StoreKit 2); tests use a fake.

export type StoreProduct = {
  id: string;
  /** Localized price string from the App Store, e.g. "$9.99" or "9,99 €". Never hard-coded. */
  displayPrice: string;
  title: string;
};

export type StorePurchase = {
  productId: string;
  state: 'pending' | 'purchased' | 'unknown';
  transactionId?: string;
  /** The original object from the store library, handed back when finishing the transaction. */
  raw: unknown;
};

export type StoreErrorKind = 'cancelled' | 'pending' | 'already-owned' | 'network' | 'unavailable' | 'other';

export type StoreError = { kind: StoreErrorKind; message: string };

export interface StoreAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  fetchProduct(productId: string): Promise<StoreProduct | null>;
  /** Starts the purchase. The outcome arrives through onPurchase / onError. */
  requestPurchase(productId: string): Promise<void>;
  /** Purchases the Apple Account currently owns (StoreKit current entitlements). */
  ownedPurchases(): Promise<StorePurchase[]>;
  /** Asks the App Store to sync, then the owned purchases can be read again. */
  restore(): Promise<void>;
  finish(purchase: StorePurchase): Promise<void>;
  onPurchase(listener: (purchase: StorePurchase) => void): () => void;
  onError(listener: (error: StoreError) => void): () => void;
}
