PC-028V1 — Runtime Integration Fix

The original PC-028V engine/service installed correctly.
Only the runtime wiring failed because the current PC-028U runtime formatting
did not match the original patch anchor.

This fix targets the exact current runtime block.

Install:
cd ~/gatecep/mobile
python scripts/apply-pc028v1.py
bash scripts/verify-pc028v1.sh
npx expo start -c
