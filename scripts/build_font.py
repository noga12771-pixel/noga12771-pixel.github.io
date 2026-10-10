"""
ממיר את גופן מולדת לגרסה לאתר: assets/fonts/moledet.woff2

הרצה (מתיקיית הפרויקט):
    python scripts/build_font.py              (מהקובץ raw/Mooldet Font-Regular.otf)
    python scripts/build_font.py <נתיב לקובץ>

הקרנינג בקובץ המקור רשום רק לכתב לטיני (latn), ולכן דפדפנים לא מפעילים אותו על
עברית. בהמרה מוסיפים רישום זהה גם לכתב עברי (hebr) ולברירת המחדל (DFLT).
הצורות והערכים לא משתנים.
"""

import copy
import sys
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.ttLib.tables import otTables

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "raw" / "Mooldet Font-Regular.otf"
OUT = ROOT / "assets" / "fonts" / "moledet.woff2"


def add_scripts(font, tags=("hebr", "DFLT")):
    for table_tag in ("GPOS", "GSUB"):
        if table_tag not in font:
            continue
        script_list = font[table_tag].table.ScriptList
        records = script_list.ScriptRecord
        existing = {r.ScriptTag for r in records}
        if not records:
            continue
        source = next((r for r in records if r.ScriptTag == "latn"), records[0])
        for tag in tags:
            if tag in existing:
                continue
            rec = otTables.ScriptRecord()
            rec.ScriptTag = tag
            rec.Script = copy.deepcopy(source.Script)
            records.append(rec)
        records.sort(key=lambda r: r.ScriptTag)
        script_list.ScriptCount = len(records)


def main():
    font = TTFont(SRC)
    add_scripts(font)
    font.flavor = "woff2"
    font.save(OUT)
    print(f"{OUT.relative_to(ROOT)} ({OUT.stat().st_size} bytes) מתוך {SRC.name}")


if __name__ == "__main__":
    main()
