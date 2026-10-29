(() => {
'use strict';
// Tiny particle system shared by the games. Does nothing if the visitor prefers reduced motion.
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
const PALETTE = ['#ff9a4d', '#5a6eff', '#35d49a', '#ffd24d', '#ff6b8b', '#ffffff'];
let cv, cx, P = [], raf = 0, last = 0;

function size() {
  const dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
function ensure() {
  if (cv) return;
  cv = document.createElement('canvas'); cv.id = 'fx'; cv.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cv); cx = cv.getContext('2d'); size(); addEventListener('resize', size);
}
const accent = () => getComputedStyle(document.documentElement).getPropertyValue('--acc').trim() || '#ff9a4d';

function loop(t) {
  const dt = Math.min(0.05, (t - last) / 1000); last = t;
  cx.clearRect(0, 0, innerWidth, innerHeight);
  P = P.filter(p => {
    p.life += dt; if (p.life >= p.max) return false;
    p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    cx.globalAlpha = 1 - p.life / p.max; cx.fillStyle = p.c;
    cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.283); cx.fill();
    return true;
  });
  cx.globalAlpha = 1;
  raf = P.length ? requestAnimationFrame(loop) : 0;
}
// x, y are viewport coordinates. Options: n, speed, up, g, size, colors.
function burst(x, y, o = {}) {
  if (still) return;
  ensure();
  const n = o.n || 18, cols = o.colors || [accent()];
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.283, s = (o.speed || 180) * (0.4 + Math.random() * 0.8);
    P.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (o.up || 60), g: o.g == null ? 500 : o.g, life: 0, max: 0.5 + Math.random() * 0.4, r: 1.5 + Math.random() * (o.size || 3), c: cols[i % cols.length] });
  }
  if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
}
const confetti = (x, y) => burst(x, y, { n: 70, speed: 380, up: 280, g: 700, size: 4, colors: PALETTE });
const at = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
window.TypeRunFX = { burst, confetti, at };
})();