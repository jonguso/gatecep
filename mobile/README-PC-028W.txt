PC-028W — Coach G Reconciliation Conversation Layer

Purpose
-------
Turn Investor DNA reconciliation evidence into a natural Coach G conversation.

Flow
----
PC-028T detects alignment / drift.
PC-028U supplies real history.
PC-028V determines recommendation follow-through.
PC-028W asks the investor why.

Conversation rules
------------------
- One important issue at a time.
- Explain the observation without judgment.
- Ask before concluding.
- Practice evidence is excluded.
- Investor DNA never changes automatically.
- Investor clarification is stored as confirmed evidence.

Example
-------
Coach G:
"I noticed something worth understanding before we change your plan.
Earlier, we discussed reducing Banking exposure, but your real investing
activity moved differently. What influenced your decision around Banking?"

Possible responses include:
- It was intentional.
- My circumstances changed.
- It was temporary.
- Something prevented me.
- I chose a different approach.
- I wasn't clear on the recommendation.
- Something else.

Storage
-------
Confirmed clarification evidence:
investorDNAReconciliationClarifications

Install
-------
cd ~/gatecep/mobile

python scripts/apply-pc028w.py
bash scripts/verify-pc028w.sh

Restart if needed:
npx expo start -c

Next
----
The next UI integration can surface this conversation in Coach G, Wealth
Journey, and the Dashboard priority card.
