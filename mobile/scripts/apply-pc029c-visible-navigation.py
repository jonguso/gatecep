#!/usr/bin/env python3
from pathlib import Path
import shutil
import sys

ROOT = Path.home() / "gatecep" / "mobile"

PATCHES = {
    ROOT / "app" / "(tabs)" / "dashboard.js": [
        ('route="/coach-dashboard"', 'route="/(tabs)/coach"'),
        (
            '    <Quick\n      title="Coach G"\n      route="/(tabs)/coach"\n    />\n\n    <Quick\n      title="Markets"',
            '    <Quick\n      title="Coach G"\n      route="/(tabs)/coach"\n    />\n\n    <Quick\n      title="Wealth Journey"\n      route="/wealth-journey"\n    />\n\n    <Quick\n      title="Markets"'
        )
    ],
    ROOT / "app" / "menu.js": [
        ('route: "/transactions"', 'route: "/portfolio-activity"'),
        ('route: "/coach-dashboard"', 'route: "/(tabs)/coach"'),
        (
            '  {\n  title: "Coach G",\n  detail: "Personalized portfolio, cash, risk, and wealth recommendations",\n  route: "/(tabs)/coach"\n},',
            '  {\n  title: "Coach G",\n  detail: "Personalized portfolio, cash, risk, and wealth recommendations",\n  route: "/(tabs)/coach"\n},\n{\n  title: "Wealth Journey",\n  detail: "Goals, progress, reconciliation, and Coach G guidance over time",\n  route: "/wealth-journey"\n},'
        )
    ],
    ROOT / "app" / "(tabs)" / "coach.js": [
        (
            '          <QuickCard title="My Holdings" desc="View current positions" route="/holding-details" />',
            '          <QuickCard title="Wealth Journey" desc="Review goals, progress, and Coach G check-ins" route="/wealth-journey" />\n          <QuickCard title="Portfolio Hub" desc="Open your current portfolio view" route="/portfolio-hub" />\n          <QuickCard title="My Holdings" desc="View current positions" route="/holding-details" />'
        )
    ],
    ROOT / "app" / "coach-dashboard.js": [
        ('<Quick title="Goals" route="/goals" />', '<Quick title="Goals" route="/wealth-journey" />'),
        ('<Quick title="Activity" route="/transactions" />', '<Quick title="Activity" route="/portfolio-activity" />')
    ],
    ROOT / "app" / "wealth-journey.js": [
        ('router.replace("/")', 'router.replace("/(tabs)/dashboard")'),
        ('Return to Home', 'Return to My Journey'),
        (
            '          GateCEP learns from your goals, conversations, practice and\n          investing behavior. A change in behavior is evidence to\n          discuss—not proof that you did something wrong.',
            '          GateCEP learns from your goals, conversations, and real\n          investing behavior. Practice remains a learning sandbox and is\n          not used as Investor DNA evidence. A change in real behavior is\n          evidence to discuss—not proof that you did something wrong.'
        )
    ]
}

def backup(path):
    b = path.with_suffix(path.suffix + ".pc029c.bak")
    shutil.copy2(path, b)
    return b

def archive_backup(path):
    archive_root = ROOT / "archive" / "expo-router-nonroutes" / "bak"
    rel = path.relative_to(ROOT / "app")
    target = archive_root / rel
    target.parent.mkdir(parents=True, exist_ok=True)

    if target.exists():
        i = 1
        while True:
            candidate = target.with_name(f"{target.stem}-{i}{target.suffix}")
            if not candidate.exists():
                target = candidate
                break
            i += 1

    shutil.move(str(path), str(target))
    return target

def main():
    print("PC-029C visible navigation wiring")
    print()

    for path, replacements in PATCHES.items():
        if not path.exists():
            raise FileNotFoundError(path)

        original = path.read_text(encoding="utf-8")
        text = original

        for old, new in replacements:
            if old in text:
                text = text.replace(old, new, 1)
            elif new in text:
                continue
            else:
                raise RuntimeError(f"Anchor not found in {path}: {old[:100]!r}")

        if text != original:
            b = backup(path)
            path.write_text(text, encoding="utf-8")
            archived = archive_backup(b)
            print(f"PATCHED {path.relative_to(ROOT)}")
            print(f"  backup -> {archived.relative_to(ROOT)}")
        else:
            print(f"UNCHANGED {path.relative_to(ROOT)}")

    print()
    print("Canonical visible destinations:")
    print("  Coach G        -> /(tabs)/coach")
    print("  Wealth Journey -> /wealth-journey")
    print("  Activity       -> /portfolio-activity")
    print("  My Journey     -> /(tabs)/dashboard")

if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        sys.exit(1)
