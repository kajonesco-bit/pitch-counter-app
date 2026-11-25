import { StoreAdapter, StoreError, StoreProduct, StorePurchase } from '../src/purchases/types';
import { PRO_PRODUCT_ID } from '../src/model/entitlements';

/** A stand-in App Store. Tests decide what each call does. */
export function fakeStore(options: { product?: StoreProduct | null; owned?: StorePurchase[]; connectFails?: boolean } = {}) {
  const purchaseListeners = new Set<(p: StorePurchase) => void>();
  const errorListeners = new Set<(e: StoreError) => void>();
  const calls: string[] = [];
  const finished: StorePurchase[] = [];
  const state = {
    product: options.product === undefined ? { id: PRO_PRODUCT_ID, displayPrice: '$9.99', title: 'Pitch Counter Pro' } : options.product,
    owned: options.owned ?? [],
    connectFails: options.connectFails ?? false,
    restoreFails: false,
    ownedFails: false,
    finishFails: false,
    /** What happens when the user taps Buy. */
    onBuy: (() => {}) as () => void,
  };
  const store: StoreAdapter = {
    async connect() {
      calls.push('connect');
      if (state.connectFails) throw { kind: 'unavailable', message: 'offline' };
    },
    async disconnect() {
      calls.push('disconnect');
    },
    async fetchProduct(id) {
      calls.push('fetchProduct');
      return state.product && state.product.id === id ? state.product : null;
    },
    async requestPurchase(id) {
      calls.push(`buy:${id}`);
      state.onBuy();
    },
    async ownedPurchases() {
      calls.push('owned');
      if (state.ownedFails) throw new Error('owned failed');
      return state.owned;
    },
    async restore() {
      calls.push('restore');
      if (state.restoreFails) throw { kind: 'network', message: 'offline' };
    },
    async finish(p) {
      calls.push('finish');
      if (state.finishFails) throw new Error('finish failed');
      finished.push(p);
    },
    onPurchase(l) {
      purchaseListeners.add(l);
      return () => purchaseListeners.delete(l);
    },
    onError(l) {
      errorListeners.add(l);
      return () => errorListeners.delete(l);
    },
  };
  return {
    store,
    state,
    calls,
    finished,
    emitPurchase: (p: StorePurchase) => purchaseListeners.forEach((l) => l(p)),
    emitError: (e: StoreError) => errorListeners.forEach((l) => l(e)),
    listenerCount: () => purchaseListeners.size + errorListeners.size,
  };
}

export const proPurchase = (state: StorePurchase['state'] = 'purchased', productId = PRO_PRODUCT_ID): StorePurchase => ({
  productId,
  state,
  transactionId: 'tx-1',
  raw: { id: 'tx-1' },
});

/** Lets queued promise callbacks run. */
export const flush = () => new Promise((r) => setTimeout(r, 0));
