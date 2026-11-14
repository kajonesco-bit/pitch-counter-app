# Pitch Counter: Signed Game Log

iPhone app (React Native + Expo) for producing a two-team pitch-count record
that both coaches can review, sign on one phone, and export as a printable PDF.

The PDF is an **unofficial record**. It is not an official or approved form of
any state association or league.

## Current status

Stage 1: enter the game, teams, pitchers and final pitch totals on one screen,
then create a PDF and share it. Signing and saving games come in later stages.

## Run it on your iPhone (Windows)

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
npx tsc --noEmit
```
