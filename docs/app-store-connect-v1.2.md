# Version 1.2: App Store Connect setup for Pitch Counter Pro

For whoever administers App Store Connect. The app code is finished; the steps
below are the configuration the code expects. Values in `code` must match exactly.

App: **Pitch Counter: Signed Game Log** · Apple ID `6835624387` · Bundle ID `com.kajonesco.pitchcounter`

## 1. Before anything else

- **Paid Apps Agreement** must be **Active** (Business → Agreements), with banking
  and tax forms complete. Until it is active, StoreKit returns no products and the
  paywall shows "The App Store isn't available right now".

## 2. Create the in-app purchase

App Store Connect → Apps → Pitch Counter → Monetization → In-App Purchases → (+)

| Field | Value |
| --- | --- |
| Type | **Non-Consumable** |
| Reference Name | `Pitch Counter Pro` (internal only) |
| Product ID | `com.kajonesco.pitchcounter.pro` (permanent; cannot be reused or changed) |
| Price | **USD 9.99** base price, all territories where the app is sold; let Apple set the other countries' equivalent prices |
| Availability | Same territories as the app |
| Family Sharing | Owner's decision (off by default). The app works either way. |

Localization (English U.S.):

| Field | Suggested value (limits: 30 / 45 characters) |
| --- | --- |
| Display Name | `Pitch Counter Pro` |
| Description | `Unlimited signed reports. One-time purchase.` |

Review information:

- **Screenshot**: the in-app paywall (Pitch Counter Pro screen), 1290×2796 or any
  accepted iPhone size. It appears when the app first opens, or from
  "Pitch Counter Pro" at the bottom of the games list.
- **Review notes**, suggested: "Pitch Counter Pro is a one-time non-consumable
  purchase. Pitch counting is free and unlimited. The first 3 completed signed
  game reports are free; Pro unlocks unlimited signed reports and PDF exports.
  To reach the paywall: open the app (it appears once) or tap 'Pitch Counter Pro'
  at the bottom of the game list. Restore Purchases is on the same screen.
  No account or login is required."

## 3. Submit the purchase with version 1.2

The first in-app purchase must be submitted **together with a new app version**:
on the version 1.2 page, in the "In-App Purchases and Subscriptions" section,
add `Pitch Counter Pro` before submitting for review. Do **not** submit version
1.2 publicly until the owner approves.

## 4. Testing in TestFlight (before release)

- TestFlight builds use Apple's sandbox automatically: purchases there are free,
  and no sandbox account is required (testers buy with their own Apple Account
  and are not charged).
- The product must exist in App Store Connect (status "Ready to Submit" or later)
  for the price to load in TestFlight. It can take up to about an hour after
  creating it.
- Apple's rating prompt **never** appears in TestFlight. That is expected.

## 5. Listing and policy updates

- **App description / What's New**: mention that pitch counting is free and
  unlimited, the first three signed reports are free, and Pitch Counter Pro is a
  one-time in-app purchase (no subscription). Apple shows "In-App Purchases"
  on the listing automatically.
- **Privacy policy**: updated for 1.2 in the app and in
  `launch-site/privacy-policy.html` (new "In-app purchase" section). Republish the
  website copy (the `gh-pages` branch) so the public URL matches.
- **App Privacy answers**: unchanged. Purchase status stays on the device and with
  Apple; the developer does not collect purchase history on a server.
- **Age rating**: answer "Yes" to in-app purchases if asked in the questionnaire.

## What the app does (for reference)

- Free: unlimited pitch counting and saved games; 3 newly completed signed reports,
  each with PDF export.
- Reports signed before 1.2 remain free to view, re-sign after a correction, and export.
- Pro (one-time): unlimited signed reports and PDF exports.
- Restore Purchases: on the Pro screen.
- Rating prompt: Apple's native prompt, only after a signed report has been
  exported, at most once per app version and once every 120 days.
