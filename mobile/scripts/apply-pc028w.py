#!/usr/bin/env python3
from pathlib import Path
import shutil
import sys

ROOT = Path.home() / "gatecep" / "mobile"
INDEX = ROOT / "src" / "features" / "wealth-journey" / "index.js"

EXPORTS = [
    'export * from "./coachGReconciliationConversationEngine";',
    'export * from "./investorDNAReconciliationConversationStore";',
    'export * from "./coachGReconciliationConversationService";'
]

def main():
    if not INDEX.exists():
        print("PC-028W files installed. No wealth-journey/index.js found.")
        return

    text = INDEX.read_text(encoding="utf-8")
    changed = False

    for line in EXPORTS:
        if line not in text:
            text += "\n" + line + "\n"
            changed = True

    if not changed:
        print("PC-028W index exports already present.")
        return

    backup = INDEX.with_suffix(INDEX.suffix + ".pc028w.bak")
    shutil.copy2(INDEX, backup)
    INDEX.write_text(text, encoding="utf-8")

    print("PC-028W index exports applied.")
    print(f"Backup: {backup}")

if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        sys.exit(1)
