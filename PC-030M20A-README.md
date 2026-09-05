# PC-030M20A — Release Build Foundation

This patch begins GateCEP's production-readiness phase without changing investor behavior or the REAL/Practice data contracts.

## Included

- Explicit Android `versionCode` and iOS `buildNumber`.
- Stable Android package and iOS bundle identifiers.
- EAS internal-preview APK and production App Bundle profiles.
- Remote production build-number management with automatic increments.
- iOS encryption declaration for standard platform HTTPS usage.
- Production API environment example and HTTPS verification.
- A repeatable release configuration check.

## Deliberately not fabricated

Approved store icon, adaptive icon, and splash artwork are not present in the source received for this patch. The readiness check reports these as the next production task instead of inserting placeholder branding.

## Install dependencies and verify

```bash
cd mobile
npm install
bash scripts/verify-pc030m20a-release-build-foundation.sh
```

The `npm install` step is important because the supplied dependency snapshot is missing the declared `expo-audio` and `expo-speech` packages.
