PC-028N — Live Dashboard + Portfolio Hub Wiring

Purpose
-------
Move PC-028L/M from parallel integration services into one shared live
portfolio-source state that Dashboard and Portfolio Hub can consume.

What PC-028N adds
-----------------
PortfolioSourceProvider
usePortfolioSource()

LivePortfolioSourceSelector
LivePortfolioSourceStatus

buildVisiblePortfolioMetrics()

Why a shared provider matters
-----------------------------
Dashboard and Portfolio Hub should not independently decide which source
is selected.

With PC-028N:

Dashboard  ─┐
            ├── Shared Portfolio Source Context
Portfolio ──┘

Default:
  actual data exists -> ALL
  no actual data -> PRACTICE

ALL:
  real broker/imported sources only
  Practice excluded

Practice:
  visible simulation only
  does not enter real Wealth Journey
  does not enter DNA reconciliation

Important integration note
--------------------------
The exact main Dashboard filename was not identified by the earlier grep
output. PC-028N therefore includes:

scripts/pc028n-find-dashboard.sh

Run it to identify the actual Dashboard file before modifying it. This avoids
guessing and wiring the source selector into the wrong screen.

Portfolio Hub is known:
  app/portfolio-hub.js

Integration guides
------------------
app/_layout-PC-028N-patch.js
app/portfolio-hub-PC-028N-live-patch.js
app/dashboard-PC-028N-live-patch.js

Verify
------
cd ~/gatecep/mobile

grep -n \
  "PortfolioSourceProvider\|usePortfolioSource\|LivePortfolioSourceSelector\|LivePortfolioSourceStatus\|buildVisiblePortfolioMetrics" \
  src/features/portfolio-source/*.js \
  src/features/portfolio-source/components/*.js
