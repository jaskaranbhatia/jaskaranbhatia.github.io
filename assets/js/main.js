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
  { threshold: 0.12, rootMargin: "0px 0px -36px 0px" }
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

/* ---------- Dock active-link tracking (home page sections) ---------- */
const sections = document.querySelectorAll("main section[id]");
const dockLinks = document.querySelectorAll('.dock-link[href*="#"]');

if (sections.length && dockLinks.length) {
  const sio = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        dockLinks.forEach((l) => {
          const hash = l.getAttribute("href").split("#")[1];
          l.classList.toggle("active", hash === entry.target.id);
        });
      }
    },
    { rootMargin: "-40% 0px -55% 0px" }
  );
  sections.forEach((s) => sio.observe(s));
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

/* ---------- Hide dock while scrolling down on mobile ---------- */
const dock = document.querySelector(".dock");
if (dock && window.matchMedia("(max-width: 899px)").matches) {
  let lastY = window.scrollY;
  let idle;
  window.addEventListener(
    "scroll",
    () => {
      const y = window.scrollY;
      if (y > lastY + 8 && y > 140) {
        dock.style.transform = "translateX(-50%) translateY(120%)";
      } else if (y < lastY - 8) {
        dock.style.transform = "translateX(-50%)";
      }
      lastY = y;
      clearTimeout(idle);
      idle = setTimeout(() => { dock.style.transform = "translateX(-50%)"; }, 900);
    },
    { passive: true }
  );
}

/* ---------- Hero avatar scroll parallax ---------- */
const heroAvatar = document.querySelector(".hero-avatar");
if (heroAvatar && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  let ticking = false;
  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const vh = window.innerHeight;
        if (y < vh) {
          const p = y / vh;
          heroAvatar.style.translate = `0 ${y * 0.18}px`;
          heroAvatar.style.rotate = `${p * 6}deg`;
          heroAvatar.style.opacity = `${1 - p * 0.6}`;
        }
        ticking = false;
      });
    },
    { passive: true }
  );
}

/* ---------- Footer year ---------- */
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();
