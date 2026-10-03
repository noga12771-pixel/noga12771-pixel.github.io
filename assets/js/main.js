// תיק העבודות של נוגה נחמן
// בהמשך ייכנס כאן גם שדה ההתנסות בגופן מולדת.

// ---------- סרטונים בלולאה ----------
// סרטון עם data-inview מתנגן רק כשהוא נמצא במסך, ונעצר כשהוא יוצא ממנו.
// עם prefers-reduced-motion הוא לא מתנגן, ומוצגת תמונת ה-poster.
(function inViewVideos() {
  const videos = document.querySelectorAll("video[data-inview]");
  if (!videos.length || !("IntersectionObserver" in window)) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const observer = new IntersectionObserver((entries) => {
    for (const { target: video, isIntersecting } of entries) {
      if (isIntersecting && !reduceMotion.matches) {
        video.play().catch(() => {}); // דפדפן שחוסם ניגון אוטומטי: נשארת תמונת ה-poster
      } else {
        video.pause();
      }
    }
  }, { threshold: 0.25 });

  videos.forEach((video) => observer.observe(video));
})();

// ---------- סמן עכבר ----------
// ריבוע קטן שזז עם העכבר בלי עיכוב, והופך למעוין מעל משהו לחיץ.
// רק במכשירים עם עכבר. בשדות טקסט הוא מוסתר ומוצג הסמן של המערכת.
(function customCursor() {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  const CLICKABLE = 'a[href], button, [role="button"], label, select, summary, ' +
    'input[type="range"], input[type="checkbox"], input[type="radio"], ' +
    'input[type="button"], input[type="submit"], input[type="reset"]';
  const TEXT_FIELD = 'textarea, [contenteditable="true"], ' +
    'input:not([type="range"]):not([type="checkbox"]):not([type="radio"])' +
    ':not([type="button"]):not([type="submit"]):not([type="reset"])' +
    ':not([type="color"]):not([type="file"])';

  const cursor = document.createElement("div");
  cursor.className = "cursor";
  cursor.setAttribute("aria-hidden", "true");
  cursor.innerHTML = '<div class="cursor__shape"></div>';
  document.body.append(cursor);
  document.documentElement.classList.add("has-custom-cursor");

  let overTextField = false;

  document.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    cursor.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
    cursor.classList.toggle("is-visible", !overTextField);
  }, { passive: true });

  document.addEventListener("pointerover", (e) => {
    const target = e.target instanceof Element ? e.target : null;
    overTextField = Boolean(target && target.closest(TEXT_FIELD));
    cursor.classList.toggle("is-active", Boolean(target && target.closest(CLICKABLE)));
    if (overTextField) cursor.classList.remove("is-visible");
  });

  // העכבר יצא מהחלון
  document.addEventListener("pointerout", (e) => {
    if (!e.relatedTarget) cursor.classList.remove("is-visible");
  });
})();
