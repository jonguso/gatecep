# PC-030M15C — Interactive Verified Market Calendar

This update replaces the long Calendar event list with a real month view while preserving GateCEP's verified-evidence policy.

## Included behavior

- Previous and next month navigation plus a **Today** shortcut.
- A complete six-week calendar grid for every displayed month.
- Event-count markers on dates containing verified events.
- A day popup containing every verified event on the selected date.
- Official, Reported and Verified labels, descriptions, companies, event types and original evidence links inside the popup.
- Explicit empty-day and empty-month states without sample or fabricated dates.
- Summary metrics recalculate for the displayed month.

## Install and verify

Extract from the GateCEP repository root:

```bash
cd ~/gatecep
unzip -o ~/Downloads/gatecep-pc030m15c-interactive-verified-market-calendar.zip

cd mobile
bash scripts/verify-pc030m15b-verified-calendar.sh
bash scripts/verify-pc030m15c-interactive-market-calendar.sh

npx expo start --clear --lan
```

No backend migration is required. The month grid reads the existing authenticated verified-calendar API.
