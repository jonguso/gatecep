from pathlib import Path
import shutil
import sys

ROOT = Path.home() / "gatecep" / "mobile"
APP = ROOT / "app"
ARCHIVE = ROOT / "archive" / "expo-router-nonroutes" / "bak"

targets = {
    APP / "menu.js": [
        ('route: "/transactions"', 'route: "/portfolio-activity"'),
        ('route: "/coach-dashboard"', 'route: "/(tabs)/coach"')
    ],

    APP / "coach-dashboard.js": [
        ('<Quick title="Goals" route="/goals" />',
         '<Quick title="Goals" route="/wealth-journey" />'),

        ('<Quick title="Activity" route="/transactions" />',
         '<Quick title="Activity" route="/portfolio-activity" />')
    ],

    APP / "(tabs)" / "coach.js": [
        (
            '<QuickCard title="My Holdings" desc="View current positions" route="/holding-details" />',
            '<QuickCard title="Wealth Journey" desc="Review goals, progress, and Coach G check-ins" route="/wealth-journey" />\n'
            '          <QuickCard title="Portfolio Hub" desc="Open your current portfolio view" route="/portfolio-hub" />\n'
            '          <QuickCard title="My Holdings" desc="View current positions" route="/holding-details" />'
        )
    ],

    APP / "wealth-journey.js": [
        ('router.replace("/")',
         'router.replace("/(tabs)/dashboard")'),

        ('Return to Home',
         'Return to My Journey')
    ]
}

def backup(path):
    b = path.with_suffix(path.suffix + ".pc029c1.bak")
    shutil.copy2(path, b)
    return b

def archive_backup(path):
    rel = path.relative_to(APP)
    dest = ARCHIVE / rel
    dest.parent.mkdir(parents=True, exist_ok=True)

    if dest.exists():
        i = 1
        while True:
            candidate = dest.with_name(f"{dest.stem}-{i}{dest.suffix}")
            if not candidate.exists():
                dest = candidate
                break
            i += 1

    shutil.move(str(path), str(dest))
    return dest

try:
    for path, replacements in targets.items():
        if not path.exists():
            raise FileNotFoundError(path)

        original = path.read_text(encoding="utf-8")
        text = original

        for old, new in replacements:
            if old in text:
                text = text.replace(old, new, 1)
            elif new in text:
                pass
            else:
                raise RuntimeError(
                    f"Anchor not found in {path}: {old}"
                )

        if text != original:
            b = backup(path)
            path.write_text(text, encoding="utf-8")
            archived = archive_backup(b)

            print(f"PATCHED {path.relative_to(ROOT)}")
            print(f"  backup -> {archived.relative_to(ROOT)}")
        else:
            print(f"UNCHANGED {path.relative_to(ROOT)}")

    print("PC-029C1 applied.")

except Exception as e:
    print(f"ERROR: {e}", file=sys.stderr)
    sys.exit(1)
