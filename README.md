# Pitch Counter: Signed Game Log

iPhone app (React Native + Expo) for producing a two-team pitch-count record
that both coaches can review, sign on one phone, and export as a printable PDF.

The PDF is an **unofficial record**. It is not an official or approved form of
any state association or league.

## Current status

Stage 1: enter the game, teams, pitchers and final pitch totals on one screen,
then create a PDF and share it. Signing and saving games come in later stages.

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
| `App.tsx` | Starts the app and shows the screen |
| `src/screens/GameFormScreen.tsx` | The entry screen |
| `src/game.ts` | New-game defaults, totals, validation |
| `src/pdf/buildGameHtml.ts` | Layout of the PDF |
| `src/pdf/exportPdf.ts` | Creates, saves and shares the PDF |

## Checks

```powershell
npx expo lint
npx tsc --noEmit
npx expo-doctor
```

These also run automatically on every pull request (GitHub Actions, "Checks").
