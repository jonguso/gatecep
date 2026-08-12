PC-028X — Coach G Reconciliation UI Integration

Purpose
-------
Surface PC-028W conversations directly to the investor.

Where it appears
----------------
1. Coach G tab
2. Wealth Journey
3. Full conversation screen:
   /reconciliation-conversation

Behavior
--------
The card appears only when PC-028W says a real-investing issue requires
clarification.

The investor can explain:
- It was intentional
- My circumstances changed
- It was temporary
- Something prevented me
- I chose a different approach
- I wasn't clear on the recommendation
- Something else

The investor can also add free-text context.

On save
-------
The response is stored as confirmed reconciliation evidence under:

investorDNAReconciliationClarifications

It does NOT:
- automatically rewrite Investor DNA
- place a trade
- change holdings
- use Practice behavior
- make a conclusion before clarification

Install
-------
cd ~/gatecep/mobile
python scripts/apply-pc028x.py
bash scripts/verify-pc028x.sh
npx expo start -c

Backups
-------
app/(tabs)/coach.js.pc028x.bak
app/wealth-journey.js.pc028x.bak
