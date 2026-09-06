# PC-030M20H — First iOS Preview + TestFlight Build

GateCEP now has explicit commands for registered-device iOS previews and TestFlight.

## Verify

From `mobile`:

```bash
npm install
bash scripts/verify-pc030m20h-first-ios-testflight-build.sh
```

## Recommended first TestFlight build

An active paid Apple Developer membership is required. The first run asks you to sign in to Apple and allows EAS to create or reuse the distribution certificate and provisioning profile.

```bash
npm run build:testflight:ios
npm run submit:testflight:ios
```

After Apple finishes processing the upload, enable the build for internal testers in App Store Connect > TestFlight. Uploading to TestFlight does not publish GateCEP to the App Store.

## Optional direct iPhone preview

Internal iOS builds can install only on registered devices:

```bash
npm run eas:device:register:ios
npm run build:preview:ios
```

Register each tester device before building. This route is optional; TestFlight is the recommended first iPhone test for production readiness.
