PC-029A — Expo Router Navigation Cleanup

What the discovery found
------------------------
The current route inventory has three distinct navigation problems:

1. Legacy root-route references:
   /dashboard
   /trading
   /coach
   /funds
   /portfolio

   The actual canonical routes are:
   /(tabs)/dashboard
   /(tabs)/trading
   /(tabs)/coach
   /(tabs)/funds
   /portfolio-hub

2. Confirmed unresolved route references:
   /holdings-import
   /oms-orders

   PC-029A deliberately does NOT guess where these should go.

3. Patch / backup / integration JavaScript files live inside app/.
   Expo Router can interpret JavaScript files in app/ as routes.
   PC-029A moves these implementation artifacts to:

   archive/expo-router-nonroutes/

What PC-029A changes
--------------------
- Normalizes legacy navigation targets to canonical routes.
- Moves patch/backup/integration JS files out of app/.
- Preserves source structure inside the archive folder.
- Creates .pc029a.bak backups for modified source files.
- Adds a route audit script that compares router.push/router.replace targets
  with the actual Expo Router filesystem.

What PC-029A does NOT change
-----------------------------
- It does not redesign the UI.
- It does not change tabs.
- It does not alter business logic.
- It does not guess replacements for /holdings-import or /oms-orders.

Install
-------
cd ~/gatecep/mobile

python scripts/apply-pc029a-navigation-cleanup.py
bash scripts/verify-pc029a-navigation.sh

Then restart:

npx expo start -c

After verification
------------------
The audit output should show the remaining unresolved routes. Those should be
handled in PC-029B after we decide their intended destinations.

Navigation rule going forward
-----------------------------
Primary canonical destinations:

My Journey  -> /(tabs)/dashboard
Markets     -> /(tabs)/markets
Trading     -> /(tabs)/trading
Portfolio   -> /portfolio-hub
Coach G     -> /(tabs)/coach
Wealth      -> /wealth-journey

Hidden tabs such as Coach G and Funds can still be reached directly by route;
href:null only removes them from the visible tab bar.
