"""
עיבוד מדיה לתיק העבודות.

קורא את scripts/media.json, לוקח את הקבצים המקוריים מ-raw/<slug>/
ושומר גרסאות מעובדות ב-assets/img/<slug>/ ו-assets/video/<slug>/.

תמונות: WebP באיכות 82, בשני רוחבים (2400 ו-1200, בלי הגדלה מעבר למקור).
         השם כולל את הרוחב בפועל, למשל poster-wall-2400.webp.
סרטונים: נוגה דוחסת אותם בעצמה ב-Adobe Media Encoder (H.264, בלי קול, עד 5.5MB),
          עם המילה "web" בשם. הסקריפט רק מעתיק אותם ל-assets/video/<slug>/ בשם באנגלית,
          ומייצר תמונת poster ב-WebP מפריים מתוך הסרטון (לפי poster_at, בשניות).
          קובץ גדול מ-5.5MB לא מועתק, והסקריפט מדווח עליו.
          סרט עם קול ונגן (סוג "film" ב-media.json, למשל סרט תדמית) מותר עד 25MB.
          ליצירת ה-poster צריך את הספרייה PyAV:  python -m pip install --user av
SVG: מועתק כמו שהוא (בלי המרה), בשם באנגלית.
אפשר להוסיף לתמונה ב-media.json את "rotate" (90, 180 או 270, עם כיוון השעון) כדי לסובב אותה.

הרצה (מתיקיית הפרויקט):
    python scripts/process_media.py              כל הפרויקטים
    python scripts/process_media.py du-hayim     פרויקט אחד

קבצים שכבר עובדו מדולגים. כדי לעבד מחדש, מחקי את הקובץ המעובד או הוסיפי --force.
בסוף נשמר scripts/media-output.json עם המידות של כל קובץ (משמש לבניית ה-HTML).
"""

import json
import shutil
import sys
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "raw"
IMG_OUT = ROOT / "assets" / "img"
VIDEO_OUT = ROOT / "assets" / "video"
MANIFEST = ROOT / "scripts" / "media.json"
OUTPUT = ROOT / "scripts" / "media-output.json"

IMAGE_WIDTHS = (2400, 1200)
WEBP_QUALITY = 82
VIDEO_MAX_BYTES = int(5.5 * 1024 * 1024)
FILM_MAX_BYTES = 25 * 1024 * 1024  # סרט עם קול ונגן (type: film)
VIDEO_EXTS = {".mp4", ".mov", ".m4v", ".webm"}

Image.MAX_IMAGE_PIXELS = None  # סריקות גדולות מאוד


def save_image_sizes(im, out_dir, name, force):
    """שומר את התמונה בשני רוחבים ומחזיר רשימת קבצים עם מידות."""
    out_dir.mkdir(parents=True, exist_ok=True)
    has_alpha = im.mode in ("RGBA", "LA") or "transparency" in im.info
    im = im.convert("RGBA" if has_alpha else "RGB")
    results = []
    used = set()
    for target in IMAGE_WIDTHS:
        w = min(target, im.width)
        if w in used:
            continue
        used.add(w)
        h = round(im.height * w / im.width)
        path = out_dir / f"{name}-{w}.webp"
        if force or not path.exists():
            im.resize((w, h), Image.LANCZOS).save(path, "WEBP", quality=WEBP_QUALITY, method=6)
        results.append({"file": path.relative_to(ROOT).as_posix(), "width": w, "height": h,
                        "kb": round(path.stat().st_size / 1024)})
    return results


def process_image(src, slug, name, force, rotate=0):
    im = ImageOps.exif_transpose(Image.open(src))
    if rotate:
        im = im.rotate(-rotate, expand=True)  # rotate במעלות, עם כיוון השעון
    return {"type": "image", "sizes": save_image_sizes(im, IMG_OUT / slug, name, force)}


def process_video(src, slug, name, force, poster_at, kind="video"):
    """מעתיק סרטון מוכן (web) ומייצר לו poster. מחזיר None אם הקובץ גדול מדי."""
    size = src.stat().st_size
    limit = FILM_MAX_BYTES if kind == "film" else VIDEO_MAX_BYTES
    if size > limit:
        print(f"    גדול מ-{limit / 1024 / 1024:g}MB ({size / 1024 / 1024:.2f}MB), לא הועתק. צריך לדחוס מחדש.")
        return None
    out_dir = VIDEO_OUT / slug
    out_dir.mkdir(parents=True, exist_ok=True)
    dst = out_dir / f"{name}.mp4"
    if force or not dst.exists():
        shutil.copy2(src, dst)

    import av  # רק כאן, כדי שעיבוד תמונות יעבוד גם בלי PyAV
    with av.open(str(dst)) as container:
        stream = container.streams.video[0]
        duration = float(container.duration / 1_000_000)
        t = min(poster_at, max(duration - 0.1, 0))
        container.seek(int(t * 1_000_000), backward=True)
        frame = None
        for frame in container.decode(video=0):
            if frame.time is not None and frame.time >= t - 0.02:
                break
        poster = frame.to_image()
        width, height = stream.codec_context.width, stream.codec_context.height
    poster_sizes = save_image_sizes(poster, IMG_OUT / slug, f"{name}-poster", force)

    return {"type": kind, "file": dst.relative_to(ROOT).as_posix(),
            "mb": round(size / 1024 / 1024, 2), "duration": round(duration, 1),
            "width": width, "height": height, "poster": poster_sizes}


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    force = "--force" in sys.argv
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    output = json.loads(OUTPUT.read_text(encoding="utf-8")) if OUTPUT.exists() else {}

    for slug, items in manifest.items():
        if args and slug not in args:
            continue
        print(f"== {slug}")
        output.setdefault(slug, {})
        for item in items:
            src = RAW / slug / item["src"]
            name = item["name"]
            if not src.exists():
                print(f"  חסר קובץ מקור: {src.relative_to(ROOT)}")
                continue
            if src.suffix.lower() == ".svg":
                # SVG נשאר SVG: מועתק כמו שהוא, בשם באנגלית
                print(f"  SVG: {name}")
                dst = IMG_OUT / slug / f"{name}.svg"
                dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src, dst)
                output[slug][name] = {"type": "svg", "file": dst.relative_to(ROOT).as_posix()}
            elif src.suffix.lower() in VIDEO_EXTS:
                print(f"  סרטון: {name}")
                result = process_video(src, slug, name, force, item.get("poster_at", 1.0),
                                       item.get("type", "video"))
                if result:
                    output[slug][name] = result
                else:
                    output[slug].pop(name, None)
            else:
                print(f"  תמונה: {name}")
                output[slug][name] = process_image(src, slug, name, force, item.get("rotate", 0))

    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nנשמר: {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
