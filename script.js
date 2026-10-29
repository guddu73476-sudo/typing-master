 (() => {
'use strict';
const KEY = 'typerun.v1', $ = s => document.querySelector(s);
const WORDS = 'the be to of and a in that have it for not on with he as you do at this but his by from they we say her she or an will my one all would there their what so up out if about who get which go me when make can like time no just him know take people into year your good some could them see other than then now look only come its over think also back after use two how our work first well way even new want because any these give day most us'.split(' ');
const PASSAGES = [
  { id: 'e1', cat: 'Easy', title: 'Morning walk', text: 'The morning air was cool and quiet. I put on my shoes, opened the door, and walked down the road. A few birds sang in the trees, and the sun slowly climbed over the hills. It was a good way to start the day.' },
  { id: 'e2', cat: 'Easy', title: 'A simple recipe', text: 'To make tea, boil some water and pour it over a tea bag in a cup. Wait for three minutes, then take the bag out. Add a little milk or sugar if you like. Sit down, sip slowly, and enjoy the warm taste.' },
  { id: 'e3', cat: 'Easy', title: 'The old library', text: 'At the end of our street stands an old library with creaky wooden floors. Every Saturday I borrow a new book and read it by the window. The librarian knows my name and always saves the best stories for me.' },
  { id: 'm1', cat: 'Medium', title: 'How rain forms', text: 'Rain begins when the sun heats water on oceans and rivers, turning it into invisible vapor that rises into the sky. High above, the air is cold, so the vapor cools and gathers into tiny droplets that form clouds. When the droplets grow heavy enough, they fall back to the ground as rain.' },
  { id: 'm2', cat: 'Medium', title: 'Learning anything', text: 'Skill is built in small steps. Practicing for twenty minutes every day beats a single long session once a week, because the brain needs rest to store what it has learned. Mistakes are not failures; they are information that shows you exactly what to improve next.' },
  { id: 'm3', cat: 'Medium', title: 'City at night', text: 'When darkness falls, the city changes its shape. Office towers glow like rows of lanterns, buses hum past quiet shops, and street vendors light their lamps. Somewhere a musician tunes a guitar, and the whole neighbourhood seems to slow down and listen.' },
  { id: 'm4', cat: 'Medium', title: 'The value of sleep', text: 'Sleep is not wasted time. While we rest, the body repairs muscles, the mind sorts memories, and energy returns for the next day. Most adults feel their best with seven to nine hours of sleep, taken at roughly the same time every night.' },
  { id: 'h1', cat: 'Hard', title: 'Project report', text: 'Our team shipped version 2.4 on March 18th, three days ahead of schedule. Page load time dropped from 3.2 seconds to 1.1 seconds, a 66% improvement; however, support tickets rose by 14% during the first week, mostly about the new settings menu.' },
  { id: 'h2', cat: 'Hard', title: 'Quick facts', text: 'Light travels at about 299,792 kilometres per second, so sunlight reaches Earth in roughly 8 minutes and 20 seconds. By contrast, the nearest star beyond the Sun, Proxima Centauri, is 4.24 light-years away: a journey of over 40 trillion kilometres.' },
  { id: 'h3', cat: 'Hard', title: 'Travel plans', text: "We leave at 6:45 a.m. on Friday (not Saturday!), drive 220 km to the coast, and check in by noon. Remember: passports, chargers, sunscreen, and $50 in small notes. If it rains, we'll visit the museum instead; tickets cost $12 each." }
];
const BASIC = [
  'I like to drink a cup of tea in the morning.', 'The sun is up and the day is bright.', 'We go to school by bus every day.', 'My friend has a small red car.',
  'She reads a book before she goes to bed.', 'The dog ran across the park and jumped in the water.', 'It is a good time to sit down and rest.', 'There are many people at the market today.',
  'He made a plan and wrote it on a piece of paper.', 'The children play with a ball after lunch.', 'Please open the door and come inside.', 'We saw a big tree near the old house.',
  'Birds sing in the garden when the weather is warm.', 'My mother cooks rice and fresh vegetables for dinner.', 'I will call you after I finish my work.', 'The shop opens at nine and closes at six.',
  'Water is important for every person, plant, and animal.', 'Take a deep breath and think about what you want to say.', 'On Sunday we visit our family and share a meal.', 'A small step each day can lead to a big change.',
  'The train was late, so we waited at the station.', 'He keeps his books on a shelf by the window.', 'Good food, fresh air, and enough sleep keep us healthy.', 'Learning to type fast takes time and daily practice.'
];
const tl = t => t < 60 ? t + ' s' : t / 60 + ' min';
const fmt = s => s >= 60 ? Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') : String(s);
const timed = () => S.mode === 'words' || S.mode === 'para';
const DEF = () => ({ time: 30, punct: false, theme: '', best: {}, hist: [], mode: 'words', pid: 'rand', custom: '' });
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let S = (() => { try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && Array.isArray(d.hist) && d.best) return Object.assign(DEF(), d); } catch (e) {} return DEF(); })();
if (![15, 30, 60, 120, 180, 300].includes(S.time)) S.time = 30;
if (!['words', 'para', 'passage', 'custom'].includes(S.mode)) S.mode = 'words';
if (typeof S.custom !== 'string') S.custom = '';
if (!S.theme) S.theme = 'dark';
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
let tt; const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2600); };

const inp = $('#inp'), words = $('#words');
let target = '', els = [], state = 'idle', startAt = 0, timer = 0, keys = 0, wrong = 0, prev = 0, meta = { lbl: '', key: '' }, lastPid = '';

function gen(n, p) {
  const out = []; let cap = true, last = '';
  for (let i = 0; i < n; i++) {
    let w; do { w = WORDS[Math.random() * WORDS.length | 0]; } while (w === last); last = w;
    if (p) { if (cap) { w = w[0].toUpperCase() + w.slice(1); cap = false; } const r = Math.random(); if (r < .1 && i < n - 1) w += ','; else if (r < .2 && i < n - 1) { w += '.'; cap = true; } }
    out.push(w);
  }
  return out.join(' ');
}
function para(n) {
  let out = '';
  while (out.length < n) out += (out ? ' ' : '') + BASIC.slice().sort(() => Math.random() - .5).join(' ');
  return out;
}
function pickTarget() {
  inp.disabled = false;
  if (S.mode === 'passage') {
    let p = PASSAGES.find(x => x.id === S.pid);
    if (!p) { const pool = PASSAGES.filter(x => x.id !== lastPid); p = pool[Math.random() * pool.length | 0]; }
    lastPid = p.id; target = p.text; meta = { lbl: 'Passage: ' + p.title, key: 'p:' + p.id };
  } else if (S.mode === 'custom') {
    meta = { lbl: 'Your own text', key: '' };
    if (S.custom) target = S.custom; else { target = 'Add your own text above and press Use this text.'; inp.disabled = true; }
  } else if (S.mode === 'para') { target = para(Math.max(600, S.time * 14)); meta = { lbl: tl(S.time) + ' paragraph', key: 'para:' + S.time };
  } else { target = gen(Math.max(220, S.time * 3), S.punct); meta = { lbl: tl(S.time) + ' words', key: String(S.time) }; }
}
function build() {
  pickTarget();
  words.innerHTML = target.split(' ').map((w, k, a) => '<span class="w">' + [...w].map(c => '<i>' + esc(c) + '</i>').join('') + (k < a.length - 1 ? '<i> </i>' : '') + '</span>').join('');
  els = [...words.querySelectorAll('i')]; inp.maxLength = target.length;
}
function paint() {
  const t = inp.value;
  for (let i = 0; i < els.length; i++) els[i].className = i < t.length ? (t[i] === target[i] ? 'ok' : 'bad') : i === t.length ? 'cur' : '';
  const cur = els[Math.min(t.length, els.length - 1)], lh = cur.parentElement.offsetHeight || 1;
  words.style.transform = `translateY(${-Math.max(0, Math.round(cur.parentElement.offsetTop / lh) - 1) * lh}px)`;
}
function calc(sec) {
  const t = inp.value; let ok = 0;
  for (let i = 0; i < t.length; i++) if (t[i] === target[i]) ok++;
  const m = Math.max(sec, 1) / 60;
  return { net: ok / 5 / m, raw: t.length / 5 / m, ok, acc: keys ? (keys - wrong) / keys * 100 : 100 };
}
function live() {
  const el = state === 'run' ? (Date.now() - startAt) / 1000 : 0;
  $('#left').textContent = fmt(timed() ? Math.max(0, Math.ceil(S.time - el)) : Math.floor(el));
  $('#wpm').textContent = el >= 1 ? Math.round(calc(el).net) : 0;
  $('#acc').textContent = Math.round(calc(Math.max(el, 1)).acc) + '%';
}
function reset() {
  clearInterval(timer); state = 'idle'; keys = wrong = prev = 0; inp.value = ''; inp.disabled = false;
  build(); paint(); live();
  $('#res').hidden = true; $('#testWrap').hidden = false;
  document.querySelectorAll('[data-t]').forEach(b => b.setAttribute('aria-pressed', +b.dataset.t === S.time));
  $('#punct').setAttribute('aria-pressed', S.punct);
  $('#left').textContent = fmt(timed() ? S.time : 0); modeUI(); inp.focus({ preventScroll: true });
}
function start() {
  state = 'run'; startAt = Date.now();
  timer = setInterval(() => { live(); if (timed() && (Date.now() - startAt) / 1000 >= S.time) finish(); }, 100);
}
function finish() {
  if (state !== 'run') return;
  clearInterval(timer);
  const el = (Date.now() - startAt) / 1000, sec = timed() ? Math.min(S.time, el) : el, r = calc(sec); state = 'done'; inp.blur(); inp.disabled = true;
  const wpm = Math.round(r.net), acc = Math.round(r.acc), key = meta.key, pb = !!key && wpm > (S.best[key] || 0) && wpm > 0;
  if (pb) S.best[key] = wpm;
  if (keys > 0) S.hist.unshift({ wpm, acc, sec: Math.round(sec), lbl: meta.lbl, at: Date.now(), p: S.mode === 'words' && S.punct });
  S.hist = S.hist.slice(0, 50); save();
  $('#rWpm').textContent = wpm; $('#rAcc').textContent = acc + '%'; $('#rRaw').textContent = Math.round(r.raw);
  $('#rOk').textContent = r.ok; $('#rBad').textContent = wrong; $('#pb').hidden = !pb;
  $('#rMeta').textContent = meta.lbl + (timed() ? '' : ', finished in ' + Math.round(sec) + ' s'); $('#res').hidden = false; $('#again').focus(); renderHist();
}
inp.addEventListener('input', () => {
  if (state === 'done') return;
  const v = inp.value;
  if (v.length > prev) { if (state === 'idle') start(); for (let i = prev; i < v.length; i++) { keys++; if (v[i] !== target[i]) wrong++; } }
  prev = v.length; paint(); live();
  if (v.length >= target.length) finish();
});
['paste', 'drop', 'cut'].forEach(ev => inp.addEventListener(ev, e => e.preventDefault()));
inp.addEventListener('focus', () => $('#test').classList.remove('off'));
inp.addEventListener('blur', () => { if (state !== 'done') $('#test').classList.add('off'); });
$('#test').addEventListener('click', () => inp.focus());
document.addEventListener('keydown', e => {
  if (document.body.classList.contains('ingame')) return;
  if (e.key === 'Escape') { e.preventDefault(); reset(); return; }
  if (state === 'idle' && document.activeElement !== inp && !e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1 && !/^(BUTTON|INPUT|A)$/.test(document.activeElement.tagName)) inp.focus();
});
$('#restart').addEventListener('click', reset);
$('#again').addEventListener('click', reset);
$('#closeRes').addEventListener('click', () => { $('#res').hidden = true; });
document.querySelectorAll('[data-t]').forEach(b => b.addEventListener('click', () => { S.time = +b.dataset.t; save(); reset(); }));
$('#punct').addEventListener('click', () => { S.punct = !S.punct; save(); reset(); });

function modeUI() {
  document.querySelectorAll('[data-m]').forEach(b => b.setAttribute('aria-pressed', b.dataset.m === S.mode));
  $('#timeSeg').hidden = !timed(); $('#punct').hidden = S.mode !== 'words';
  $('#pSel').hidden = S.mode !== 'passage';
  $('#customBox').hidden = S.mode !== 'custom';
  $('#leftLbl').textContent = timed() ? 'time left' : 'time (seconds)';
  $('#restart').textContent = S.mode === 'custom' ? 'Restart' : 'New text';
  $('.pause').textContent = inp.disabled ? 'Add your text above to begin' : 'Click here or press any key to start';
}
document.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => { S.mode = b.dataset.m; save(); reset(); }));
$('#pSel').innerHTML = '<option value="rand">Random passage</option>' + ['Easy', 'Medium', 'Hard'].map(c => `<optgroup label="${c}">` + PASSAGES.filter(p => p.cat === c).map(p => `<option value="${p.id}">${esc(p.title)}</option>`).join('') + '</optgroup>').join('');
$('#pSel').value = PASSAGES.some(p => p.id === S.pid) ? S.pid : 'rand';
$('#pSel').addEventListener('change', e => { S.pid = e.target.value; save(); reset(); });
$('#custom').value = S.custom;
const ccount = () => $('#cc').textContent = $('#custom').value.length + ' / 1500';
$('#custom').addEventListener('input', ccount); ccount();
$('#useCustom').addEventListener('click', () => {
  const t = $('#custom').value.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[\u2013\u2014]/g, '-').replace(/\u2026/g, '...').replace(/\s+/g, ' ').trim(), e = $('#cerr');
  if (t.length < 20) return void (e.textContent = 'Enter at least 20 characters.');
  if (t.length > 1500) return void (e.textContent = 'Keep it under 1,500 characters.');
  if (/[^\x20-\x7E]/.test(t)) return void (e.textContent = 'Use only standard keyboard characters. Remove emoji or accented letters.');
  e.textContent = ''; S.custom = t; $('#custom').value = t; ccount(); save(); reset(); toast('Text ready. Start typing.');
});

function renderHist() {
  $('#tBest').innerHTML = [15, 30, 60, 120, 180, 300].map(t => `<div><b>${S.best[t] || '-'}</b><span>${tl(t)} words</span></div>`).join('');
  $('#pBest').innerHTML = Object.keys(S.best).filter(k => k.startsWith('para:')).map(k => `<div><b>${S.best[k]}</b><span>${tl(+k.slice(5))} paragraph</span></div>`).join('') + PASSAGES.filter(p => S.best['p:' + p.id]).map(p => `<div><b>${S.best['p:' + p.id]}</b><span>${esc(p.title)}</span></div>`).join('');
  $('#hist').innerHTML = S.hist.slice(0, 10).map(h => `<li><span><b>${h.wpm} WPM</b> <small>${h.acc}% accurate, ${esc(h.lbl || h.sec + ' s')}${h.p ? ', punctuation' : ''}</small></span><small>${new Date(h.at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</small></li>`).join('')
    || '<li class="none">No tests yet. Finish one and it appears here.</li>';
}
let armed = 0;
$('#clear').addEventListener('click', e => {
  if (!S.hist.length && !Object.keys(S.best).length) return toast('Nothing to clear.');
  if (!armed) { armed = setTimeout(() => { armed = 0; e.target.textContent = 'Clear history'; }, 3000); e.target.textContent = 'Tap again to confirm'; return; }
  clearTimeout(armed); armed = 0; e.target.textContent = 'Clear history'; S.hist = []; S.best = {}; save(); renderHist(); toast('History cleared');
});
const applyTheme = () => S.theme ? document.documentElement.dataset.theme = S.theme : document.documentElement.removeAttribute('data-theme');
$('#theme').addEventListener('click', () => {
  const eff = S.theme || 'dark';
  S.theme = eff === 'dark' ? 'light' : 'dark'; save(); applyTheme();
});
function bgAnim() {
  const cv = $('#bg'), cx = cv.getContext('2d'); if (!cx) return;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches, CH = 'abcdefghijklmnopqrstuvwxyz0123456789{}[]();=+*/<>', P = [];
  let w = 0, h = 0, dpr = 1, col = '#ff9a4d';
  const mk = top => ({ x: Math.random() * w, y: top ? Math.random() * h : h + 30, s: 14 + Math.random() * 26, v: .15 + Math.random() * .45, a: .05 + Math.random() * .16, ph: Math.random() * 6.28, c: CH[Math.random() * CH.length | 0] });
  function size() {
    dpr = Math.min(2, devicePixelRatio || 1); w = innerWidth; h = innerHeight; cv.width = w * dpr; cv.height = h * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.max(18, Math.min(60, Math.round(w * h / 22000))); while (P.length < n) P.push(mk(true)); P.length = n;
    col = getComputedStyle(document.documentElement).getPropertyValue('--acc').trim() || col;
    if (still) frame(0);
  }
  function frame(t) {
    cx.clearRect(0, 0, w, h); cx.fillStyle = col;
    for (const p of P) {
      if (!still) { p.y -= p.v; if (p.y < -40) Object.assign(p, mk(false)); }
      cx.globalAlpha = p.a; cx.font = `500 ${p.s}px "IBM Plex Mono", monospace`;
      cx.fillText(p.c, p.x + Math.sin(t / 2200 + p.ph) * 14, p.y);
    }
    cx.globalAlpha = 1; if (!still) requestAnimationFrame(frame);
  }
  size(); addEventListener('resize', size); if (!still) requestAnimationFrame(frame);
  new MutationObserver(size).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}
applyTheme(); try { bgAnim(); } catch (e) {} renderHist(); reset();
})();