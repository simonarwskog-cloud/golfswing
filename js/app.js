// GolfSwing – appens skärmar och flöden.
import { store } from './store.js';
import { loadPose, trackVideo, seekTo, FPS } from './pose.js';
import { analyzeSwing } from './analysis.js';
import { drawOverlay, snapshot } from './draw.js';
import { drawModel } from './model.js';
import { trackClub } from './club.js';
import { FAULTS, CHANGES, PHASE_NAMES, PHASE_TIPS, GOOD, DRILLS, sides, say, scoreLabel, coachMessage, planFor } from './coach.js';

const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);
const SCREENS = ['welcome', 'home', 'analyzing', 'result', 'progress', 'training'];
const ERRORS = {
  video: 'Videon kunde inte öppnas. Prova en annan video.',
  nobody: 'Vi kunde inte se din kropp tydligt. Se till att hela kroppen syns och att det är ljust.',
  noswing: 'Vi hittade ingen hel sving i videon. Filma en hel sving – från uppställning till avslut – i vanlig hastighet.',
  model: 'Analysen kunde inte starta. Kontrollera att du har internet och försök igen.',
};
const PHASE_S = { address: 0, top: 1, down: 1.5, impact: 2, finish: 3 }; // var gubben står i varje del av svingen

const video = $('#video');
const canvas = $('#overlay');
const ctx = canvas.getContext('2d');
const player = $('#player');
const modelCanvas = $('#model');

let current = null; // { frames, res } för svingen i spelaren
let shown = null;   // resultatet som visas just nu
let runId = 0;      // ökar för varje ny analys så att en avbruten analys slutar
let playing = null; // { rate, end, t, last } medan svingen spelas upp
let raf = 0;
let modelS = 1;     // var i svingen gubben står
let framed = null;  // { z, x0, y0, place }: inzoomning på golfaren och var gubben ska stå

// ---------- Navigering ----------
function show(name) {
  for (const s of SCREENS) $(`#screen-${s}`).hidden = s !== name;
  $('#tabbar').hidden = name === 'welcome' || name === 'analyzing';
  $('#btn-settings').hidden = name === 'analyzing';
  $$('#tabbar button').forEach(b => b.classList.toggle('active', b.dataset.go === name));
  if (name !== 'result') stopPlayback();
  if (name === 'home') renderHome();
  if (name === 'progress') renderProgress();
  if (name === 'training') renderTraining();
  window.scrollTo(0, 0);
}

document.addEventListener('click', e => {
  const go = e.target.closest('[data-go]');
  if (go) show(go.dataset.go);
});

$('#level-buttons').addEventListener('click', e => {
  const b = e.target.closest('[data-level]');
  if (!b) return;
  store.setLevel(b.dataset.level);
  show('home');
});

$('#btn-settings').addEventListener('click', () => {
  $$('[data-level]').forEach(b => b.classList.toggle('selected', b.dataset.level === store.level));
  show('welcome');
});

// ---------- Installera på hemskärmen ----------
let installEvent = null; // Android/Chrome: webbläsarens egen installationsruta
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  installEvent = e;
  renderInstall();
});
window.addEventListener('appinstalled', () => { installEvent = null; renderInstall(); });

function renderInstall() {
  const installed = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  $('#install-card').hidden = installed || (!installEvent && !ios);
  $('#btn-install').hidden = !installEvent;
  $('#install-text').innerHTML = ios
    ? 'Tryck på <b>Dela</b>-knappen längst ner i Safari och välj <b>Lägg till på hemskärmen</b>. Då öppnas GolfSwing som en vanlig app.'
    : 'Installera appen så ligger den bland dina andra appar och öppnas i helskärm.';
}

$('#btn-install').addEventListener('click', async () => {
  if (!installEvent) return;
  installEvent.prompt();
  await installEvent.userChoice;
  installEvent = null;
  renderInstall();
});

function renderHome() {
  renderInstall();
  $('#home-coach-text').textContent = coachMessage(store.history);
  const last = store.history[0];
  $('#home-last').hidden = !last;
  if (last) {
    $('#home-last').innerHTML = `
      ${last.thumb ? `<img src="${last.thumb}" alt="">` : ''}
      <div class="li-main">
        <b>Din senaste sving</b>
        <div class="li-date">${FAULTS[last.faults[0]?.id]?.title || 'Inga tydliga fel'} · ${formatDate(last.date)}</div>
      </div>
      <div class="li-score">${last.score}</div>`;
  }
}

$('#home-last').addEventListener('click', () => {
  if (store.history[0]) showResult(store.history[0], false);
});

// ---------- Filma / välj video ----------
for (const [button, input] of [['#btn-film', '#file-camera'], ['#btn-pick', '#file-library']]) {
  $(button).addEventListener('click', () => {
    loadPose().catch(() => {}); // börja ladda AI-modellen medan användaren filmar
    $(input).click();
  });
  $(input).addEventListener('change', e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (file) analyze(file);
  });
}

$('#btn-cancel').addEventListener('click', () => {
  runId++;
  show('home');
});

function progress(p, text) {
  $('#an-bar').style.width = `${Math.round(p * 100)}%`;
  $('#an-text').textContent = text;
}

function showError(key, run) {
  if (run !== runId) return;
  show('home');
  const box = $('#home-error');
  box.textContent = ERRORS[key] || ERRORS.video;
  box.hidden = false;
}

function waitForData(el) {
  return new Promise((resolve, reject) => {
    if (el.readyState >= 2) return resolve();
    const ok = () => { done(); resolve(); };
    const fail = () => { done(); reject(new Error('video')); };
    const done = () => { el.removeEventListener('loadeddata', ok); el.removeEventListener('error', fail); };
    el.addEventListener('loadeddata', ok);
    el.addEventListener('error', fail);
  });
}

function placePlayer(slot) {
  $(slot).appendChild(player);
  player.hidden = false;
  if (slot === '#player-slot-an') applyZoom(null);
  const ar = video.videoWidth / video.videoHeight || 9 / 16;
  player.style.aspectRatio = String(ar);
  player.style.width = slot === '#player-slot-an' ? `min(100%, calc(60vh * ${ar}))` : '100%';
  if (video.videoWidth) {
    const k = Math.min(1, 720 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * k);
    canvas.height = Math.round(video.videoHeight * k);
  }
}

async function analyze(file) {
  const run = ++runId;
  const stale = () => run !== runId;
  current = null;
  $('#home-error').hidden = true;
  progress(0, 'Laddar videon…');
  show('analyzing');

  if (video.src) URL.revokeObjectURL(video.src);
  video.src = URL.createObjectURL(file);
  video.load();
  video.play().then(() => video.pause()).catch(() => {}); // iPhone laddar inte bilderna annars
  placePlayer('#player-slot-an');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  try { await waitForData(video); } catch { return showError('video', run); }
  if (stale()) return;
  placePlayer('#player-slot-an');

  progress(0.02, 'Startar AI-tränaren…');
  try { await loadPose(); } catch { return showError('model', run); }
  if (stale()) return;

  let frames;
  try {
    frames = await trackVideo(video, {
      isCancelled: stale,
      onProgress: p => progress(0.04 + p * 0.94, p < 0.3 ? 'Letar efter din sving…' : p < 0.65 ? 'Följer din sving…' : 'Mäter dina rörelser…'),
      onFrame: f => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawOverlay(ctx, f.lm);
      },
    });
  } catch { return showError('video', run); }
  if (!frames || stale()) return;

  const res = analyzeSwing(frames, video.videoWidth, video.videoHeight);
  if (!res.ok) return showError(res.reason, run);

  const top = res.phases.top;
  await seekTo(video, frames[top].t);
  if (stale()) return;
  res.club = trackClub(frames, res); // klubbhuvudets bana, eller null om klubban inte syns tillräckligt
  for (const f of frames) delete f.gray;
  current = { frames, res };
  framed = framing();
  const entry = {
    id: Date.now(),
    date: new Date().toISOString(),
    score: res.score, view: res.view, righty: res.righty, tempo: res.tempo,
    faults: res.faults, goods: res.goods, pro: res.pro,
    aspect: video.videoWidth / video.videoHeight,
    place: framed.place,
    club: !!res.club,
    thumb: snapshot(video, frames[top].lm, res.path, res.phases, top, framed, res.club),
  };
  store.addResult(entry);
  showResult(entry, true);
}

// ---------- Resultat ----------
const formatDate = iso => new Date(iso).toLocaleDateString('sv-SE', { day: 'numeric', month: 'long' });

function drillHtml(id) {
  const d = DRILLS[id];
  return `<div class="drill">
    <div class="drill-title">Övning: ${d.title}</div>
    <div class="muted">${d.why} · ${d.reps}</div>
    <ol>${d.steps.map(s => `<li>${s}</li>`).join('')}</ol>
  </div>`;
}

function showResult(entry, live) {
  shown = entry;
  const level = store.level || 'medel';
  const s = sides(entry.righty);
  const c = f => ({ v: f.value, s });
  const faults = entry.faults.filter(f => FAULTS[f.id] && CHANGES[f.id]);

  $('#player-controls').hidden = !live;
  $('#res-thumb').hidden = live || !entry.thumb;
  if (live) {
    placePlayer('#player-slot-res');
    framed = framing();
    applyZoom(framed);
  } else {
    stopPlayback();
    player.hidden = true;
    current = null;
    framed = entry.place ? { z: 1, place: entry.place } : null; // bilden är redan inzoomad
    if (entry.thumb) $('#res-thumb').src = entry.thumb;
  }
  const ar = (live ? video.videoWidth / video.videoHeight : entry.aspect) || 9 / 16;
  $('#compare').classList.toggle('stacked', ar >= 1);
  $('#model-box').style.aspectRatio = String(ar);

  $('#res-ring').style.setProperty('--p', entry.score);
  $('#res-score').textContent = entry.score;
  $('#res-label').textContent = scoreLabel(entry.score);
  $('#res-view').textContent = `${entry.view === 'face' ? 'Filmad framifrån' : 'Filmad bakifrån'} · ${formatDate(entry.date)}`;
  $('#legend-text').textContent = entry.club
    ? 'Den tjocka linjen följer klubbhuvudet. Den tunna vita linjen är dina händer.'
    : 'Linjen följer dina händer – klubbhuvudet syntes inte tydligt nog i videon.';

  // Det här ska du ändra – i ord, viktigast först
  const changes = faults.slice(0, level === 'ny' ? 2 : 3);
  const changesEl = $('#res-changes');
  changesEl.className = `card ${changes.length ? 'card-focus' : 'card-good'}`;
  changesEl.innerHTML = changes.length
    ? `<h3>Det här ska du ändra</h3>
      <p class="muted small" style="margin:-6px 0 14px">Börja med nummer 1. Ta en sak i taget – när den sitter går du vidare.</p>
      <ol class="change-list">${changes.map((f, i) => {
        const ch = CHANGES[f.id];
        const body = `
          <div class="explain">
            <div class="ex-label">Det här gör du nu</div>
            <p>${say(ch.what, c(f))}</p>
            <div class="ex-label">Därför blir det fel</div>
            <p>${say(ch.why, c(f))}</p>
            <div class="ex-label">Så rättar du det – steg för steg</div>
            <ol class="fix-steps">${say(ch.steps, c(f)).map(t => `<li>${t}</li>`).join('')}</ol>
            <div class="feel"><b>Så ska det kännas:</b> ${say(ch.feel, c(f))}</div>
            <div class="ex-label">Så vet du att det blev rätt</div>
            <p>${say(ch.check, c(f))}</p>
            ${level !== 'ny' ? `<p class="why">Uppmätt: ${FAULTS[f.id].detail(c(f))}</p>` : ''}
            <button class="link-btn" data-show="${ch.phase}">Visa skillnaden mot gubben</button>
          </div>`;
        return `<li><b>${FAULTS[f.id].title}</b>${i === 0 ? body
          : `<details class="more"><summary>Visa hur du rättar det</summary>${body}</details>`}</li>`;
      }).join('')}
      </ol>`
    : `<div class="tag">Snyggt!</div>
      <p class="fault-title">Inget tydligt att ändra</p>
      <ul class="tips"><li>Din sving liknar den perfekta.</li><li>Fortsätt med grundövningarna så håller du den i form.</li></ul>`;

  const [main] = faults;
  $('#res-main').innerHTML = main
    ? `<div class="tag">Övning för nummer 1</div>${drillHtml(FAULTS[main.id].drill)}`
    : `<div class="tag">Håll svingen i form</div>${drillHtml('finish3')}`;

  const goods = entry.goods.filter(g => GOOD[g]).slice(0, level === 'ny' ? 1 : 3);
  $('#res-good').hidden = !goods.length;
  $('#res-good').innerHTML = `<div class="tag">Det här gör du bra</div>
    <ul class="good-list">${goods.map(g => `<li>${GOOD[g]}</li>`).join('')}</ul>`;

  $('#res-pro').innerHTML = '<div class="h">Mätning</div><div class="h you">Du</div><div class="h target">Proffs</div>' +
    entry.pro.map(r => `<div>${r.label}</div><div class="you ${r.ok ? 'ok' : 'bad'}">${r.ok ? '✓' : '✗'} ${r.you}</div><div class="target">${r.target}</div>`).join('');
  $('#res-pro-card').open = level === 'erfaren';

  show('result');
  // börja där skillnaden syns tydligast (en sparad sving har bara bilden från toppen)
  goToPhase(live && main ? CHANGES[main.id].phase : 'top');
}

$('#res-changes').addEventListener('click', e => {
  const b = e.target.closest('[data-show]');
  if (!b) return;
  goToPhase(b.dataset.show);
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ---------- Din video och gubben ----------
// Zooma in på golfaren och ställ gubben i samma storlek och på samma ställe som golfaren i uppställningen
function framing() {
  const { frames, res } = current;
  const ar = video.videoWidth / video.videoHeight || 9 / 16;
  let x0 = 1, x1 = 0, y0 = 1, y1 = 0;
  for (let i = res.phases.address; i <= res.phases.finish; i++) {
    const lm = frames[i].lm;
    if (!lm) continue;
    for (const j of [0, 11, 12, 15, 16, 23, 24, 27, 28]) {
      x0 = Math.min(x0, lm[j].x); x1 = Math.max(x1, lm[j].x);
      y0 = Math.min(y0, lm[j].y); y1 = Math.max(y1, lm[j].y);
    }
  }
  const tall = y1 - y0;
  const padX = (tall * 0.3) / ar; // klubban sticker ut åt sidorna
  let rx0 = x0 - padX, rx1 = x1 + padX, ry0 = y0 - tall * 0.35, ry1 = y1 + tall * 0.1;
  // klubbhuvudets bana ska också synas hela vägen
  for (const p of res.club || []) {
    if (!p) continue;
    rx0 = Math.min(rx0, p.x - 0.03); rx1 = Math.max(rx1, p.x + 0.03);
    ry0 = Math.min(ry0, p.y - 0.03); ry1 = Math.max(ry1, p.y + 0.03);
  }
  const z = Math.min(2.5, Math.max(1, 1 / Math.max(rx1 - rx0, ry1 - ry0)));
  const side = 1 / z;
  const inside = v => Math.min(1 - side, Math.max(0, v));
  const zx = inside((rx0 + rx1) / 2 - side / 2);
  const zy = inside((ry0 + ry1) / 2 - side / 2);
  const lm = frames[res.phases.address].lm || frames.find(f => f.lm).lm;
  const ankle = (lm[27].y + lm[28].y) / 2;
  return {
    z, x0: zx, y0: zy,
    place: { x: ((lm[23].x + lm[24].x) / 2 - zx) * z, ground: (ankle - zy) * z, height: (ankle - lm[0].y) * z },
    // samma sak i hela videobilden (för gubben ovanpå videon, som zoomas tillsammans med videon)
    placeVideo: { x: (lm[23].x + lm[24].x) / 2, ground: ankle, height: ankle - lm[0].y },
  };
}

// Gubben genomskinlig ovanpå din video – sparas så att valet finns kvar nästa gång
let ghostOn = false;
try { ghostOn = localStorage.getItem('golfswing.ghost') === '1'; } catch {}
function setGhost(on) {
  ghostOn = on;
  try { localStorage.setItem('golfswing.ghost', on ? '1' : '0'); } catch {}
  $('#btn-ghost').setAttribute('aria-pressed', String(on));
  redrawModel();
}
$('#btn-ghost').addEventListener('click', () => setGhost(!ghostOn));

function applyZoom(f) {
  $('#zoom').style.transform = f && f.z > 1 ? `scale(${f.z}) translate(${-f.x0 * 100}%, ${-f.y0 * 100}%)` : '';
}

function redrawModel() {
  if (shown) drawModel(modelCanvas, modelS, shown.view, shown.righty, framed?.place, shown.club ? 'club' : 'hands');
  const ghost = $('#ghost');
  ghost.hidden = !(ghostOn && current && framed?.placeVideo);
  if (!ghost.hidden) drawModel(ghost, modelS, shown.view, shown.righty, framed.placeVideo, 'hands', true);
}

function setCaption(phase) {
  const fault = shown?.faults.find(f => CHANGES[f.id]?.phase === phase);
  $('#compare-text').innerHTML =
    (fault ? `<div class="diff"><b>Skillnaden</b><p>${CHANGES[fault.id].look}</p></div>` : '') +
    `<b>${PHASE_NAMES[phase]} – så gör gubben:</b><ul>${PHASE_TIPS[phase].map(t => `<li>${t}</li>`).join('')}</ul>`;
}

// Gubben träffar bollen samtidigt som du, men med perfekt tempo (baksvingen tar 3 gånger så lång tid som nedsvingen)
function idealS(time) {
  const { frames, res } = current;
  const at = name => frames[res.phases[name]].t;
  const start = at('address'), hit = at('impact'), end = at('finish');
  const top = start + 0.75 * (hit - start);
  if (time <= start) return 0;
  if (time <= top) return (time - start) / (top - start);
  if (time <= hit) return 1 + (time - top) / (hit - top);
  return Math.min(3, 2 + (time - hit) / ((end - hit) || 1));
}

function drawAt(time, s = idealS(time)) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!current) return;
  const { frames, res } = current;
  const i = Math.max(0, Math.min(frames.length - 1, Math.round((time - frames[0].t) * FPS)));
  const analyzed = time >= frames[0].t - 0.05 && time <= frames[frames.length - 1].t + 0.05;
  drawOverlay(ctx, analyzed ? frames[i].lm : null, res.path, res.phases, i, framed?.z || 1, res.club);
  modelS = s;
  redrawModel();
  const { start, end } = swingWindow();
  $('#scrub').value = String(Math.round(((time - start) / (end - start || 1)) * 1000));
}

// När du spolar står gubben i samma del av svingen som du (inte i perfekt tempo)
const PHASE_ORDER = ['address', 'top', 'down', 'impact', 'finish'];
function phaseS(time) {
  const { frames, res } = current;
  const times = PHASE_ORDER.map(name => frames[res.phases[name]].t);
  if (time <= times[0]) return 0;
  for (let k = 1; k < times.length; k++) {
    if (time <= times[k]) {
      const a = PHASE_S[PHASE_ORDER[k - 1]], b = PHASE_S[PHASE_ORDER[k]];
      return a + ((b - a) * (time - times[k - 1])) / (times[k] - times[k - 1] || 1);
    }
  }
  return 3;
}

let scrubTo = null, scrubbing = false;
$('#scrub').addEventListener('input', async e => {
  if (!current) return;
  if (playing) stopPlayback();
  const { start, end } = swingWindow();
  scrubTo = start + (Number(e.target.value) / 1000) * (end - start);
  if (scrubbing) return; // vi ritar bara senaste läget, så det inte laggar
  scrubbing = true;
  while (scrubTo != null) {
    const t = scrubTo;
    scrubTo = null;
    await seekTo(video, t);
    const s = phaseS(t);
    drawAt(t, s);
    const near = PHASE_ORDER.reduce((x, y) => (Math.abs(PHASE_S[y] - s) < Math.abs(PHASE_S[x] - s) ? y : x));
    $$('#phase-chips .chip').forEach(chip => chip.classList.toggle('active', chip.dataset.phase === near));
    setCaption(near);
  }
  scrubbing = false;
});

async function goToPhase(name) {
  stopPlayback();
  $$('#phase-chips .chip').forEach(chip => chip.classList.toggle('active', chip.dataset.phase === name));
  setCaption(name);
  modelS = PHASE_S[name];
  if (!current) return redrawModel();
  const t = current.frames[current.res.phases[name]].t;
  await seekTo(video, t);
  if (!playing) drawAt(t, PHASE_S[name]);
}

$('#phase-chips').addEventListener('click', e => {
  const chip = e.target.closest('[data-phase]');
  if (chip) goToPhase(chip.dataset.phase);
});

function swingWindow() {
  const { frames, res } = current;
  const at = name => frames[res.phases[name]].t;
  return {
    start: Math.max(frames[0].t, at('address') - 0.4),
    end: Math.min(frames[frames.length - 1].t, at('finish') + 0.5),
  };
}

function setButtons() {
  $('#icon-play').hidden = !!playing;
  $('#icon-pause').hidden = !playing;
  $('#btn-play').setAttribute('aria-label', playing ? 'Pausa' : 'Spela');
}

function stopPlayback() {
  playing = null;
  video.pause();
  cancelAnimationFrame(raf);
  setButtons();
}

const speed = () => Number($('#speed').value) / 100;

function showSpeed() {
  $('#speed-label').textContent = speed() === 1 ? 'Normal fart' : `${Math.round(speed() * 100)} %`;
}
$('#speed').addEventListener('input', () => {
  showSpeed();
  try { localStorage.setItem('golfswing.speed', $('#speed').value); } catch {}
});
// vald hastighet finns kvar nästa gång
try { const saved = localStorage.getItem('golfswing.speed'); if (saved) $('#speed').value = saved; } catch {}
showSpeed();
$('#btn-ghost').setAttribute('aria-pressed', String(ghostOn));

// Spelar svingen om och om igen i vald hastighet. Videon stegas fram bit för bit så att
// din video och gubben alltid går i exakt samma takt – oavsett hastighet och webbläsare.
function startPlayback() {
  stopPlayback();
  const { start, end } = swingWindow();
  const from = video.currentTime > start && video.currentTime < end - 0.05 ? video.currentTime : start;
  playing = { start, end, t: from, last: performance.now(), hold: 0 };
  $$('#phase-chips .chip').forEach(chip => chip.classList.remove('active'));
  $('#compare-text').innerHTML = '<b>Gubben träffar bollen samtidigt som du – med perfekt tempo.</b><ul><li>Dra i Hastighet för att spela fortare eller långsammare.</li><li>Tryck på en del av svingen för att stanna och jämföra.</li></ul>';
  setButtons();
  raf = requestAnimationFrame(step);
}

async function step() {
  const p = playing;
  if (!p) return;
  const now = performance.now();
  if (p.hold) {
    // kort paus i avslutet innan svingen börjar om
    if (now < p.hold) { raf = requestAnimationFrame(step); return; }
    p.hold = 0;
    p.t = p.start;
  } else {
    p.t += ((now - p.last) / 1000) * speed();
  }
  p.last = now;
  if (p.t >= p.end) {
    p.t = p.end;
    p.hold = now + 800;
  }
  await seekTo(video, p.t);
  if (playing !== p) return;
  drawAt(p.t);
  raf = requestAnimationFrame(step);
}

$('#btn-play').addEventListener('click', () => {
  if (!current) return;
  if (playing) stopPlayback();
  else startPlayback();
});

window.addEventListener('resize', () => {
  if (!$('#screen-result').hidden) redrawModel();
});

// ---------- Min utveckling ----------
function chartSvg(items) {
  const W = 320, H = 150, pad = 26;
  const x = i => pad + (i * (W - 2 * pad)) / (items.length - 1);
  const y = v => H - pad - (v / 100) * (H - 2 * pad);
  const last = items[items.length - 1];
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Svingpoäng över tid">
    ${[0, 50, 100].map(v => `<line x1="${pad}" x2="${W - pad}" y1="${y(v)}" y2="${y(v)}" stroke="currentColor" opacity=".15"/>
      <text x="0" y="${y(v) + 4}" font-size="11" fill="currentColor" opacity=".6">${v}</text>`).join('')}
    <polyline points="${items.map((e, i) => `${x(i)},${y(e.score)}`).join(' ')}" style="fill:none;stroke:var(--green);stroke-width:3;stroke-linejoin:round"/>
    ${items.map((e, i) => `<circle cx="${x(i)}" cy="${y(e.score)}" r="5" style="fill:var(--green)"/>`).join('')}
    <text x="${x(items.length - 1)}" y="${y(last.score) - 12}" font-size="13" font-weight="700" text-anchor="end" fill="currentColor">${last.score}</text>
  </svg></div>`;
}

function renderProgress() {
  const history = store.history;
  $('#prog-coach').textContent = coachMessage(history);
  $('#prog-chart-card').hidden = history.length < 2;
  $('#prog-chart').innerHTML = history.length < 2 ? '' : chartSvg(history.slice(0, 12).reverse());
  $('#btn-clear').hidden = !history.length;
  $('#prog-list').innerHTML = !history.length
    ? '<p class="muted center">Här ser du din utveckling när du har analyserat några svingar.</p>'
    : history.map((e, i) => `
      <button class="list-item" data-entry="${i}">
        ${e.thumb ? `<img src="${e.thumb}" alt="">` : ''}
        <div class="li-main">
          <b>${FAULTS[e.faults[0]?.id]?.title || 'Inga tydliga fel'}</b>
          <div class="li-date">${formatDate(e.date)} · ${e.view === 'face' ? 'framifrån' : 'bakifrån'}</div>
        </div>
        <div class="li-score">${e.score}</div>
      </button>`).join('');
}

$('#prog-list').addEventListener('click', e => {
  const item = e.target.closest('[data-entry]');
  if (item) showResult(store.history[Number(item.dataset.entry)], false);
});

$('#btn-clear').addEventListener('click', () => {
  if (confirm('Vill du ta bort alla sparade svingar?')) {
    store.clearHistory();
    renderProgress();
  }
});

// ---------- Träning ----------
function renderTraining() {
  const plan = planFor(store.history);
  $('#train-intro').textContent = plan.personal
    ? 'Din plan bygger på dina senaste svingar. Gör övningarna 3–4 dagar i veckan.'
    : 'Grundövningar för alla golfare. Filma en sving så gör jag en plan bara för dig.';
  const days = store.daysTrainedThisWeek();
  $('#train-streak').textContent = days
    ? `Du har tränat ${days} ${days === 1 ? 'dag' : 'dagar'} den senaste veckan. Bra jobbat!`
    : 'Tryck på knappen under en övning när du har gjort den.';
  $('#train-list').innerHTML = plan.drills.map(id => {
    const d = DRILLS[id];
    const done = store.isDoneToday(id);
    return `<div class="card drill-card ${done ? 'done' : ''}">
      <p class="fault-title">${d.title}</p>
      <p class="muted">${d.why} · ${d.reps}</p>
      <ol class="steps">${d.steps.map(s => `<li>${s}</li>`).join('')}</ol>
      <button class="btn ${done ? 'btn-secondary' : 'btn-primary'}" data-drill="${id}">${done ? '✓ Klar idag' : 'Jag har gjort övningen idag'}</button>
    </div>`;
  }).join('');
}

$('#train-list').addEventListener('click', e => {
  const b = e.target.closest('[data-drill]');
  if (!b) return;
  store.toggleDone(b.dataset.drill);
  renderTraining();
});

// ---------- Start ----------
show(store.level ? 'home' : 'welcome');
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
