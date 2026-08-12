PC-029C — Visible Navigation Wiring

Changes
-------
Dashboard
- Coach G now opens /(tabs)/coach.
- Adds Wealth Journey -> /wealth-journey.

Menu
- Activity -> /portfolio-activity.
- Coach G -> /(tabs)/coach.
- Adds Wealth Journey -> /wealth-journey.

Coach G
- Adds Wealth Journey to Analysis Center.
- Adds Portfolio Hub to Analysis Center.

Legacy Coach Dashboard
- Keeps the route for backward compatibility.
- Goals -> /wealth-journey.
- Activity -> /portfolio-activity.

Wealth Journey
- Return to Home -> Return to My Journey.
- Return route -> /(tabs)/dashboard.
- Practice wording corrected so practice remains a learning sandbox and is
  not presented as Investor DNA evidence.

Audit
-----
The PC-029C audit checks:
- router.push/router.replace string literals
- route="/..." props
- route: "/..." configuration values

This catches visible Quick-card destinations that the earlier static audit
could miss.

Install
-------
cd ~/gatecep/mobile

python scripts/apply-pc029c-visible-navigation.py
bash scripts/verify-pc029c-visible-navigation.sh

npx expo start -c

Expected
--------
Broken targets: 0

Manual navigation walk
----------------------
1. Dashboard -> Portfolio Hub -> Dashboard
2. Dashboard -> Coach G
3. Dashboard -> Wealth Journey -> Return to My Journey
4. Coach G -> Wealth Journey
5. Coach G -> Portfolio Hub
6. Wealth Journey -> Reconciliation Conversation
7. Reconciliation -> DNA Review -> Back
8. Menu -> Activity
9. Menu -> Coach G
10. Menu -> Wealth Journey
