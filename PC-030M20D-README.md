# PC-030M20D — First Android Preview Build

This patch prepares a credential-safe EAS preview APK flow. It does not log in, create an Expo project, generate a keystore, or start a paid/remote action without the owner's authorization.

## Verify and link the project

```bash
cd mobile
npm install
bash scripts/verify-pc030m20d-android-preview-build.sh
npm run eas:login
npm run eas:init
npm run release:preview-preflight
```

When `eas init` asks whether to create or link a project, use the GateCEP project owned by your Expo account. It will add the real `extra.eas.projectId` to `app.json`.

## Create the first installable APK

```bash
npm run build:preview:android
```

For the first Android build, allow EAS to generate a new Android keystore unless GateCEP already has an established signing key. Preserve an existing signing key if one exists; changing it can prevent future updates.

The preview profile creates an APK for direct device testing. The production profile remains an AAB for Google Play submission.
