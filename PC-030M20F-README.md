# PC-030M20F — Production Mobile Acceptance

The login screen now uses the approved blue GateCEP logo and blue primary action styling. Automated release checks cover production API wiring, authenticated PDF evidence, statement dates, REAL/Practice boundaries, core routes, release identities, and APK/AAB profiles. The included device checklist completes the physical-phone acceptance pass.

```bash
cd mobile
bash scripts/verify-pc030m20f-production-mobile-acceptance.sh
npm run build:preview:android
```
