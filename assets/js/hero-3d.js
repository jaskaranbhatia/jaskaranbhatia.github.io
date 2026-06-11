// 3D hero — a slowly breathing neural "constellation" rendered with Three.js.
// Loads only when WebGL is available; renders a single static frame when the
// user prefers reduced motion; pauses entirely while scrolled out of view.

import * as THREE from "three";

const canvas = document.getElementById("hero-canvas");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

if (canvas && webglAvailable()) init();

function init() {
  const isMobile = window.matchMedia("(max-width: 899px)").matches;
  const COUNT = isMobile ? 220 : 720;
  const RADIUS = 9;
  const LINK_DIST = isMobile ? 2.8 : 2.2;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  const BASE_Z = 23; // further back = smaller, more contained object
  camera.position.z = BASE_Z;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !isMobile });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));

  // --- particles, distributed in a flattened ellipsoid shell ---
  const positions = new Float32Array(COUNT * 3);
  const colors = new Float32Array(COUNT * 3);
  const seeds = new Float32Array(COUNT);

  // monochrome constellation — one hue, varied brightness
  const cA = new THREE.Color("#8aa3ff");
  const cB = new THREE.Color("#36405f");
  const cC = new THREE.Color("#e8edff");
  const tmp = new THREE.Color();

  for (let i = 0; i < COUNT; i++) {
    // shell sampling: sqrt bias keeps points away from dead center
    const r = RADIUS * (0.45 + 0.55 * Math.sqrt(Math.random()));
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta) * 1.45;
    positions[i * 3 + 1] = r * Math.cos(phi) * 0.62;
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

    const t = Math.random();
    tmp.copy(t < 0.5 ? cA : cB).lerp(t < 0.5 ? cB : cC, Math.random() * 0.8);
    // vignette baked into the scene: outer particles dim toward the rim so the
    // constellation fades out without a CSS mask (which breaks Chromium's
    // backdrop-filter sampling)
    const rim = (r / RADIUS - 0.45) / 0.55;
    const dim = 1 - 0.72 * rim * rim;
    colors[i * 3] = tmp.r * dim;
    colors[i * 3 + 1] = tmp.g * dim;
    colors[i * 3 + 2] = tmp.b * dim;
    seeds[i] = Math.random() * Math.PI * 2;
  }

  const base = positions.slice();

  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  pGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const sprite = makeGlowSprite();
  const pMat = new THREE.PointsMaterial({
    size: isMobile ? 0.22 : 0.17,
    map: sprite,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(pGeo, pMat);
  scene.add(points);

  // --- synapse lines between near neighbours (computed once) ---
  const linePos = [];
  const lineCol = [];
  for (let i = 0; i < COUNT; i++) {
    for (let j = i + 1; j < COUNT; j++) {
      const dx = base[i * 3] - base[j * 3];
      const dy = base[i * 3 + 1] - base[j * 3 + 1];
      const dz = base[i * 3 + 2] - base[j * 3 + 2];
      if (dx * dx + dy * dy + dz * dz < LINK_DIST * LINK_DIST) {
        linePos.push(base[i * 3], base[i * 3 + 1], base[i * 3 + 2]);
        linePos.push(base[j * 3], base[j * 3 + 1], base[j * 3 + 2]);
        lineCol.push(colors[i * 3], colors[i * 3 + 1], colors[i * 3 + 2]);
        lineCol.push(colors[j * 3], colors[j * 3 + 1], colors[j * 3 + 2]);
      }
    }
  }

  const lGeo = new THREE.BufferGeometry();
  lGeo.setAttribute("position", new THREE.Float32BufferAttribute(linePos, 3));
  lGeo.setAttribute("color", new THREE.Float32BufferAttribute(lineCol, 3));

  const lMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  scene.add(new THREE.LineSegments(lGeo, lMat));

  // --- scene hue drift (driven by the section spy in main.js) ---
  const basePointColors = colors.slice();
  const baseLineColors = Float32Array.from(lineCol);
  let hueCur = 0;
  let hueTarget = 0;

  window.__setSceneHue = (deg) => { hueTarget = deg; };

  const hueTmp = new THREE.Color();
  function applyHue() {
    const shift = hueCur / 360;
    const pc = pGeo.attributes.color.array;
    for (let i = 0; i < basePointColors.length; i += 3) {
      hueTmp.setRGB(basePointColors[i], basePointColors[i + 1], basePointColors[i + 2]);
      hueTmp.offsetHSL(shift, 0, 0);
      pc[i] = hueTmp.r; pc[i + 1] = hueTmp.g; pc[i + 2] = hueTmp.b;
    }
    pGeo.attributes.color.needsUpdate = true;
    const lc = lGeo.attributes.color.array;
    for (let i = 0; i < baseLineColors.length; i += 3) {
      hueTmp.setRGB(baseLineColors[i], baseLineColors[i + 1], baseLineColors[i + 2]);
      hueTmp.offsetHSL(shift, 0, 0);
      lc[i] = hueTmp.r; lc[i + 1] = hueTmp.g; lc[i + 2] = hueTmp.b;
    }
    lGeo.attributes.color.needsUpdate = true;
  }

  // --- sizing (the canvas is sized by CSS, not its parent) ---
  function resize() {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", () => { resize(); render(0); });

  // --- pointer parallax ---
  let targetX = 0, targetY = 0, curX = 0, curY = 0;
  if (!reducedMotion) {
    window.addEventListener("pointermove", (e) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });

    window.addEventListener("deviceorientation", (e) => {
      if (e.gamma == null) return;
      targetX = Math.max(-1, Math.min(1, e.gamma / 28));
      targetY = Math.max(-1, Math.min(1, (e.beta - 45) / 28));
    }, { passive: true });
  }

  function render(t) {
    const time = t * 0.001;

    // gentle breathing of each particle around its base position
    const pos = pGeo.attributes.position.array;
    for (let i = 0; i < COUNT; i++) {
      const s = seeds[i];
      pos[i * 3 + 1] = base[i * 3 + 1] + Math.sin(time * 0.6 + s) * 0.18;
    }
    pGeo.attributes.position.needsUpdate = true;

    curX += (targetX - curX) * 0.04;
    curY += (targetY - curY) * 0.04;

    if (Math.abs(hueTarget - hueCur) > 0.5) {
      hueCur += (hueTarget - hueCur) * 0.05;
      applyHue();
    }

    // scroll coupling: rotation keeps turning all the way down the page,
    // while the zoom-out settles after the first viewport
    const sy = reducedMotion ? 0 : window.scrollY;
    const zoomY = Math.min(sy, window.innerHeight);

    scene.rotation.y = time * 0.04 + curX * 0.22 + sy * 0.00055;
    scene.rotation.x = curY * 0.14 + zoomY * 0.0004;
    camera.position.z = BASE_Z + Math.sin(time * 0.18) * 0.6 + zoomY * 0.006;

    renderer.render(scene, camera);
  }

  // --- run loop, paused offscreen ---
  let running = false;
  let raf = 0;

  function loop(t) {
    render(t);
    if (running) raf = requestAnimationFrame(loop);
  }

  if (reducedMotion) {
    render(0);
  } else {
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !running) {
        running = true;
        raf = requestAnimationFrame(loop);
      } else if (!entry.isIntersecting && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    }, { threshold: 0.02 }).observe(canvas);
  }

  canvas.classList.add("ready");
}

function makeGlowSprite() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
