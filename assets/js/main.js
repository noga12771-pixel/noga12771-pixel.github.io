// תיק העבודות של נוגה נחמן

// ---------- שדה התנסות בגופן מולדת (7.2) ----------
// סליידר גודל (32–200px, במובייל 24–96px) ומתג צבעים (בהיר על כהה / כהה על בהיר).
(function fontTester() {
  const tester = document.querySelector("[data-font-tester]");
  if (!tester) return;
  const range = tester.querySelector("[data-ft-size]");
  const out = tester.querySelector("[data-ft-size-out]");
  const mobile = window.matchMedia("(max-width: 767px)");

  function apply() {
    tester.style.setProperty("--ft-size", `${range.value}px`);
    out.textContent = `${range.value}px`;
  }

  function setRange() {
    const [min, max] = mobile.matches ? [24, 96] : [32, 200];
    range.min = min;
    range.max = max;
    range.value = Math.min(max, Math.max(min, Number(range.value)));
    apply();
  }

  range.addEventListener("input", apply);
  mobile.addEventListener("change", setRange);
  setRange();

  tester.querySelectorAll('input[name="ft-theme"]').forEach((radio) => {
    radio.addEventListener("change", () => { tester.dataset.theme = radio.value; });
  });
})();

// ---------- בלי מילים יתומות ----------
// מחבר את שתי המילים האחרונות בכל כותרת ופסקה ברווח שלא נשבר (U+00A0),
// כך שמילה אחרונה לא תישאר לבד בשורה. גיבוי ל-text-wrap שב-CSS, לדפדפנים שלא תומכים בו.
(function noOrphans() {
  const els = document.querySelectorAll("h1, h2, h3, p, li, dd, figcaption, .next-project__name");
  els.forEach((el) => {
    if (el.closest("[data-typing], textarea, .site-nav, .site-footer")) return;
    if (el.textContent.trim().split(/\s+/).length < 3) return;
    // הרווח האחרון נמצא בצומת הטקסט האחרון שיש בו רווח
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let last = null;
    while (walker.nextNode()) {
      if (/\S\s+\S/.test(walker.currentNode.nodeValue)) last = walker.currentNode;
    }
    if (last) last.nodeValue = last.nodeValue.replace(/(\S)\s+(\S+\s*)$/, "$1\u00A0$2");
  });
})();

// ---------- swap: החלפת תמונה בלחיצה ----------
// בדסקטופ ההחלפה קורית בריחוף (CSS). לחיצה, הקשה או Enter מקבעים את ההחלפה.
document.querySelectorAll("[data-swap]").forEach((button) => {
  button.addEventListener("click", () => {
    button.setAttribute("aria-pressed", String(button.getAttribute("aria-pressed") !== "true"));
  });
});

// ---------- הגדלה בלחיצה (lightbox) ----------
// קישור עם data-lightbox (למשל כפולה במקבץ הסריקות) נפתח בגדול בחלון מעל העמוד,
// עם מעבר לקודמת ולבאה באותו בלוק. סגירה: כפתור, Esc או לחיצה על הרקע.
// מקלדת: חץ שמאלה לבאה וחץ ימינה לקודמת (כיוון הקריאה בעברית).
// בלי JavaScript, הקישור פותח את התמונה הגדולה בדפדפן.
(function lightbox() {
  const links = [...document.querySelectorAll("a[data-lightbox]")];
  if (!links.length || typeof HTMLDialogElement !== "function") return;

  const dialog = document.createElement("dialog");
  dialog.className = "lightbox";
  dialog.setAttribute("aria-label", "תצוגה מוגדלת");
  dialog.innerHTML =
    '<button class="lightbox__close" type="button">סגירה</button>' +
    '<div class="lightbox__stage"><img class="lightbox__img" alt=""></div>' +
    '<div class="lightbox__nav">' +
    '<button class="lightbox__prev" type="button">הקודמת</button>' +
    '<span class="lightbox__count" dir="ltr" aria-live="polite"></span>' +
    '<button class="lightbox__next" type="button">הבאה</button>' +
    "</div>";
  document.body.append(dialog);

  const img = dialog.querySelector(".lightbox__img");
  const count = dialog.querySelector(".lightbox__count");
  let group = [];
  let index = 0;

  function show(i) {
    index = (i + group.length) % group.length;
    const thumb = group[index].querySelector("img");
    img.src = group[index].href;
    img.alt = thumb ? thumb.alt : "";
    count.textContent = `${index + 1} / ${group.length}`;
  }

  // הסמן המעוצב נמצא ב-body, והחלון מוצג מעל הכל. לכן כשהחלון פתוח הסמן עובר לתוכו.
  function moveCursor(parent) {
    const cursor = document.querySelector(".cursor");
    if (cursor) parent.append(cursor);
  }

  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      group = links.filter((l) => l.parentElement === link.parentElement);
      show(group.indexOf(link));
      moveCursor(dialog);
      dialog.showModal();
    });
  });

  // הסגירה עוברת תמיד דרך הפונקציה הזאת (גם Esc), כדי שהסמן יחזור לעמוד בכל מקרה
  function close() {
    if (dialog.open) dialog.close();
    moveCursor(document.body);
    img.removeAttribute("src");
  }

  dialog.addEventListener("close", close);
  dialog.querySelector(".lightbox__close").addEventListener("click", close);
  dialog.querySelector(".lightbox__prev").addEventListener("click", () => show(index - 1));
  dialog.querySelector(".lightbox__next").addEventListener("click", () => show(index + 1));
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog || e.target.classList.contains("lightbox__stage")) close();
  });
  dialog.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
    if (e.key === "ArrowLeft") show(index + 1);
    if (e.key === "ArrowRight") show(index - 1);
  });
})();

// ---------- "בחזרה למעלה" ----------
// קישורים ל-#top (הסמל ב-header בעמוד הבית, "בחזרה למעלה" בתחתית עמוד פרויקט)
// גוללים לראש העמוד: גלילה חלקה, ועם prefers-reduced-motion קפיצה מיידית.
// בלי JavaScript, הקישור עדיין עובד כעוגן רגיל.
document.addEventListener("click", (e) => {
  const link = e.target instanceof Element && e.target.closest('a[href="#top"]');
  if (!link) return;
  e.preventDefault();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: reduce ? "instant" : "smooth" });
});

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
