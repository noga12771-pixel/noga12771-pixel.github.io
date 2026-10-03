// תיק העבודות של נוגה נחמן
// בהמשך ייכנסו כאן גם: ניגון סרטונים רק כשהם במסך (IntersectionObserver),
// התאמה ל-prefers-reduced-motion, ושדה ההתנסות בגופן מולדת.

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
