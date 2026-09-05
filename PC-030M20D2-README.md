# PC-030M20D2 — EAS Android Babel Preset Fix

The failed EAS `Bundle JavaScript` phase could not resolve `babel-preset-expo` because the mobile project relied on Expo's transitive copy. This patch declares the Expo SDK 54-compatible preset directly in `dependencies` and locks it in `package-lock.json`.

## Verify and rebuild

```bash
cd mobile
npm install
bash scripts/verify-pc030m20d2-eas-babel-preset.sh
npm run build:preview:android
```
