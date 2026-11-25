// The real App Store adapter, with the native expo-iap module replaced by a mock.
jest.mock('expo-iap', () => ({
  initConnection: jest.fn(async () => true),
  endConnection: jest.fn(async () => true),
  fetchProducts: jest.fn(async () => [
    { id: 'com.kajonesco.pitchcounter.pro', displayPrice: '$9.99', title: 'Pitch Counter Pro' },
    { id: 'other', displayPrice: '$1', title: 'x' },
  ]),
  requestPurchase: jest.fn(async () => null),
  getAvailablePurchases: jest.fn(async () => [{ id: 'tx-7', productId: 'com.kajonesco.pitchcounter.pro', purchaseState: 'purchased' }]),
  restorePurchases: jest.fn(async () => undefined),
  finishTransaction: jest.fn(async () => undefined),
  purchaseUpdatedListener: jest.fn(() => ({ remove: jest.fn() })),
  purchaseErrorListener: jest.fn(() => ({ remove: jest.fn() })),
  ErrorCode: {
    UserCancelled: 'user-cancelled',
    Pending: 'pending',
    DeferredPayment: 'deferred-payment',
    AlreadyOwned: 'already-owned',
    NetworkError: 'network-error',
    ServiceTimeout: 'service-timeout',
    ServiceDisconnected: 'service-disconnected',
    ConnectionClosed: 'connection-closed',
    IapNotAvailable: 'iap-not-available',
    BillingUnavailable: 'billing-unavailable',
    NotPrepared: 'not-prepared',
    InitConnection: 'init-connection',
    SkuNotFound: 'sku-not-found',
    ItemUnavailable: 'item-unavailable',
  },
}));

import { createExpoIapStore, toStoreErrorFromIap } from '../src/purchases/expoIapStore';

const mockIap = jest.requireMock('expo-iap');

describe('expo-iap adapter', () => {
  it('asks StoreKit for the Pro product as a one-time in-app purchase and returns its localized price', async () => {
    const store = createExpoIapStore();
    await store.connect();
    const product = await store.fetchProduct('com.kajonesco.pitchcounter.pro');
    expect(mockIap.fetchProducts).toHaveBeenCalledWith({ skus: ['com.kajonesco.pitchcounter.pro'], type: 'in-app' });
    expect(product).toEqual({ id: 'com.kajonesco.pitchcounter.pro', displayPrice: '$9.99', title: 'Pitch Counter Pro' });
  });

  it('buys with the iOS request shape and finishes as non-consumable', async () => {
    const store = createExpoIapStore();
    await store.requestPurchase('com.kajonesco.pitchcounter.pro');
    expect(mockIap.requestPurchase).toHaveBeenCalledWith({ request: { apple: { sku: 'com.kajonesco.pitchcounter.pro' } }, type: 'in-app' });
    const [owned] = await store.ownedPurchases();
    expect(owned).toMatchObject({ productId: 'com.kajonesco.pitchcounter.pro', state: 'purchased', transactionId: 'tx-7' });
    await store.finish(owned);
    expect(mockIap.finishTransaction).toHaveBeenCalledWith({ purchase: owned.raw, isConsumable: false });
  });

  it('a failed StoreKit connection is reported as unavailable', async () => {
    mockIap.initConnection.mockResolvedValueOnce(false);
    await expect(createExpoIapStore().connect()).rejects.toMatchObject({ kind: 'unavailable' });
  });

  it.each([
    ['user-cancelled', 'cancelled'],
    ['pending', 'pending'],
    ['deferred-payment', 'pending'],
    ['already-owned', 'already-owned'],
    ['network-error', 'network'],
    ['sku-not-found', 'unavailable'],
    ['something-new', 'other'],
  ])('maps StoreKit error %s to %s', (code, kind) => {
    expect(toStoreErrorFromIap({ code, message: 'm' })).toEqual({ kind, message: 'm' });
  });

  it('errors thrown by StoreKit calls arrive already converted', async () => {
    mockIap.restorePurchases.mockRejectedValueOnce({ code: 'network-error', message: 'offline' });
    await expect(createExpoIapStore().restore()).rejects.toEqual({ kind: 'network', message: 'offline' });
  });
});
