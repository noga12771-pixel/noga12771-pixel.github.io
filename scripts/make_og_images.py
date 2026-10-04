"""
תמונות שיתוף (Open Graph) לכל עמוד: 1200×630, JPG.
התמונה מופיעה כששולחים קישור לאתר בוואטסאפ, בלינקדאין, בפייסבוק או במייל.

הרצה (מתיקיית הפרויקט):
    python scripts/make_og_images.py

הפלט: assets/og/<name>.jpg
- home: הכוכב והשם "נוגה נחמן" בגופן מולדת, על הרקע הכהה של האתר.
- moledet-font: "גופן מולדת" בגופן עצמו, בלבן על הכחול של הספסימן.
- כל עמוד אחר: חיתוך מהמרכז ליחס 1200×630 של תמונה מהעמוד (רשימה ב-PAGES למטה).
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "og"
W, H = 1200, 630
BG = (13, 13, 13)  # --bg
TEXT = (214, 214, 214)  # --text

# שם הקובץ באתר ← התמונה שממנה נחתכת תמונת השיתוף
PAGES = {
    "about": "assets/img/about/portrait-photo-2048.webp",
    "by-the-cover": "assets/img/by-the-cover/opening-screen-poster-1280.webp",
    "haifa-kids-festival": "assets/img/haifa-kids-festival/grid-photo-1600.webp",
    "du-hayim": "assets/img/du-hayim/hero-photo-2400.webp",
    "checkcheck": "assets/img/checkcheck/interface-mockup-2400.webp",
    "aya-korem-vinyl": "assets/img/aya-korem-vinyl/flying-records-2400.webp",
}

SPECIMEN_BLUE = (35, 52, 102)  # הכחול של ספסימן מולדת


def cover(im):
    """חיתוך מהמרכז ליחס 1200×630, ואז הקטנה."""
    im = im.convert("RGB")
    ratio = W / H
    if im.width / im.height > ratio:
        w = round(im.height * ratio)
        x = (im.width - w) // 2
        im = im.crop((x, 0, x + w, im.height))
    else:
        h = round(im.width / ratio)
        y = (im.height - h) // 2
        im = im.crop((0, y, im.width, y + h))
    return im.resize((W, H), Image.LANCZOS)


def home():
    """הכוכב מעל השם, ממורכזים. Pillow כאן בלי תמיכה בכתיבה מימין לשמאל,
    ולכן השם נכתב הפוך (בעברית אין חיבורים בין אותיות, אז זה מספיק)."""
    im = Image.new("RGB", (W, H), BG)
    star = Image.open(ROOT / "assets/favicon/icon-512.png").convert("RGBA")
    # ב-icon-512 יש רקע כהה ושוליים; חותכים את הכוכב עצמו
    star = star.crop((72, 72, 440, 440)).resize((150, 150), Image.LANCZOS)
    im.paste(star, ((W - 150) // 2, 120), star)
    font = ImageFont.truetype(str(ROOT / "raw/Mooldet Font-Regular.otf"), 150)
    name = "נוגה נחמן"[::-1]
    draw = ImageDraw.Draw(im)
    box = draw.textbbox((0, 0), name, font=font)
    draw.text(((W - (box[2] - box[0])) // 2 - box[0], 320 - box[1]), name, font=font, fill=TEXT)
    return im


def moledet():
    """הכותרת "גופן מולדת" בגופן עצמו, ממורכזת, על הכחול של הספסימן."""
    im = Image.new("RGB", (W, H), SPECIMEN_BLUE)
    font = ImageFont.truetype(str(ROOT / "raw/Mooldet Font-Regular.otf"), 190)
    text = "גופן מולדת"[::-1]
    draw = ImageDraw.Draw(im)
    box = draw.textbbox((0, 0), text, font=font)
    x = (W - (box[2] - box[0])) // 2 - box[0]
    y = (H - (box[3] - box[1])) // 2 - box[1]
    draw.text((x, y), text, font=font, fill=(255, 255, 255))
    return im


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    home().save(OUT / "home.jpg", quality=85, optimize=True)
    print("home.jpg")
    moledet().save(OUT / "moledet-font.jpg", quality=85, optimize=True)
    print("moledet-font.jpg")
    for name, src in PAGES.items():
        cover(Image.open(ROOT / src)).save(OUT / f"{name}.jpg", quality=85, optimize=True)
        print(f"{name}.jpg")


if __name__ == "__main__":
    main()
