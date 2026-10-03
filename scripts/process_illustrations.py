"""
עיבוד איורי SVG לבלוק genre-grid (בנק הדימויים לפי ז'אנר).

קורא את scripts/illustrations.json, לוקח את קבצי ה-SVG מ-raw/<slug>/<src>/<תיקיית ז'אנר>/
ושומר אותם ב-assets/img/<slug>/illustrations/<genre>/<name>.svg, עם שם באנגלית.

כל קובץ נחתך סביב האיור עצמו (viewBox צמוד, עם שוליים קטנים), כך שכל האיורים
מוצגים באותו גודל, גם אם על הדף המקורי הם היו בגדלים שונים.
הצבע לא משתנה בקובץ: האתר צובע את האיור ב-CSS (mask), ולכן הוא חייב להיות בצבע אחד.

הרצה (מתיקיית הפרויקט):
    python scripts/process_illustrations.py

דורש את הספרייה svgelements:  python -m pip install --user svgelements
בסוף נשמר scripts/illustrations-output.json (משמש לבניית ה-HTML).
"""

import json
import re
from pathlib import Path

from svgelements import SVG

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "raw"
IMG_OUT = ROOT / "assets" / "img"
MANIFEST = ROOT / "scripts" / "illustrations.json"
OUTPUT = ROOT / "scripts" / "illustrations-output.json"

PADDING = 0.03  # שוליים סביב האיור, כחלק מהצלע הארוכה


def tight_svg(src):
    text = src.read_text(encoding="utf-8")
    bbox = SVG.parse(str(src)).bbox()
    if not bbox:
        raise ValueError(f"לא נמצא איור בקובץ {src.name}")
    x0, y0, x1, y1 = bbox
    pad = max(x1 - x0, y1 - y0) * PADDING
    x0, y0, x1, y1 = x0 - pad, y0 - pad, x1 + pad, y1 + pad
    w, h = x1 - x0, y1 - y0
    view_box = f'viewBox="{x0:.2f} {y0:.2f} {w:.2f} {h:.2f}"'
    # מחליפים את ה-viewBox של הדף, ומורידים width/height קבועים אם יש
    svg_tag = re.search(r"<svg\b[^>]*>", text).group(0)
    new_tag = re.sub(r'\sviewBox="[^"]*"', "", svg_tag)
    new_tag = re.sub(r'\s(width|height)="[^"]*"', "", new_tag)
    new_tag = new_tag.replace("<svg", f"<svg {view_box}", 1)
    return text.replace(svg_tag, new_tag, 1), round(w / h, 3)


def main():
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    output = {}
    for slug, conf in manifest.items():
        print(f"== {slug}")
        genres_out = []
        for genre in conf["genres"]:
            out_dir = IMG_OUT / slug / "illustrations" / genre["slug"]
            out_dir.mkdir(parents=True, exist_ok=True)
            items_out = []
            for item in genre["items"]:
                src = RAW / slug / conf["src"] / genre["folder"] / item["src"]
                if not src.exists():
                    print(f"  חסר קובץ מקור: {src.relative_to(ROOT)}")
                    continue
                svg, ratio = tight_svg(src)
                dst = out_dir / f'{item["name"]}.svg'
                dst.write_text(svg, encoding="utf-8")
                items_out.append({"file": dst.relative_to(ROOT).as_posix(),
                                  "label": item["label"], "ratio": ratio})
            print(f"  {genre['label']}: {len(items_out)} איורים")
            genres_out.append({"slug": genre["slug"], "label": genre["label"], "items": items_out})
        output[slug] = genres_out
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nנשמר: {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
