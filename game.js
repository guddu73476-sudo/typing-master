 (() => {
'use strict';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const KEY = 'typerun.game.v1';
const DEF = () => ({ view: 'test', game: 'rain', diff: 'normal', best: {} });
let G = (() => { try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && typeof d === 'object') return Object.assign(DEF(), d); } catch (e) {} return DEF(); })();
if (!['easy', 'normal', 'hard'].includes(G.diff)) G.diff = 'normal';
if (!['test', 'game'].includes(G.view)) G.view = 'test';
if (!['rain', 'race', 'scramble', 'perfect'].includes(G.game)) G.game = 'rain';
if (!G.best || typeof G.best !== 'object') G.best = {};
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(G)); } catch (e) {} };

const LIST = [...new Set(('sun sky cat map ink key owl fog jam oak ice bay arc tin cup rim fox gem hat zip wave moon star wind fire leaf rain rock sand lamp bird door ship nest snow gold bell kite drum farm mint rope tide vine wolf yarn cave dust ' +
  'cloud river stone light storm plant bread chair dream flame grape honey ocean pearl quiet shine tiger voice water zebra bridge candle forest garden island jungle kitten ladder market orange planet rocket silver thunder window yellow anchor breeze ' +
  'lantern mountain journey kingdom library morning network painter rainbow harvest balloon compass diamond evening factory giraffe horizon blanket cabinet ' +
  'adventure butterfly chocolate discovery enormous fireworks hurricane keyboard landscape moonlight notebook orchestra pineapple telescope waterfall wonderful whirlwind yesterday').split(' '))];

const DIFF = { easy: { speed: 36, gap: 2.8, lives: 6 }, normal: { speed: 52, gap: 2.2, lives: 5 }, hard: { speed: 72, gap: 1.7, lives: 4 } };
const D = () => DIFF[G.diff];
window.TypeRunGame = { diff: () => G.diff };
const fx = window.TypeRunFX || { burst() {}, confetti() {}, at: () => [0, 0] };
const hearts = (n, max) => '<i class="hrt"></i>'.repeat(Math.max(0, n)) + '<i class="hrt off"></i>'.repeat(Math.max(0, max - n));
const WORDS_PER_LEVEL = 10, MAX_ON_SCREEN = 8;

const area = $('#garea'), field = $('#gfield'), ginp = $('#ginp'), banner = $('#gBanner');
let state = 'idle', words = [], target = null, buf = '';
let score = 0, level = 1, lives = 5, combo = 0, maxCombo = 0, killed = 0, chars = 0, keys = 0, wrong = 0;
let elapsed = 0, spawnT = 0, last = 0, raf = 0, hudAt = -1, bannerT = 0, flashT = 0;

const mult = () => 1 + Math.min(4, Math.floor(combo / 5));
const speed = () => D().speed * Math.min(3, 1 + (level - 1) * 0.1);
const gap = () => Math.max(0.6, D().gap * Math.pow(0.92, level - 1));
const wpm = () => elapsed > 4 ? Math.round(chars / 5 / (elapsed / 60)) : 0;
const acc = () => keys ? Math.round((keys - wrong) / keys * 100) : 100;

function hud() {
  $('#gScore').textContent = score;
  $('#gLevel').textContent = level;
  $('#gLives').innerHTML = hearts(lives, D().lives); $('#gLives').setAttribute('role', 'img'); $('#gLives').setAttribute('aria-label', Math.max(0, lives) + ' lives left');
  $('#gCombo').textContent = 'x' + mult(); $('#gCombo').dataset.m = mult();
  $('#gWpm').textContent = wpm();
}
function bestUI() {
  $$('[data-d]').forEach(b => b.setAttribute('aria-pressed', b.dataset.d === G.diff));
  $('#gBest').textContent = 'Best score on ' + G.diff + ': ' + (G.best[G.diff] || '-');
}
function say(msg) {
  banner.textContent = msg; banner.classList.add('show');
  clearTimeout(bannerT); bannerT = setTimeout(() => banner.classList.remove('show'), 1300);
}
function flash(cls) {
  area.classList.add(cls); clearTimeout(flashT);
  flashT = setTimeout(() => area.classList.remove('hit', 'err'), 180);
}

function overlay(kind) {
  $('#gOver').hidden = false;
  $('#gTitle').textContent = { idle: 'Word Rain', paused: 'Paused', over: 'Game over' }[kind];
  $('#gMsg').textContent = {
    idle: 'Words fall from the top. Type each one before it splashes into the water. Every word you miss costs a life.',
    paused: 'Your game is paused. Words are frozen until you resume.',
    over: 'You reached level ' + level + ' and destroyed ' + killed + ' words.'
  }[kind];
  $('#gStats').hidden = kind !== 'over';
  if (kind !== 'over') $('#gPb').hidden = true;
  $('#gGo').textContent = { idle: 'Start game', paused: 'Resume', over: 'Play again' }[kind];
  $('#gGo').focus({ preventScroll: true });
}

function setup() {
  cancelAnimationFrame(raf); field.innerHTML = ''; words = []; target = null; buf = ''; ginp.value = '';
  score = 0; level = 1; lives = D().lives; combo = 0; maxCombo = 0; killed = 0; chars = 0; keys = 0; wrong = 0;
  elapsed = 0; spawnT = 0.4; hudAt = -1; area.classList.remove('hit', 'err'); banner.classList.remove('show');
  hud(); bestUI();
}
function start() { setup(); run(); }
function run() {
  $('#gOver').hidden = true; state = 'run'; last = performance.now();
  ginp.focus({ preventScroll: true });
  raf = requestAnimationFrame(tick);
}
function pause() {
  if (state !== 'run') return;
  state = 'paused'; cancelAnimationFrame(raf); overlay('paused');
}
function resume() { if (state === 'paused') run(); }
function gameOver() {
  state = 'over'; cancelAnimationFrame(raf); unlock(); hud();
  const pb = score > (G.best[G.diff] || 0);
  if (pb) { G.best[G.diff] = score; save(); }
  $('#goScore').textContent = score; $('#goLevel').textContent = level; $('#goWords').textContent = killed;
  $('#goWpm').textContent = wpm(); $('#goAcc').textContent = acc() + '%'; $('#goCombo').textContent = maxCombo;
  overlay('over'); $('#gPb').hidden = !pb; bestUI();
}

function pick() {
  const hi = Math.min(10, 4 + level), lo = level < 4 ? 3 : level < 8 ? 4 : 5;
  let pool = LIST.filter(w => w.length >= lo && w.length <= hi);
  if (!pool.length) pool = LIST;
  let w;
  for (let i = 0; i < 14; i++) {
    w = pool[Math.random() * pool.length | 0];
    if (!words.some(o => o.text === w || o.text[0] === w[0])) return w;
  }
  return w;
}
function spawn() {
  if (words.length >= MAX_ON_SCREEN) return;
  const text = pick(), el = document.createElement('span');
  el.className = 'gw'; el.innerHTML = '<span class="gd"></span><span class="gr"></span>'; el.lastChild.textContent = text;
  el.style.transform = 'translate(-999px,-999px)'; field.appendChild(el);
  const W = field.clientWidth, w = el.offsetWidth, h = el.offsetHeight;
  let x = 0;
  for (let i = 0; i < 8; i++) {
    x = Math.random() * Math.max(0, W - w);
    if (!words.some(o => o.y < h + 10 && x < o.x + o.w + 10 && x + w + 10 > o.x)) break;
  }
  const o = { text, el, x, y: -h, w, h, v: 0.9 + Math.random() * 0.25 };
  el.style.transform = `translate(${x}px,${o.y}px)`; words.push(o);
}
function drop(o) { const i = words.indexOf(o); if (i > -1) words.splice(i, 1); o.el.remove(); }
function paintWord(o, n) {
  o.el.firstChild.textContent = o.text.slice(0, n); o.el.lastChild.textContent = o.text.slice(n);
  o.el.classList.toggle('tgt', n > 0);
}
function unlock() { if (target) paintWord(target, 0); target = null; buf = ''; ginp.value = ''; }

function miss(o) {
  if (target === o) { target = null; buf = ''; ginp.value = ''; }
  { const r = o.el.getBoundingClientRect(); fx.burst(r.left + r.width / 2, r.bottom, { n: 16, colors: ['#ff7b7b', '#6ea8ff'], up: 220, g: 650 }); }
  drop(o); lives--; combo = 0; flash('hit'); hud();
  if (lives <= 0) gameOver();
}
function kill(o) {
  { const r = o.el.getBoundingClientRect(); fx.burst(r.left + r.width / 2, r.top + r.height / 2, { n: 10 + o.text.length * 2, colors: mult() > 1 ? ['#ffd24d', '#ff9a4d', '#ffffff'] : undefined }); }
  score += o.text.length * 10 * mult(); combo++; maxCombo = Math.max(maxCombo, combo);
  killed++; chars += o.text.length + 1;
  target = null; buf = ''; ginp.value = '';
  o.el.classList.add('pop'); setTimeout(() => o.el.remove(), 230);
  const i = words.indexOf(o); if (i > -1) words.splice(i, 1);
  if (killed % WORDS_PER_LEVEL === 0) {
    level++; let msg = 'Level ' + level;
    if (level % 2 === 0 && lives < D().lives) { lives++; msg += ', +1 life'; }
    say(msg); { const [cx, cy] = fx.at(area); fx.confetti(cx, cy); }
  }
  hud();
}
function bad() { wrong++; combo = 0; flash('err'); hud(); }

function press(ch) {
  keys++;
  if (!target) {
    const c = words.filter(o => o.text[0] === ch).sort((a, b) => b.y - a.y)[0];
    if (!c) return bad();
    target = c;
  } else if (target.text[buf.length] !== ch) return bad();
  buf += ch; paintWord(target, buf.length);
  if (buf === target.text) kill(target);
}
ginp.addEventListener('input', () => {
  if (state !== 'run') { ginp.value = ''; return; }
  const v = ginp.value.toLowerCase();
  if (v.length < buf.length) {
    buf = v; if (!buf) unlock(); else if (target) paintWord(target, buf.length);
    return;
  }
  for (const ch of v.slice(buf.length)) {
    if (state !== 'run') break;
    if (ch === ' ') { unlock(); continue; }
    if (/[a-z]/.test(ch)) press(ch);
  }
  ginp.value = buf;
});
ginp.addEventListener('blur', () => { if (state === 'run') pause(); });
area.addEventListener('click', () => { if (state === 'run') ginp.focus({ preventScroll: true }); });

function tick(t) {
  if (state !== 'run') return;
  const dt = Math.min(0.05, (t - last) / 1000); last = t; elapsed += dt;
  spawnT -= dt; if (spawnT <= 0) { spawn(); spawnT = gap(); }
  const sp = speed(), H = field.clientHeight, W = field.clientWidth;
  for (let i = words.length - 1; i >= 0; i--) {
    const o = words[i]; o.y += sp * o.v * dt;
    if (o.x > W - o.w) o.x = Math.max(0, W - o.w);
    if (o.y + o.h >= H) { miss(o); if (state !== 'run') return; continue; }
    o.el.classList.toggle('low', o.y > H * 0.68);
    o.el.style.transform = `translate(${o.x}px,${o.y}px)`;
  }
  const q = Math.floor(elapsed * 4); if (q !== hudAt) { hudAt = q; hud(); }
  raf = requestAnimationFrame(tick);
}

$('#gGo').addEventListener('click', () => { if (state === 'paused') resume(); else start(); });
$$('[data-d]').forEach(b => b.addEventListener('click', () => {
  G.diff = b.dataset.d; save(); bestUI();
  if (G.game === 'rain') { setup(); state = 'idle'; overlay('idle'); }
  document.dispatchEvent(new Event('tr:diff'));
}));
document.addEventListener('keydown', e => {
  if (!document.body.classList.contains('ingame') || G.game !== 'rain') return;
  if (e.key === 'Escape') {
    e.preventDefault();
    if (state === 'run') pause(); else if (state === 'paused') resume();
    return;
  }
  if ((state === 'idle' || state === 'paused') && /^[a-z]$/i.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault(); if (state === 'paused') resume(); else start();
  }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

function setGame(g) {
  G.game = g; save();
  $$('[data-g]').forEach(b => b.setAttribute('aria-pressed', b.dataset.g === g));
  ['rain', 'race', 'scramble', 'perfect'].forEach(k => { $('#g-' + k).hidden = k !== g; });
  cancelAnimationFrame(raf); state = 'idle';
  document.dispatchEvent(new Event('tr:stop'));
  if (g === 'rain') { setup(); overlay('idle'); }
}
$$('[data-g]').forEach(b => b.addEventListener('click', () => { if (b.dataset.g !== G.game) setGame(b.dataset.g); }));

function setView(v, init) {
  G.view = v; save();
  $$('[data-v]').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === v));
  if (v === 'game') {
    if (!init) $('#restart').click();           // stop any running typing test
    document.body.classList.add('ingame'); $('#gameWrap').hidden = false;
    setGame(G.game);
  } else {
    pause(); state = 'idle'; cancelAnimationFrame(raf); document.dispatchEvent(new Event('tr:stop'));
    document.body.classList.remove('ingame'); $('#gameWrap').hidden = true;
    if (!init) $('#restart').click();           // reset and focus the typing test
  }
}
$$('[data-v]').forEach(b => b.addEventListener('click', () => { if (b.dataset.v !== G.view) setView(b.dataset.v); }));
setView(G.view, true);
})();