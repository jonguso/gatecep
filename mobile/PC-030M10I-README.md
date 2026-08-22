# PC-030M10I — Verified Support Tab Alignment

This patch aligns Trading, Calendar, and News with GateCEP's canonical REAL and verified-evidence boundaries.

- Trading is read-only and broker controlled. It cannot submit, accept, fill, deposit, or withdraw.
- Local EOD prices are not presented as Level 2 market depth.
- Calendar is derived from referenced corporate-action evidence and genuine date ranges.
- News is derived from verified market snapshots and referenced corporate actions.
- Coach G content is explicitly labeled as analysis, not news or trade instruction.
- Missing providers produce explicit unavailable states; sample content is never substituted.

## Install

```bash
cd ~/gatecep/mobile
unzip -o ~/Downloads/gatecep-pc030m10i-verified-support-tabs.zip
chmod +x scripts/verify-pc030m10i-verified-support-tabs.sh
bash scripts/verify-pc030m10i-verified-support-tabs.sh
npx expo start --clear --lan
```
