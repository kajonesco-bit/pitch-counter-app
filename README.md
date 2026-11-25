# Pitch Counter: Signed Game Log

iPhone app (React Native + Expo) for producing a two-team pitch-count record
that both coaches can review, sign on one phone, and export as a printable PDF.

The PDF is an **unofficial record**. It is not an official or approved form of
any state association or league.

## What it does (version 1.2)

- **Saved games**: every game is saved on the iPhone as you go. The first
  screen lists them, marked **Draft**, **Signed by 1 of 2**, or **Signed**.
- **Live pitch counting**: add any number of pitchers to either team and count
  with large **+1** / **−1** buttons. Counts never go below zero; tap a count to
  type a correction. Pitcher and team totals update as you go.
- **Final review**: one screen with both teams, every pitcher, jersey numbers
  and final totals, before anyone signs.
- **Finger signatures**: each head coach types their name and signs on the
  screen. The real signature lines are placed in the PDF.
- **Signature protection**: a signed game is locked. Changing anything the
  coaches approved (date, level, team names, any pitcher's name, number or
  pitch total, adding or removing a pitcher) removes **both** signatures, and
  both coaches must sign again. The PDF only ever shows signatures that match
  the numbers printed on it.
- **PDF**: the same layout as before, with the unofficial-record disclaimer, a
  status line, and a report check code. Signed files end in `_Signed.pdf`.

- **Pitch Counter Pro** (version 1.2): pitch counting stays free and unlimited.
  The first 3 newly completed signed reports are free; a one-time in-app
  purchase (no subscription) unlocks unlimited signed reports and PDF exports.
  Reports signed before 1.2 stay free. Restore Purchases is on the Pro screen.
  App Store Connect setup: [docs/app-store-connect-v1.2.md](docs/app-store-connect-v1.2.md).
- **Ratings**: Apple's own rating prompt, only after a signed report is exported.

Nothing leaves the phone unless you share a PDF. There are no accounts.
Purchases are handled by Apple (StoreKit, through `expo-iap`).

## Install on your iPhone with TestFlight (no computer setup)

This builds the app in Expo's cloud and delivers it through Apple's TestFlight
app. You need an Apple Developer Program membership and a free Expo account
(https://expo.dev/signup). Nothing is installed on your own computer: the
commands run in a GitHub Codespace, a terminal that opens in the browser.

1. On the iPhone, install **TestFlight** from the App Store.
2. In Safari, open this repository on github.com, switch to the branch you
   want to build, then choose **Code > Codespaces > Create codespace**.
   Wait for the terminal at the bottom to finish `npm ci`.
3. In that terminal run:

   ```sh
   npx testflight
   ```

4. Answer the prompts. You sign in to Expo and to Apple (Apple ID, password,
   two-factor code) inside the terminal; those go to Expo and Apple directly.
   Accept the suggested choices (press Enter) to let Expo create the signing
   certificate, provisioning profile and App Store Connect API key.
5. The build takes roughly 10-20 minutes in Expo's cloud and is then uploaded
   to App Store Connect. Apple emails you when it has finished processing.
6. In App Store Connect (https://appstoreconnect.apple.com) open the app >
   **TestFlight** > **Internal Testing** > **+**, create a group, and add
   yourself as a tester.
7. Open **TestFlight** on the iPhone and install Pitch Counter.
8. Stop the codespace when done (github.com/codespaces) so it does not use up
   your free hours.

To ship a newer version later, repeat steps 2-3; the build number goes up
automatically.

## Run it during development with Expo Go (Windows)

> **From version 1.2 this no longer works**: the app includes Apple in-app
> purchases, which Expo Go cannot load. Test through TestFlight instead (above).

One-time setup:

1. Install **Node.js LTS** from https://nodejs.org (accept the defaults).
2. Install **Git** from https://git-scm.com/download/win (accept the defaults).
3. On the iPhone, install **Expo Go** from the App Store.

Get the code and start it (in PowerShell):

```powershell
git clone https://github.com/kajonesco-bit/pitch-counter-app.git
cd pitch-counter-app
git checkout claude/zen-archimedes-12szi8
npm install
npx expo start
```

A QR code appears in the terminal. With the iPhone on the **same Wi-Fi** as the
PC, scan the QR code with the iPhone Camera app and tap the link; the app opens
in Expo Go. Edits to the code reload on the phone automatically.

If the phone cannot connect, stop the server (Ctrl+C) and run
`npx expo start --tunnel` instead. If Windows Firewall asks about Node.js,
choose **Allow**.

## Where things are

| File | What it does |
| --- | --- |
| `src/app/index.tsx` | Saved games list (first screen) |
| `src/app/game/[id]/index.tsx` | Live pitch counting and game details |
| `src/app/game/[id]/review.tsx` | Final review, signatures, PDF |
| `src/app/game/[id]/sign.tsx` | One coach's signature |
| `src/model/game.ts` | Counting, totals, checks, signature protection |
| `src/state/gameStore.ts` | Saves every change and applies the signature rule |
| `src/storage/fileRepository.ts` | Game files on the iPhone |
| `src/pdf/buildGameHtml.ts` | Layout of the PDF |
| `src/pdf/exportPdf.ts` | Creates, saves and shares the PDF |
| `src/model/entitlements.ts` | Free allowance, Pro, existing-game protection, rating timing |
| `src/purchases/` | Pro purchase logic and the StoreKit (expo-iap) connection |
| `src/app/pro.tsx` | Pitch Counter Pro screen (paywall, Restore Purchases) |
| `tests/` | Automated tests |

## Checks

```powershell
npx expo lint
npx tsc --noEmit
npx jest
npx expo-doctor
```

These also run automatically on every pull request (GitHub Actions, "Checks").
