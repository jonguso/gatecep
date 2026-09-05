# PC-030M20D1 — Android Preview Channel Fix

The first preview build correctly reached EAS but stopped because `eas.json` declared an OTA channel without the optional `expo-updates` package.

This patch removes the preview and production channel declarations. OTA updates are not required to create an APK or Play Store AAB and should be introduced later as a separately tested capability.

The patch deliberately does not contain `app.json`, so it cannot overwrite the EAS project ID added by `eas init`.

## Apply and retry

```bash
cd mobile
bash scripts/verify-pc030m20d1-preview-channel-fix.sh
npm run build:preview:android
```

If EAS asks about Android signing and no established GateCEP keystore exists, choose **Generate new keystore**. If a GateCEP keystore already exists, preserve and reuse it.
