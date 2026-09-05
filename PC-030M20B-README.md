# PC-030M20B — Production Brand Assets

This patch converts the supplied GateCEP logo concept into a high-resolution production brand set and connects it to Expo.

## Included

- `assets/gatecep-brand-master.png` — polished high-resolution brand master.
- `assets/icon.png` — 1024 × 1024 mask-safe application icon.
- `assets/adaptive-icon.png` — 1024 × 1024 Android adaptive foreground.
- `assets/splash.png` — 1290 × 2292 portrait launch artwork.
- Expo icon, adaptive-icon, splash image, and brand color configuration.
- Updated production-readiness verification.

## Verify

```bash
cd mobile
bash scripts/verify-pc030m20b-production-brand-assets.sh
```

After verification, restart Expo with a cleared cache. Native icon and splash changes are fully visible in a preview or production build rather than inside every version of Expo Go.
