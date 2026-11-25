import {
  endConnection,
  ErrorCode,
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  Purchase,
  purchaseErrorListener,
  PurchaseError,
  purchaseUpdatedListener,
  requestPurchase,
  restorePurchases,
} from 'expo-iap';

import { StoreAdapter, StoreError, StorePurchase } from './types';

function toPurchase(p: Purchase): StorePurchase {
  return { productId: p.productId, state: p.purchaseState, transactionId: p.id, raw: p };
}

export function toStoreErrorFromIap(error: { code?: ErrorCode | string | null; message?: string | null }): StoreError {
  const kind: StoreError['kind'] = (() => {
    switch (error.code) {
      case ErrorCode.UserCancelled:
        return 'cancelled';
      case ErrorCode.Pending:
      case ErrorCode.DeferredPayment:
        return 'pending';
      case ErrorCode.AlreadyOwned:
        return 'already-owned';
      case ErrorCode.NetworkError:
      case ErrorCode.ServiceTimeout:
      case ErrorCode.ServiceDisconnected:
      case ErrorCode.ConnectionClosed:
        return 'network';
      case ErrorCode.IapNotAvailable:
      case ErrorCode.BillingUnavailable:
      case ErrorCode.NotPrepared:
      case ErrorCode.InitConnection:
      case ErrorCode.SkuNotFound:
      case ErrorCode.ItemUnavailable:
        return 'unavailable';
      default:
        return 'other';
    }
  })();
  return { kind, message: error.message ?? '' };
}

function rethrow(error: unknown): never {
  if (error && typeof error === 'object' && 'code' in error) {
    throw toStoreErrorFromIap(error as PurchaseError);
  }
  throw error;
}

/** Apple StoreKit 2 through expo-iap. */
export function createExpoIapStore(): StoreAdapter {
  return {
    async connect() {
      const ok = await initConnection().catch(rethrow);
      if (ok === false) throw { kind: 'unavailable', message: 'StoreKit connection failed' } satisfies StoreError;
    },
    async disconnect() {
      await endConnection().catch(() => undefined);
    },
    async fetchProduct(productId) {
      const products = await fetchProducts({ skus: [productId], type: 'in-app' }).catch(rethrow);
      const product = (products ?? []).find((p) => p.id === productId);
      return product ? { id: product.id, displayPrice: product.displayPrice, title: product.title } : null;
    },
    async requestPurchase(productId) {
      await requestPurchase({ request: { apple: { sku: productId } }, type: 'in-app' }).catch(rethrow);
    },
    async ownedPurchases() {
      const purchases = await getAvailablePurchases({ onlyIncludeActiveItemsIOS: true }).catch(rethrow);
      return purchases.map(toPurchase);
    },
    async restore() {
      await restorePurchases().catch(rethrow);
    },
    async finish(purchase) {
      await finishTransaction({ purchase: purchase.raw as Purchase, isConsumable: false });
    },
    onPurchase(listener) {
      const sub = purchaseUpdatedListener((p) => listener(toPurchase(p)));
      return () => sub.remove();
    },
    onError(listener) {
      const sub = purchaseErrorListener((e) => listener(toStoreErrorFromIap(e)));
      return () => sub.remove();
    },
  };
}
