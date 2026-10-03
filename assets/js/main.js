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

  // עם prefers-reduced-motion: בעמוד פרויקט מוצג כפתור ניגון, כדי שאפשר יהיה להפעיל ידנית.
  // בגריד אין כפתור, כי כל הכרטיס הוא קישור.
  if (reduceMotion.matches) {
    videos.forEach((video) => {
      if (video.closest(".card")) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "video-toggle";
      button.textContent = "הפעלת הסרטון";
      button.addEventListener("click", () => {
        if (video.paused) {
          video.play().catch(() => {});
          button.textContent = "השהיית הסרטון";
        } else {
          video.pause();
          button.textContent = "הפעלת הסרטון";
        }
      });
      video.after(button);
    });
  }
})();

// ---------- תנועה קלה של איורים (genre-grid) ----------
// בדסקטופ האיורים זזים מעט לפי מיקום העכבר, ובמובייל לפי הגלילה.
// כל איור זז בעוצמה אחרת (data-depth ב-HTML), וה-CSS מתרגם את --mx ו---my לתזוזה.
// רק כשהבלוק במסך. עם prefers-reduced-motion אין תנועה.
(function parallax() {
  const blocks = document.querySelectorAll("[data-parallax]");
  if (!blocks.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const visible = new Set();
  let frame = null;
  let pointer = { x: 0, y: 0 };

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
  });
  blocks.forEach((b) => io.observe(b));

  function update() {
    frame = null;
    visible.forEach((block) => {
      if (finePointer) {
        block.style.setProperty("--mx", pointer.x.toFixed(3));
        block.style.setProperty("--my", pointer.y.toFixed(3));
      } else {
        // -1 כשהבלוק בתחתית המסך, 1 כשהוא בראשו
        const r = block.getBoundingClientRect();
        const progress = 1 - (r.top + r.height / 2) / (window.innerHeight / 2);
        block.style.setProperty("--my", Math.max(-1, Math.min(1, progress)).toFixed(3));
      }
    });
  }
  const request = () => { if (!frame) frame = requestAnimationFrame(update); };

  if (finePointer) {
    window.addEventListener("pointermove", (e) => {
      pointer = { x: (e.clientX / window.innerWidth - 0.5) * 2, y: (e.clientY / window.innerHeight - 0.5) * 2 };
      request();
    }, { passive: true });
  } else {
    window.addEventListener("scroll", request, { passive: true });
  }
})();

// ---------- אפקט הקלדה בשם ----------
// השם נכתב אות אחר אות, עם סמן מהבהב. מתחיל אחרי שהגופנים נטענו, כדי שהרוחב לא יקפוץ.
// עם prefers-reduced-motion השם מוצג מיד בשלמותו, בלי הקלדה.
(function typingName() {
  const el = document.querySelector("[data-typing]");
  if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const full = el.querySelector(".typing__ghost").textContent.trim();
  const out = el.querySelector(".typing__text");
  const START_DELAY = 400; // מילישניות לפני האות הראשונה
  const LETTER_DELAY = 140; // מילישניות בין אותיות

  el.classList.add("is-typing");
  const letters = Array.from(full);
  let i = 0;

  function typeNext() {
    out.textContent = letters.slice(0, ++i).join("");
    if (i < letters.length) setTimeout(typeNext, LETTER_DELAY);
  }

  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
    setTimeout(typeNext, START_DELAY);
  });
})();

// ---------- סמן עכבר ----------
// כוכב שזז עם העכבר בלי עיכוב: assets/cursor/cursor.svg במצב רגיל,
// ומתחלף ל-assets/cursor/cursor-hover.svg מעל משהו לחיץ.
// רק במכשירים עם עכבר. בשדות טקסט הוא מוסתר ומוצג הסמן של המערכת.
(function customCursor() {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  // הקבצים נטענים יחסית למיקום של main.js, כך שזה עובד מכל עמוד באתר
  const cursorDir = new URL("../cursor/", document.currentScript.src);

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
  cursor.innerHTML = '<span class="cursor__icon cursor__icon--normal"></span>' +
    '<span class="cursor__icon cursor__icon--hover"></span>';

  // ה-SVG נכנס לתוך הדף (ולא כ-<img>), כדי שה-CSS יוכל לקבוע עובי קו שנשאר קריא בגודל קטן.
  // הסמן הרגיל של המערכת מוסתר רק אחרי ששני הקבצים נטענו.
  Promise.all(["cursor.svg", "cursor-hover.svg"].map((file) =>
    fetch(new URL(file, cursorDir)).then((r) => {
      if (!r.ok) throw new Error(file);
      return r.text();
    })
  )).then(([normal, hover]) => {
    // שני הקבצים משתמשים באותו שם מחלקה פנימי (cls-1), וסגנון בתוך SVG חל על כל הדף.
    // לכן כל קובץ מקבל קידומת משלו, אחרת הסגנון של קובץ אחד דורס את השני.
    const scope = (svg, prefix) => svg.replace(/\bcls-/g, `${prefix}-cls-`);
    cursor.querySelector(".cursor__icon--normal").innerHTML = scope(normal, "cursor-normal");
    cursor.querySelector(".cursor__icon--hover").innerHTML = scope(hover, "cursor-hover");
    document.body.append(cursor);
    document.documentElement.classList.add("has-custom-cursor");
  }).catch(() => {}); // אם הקבצים לא נטענו, נשאר הסמן של המערכת

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
