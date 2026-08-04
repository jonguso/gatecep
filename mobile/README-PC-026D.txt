PC-026D — Fundamental Feature Navigation Hub

Files:

1. app/fundamental-data-hub.js
2. src/features/fundamentals/navigation/fundamentalNavigationRegistry.js
3. src/features/fundamentals/navigation/FundamentalNavigationFooter.js
4. scripts/apply-fundamental-navigation.js
5. app/main-dashboard-PC-026D-patch.js
6. README-PC-026D.txt

Main route:

  http://localhost:8081/fundamental-data-hub

Installation:

  Extract the ZIP into ~/gatecep/mobile

Then apply safe return-path patches:

  cd ~/gatecep/mobile
  node scripts/apply-fundamental-navigation.js

The script updates only known fundamental-data pages and creates
.pc026d.bak backups before changes.

Add the supplied main-dashboard button snippet to the user's existing
main dashboard so the hub is reachable from the normal application menu.

Navigation rule:

  Use router.replace("/fundamental-data-hub") for the main return button
  on every fundamental-data screen.

  Use router.replace("/") only when explicitly returning to the main
  Gatecep dashboard.

Do not use router.back() as the primary navigation path for these pages.
