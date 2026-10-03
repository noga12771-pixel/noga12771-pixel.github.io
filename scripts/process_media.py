"""
עיבוד מדיה לתיק העבודות.

קורא את scripts/media.json, לוקח את הקבצים המקוריים מ-raw/<slug>/
ושומר גרסאות מעובדות ב-assets/img/<slug>/ ו-assets/video/<slug>/.

תמונות: WebP באיכות 82, בשני רוחבים (2400 ו-1200, בלי הגדלה מעבר למקור).
         השם כולל את הרוחב בפועל, למשל poster-wall-2400.webp.
סרטונים: MP4 (H.264) בלי קול, ברוחב עד 1920, עד כ-5MB,
          ותמונת poster ב-WebP מפריים מתוך הסרטון.

הרצה (מתיקיית הפרויקט):
    python scripts/process_media.py              כל הפרויקטים
    python scripts/process_media.py du-hayim     פרויקט אחד

קבצים שכבר עובדו מדולגים. כדי לעבד מחדש, מחקי את הקובץ המעובד או הוסיפי --force.
בסוף נשמר scripts/media-output.json עם המידות של כל קובץ (משמש לבניית ה-HTML).
"""

import json
import shutil
import subprocess
import sys
import tempfile
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
VIDEO_MAX_WIDTH = 1920
VIDEO_MAX_BYTES = 5 * 1024 * 1024
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


def process_image(src, slug, name, force):
    im = ImageOps.exif_transpose(Image.open(src))
    return {"type": "image", "sizes": save_image_sizes(im, IMG_OUT / slug, name, force)}


def ffmpeg_available():
    return shutil.which("ffmpeg") is not None and shutil.which("ffprobe") is not None


def video_duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                          "-of", "csv=p=0", str(path)], capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


def encode_video(src, dst, crf, max_width):
    subprocess.run([
        "ffmpeg", "-y", "-v", "error", "-i", str(src),
        "-an",
        "-vf", f"scale='min({max_width},iw)':-2",
        "-c:v", "libx264", "-preset", "slow", "-crf", str(crf),
        "-pix_fmt", "yuv420p", "-movflags", "+faststart",
        str(dst),
    ], check=True)


def process_video(src, slug, name, force, poster_at):
    out_dir = VIDEO_OUT / slug
    out_dir.mkdir(parents=True, exist_ok=True)
    dst = out_dir / f"{name}.mp4"

    if force or not dst.exists():
        # מתחילים באיכות גבוהה, ומורידים איכות (ואז רוחב) עד שהקובץ קטן מ-5MB
        attempts = [(23, VIDEO_MAX_WIDTH), (26, VIDEO_MAX_WIDTH), (29, VIDEO_MAX_WIDTH),
                    (29, 1440), (31, 1280), (33, 1280)]
        for crf, width in attempts:
            encode_video(src, dst, crf, width)
            size = dst.stat().st_size
            print(f"    crf {crf}, רוחב עד {width}: {size / 1024 / 1024:.1f}MB")
            if size <= VIDEO_MAX_BYTES:
                break
        else:
            print(f"    שימי לב: {dst.name} עדיין גדול מ-5MB")

    # poster: פריים מתוך הסרטון המעובד
    duration = video_duration(dst)
    t = min(poster_at, max(duration - 0.1, 0))
    with tempfile.TemporaryDirectory() as tmp:
        frame = Path(tmp) / "frame.png"
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", str(t), "-i", str(dst),
                        "-frames:v", "1", str(frame)], check=True)
        poster_sizes = save_image_sizes(Image.open(frame), IMG_OUT / slug, f"{name}-poster", force)

    with Image.open(IMG_OUT / slug / Path(poster_sizes[0]["file"]).name) as p:
        vw, vh = p.size
    return {"type": "video", "file": dst.relative_to(ROOT).as_posix(),
            "mb": round(dst.stat().st_size / 1024 / 1024, 1),
            "duration": round(duration, 1), "poster": poster_sizes,
            "width": vw, "height": vh}


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    force = "--force" in sys.argv
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    output = json.loads(OUTPUT.read_text(encoding="utf-8")) if OUTPUT.exists() else {}
    has_ffmpeg = ffmpeg_available()
    if not has_ffmpeg:
        print("ffmpeg לא מותקן, ולכן הסרטונים ידולגו בהרצה הזו.\n")

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
            if src.suffix.lower() in VIDEO_EXTS:
                if not has_ffmpeg:
                    print(f"  דילוג (אין ffmpeg): {name}")
                    continue
                print(f"  סרטון: {name}")
                output[slug][name] = process_video(src, slug, name, force, item.get("poster_at", 1.0))
            else:
                print(f"  תמונה: {name}")
                output[slug][name] = process_image(src, slug, name, force)

    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nנשמר: {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
