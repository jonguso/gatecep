PC-028S — Account-Scoped Cash & Multi-Broker Cash Reconciliation

Purpose
-------
Prevent aggregate All-Accounts cash from being shown inside every individual
broker/account view.

Cash rules
----------
ALL ACCOUNTS:
  userStorage["availableCash"]

INDIVIDUAL REAL ACCOUNT:
  userStorage["portfolioCashBySource"][matching source key]

PRACTICE:
  practicePortfolio.availableCash

Important safeguard
-------------------
If a specific real account has no scoped cash record yet, PC-028S returns 0
instead of incorrectly attaching aggregate All-Accounts cash to that account.

Supported account cash lookup keys
----------------------------------
id
sourceId
brokerAccountId
accountId
brokerId
broker
name
label

Expected behavior
-----------------
All Accounts:
  portfolio value across all real accounts
  + aggregate real cash

Broker A:
  Broker A portfolio value
  + Broker A cash only

Broker B:
  Broker B portfolio value
  + Broker B cash only

Practice:
  Practice portfolio value
  + Practice simulated cash

Wealth Journey
--------------
Continues to use ALL real accounts + aggregate real cash only.

Install
-------
cd ~/gatecep/mobile
python scripts/apply-pc028s.py
bash scripts/verify-pc028s.sh
npx expo start -c

Backups
-------
app/(tabs)/dashboard.js.pc028s.bak
app/portfolio-hub.js.pc028s.bak
src/features/wealth-journey/canonicalRealWealthContextService.js.pc028s.bak
