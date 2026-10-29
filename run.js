 (() => {
'use strict';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const API = window.TypeRunGame || { diff: () => 'normal' };
const FX = window.TypeRunFX || { burst() {}, confetti() {}, at: () => [0, 0] };
const KEY = 'typerun.games.v1';
let P = (() => { try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && typeof d === 'object') return d; } catch (e) {} return {}; })();
P.race = Object.assign({ w: 0, n: 0, best: 0 }, P.race); P.scr = P.scr || {}; P.per = P.per || {};
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) {} };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = a => a.slice().sort(() => Math.random() - .5);
const INPUT = 'autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"';
const hearts = (n, max) => '<i class="hrt"></i>'.repeat(Math.max(0, n)) + '<i class="hrt off"></i>'.repeat(Math.max(0, max - n));

const SENT = ['I like to drink a cup of tea in the morning.', 'The sun is up and the day is bright.', 'We go to school by bus every day.', 'My friend has a small red car.',
  'She reads a book before she goes to bed.', 'The dog ran across the park and jumped in the water.', 'There are many people at the market today.', 'He made a plan and wrote it on a piece of paper.',
  'The children play with a ball after lunch.', 'Birds sing in the garden when the weather is warm.', 'My mother cooks rice and fresh vegetables for dinner.', 'The shop opens at nine and closes at six.',
  'Take a deep breath and think about what you want to say.', 'A small step each day can lead to a big change.', 'The train was late, so we waited at the station.', 'Learning to type fast takes time and daily practice.'];
const HARD = ['Our team shipped version 2.4 on March 18th, three days ahead of schedule.', 'Light travels at about 299,792 kilometres per second.', 'Remember: passports, chargers, sunscreen, and $50 in small notes.',
  'We leave at 6:45 a.m. on Friday (not Saturday!) and drive 220 km.', 'Page load time dropped from 3.2 seconds to 1.1 seconds, a 66% improvement.', 'The shop opens at 9:00 and closes at 6:30; tickets cost $12 each.',
  'Proxima Centauri is 4.24 light-years away, over 40 trillion kilometres.', 'Order #4821 shipped on May 7th; expect delivery in 3-5 days.'];
// n sentences for the current difficulty; plain = keep the original capitals and punctuation on easy
const mkText = (n, plain) => {
  const d = API.diff(); let t = shuffle(d === 'hard' ? HARD : SENT).slice(0, n).join(' ');
  if (d === 'easy' && !plain) t = t.toLowerCase().replace(/[^a-z ]/g, '');
  return t;
};
// split into words so long text wraps; returns the per-character elements in order
function render(box, text) {
  box.innerHTML = text.split(' ').map((w, k, a) => '<span class="tw">' + [...w].map(c => '<i>' + esc(c) + '</i>').join('') + (k < a.length - 1 ? '<i> </i>' : '') + '</span>').join('');
  return [...box.querySelectorAll('i')];
}
const paint = (els, v, text) => els.forEach((e, i) => { e.className = i < v.length ? (v[i] === text[i] ? 'ok' : 'bad') : i === v.length ? 'cur' : ''; });
const ord = n => ['', '1st', '2nd', '3rd', '4th'][n] || n + 'th';
const blink = (el, cls) => { el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 180); };

/* ================= Typing Race ================= */
{
  const BOTS = { easy: [14, 22, 30], normal: [24, 38, 52], hard: [38, 55, 75] }, NAMES = ['Steady', 'Swift', 'Blaze'], COLORS = ['var(--acc)', '#35d49a', '#5a9bff', '#c77dff'];
  const CAR = c => `<svg class="car" viewBox="0 0 44 22" style="color:${c}" aria-hidden="true"><rect x="2" y="9" width="40" height="8" rx="3" fill="currentColor"/><path d="M11 9l4-6h13l5 6z" fill="currentColor"/><path d="M16 8l3-4h4v4zM25 8V4h3l3 4z" fill="#fff" fill-opacity=".8"/><circle cx="11" cy="17" r="4" fill="#15171f"/><circle cx="11" cy="17" r="1.6" fill="#cfd3dc"/><circle cx="33" cy="17" r="4" fill="#15171f"/><circle cx="33" cy="17" r="1.6" fill="#cfd3dc"/></svg>`;
  $('#g-race').innerHTML = `
    <div class="live gl" aria-live="off">
      <div><b class="w" id="rcPlace">-</b><span>position</span></div>
      <div><b id="rcWpm">0</b><span>words per minute</span></div>
      <div><b id="rcAcc">100%</b><span>accuracy</span></div>
      <div><b id="rcRec"></b><span>races won</span></div>
    </div>
    <div class="lanes" id="rcLanes">${['You', ...NAMES].map((n, i) => `<div class="lane${i ? '' : ' you'}"><span>${n}</span><div class="trk">${CAR(COLORS[i])}</div><span class="pc">0%</span></div>`).join('')}<div class="cdn" id="rcCd" aria-hidden="true"></div></div>
    <div class="card txtbox" id="rcBox"><div class="txt" id="rcTxt"></div><input class="tin" id="rcInp" aria-label="Type the race text" ${INPUT} disabled></div>
    <div class="bar"><p class="gstat" id="rcMsg" role="status"></p><button class="btn" id="rcGo">Start race</button></div>
    <p class="hint">Three bots race you at steady speeds that match the difficulty. Mistakes stop your car until you fix them.</p>`;
  const inp = $('#rcInp'), txt = $('#rcTxt'), msg = $('#rcMsg'), go = $('#rcGo'), cars = $$('#rcLanes .car'), pcs = $$('#rcLanes .pc');
  let st = 'idle', text = '', els = [], bots = [], t0 = 0, raf = 0, cd = 0, keys = 0, wrong = 0, prev = 0;
  const setPos = (i, p) => { cars[i].style.left = `calc(${p * 100}% - ${p * 44}px)`; pcs[i].textContent = Math.round(p * 100) + '%'; };
  const pre = v => { let i = 0; while (i < v.length && v[i] === text[i]) i++; return i; };
  const cdn = t => { const e = $('#rcCd'); e.textContent = t; e.classList.remove('pop'); void e.offsetWidth; if (t) e.classList.add('pop'); };
  const rec = () => { $('#rcRec').textContent = P.race.w + ' of ' + P.race.n; };
  function frame() {
    if (st !== 'run') return;
    const e = (performance.now() - t0) / 1000, ok = pre(inp.value), p = ok / text.length;
    setPos(0, p); bots.forEach((b, i) => setPos(i + 1, Math.min(1, e / b.ft)));
    $('#rcPlace').textContent = ord(1 + bots.filter(b => e / b.ft > p).length);
    $('#rcWpm').textContent = e > 1 ? Math.round(ok / 5 / (e / 60)) : 0;
    $('#rcAcc').textContent = (keys ? Math.round((keys - wrong) / keys * 100) : 100) + '%';
    raf = requestAnimationFrame(frame);
  }
  function idle() {
    clearInterval(cd); cancelAnimationFrame(raf); cdn(''); st = 'idle'; inp.disabled = true; inp.value = ''; els = [];
    txt.textContent = 'Press Start race. When the countdown ends, type the text before the bots reach the finish line.';
    for (let i = 0; i < 4; i++) setPos(i, 0);
    $('#rcPlace').textContent = '-'; $('#rcWpm').textContent = '0'; $('#rcAcc').textContent = '100%';
    go.textContent = 'Start race'; msg.textContent = ''; rec();
  }
  function begin() {
    text = mkText(3, true); els = render(txt, text); paint(els, '', text);
    bots = BOTS[API.diff()].map(w => ({ ft: text.length * 12 / (w * (.92 + Math.random() * .16)) }));
    inp.value = ''; inp.maxLength = text.length; prev = keys = wrong = 0;
    for (let i = 0; i < 4; i++) setPos(i, 0);
    st = 'count'; go.textContent = 'Quit race'; let n = 3; msg.textContent = 'Get ready'; cdn(3);
    cd = setInterval(() => {
      if (--n > 0) { cdn(n); return; }
      clearInterval(cd); msg.textContent = 'Go!'; cdn('GO!'); st = 'run'; inp.disabled = false; inp.focus(); t0 = performance.now(); raf = requestAnimationFrame(frame);
    }, 800);
  }
  function finish() {
    st = 'done'; cancelAnimationFrame(raf); inp.disabled = true;
    const e = (performance.now() - t0) / 1000, place = 1 + bots.filter(b => b.ft < e).length, wpm = Math.round(text.length / 5 / (e / 60));
    setPos(0, 1); bots.forEach((b, i) => setPos(i + 1, Math.min(1, e / b.ft)));
    P.race.n++; if (place === 1) P.race.w++; const pb = wpm > P.race.best; if (pb) P.race.best = wpm; save(); rec();
    $('#rcPlace').textContent = ord(place); $('#rcWpm').textContent = wpm;
    if (place === 1) { const [x, y] = FX.at($('#rcLanes')); FX.confetti(x, y); }
    msg.textContent = (place === 1 ? 'You won the race! ' : 'You finished ' + ord(place) + '. ') + wpm + ' WPM' + (pb ? ', your fastest race yet.' : '.');
    go.textContent = 'Race again';
  }
  inp.addEventListener('input', () => {
    if (st !== 'run') return;
    const v = inp.value; for (let i = prev; i < v.length; i++) { keys++; if (v[i] !== text[i]) wrong++; }
    prev = v.length; paint(els, v, text); if (v === text) finish();
  });
  ['paste', 'drop', 'cut'].forEach(ev => inp.addEventListener(ev, e => e.preventDefault()));
  $('#rcBox').addEventListener('click', () => { if (st === 'run') inp.focus(); });
  go.addEventListener('click', () => { if (st === 'idle' || st === 'done') begin(); else idle(); });
  document.addEventListener('tr:stop', idle); document.addEventListener('tr:diff', idle);
  idle();
}

/* ================= Word Scramble ================= */
{
  const WORDS = ('moon star wind fire leaf rain rock sand lamp bird door ship nest snow gold bell kite drum farm mint rope tide vine wolf yarn cave dust ' +
    'cloud river stone light storm plant bread chair dream flame grape honey ocean pearl quiet shine tiger voice water zebra ' +
    'bridge candle forest garden island jungle kitten ladder market orange planet rocket silver window yellow anchor breeze ' +
    'lantern journey kingdom library morning network painter rainbow harvest balloon compass diamond evening factory giraffe horizon blanket cabinet thunder ' +
    'mountain keyboard sunshine elephant festival gardener notebook umbrella triangle treasure ' +
    'adventure butterfly chocolate discovery landscape moonlight pineapple telescope waterfall wonderful whirlwind yesterday fireworks orchestra ' +
    'strawberry television understand playground basketball chandelier motorcycle generation').split(' ');
  const RANGE = { easy: [4, 5], normal: [5, 7], hard: [7, 10] }, TIME = 60, SKIP = 3, MAX_SKIPS = 2, WT = { easy: 12, normal: 9, hard: 7 };
  $('#g-scramble').innerHTML = `
    <div class="live gl" aria-live="off">
      <div><b class="w" id="scScore">0</b><span>score</span></div>
      <div><b id="scTime">${TIME}</b><span>seconds left</span></div>
      <div><b id="scStreak">0</b><span>words in a row</span></div>
      <div><b id="scSolved">0</b><span>words solved</span></div>
      <div><b id="scWT">-</b><span>seconds for this word</span></div>
    </div>
    <div class="card">
      <div class="tbar" aria-hidden="true"><i id="scBar"></i></div>
      <div class="scw" id="scWord" role="img" aria-label="Scrambled letters appear here"></div>
      <input class="sin" id="scInp" aria-label="Type the unscrambled word" ${INPUT} disabled>
      <div class="bar" style="margin-top:.8rem"><span class="gbest" id="scBest"></span><span class="seg"><button class="ghost" id="scSkip" disabled>Skip (${MAX_SKIPS} left)</button><button class="btn" id="scGo">Start</button></span></div>
    </div>
    <p class="gstat" id="scMsg" role="status"></p>
    <p class="hint">Unscramble as many words as you can in ${TIME} seconds. You can skip only ${MAX_SKIPS} words per game. A correct word moves on by itself. Longer words and streaks score more.</p>`;
  const inp = $('#scInp'), msg = $('#scMsg'), go = $('#scGo'), skip = $('#scSkip');
  let st = 'idle', cur = '', last = '', score = 0, solved = 0, streak = 0, end = 0, timer = 0, wEnd = 0, skipsLeft = MAX_SKIPS;
  const skipUI = () => { skip.textContent = 'Skip (' + skipsLeft + ' left)'; skip.disabled = st !== 'run' || skipsLeft <= 0; };
  const best = () => { $('#scBest').textContent = 'Best score on ' + API.diff() + ': ' + (P.scr[API.diff()] || '-'); };
  const bar = p => { const b = $('#scBar'); b.style.width = Math.max(0, Math.min(100, p)) + '%'; b.classList.toggle('low', p <= 16.7); };
  const hud = () => { $('#scScore').textContent = score; $('#scSolved').textContent = solved; $('#scStreak').textContent = streak; };
  function next() {
    const [lo, hi] = RANGE[API.diff()], pool = WORDS.filter(w => w.length >= lo && w.length <= hi && w !== last);
    cur = last = pool[Math.random() * pool.length | 0];
    let s = cur; for (let i = 0; i < 30 && s === cur; i++) s = shuffle([...cur]).join('');
    $('#scWord').innerHTML = [...s].map((c, i) => '<i style="--i:' + i + '">' + c + '</i>').join(''); $('#scWord').setAttribute('aria-label', 'Scrambled letters: ' + [...s].join(' '));
    inp.value = ''; inp.maxLength = cur.length + 6;
    wEnd = Date.now() + WT[API.diff()] * 1000; $('#scWT').textContent = WT[API.diff()];   // fresh timer for every new word (also after Skip)
  }
  function stop(text) {
    clearInterval(timer); st = 'idle'; inp.disabled = true; skipUI(); go.textContent = 'Play again'; msg.textContent = text || ''; best();
  }
  function over() {
    const d = API.diff(), pb = score > (P.scr[d] || 0); if (pb) { P.scr[d] = score; save(); }
    stop('Time is up. You solved ' + solved + ' words and scored ' + score + (pb ? ', a new best.' : '.')); $('#scTime').textContent = 0;
  }
  function begin() {
    score = solved = streak = 0; hud(); bar(100); st = 'run'; end = Date.now() + TIME * 1000; msg.textContent = '';
    skipsLeft = MAX_SKIPS; inp.disabled = false; skipUI(); go.textContent = 'Quit'; next(); inp.focus();
    timer = setInterval(() => { const l = Math.ceil((end - Date.now()) / 1000); bar((end - Date.now()) / (TIME * 10)); $('#scTime').textContent = Math.max(0, l); if (l <= 0) { over(); return; }
      const wl = Math.ceil((wEnd - Date.now()) / 1000); $('#scWT').textContent = Math.max(0, wl);
      if (wl <= 0) { streak = 0; hud(); blink($('#scWord'), 'bad'); next(); } }, 100);
  }
  function reset() { stop(''); score = solved = streak = 0; hud(); bar(100); $('#scTime').textContent = TIME; $('#scWT').textContent = '-'; skipsLeft = MAX_SKIPS; skipUI(); go.textContent = 'Start'; $('#scWord').innerHTML = '<i>?</i><i>?</i><i>?</i><i>?</i>'; }
  inp.addEventListener('input', () => {
    if (st !== 'run') return;
    const v = inp.value.trim().toLowerCase();
    if (v === cur) { score += cur.length * 10 + 10 * Math.min(streak, 5); solved++; streak++; hud(); { const [x, y] = FX.at($('#scWord')); FX.burst(x, y, { n: 18 + cur.length * 3, speed: 260 }); } blink($('#scWord'), 'good'); next(); }
    else if (v.length >= cur.length) { streak = 0; hud(); blink(inp, 'err'); blink($('#scWord'), 'bad'); inp.value = ''; }
  });
  skip.addEventListener('click', () => { if (st !== 'run' || skipsLeft <= 0) return; skipsLeft--; streak = 0; end -= SKIP * 1000; hud(); skipUI(); next(); inp.value = ''; inp.focus(); });  // next() gives the new word a full fresh timer
  go.addEventListener('click', () => { if (st === 'run') reset(); else begin(); });
  document.addEventListener('tr:stop', reset); document.addEventListener('tr:diff', () => { reset(); best(); });
  reset(); best();
}

/* ================= Perfect Run ================= */
{
  const LIVES = { easy: 3, normal: 2, hard: 1 };
  $('#g-perfect').innerHTML = `
    <div class="live gl" aria-live="off">
      <div><b class="w" id="pfChars">0</b><span>perfect characters</span></div>
      <div><b class="hearts" id="pfLives"></b><span>mistakes allowed</span></div>
      <div><b id="pfWpm">0</b><span>words per minute</span></div>
      <div><b id="pfBest">-</b><span>best run (characters)</span></div>
    </div>
    <div class="card txtbox" id="pfBox"><div class="txt" id="pfTxt"></div><input class="tin" id="pfInp" aria-label="Type the text without mistakes" ${INPUT} disabled></div>
    <div class="bar"><p class="gstat" id="pfMsg" role="status"></p><button class="btn" id="pfGo">Start run</button></div>
    <p class="hint">Type as far as you can without making mistakes. A wrong key costs one mistake and the run ends when you run out. Easy uses lowercase text, Hard adds numbers and symbols.</p>`;
  const inp = $('#pfInp'), txt = $('#pfTxt'), msg = $('#pfMsg'), go = $('#pfGo'), box = $('#pfBox');
  let st = 'idle', text = '', els = [], prev = 0, done = 0, lives = 0, t0 = 0, lastMs = 0;
  const total = () => done + prev;
  function hud() {
    $('#pfChars').textContent = total(); $('#pfLives').innerHTML = hearts(lives, LIVES[API.diff()]);
    const heat = Math.min(1, total() / 150); box.style.boxShadow = heat > 0.02 ? `0 0 ${Math.round(heat * 32)}px ${Math.round(heat * 8)}px color-mix(in srgb,var(--acc) ${Math.round(20 + heat * 50)}%,transparent)` : '';
    const m = (Date.now() - t0) / 60000; $('#pfWpm').textContent = t0 && m > 0.03 ? Math.round(total() / 5 / m) : 0;
    $('#pfBest').textContent = P.per[API.diff()] || '-';
  }
  function load() { text = mkText(2); els = render(txt, text); inp.value = ''; inp.maxLength = text.length; prev = 0; paint(els, '', text); }
  function idle() {
    st = 'idle'; inp.disabled = true; inp.value = ''; done = prev = 0; t0 = 0; lives = LIVES[API.diff()]; els = [];
    txt.textContent = 'Press Start run, then type the text. The clock starts with your first key.'; go.textContent = 'Start run'; msg.textContent = ''; hud();
  }
  function begin() { done = 0; t0 = 0; lastMs = 0; lives = LIVES[API.diff()]; st = 'run'; load(); inp.disabled = false; inp.focus(); go.textContent = 'End run'; msg.textContent = ''; hud(); }
  function end() {
    st = 'done'; inp.disabled = true; const n = total(), d = API.diff(), pb = n > (P.per[d] || 0);
    if (pb) { P.per[d] = n; save(); }
    msg.textContent = 'Run over: ' + n + ' perfect characters at ' + $('#pfWpm').textContent + ' WPM' + (pb ? ', a new best.' : '.'); go.textContent = 'Try again'; hud();
  }
  inp.addEventListener('input', () => {
    if (st !== 'run') return;
    let v = inp.value;
    if (v.length > prev) {
      if (!t0) t0 = Date.now();
      for (let i = prev; i < v.length; i++) if (v[i] !== text[i]) { lives--; blink(box, 'err'); { const [x, y] = FX.at(box); FX.burst(x, y + 20, { n: 16, speed: 200, colors: ['#ff7b7b', '#ffb36b'] }); } v = v.slice(0, i); inp.value = v; break; }
    }
    prev = v.length; paint(els, v, text); hud();
    { const t = total(); if (t && t % 50 === 0 && t !== lastMs) { lastMs = t; const [x, y] = FX.at(box); FX.burst(x, y, { n: 26, speed: 260, colors: ['#ffd24d', '#ff9a4d', '#ffffff'] }); } }
    if (lives <= 0) return end();
    if (v.length === text.length) { done += text.length + 1; load(); hud(); }
  });
  ['paste', 'drop', 'cut'].forEach(ev => inp.addEventListener(ev, e => e.preventDefault()));
  box.addEventListener('click', () => { if (st === 'run') inp.focus(); });
  go.addEventListener('click', () => { if (st === 'run') end(); else begin(); });
  document.addEventListener('tr:stop', idle); document.addEventListener('tr:diff', idle);
  idle();
}
})();