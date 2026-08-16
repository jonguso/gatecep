# PC-030M4A — Expo Go Authentication Contrast Fix

This update corrects the nearly invisible Login controls seen on a physical
phone. Login previously inherited GateCEP's dark native background while using
default dark text, placeholder, and border colors.

Login and Register now provide:

- explicit high-contrast dark-theme colors;
- labeled email, username, and password fields;
- visible placeholders, input text, borders, and buttons;
- show/hide password controls;
- safe-area and keyboard-aware scrolling;
- disabled submit state until required fields are entered.

Authentication services and destination routes are unchanged.

## Apply and verify

```bash
cd ~/gatecep/mobile
unzip -o ~/Downloads/gatecep-pc030m4a-expo-go-auth-contrast.zip

chmod +x scripts/verify-pc030m4a-mobile-auth.sh
bash scripts/verify-pc030m4a-mobile-auth.sh
```

Restart Metro so the phone receives the new bundle:

```bash
npx expo start --clear --lan
```
