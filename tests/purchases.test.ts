import { PRO_PRODUCT_ID } from '../src/model/entitlements';
import { createProController, MESSAGES, toStoreError } from '../src/purchases/proController';
import { fakeStore, flush, proPurchase } from './fakeStore';

function setup(storeOptions: Parameters<typeof fakeStore>[0] = {}, alreadyPro = false) {
  const fake = fakeStore(storeOptions);
  let pro = alreadyPro;
  const grants: (string | undefined)[] = [];
  const controller = createProController({
    store: fake.store,
    isPro: () => pro,
    grantPro: (tx) => {
      pro = true;
      grants.push(tx);
    },
  });
  return { fake, controller, grants, isPro: () => pro };
}

describe('loading the Pro product', () => {
  it('shows the localized price from the App Store, not a hard-coded one', async () => {
    const { controller } = setup({ product: { id: PRO_PRODUCT_ID, displayPrice: '9,99 €', title: 'Pro' } });
    await controller.start();
    expect(controller.getSnapshot()).toMatchObject({ status: 'ready', product: { displayPrice: '9,99 €' }, message: null });
  });

  it('offline or App Store unavailable: says so, can retry, and keeps Pro already saved on the phone', async () => {
    const { controller, fake, isPro } = setup({ connectFails: true }, true);
    await controller.start();
    expect(controller.getSnapshot()).toMatchObject({ status: 'unavailable', message: MESSAGES.unavailable });
    expect(isPro()).toBe(true);
    fake.state.connectFails = false;
    await controller.start();
    expect(controller.getSnapshot().status).toBe('ready');
  });

  it('a product missing from App Store Connect is reported as unavailable, not as a price', async () => {
    const { controller } = setup({ product: null });
    await controller.start();
    expect(controller.getSnapshot()).toMatchObject({ status: 'unavailable', product: null });
  });

  it('on start, an Apple Account that already owns Pro gets it back automatically', async () => {
    const { controller, grants, fake } = setup({ owned: [proPurchase()] });
    await controller.start();
    expect(grants).toEqual(['tx-1']);
    expect(fake.finished).toHaveLength(1);
  });

  it('listeners are attached once even if start is retried', async () => {
    const { controller, fake } = setup();
    await controller.start();
    await controller.start();
    expect(fake.listenerCount()).toBe(2);
    await controller.stop();
    expect(fake.listenerCount()).toBe(0);
  });
});

describe('buying Pro', () => {
  it('a successful purchase unlocks Pro, then finishes the transaction', async () => {
    const { controller, fake, grants } = setup();
    await controller.start();
    fake.state.onBuy = () => fake.emitPurchase(proPurchase());
    await controller.buy();
    await flush();
    expect(grants).toEqual(['tx-1']);
    expect(fake.calls.indexOf('finish')).toBeGreaterThan(-1);
    expect(controller.getSnapshot()).toMatchObject({ status: 'ready', message: null });
  });

  it('if finishing the transaction fails, Pro is still kept (StoreKit replays it later)', async () => {
    const { controller, fake, isPro } = setup();
    await controller.start();
    fake.state.finishFails = true;
    fake.state.onBuy = () => fake.emitPurchase(proPurchase());
    await controller.buy();
    await flush();
    expect(isPro()).toBe(true);
  });

  it('cancelling quietly returns to the paywall: no error, no Pro', async () => {
    const { controller, fake, isPro } = setup();
    await controller.start();
    fake.state.onBuy = () => fake.emitError({ kind: 'cancelled', message: 'User cancelled' });
    await controller.buy();
    await flush();
    expect(isPro()).toBe(false);
    expect(controller.getSnapshot()).toMatchObject({ status: 'ready', message: null });
  });

  it('a pending purchase (Ask to Buy) waits, then unlocks when approved later', async () => {
    const { controller, fake, isPro } = setup();
    await controller.start();
    fake.state.onBuy = () => fake.emitPurchase(proPurchase('pending'));
    await controller.buy();
    await flush();
    expect(isPro()).toBe(false);
    expect(controller.getSnapshot()).toMatchObject({ status: 'pending', message: MESSAGES.pending });
    expect(fake.finished).toHaveLength(0); // a pending transaction is not finished
    fake.emitPurchase(proPurchase('purchased')); // parent approves, StoreKit delivers it
    await flush();
    expect(isPro()).toBe(true);
  });

  it('a pending error code is treated the same as a pending purchase', async () => {
    const { controller, fake } = setup();
    await controller.start();
    fake.state.onBuy = () => fake.emitError({ kind: 'pending', message: 'deferred' });
    await controller.buy();
    await flush();
    expect(controller.getSnapshot().status).toBe('pending');
  });

  it('a failed purchase shows a clear message and does not unlock Pro', async () => {
    const { controller, fake, isPro } = setup();
    await controller.start();
    fake.state.onBuy = () => fake.emitError({ kind: 'other', message: 'payment declined' });
    await controller.buy();
    await flush();
    expect(isPro()).toBe(false);
    expect(controller.getSnapshot()).toMatchObject({ status: 'ready', message: MESSAGES.purchaseFailed });
  });

  it('a network failure during purchase says to check the connection', async () => {
    const { controller, fake } = setup();
    await controller.start();
    fake.state.onBuy = () => {
      throw { kind: 'network', message: 'offline' };
    };
    await controller.buy();
    expect(controller.getSnapshot().message).toBe(MESSAGES.unavailable);
  });

  it('"already owned" restores Pro instead of failing', async () => {
    const { controller, fake, isPro } = setup();
    await controller.start();
    fake.state.owned = [proPurchase()];
    fake.state.onBuy = () => fake.emitError({ kind: 'already-owned', message: 'owned' });
    await controller.buy();
    await flush();
    await flush();
    expect(isPro()).toBe(true);
    expect(controller.getSnapshot().message).toBe(MESSAGES.restored);
  });

  it('purchases of other products are ignored', async () => {
    const { controller, fake, isPro } = setup();
    await controller.start();
    fake.emitPurchase(proPurchase('purchased', 'com.other.thing'));
    await flush();
    expect(isPro()).toBe(false);
  });

  it('does nothing if already Pro, or before the price has loaded', async () => {
    const owned = setup({}, true);
    await owned.controller.start();
    await owned.controller.buy();
    expect(owned.fake.calls.some((c) => c.startsWith('buy:'))).toBe(false);
    const notLoaded = setup();
    await notLoaded.controller.buy();
    expect(notLoaded.fake.calls.some((c) => c.startsWith('buy:'))).toBe(false);
  });
});

describe('Restore Purchases', () => {
  it('restores Pro for an Apple Account that bought it (new phone or reinstall)', async () => {
    const { controller, fake, isPro } = setup();
    await controller.start();
    fake.state.owned = [proPurchase()];
    await controller.restore();
    expect(fake.calls).toContain('restore');
    expect(isPro()).toBe(true);
    expect(controller.getSnapshot()).toMatchObject({ status: 'ready', message: MESSAGES.restored });
  });

  it('says clearly when there is nothing to restore', async () => {
    const { controller, isPro } = setup();
    await controller.start();
    await controller.restore();
    expect(isPro()).toBe(false);
    expect(controller.getSnapshot().message).toBe(MESSAGES.nothingToRestore);
  });

  it('a restore failure does not remove Pro already on the phone', async () => {
    const { controller, fake, isPro } = setup({}, true);
    await controller.start();
    fake.state.restoreFails = true;
    await controller.restore();
    expect(isPro()).toBe(true);
    expect(controller.getSnapshot().message).toBe(MESSAGES.restoreFailed);
  });

  it('works even if the price never loaded (connects on demand)', async () => {
    const { controller, fake, isPro } = setup({ product: null });
    fake.state.owned = [proPurchase()];
    await controller.restore();
    expect(fake.calls[0]).toBe('connect');
    expect(isPro()).toBe(true);
  });

  it('a pending (unapproved) purchase is not treated as owned', async () => {
    const { controller, fake, isPro } = setup();
    fake.state.owned = [proPurchase('pending')];
    await controller.restore();
    expect(isPro()).toBe(false);
  });
});

describe('error conversion', () => {
  it('keeps store errors and wraps anything else', () => {
    expect(toStoreError({ kind: 'cancelled', message: 'x' })).toEqual({ kind: 'cancelled', message: 'x' });
    expect(toStoreError(new Error('boom'))).toEqual({ kind: 'other', message: 'boom' });
  });
});
