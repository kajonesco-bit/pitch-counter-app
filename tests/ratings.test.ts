import { markReviewRequested, newAppState, recordSignedExport, shouldRequestReview } from '../src/model/entitlements';

const day = (n: number) => new Date(Date.UTC(2026, 10, 25) + n * 86_400_000);

describe('App Store rating prompt timing', () => {
  it('is never requested before a signed report has been exported', () => {
    expect(shouldRequestReview(newAppState(day(0)), '1.2.0', day(0))).toBe(false);
  });

  it('is requested after the first signed report export', () => {
    expect(shouldRequestReview(recordSignedExport(newAppState(day(0))), '1.2.0', day(0))).toBe(true);
  });

  it('is not requested again for the same version, nor within 120 days', () => {
    let s = markReviewRequested(recordSignedExport(newAppState(day(0))), '1.2.0', day(0));
    s = recordSignedExport(s);
    expect(shouldRequestReview(s, '1.2.0', day(200))).toBe(false);
    expect(shouldRequestReview(s, '1.3.0', day(30))).toBe(false);
    expect(shouldRequestReview(s, '1.3.0', day(121))).toBe(true);
  });

  it('does not depend on anything that would predict the rating (Pro status or usage happiness)', () => {
    const free = recordSignedExport(newAppState(day(0)));
    const pro = { ...free, pro: { owned: true } };
    expect(shouldRequestReview(free, '1.2.0', day(0))).toBe(shouldRequestReview(pro, '1.2.0', day(0)));
  });
});
