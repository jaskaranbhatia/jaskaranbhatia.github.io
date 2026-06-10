"use strict";

/* ---------- Theme (system default, persisted override) ---------- */
const root = document.documentElement;
const stored = localStorage.getItem("theme");

if (stored) {
  root.dataset.theme = stored;
} else if (window.matchMedia("(prefers-color-scheme: light)").matches) {
  root.dataset.theme = "light";
}

document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const next = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = next;
    localStorage.setItem("theme", next);
  });
});

/* ---------- Material ripple ---------- */
document.querySelectorAll(".btn").forEach((btn) => {
  btn.addEventListener("pointerdown", (e) => {
    const rect = btn.getBoundingClientRect();
    const d = Math.max(rect.width, rect.height);
    const span = document.createElement("span");
    span.className = "ripple";
    span.style.width = span.style.height = `${d}px`;
    span.style.left = `${e.clientX - rect.left - d / 2}px`;
    span.style.top = `${e.clientY - rect.top - d / 2}px`;
    btn.appendChild(span);
    span.addEventListener("animationend", () => span.remove());
  });
});

/* ---------- Scroll reveal ---------- */
const revealEls = document.querySelectorAll(".reveal");
const io = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("in");
        io.unobserve(entry.target);
      }
    }
  },
  // trigger as soon as the element edges in, so fast scrolling never
  // lands on a blank card waiting to animate
  { threshold: 0.01, rootMargin: "0px 0px 8% 0px" }
);
revealEls.forEach((el) => io.observe(el));

/* ---------- Stagger siblings inside grids ---------- */
document.querySelectorAll("[data-stagger]").forEach((grid) => {
  [...grid.children].forEach((child, i) => {
    child.style.setProperty("--d", `${Math.min(i, 8) * 70}ms`);
  });
});

/* ---------- Animated counters ---------- */
const counters = document.querySelectorAll("[data-count]");
const cio = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      cio.unobserve(entry.target);
      const el = entry.target;
      const target = parseFloat(el.dataset.count);
      const dur = 1300;
      const start = performance.now();
      const fmt = (v) =>
        Number.isInteger(target) ? Math.round(v).toLocaleString() : v.toFixed(1);
      (function tick(now) {
        const p = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(target * eased);
        if (p < 1) requestAnimationFrame(tick);
      })(start);
    }
  },
  { threshold: 0.6 }
);
counters.forEach((el) => cio.observe(el));

/* ---------- Liquid-glass dock highlight ---------- */
/* A glass pill glides between dock links; on the home page a scroll spy
   hands it from section to section automatically. */
const dock = document.querySelector(".dock");
const dockLinks = [...document.querySelectorAll(".dock-link")];

if (dock && dockLinks.length) {
  const pill = document.createElement("span");
  pill.className = "dock-pill";
  dock.prepend(pill);
  dock.classList.add("has-pill");

  let current = document.querySelector(".dock-link.active") || dockLinks[0];

  const movePill = () => {
    pill.style.left = `${current.offsetLeft}px`;
    pill.style.top = `${current.offsetTop}px`;
    pill.style.width = `${current.offsetWidth}px`;
    pill.style.height = `${current.offsetHeight}px`;
  };

  const setActive = (link) => {
    if (!link || link === current) return;
    current.classList.remove("active");
    link.classList.add("active");
    current = link;
    movePill();
  };

  requestAnimationFrame(movePill);
  window.addEventListener("load", movePill);
  window.addEventListener("resize", movePill);

  // home-page scroll spy: which section is on screen → which dock item glows
  const NAV_FOR_SECTION = {
    about: "#top",
    writing: "/blog.html",
    experience: "/experience.html",
    projects: "/projects.html",
    contact: "#contact",
  };

  const spied = document.querySelectorAll("main section[id], section.hero");
  if (spied.length > 1) {
    const spy = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const href = entry.target.classList.contains("hero")
            ? "#top"
            : NAV_FOR_SECTION[entry.target.id];
          if (href) setActive(dock.querySelector(`.dock-link[href="${href}"]`));
        }
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    spied.forEach((s) => spy.observe(s));
  }
}

/* ---------- 3D tilt on cards (fine pointers only) ---------- */
if (window.matchMedia("(pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  document.querySelectorAll("[data-tilt]").forEach((card) => {
    let raf = 0;
    card.addEventListener("pointermove", (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform =
          `translateY(-7px) perspective(900px) rotateX(${-y * 5}deg) rotateY(${x * 6}deg)`;
      });
    });
    card.addEventListener("pointerleave", () => {
      cancelAnimationFrame(raf);
      card.style.transform = "";
    });
  });
}

/* ---------- Mobile "Show more" for long text blocks ---------- */
document.querySelectorAll("[data-clamp]").forEach((el) => {
  el.classList.add("clamped");
  const btn = document.createElement("button");
  btn.className = "clamp-toggle";
  btn.setAttribute("aria-expanded", "false");
  btn.textContent = "Show more";
  el.insertAdjacentElement("afterend", btn);
  btn.addEventListener("click", () => {
    const collapsed = el.classList.toggle("clamped");
    btn.textContent = collapsed ? "Show more" : "Show less";
    btn.setAttribute("aria-expanded", String(!collapsed));
  });
});

/* ---------- Hero photo cinematic scroll reveal ---------- */
/* Scrubbed by scroll: starts zoomed in tight on the speaker, pulls back to
   reveal the whole conference scene while a light streak sweeps the glass
   and the frame turns subtly in 3D. */
const heroAvatar = document.querySelector(".hero-avatar");
const photoClip = document.querySelector(".hero-avatar .photo-clip");
const photoImg = document.querySelector(".hero-avatar .photo-clip img");
const photoGlare = document.querySelector(".hero-avatar .photo-glare");

if (photoImg && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  let ticking = false;
  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  const update = () => {
    const p = Math.min(window.scrollY / (window.innerHeight * 0.8), 1);
    const e = easeInOut(p);
    photoImg.style.transform = `scale(${1.4 - 0.4 * e})`;
    photoGlare.style.transform = `translateX(${-160 + e * 420}%) skewX(-12deg)`;
    photoClip.style.transform = `rotateY(${e * -10}deg) rotateX(${e * 4}deg)`;
    heroAvatar.style.translate = `0 ${Math.min(window.scrollY, window.innerHeight) * 0.08}px`;
    ticking = false;
  };

  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    },
    { passive: true }
  );
  update();
} else if (photoImg) {
  photoImg.style.transform = "none";
}


/* ---------- Section hue drift ---------- */
/* The ambient field (and the constellation with it) slowly re-temperatures
   as each section takes the screen — blue at the top, a teal moment for
   writing, drifting toward violet by the time you reach contact. */
const ambientEl = document.querySelector(".ambient");
const canvasEl = document.getElementById("hero-canvas");

const SECTION_HUES = {
  hero: 0,
  about: 8,
  writing: -26,
  experience: 14,
  projects: 32,
  publications: 46,
  photos: 60,
  achievements: 72,
  contact: 88,
};

const hueSections = document.querySelectorAll("main section[id], section.hero");

if (ambientEl && hueSections.length > 1) {
  let currentHue = null;

  const setHue = (h) => {
    if (h === currentHue) return;
    currentHue = h;
    ambientEl.style.filter = `hue-rotate(${h}deg)`;
    if (canvasEl) canvasEl.style.filter = `hue-rotate(${h}deg)`;
  };

  const hueSpy = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const key = entry.target.classList.contains("hero") ? "hero" : entry.target.id;
        if (key in SECTION_HUES) setHue(SECTION_HUES[key]);
      }
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  hueSections.forEach((s) => hueSpy.observe(s));
}

/* ---------- Footer year ---------- */
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ---------- Command palette (⌘K / Ctrl+K — deliberately low-key) ---------- */
(() => {
  const COMMANDS = [
    { group: "Navigate", label: "Home", hint: "hero about main", run: () => (location.href = "/") },
    { group: "Navigate", label: "Blog & writing", hint: "articles medium posts", run: () => (location.href = "/blog.html") },
    { group: "Navigate", label: "Work experience", hint: "jobs j-squared jpmc career", run: () => (location.href = "/experience.html") },
    { group: "Navigate", label: "Projects", hint: "builds portfolio github", run: () => (location.href = "/projects.html") },
    { group: "Navigate", label: "Research & speaking", hint: "publications papers talks photos cansec", run: () => (location.href = "/research.html") },
    { group: "Navigate", label: "Contact", hint: "email reach hire", run: () => (location.href = "/#contact") },
    { group: "Actions", label: "Download résumé", hint: "cv pdf resume", run: () => (location.href = "/assets/Jaskaran_Singh_Resume.pdf") },
    { group: "Actions", label: "Email Jaskaran", hint: "mail contact write", run: () => (location.href = "mailto:thejaskaranbhatia@gmail.com") },
    { group: "Actions", label: "Toggle theme", hint: "dark light mode", run: () => document.querySelector("[data-theme-toggle]")?.click() },
    { group: "Elsewhere", label: "GitHub", hint: "code repos", run: () => window.open("https://github.com/jaskaranbhatia", "_blank") },
    { group: "Elsewhere", label: "LinkedIn", hint: "connect profile", run: () => window.open("https://linkedin.com/in/jaskaran-bhatia", "_blank") },
    { group: "Elsewhere", label: "Medium", hint: "blog follow articles", run: () => window.open("https://medium.com/@jaskaranbhatia", "_blank") },
    { group: "Read", label: "Rust vs Python for LLM Inference", hint: "article benchmark latest", run: () => (location.href = "/post.html?id=rust-vs-python") },
    { group: "Read", label: "The Rise of On-Device AI and SLMs", hint: "article edge", run: () => (location.href = "/post.html?id=on-device-slms") },
    { group: "Read", label: "AI Accelerators: Past, Present, Future", hint: "article hardware", run: () => (location.href = "/post.html?id=ai-accelerators") },
  ];

  let overlay = null;
  let selected = 0;
  let visible = [];

  function build() {
    overlay = document.createElement("div");
    overlay.className = "cmdk-overlay";
    overlay.innerHTML = `
      <div class="cmdk glass" role="dialog" aria-modal="true" aria-label="Command palette">
        <input class="cmdk-input" type="text" placeholder="Type a command or search…" autocomplete="off" spellcheck="false">
        <ul class="cmdk-list" role="listbox"></ul>
        <div class="cmdk-foot"><kbd>↑↓</kbd> navigate <kbd>↵</kbd> open <kbd>esc</kbd> close</div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.addEventListener("pointerdown", (e) => { if (e.target === overlay) close(); });
    const input = overlay.querySelector(".cmdk-input");
    input.addEventListener("input", () => render(input.value));
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); selected = Math.min(selected + 1, visible.length - 1); paint(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); selected = Math.max(selected - 1, 0); paint(); }
      else if (e.key === "Enter" && visible[selected]) { close(); visible[selected].run(); }
    });
  }

  function render(q) {
    const list = overlay.querySelector(".cmdk-list");
    const needle = (q || "").trim().toLowerCase();
    visible = COMMANDS.filter((c) =>
      !needle || (c.label + " " + c.hint + " " + c.group).toLowerCase().includes(needle));
    selected = 0;
    let html = "", lastGroup = "";
    visible.forEach((c, i) => {
      if (c.group !== lastGroup) { html += `<li class="cmdk-group">${c.group}</li>`; lastGroup = c.group; }
      html += `<li class="cmdk-item" data-i="${i}" role="option">${c.label}</li>`;
    });
    list.innerHTML = html || '<li class="cmdk-group">No matches</li>';
    list.querySelectorAll(".cmdk-item").forEach((el) => {
      el.addEventListener("pointerenter", () => { selected = +el.dataset.i; paint(); });
      el.addEventListener("click", () => { close(); visible[+el.dataset.i].run(); });
    });
    paint();
  }

  function paint() {
    overlay.querySelectorAll(".cmdk-item").forEach((el) => {
      const sel = +el.dataset.i === selected;
      el.classList.toggle("sel", sel);
      if (sel) el.scrollIntoView({ block: "nearest" });
    });
  }

  let lastFocus = null;

  function open() {
    if (!overlay) build();
    lastFocus = document.activeElement;
    overlay.classList.add("open");
    const input = overlay.querySelector(".cmdk-input");
    input.value = "";
    render("");
    requestAnimationFrame(() => input.focus());
  }

  function close() {
    overlay?.classList.remove("open");
    lastFocus?.focus?.();
  }

  window.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      overlay?.classList.contains("open") ? close() : open();
    } else if (e.key === "Escape" && overlay?.classList.contains("open")) {
      close();
    }
  });

  // whisper-quiet hints, keyboard devices only
  if (window.matchMedia("(pointer: fine)").matches) {
    const foot = document.querySelector("footer .wrap");
    if (foot) {
      const hint = document.createElement("p");
      hint.className = "kbd-hint";
      hint.innerHTML = "<kbd>\u2318</kbd><kbd>K</kbd> to navigate";
      foot.appendChild(hint);
    }

    // dim floating chip in the bottom-right corner — click to open
    const corner = document.createElement("button");
    corner.className = "spot-hint";
    corner.title = "Spotlight — \u2318K";
    corner.setAttribute("aria-label", "Open spotlight (Cmd+K)");
    corner.innerHTML = "<kbd>\u2318</kbd><kbd>K</kbd>";
    document.body.appendChild(corner);
    corner.addEventListener("click", open);
  }
})();
