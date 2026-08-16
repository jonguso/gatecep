# PC-030M4 — Expo Go Mobile Readiness

This update moves GateCEP from web-only build verification to an explicit
Android/iOS Expo Go development contract.

## What changes

- Adds GateCEP app identity, deep-link scheme, portrait orientation, dark mode,
  Android package name, and iOS bundle identifier.
- Adds the root gesture handler, safe-area provider, native status bar, and
  native stack transition background.
- Removes the old fixed development IP address. Expo Go uses the current local
  Metro host when available and otherwise uses the production API.
- Adds Expo Doctor plus Android and iOS Hermes bundle verification.

## Apply

From `~/gatecep/mobile`:

```bash
unzip -o ~/Downloads/gatecep-pc030m4-expo-go-readiness.zip

npx expo install expo@~54.0.36

chmod +x scripts/verify-pc030m4-expo-go.sh
bash scripts/verify-pc030m4-expo-go.sh
```

The Expo install command is required because the current project contains
`54.0.35`, while SDK 54 expects `~54.0.36`.

## Open on a physical phone

1. Put the development computer and phone on the same Wi-Fi network.
2. Ensure the GateCEP backend is reachable. For a local backend, allow Node and
   port `4000` through Windows Firewall. For a remote backend, set
   `EXPO_PUBLIC_API_URL` in the mobile environment.
3. Start GateCEP:

```bash
npx expo start --clear --lan
```

4. Open Expo Go on Android and scan the QR code. On iPhone, scan it with the
   Camera app and open the Expo Go link.

An expired or missing REAL authentication session remains unavailable; it does
not switch the investor into Practice Portfolio.
