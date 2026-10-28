// Svinganalys: hittar svingens faser och mäter kroppens rörelser.
// Längder mäts i "bål-längder" (mitten av axlarna till mitten av höfterna, ca 50 cm),
// så det spelar ingen roll hur långt bort kameran står.
export const TORSO_CM = 50;

const IDX = { nose: 0, lEar: 7, rEar: 8, lSh: 11, rSh: 12, lWr: 15, rWr: 16, lHip: 23, rHip: 24, lAnk: 27, rAnk: 28 };

export function analyzeSwing(frames, width, height) {
  const n = frames.length;
  const seen = frames.filter(f => f.lm).length;
  if (seen < Math.max(3, n * 0.5)) return { ok: false, reason: 'nobody' };
  if (n < 20) return { ok: false, reason: 'noswing' };

  const t = frames.map(f => f.t);
  const fps = (n - 1) / ((t[n - 1] - t[0]) || 1);
  const win = sec => Math.round(sec * fps);

  const P = {};
  for (const [name, i] of Object.entries(IDX)) {
    P[name] = smooth(fillGaps(frames.map(f => (f.lm ? { x: f.lm[i].x * width, y: f.lm[i].y * height } : null))));
  }
  const hands = mid(P.lWr, P.rWr);
  const sh = mid(P.lSh, P.rSh);
  const hip = mid(P.lHip, P.rHip);
  const head = P.nose;
  const scale = median(sh.map((p, i) => dist(p, hip[i])));
  if (!(scale > 0)) return { ok: false, reason: 'nobody' };

  // Faserna hittas med händerna: högst upp = toppen, lägst efter toppen = träffen
  const speed = hands.map((p, i) => (i === 0 ? 0 : dist(p, hands[i - 1]) / scale / ((t[i] - t[i - 1]) || 1 / fps)));
  const peak = best(2, n - 3, i => speed[i]);
  const top = best(Math.max(0, peak - win(1.2)), peak, i => -hands[i].y);
  const impact = best(top, Math.min(n - 1, top + win(0.7)), i => hands[i].y);
  let a = top; // uppställningen: gå bakåt tills händerna är nere vid bollen och står still
  while (a > 0 && hands[a].y < hands[impact].y - 0.25 * scale) a--;
  while (a > 0 && speed[a] > 0.5 && top - a < win(3)) a--;
  const finish = best(impact, Math.min(n - 1, impact + win(1.5)), i => -hands[i].y);

  const back = t[top] - t[a];
  const down = t[impact] - t[top];
  const rise = (hands[a].y - hands[top].y) / scale;
  if (down < 0.08 || down > 0.8 || back < 0.25 || back > 4 || rise < 0.7) return { ok: false, reason: 'noswing' };

  // Framifrån syns axlarna breda, bakifrån ligger de nästan på varandra
  const shWidth = Math.abs(P.lSh[a].x - P.rSh[a].x) / scale;
  const hipWidth = Math.abs(P.lHip[a].x - P.rHip[a].x) / scale;
  const view = (shWidth + hipWidth) / 2 > 0.4 ? 'face' : 'dtl';

  const faults = [], goods = [], pro = [];
  const fault = (id, value, severity) => faults.push({ id, value, severity });
  const sev = (v, limit) => (v > limit * 2 ? 3 : v > limit * 1.5 ? 2 : 1);
  const cm = v => Math.round(Math.abs(v) * TORSO_CM);
  // Varje mätning får ett delbetyg 0–100: 100 när avvikelsen från det perfekta är högst "good", 0 vid "bad"
  const grades = [];
  const grade = (dev, good, bad, weight = 1) =>
    grades.push({ g: 100 * clamp(1 - (dev - good) / (bad - good), 0, 1), weight });

  const tempo = back / down;
  grade(Math.abs(tempo - 3), 0.3, 2, 1.5);
  if (tempo < 2.2) fault('tempo_fast', tempo, tempo < 1.6 ? 3 : tempo < 1.9 ? 2 : 1);
  else if (tempo > 4.5) fault('tempo_slow', tempo, tempo > 6 ? 2 : 1);
  else goods.push('tempo');
  pro.push(row('Tempo (upp : ner)', `${dec(tempo)} : 1`, '3 : 1', tempo >= 2.2 && tempo <= 4.5));

  const headDrop = (head[impact].y - head[a].y) / scale; // + = huvudet lägre i träffen
  grade(Math.abs(headDrop), 0.04, 0.3);
  if (headDrop < -0.12) fault('head_rise', -headDrop, sev(-headDrop, 0.12));
  else if (headDrop > 0.15) fault('head_dip', headDrop, sev(headDrop, 0.15));
  else goods.push('height');
  pro.push(row('Huvudets höjd i träffen', `${cm(headDrop)} cm ${headDrop < 0 ? 'upp' : 'ner'}`, 'nästan samma', headDrop >= -0.12 && headDrop <= 0.15));

  let righty;
  if (view === 'face') {
    const trailDir = Math.sign(hands[top].x - sh[top].x) || -1; // åt vilket håll händerna går i baksvingen
    const leadDir = -trailDir;
    righty = trailDir === Math.sign(P.rSh[a].x - P.lSh[a].x);

    let sway = 0;
    for (let i = a; i <= impact; i++) sway = Math.max(sway, Math.abs(head[i].x - head[a].x) / scale);
    const ahead = ((head[impact].x - head[a].x) * leadDir) / scale;
    grade(sway, 0.08, 0.5);
    grade(ahead, 0.05, 0.35);
    if (ahead > 0.15) fault('head_ahead', ahead, sev(ahead, 0.15));
    else if (sway > 0.25) fault('head_sway', sway, sev(sway, 0.25));
    else goods.push('head');
    pro.push(row('Huvudet i sidled', `${cm(sway)} cm`, 'högst ca 12 cm', sway <= 0.25 && ahead <= 0.15));

    const hipSway = ((hip[top].x - hip[a].x) * trailDir) / scale;
    grade(hipSway, 0.06, 0.4);
    if (hipSway > 0.18) fault('hip_sway', hipSway, sev(hipSway, 0.18));
    else goods.push('hips');
    pro.push(row('Höfterna glider bakåt', `${cm(Math.max(0, hipSway))} cm`, 'högst ca 9 cm', hipSway <= 0.18));

    const ankA = P.lAnk[a].x, ankB = P.rAnk[a].x;
    const leadAnk = leadDir > 0 ? Math.max(ankA, ankB) : Math.min(ankA, ankB);
    const trailAnk = leadDir > 0 ? Math.min(ankA, ankB) : Math.max(ankA, ankB);
    const shift = (hip[finish].x - trailAnk) / ((leadAnk - trailAnk) || 1);
    grade(1 - shift, 0.15, 0.7, 1.5);
    if (shift < 0.6) fault('weight_back', shift, shift < 0.3 ? 3 : shift < 0.45 ? 2 : 1);
    else goods.push('weight');
    pro.push(row('Vikt på främre foten i avslutet', `${Math.round(clamp(shift, 0, 1) * 100)} %`, 'minst 60 %', shift >= 0.6));
  } else {
    const earMid = (P.lEar[a].x + P.rEar[a].x) / 2;
    const facing = Math.sign(head[a].x - earMid) || 1; // åt vilket håll bollen ligger
    righty = facing > 0;

    const spine = i => (Math.atan2(Math.abs(sh[i].x - hip[i].x), hip[i].y - sh[i].y) * 180) / Math.PI;
    const spine0 = spine(a);
    const loss = spine0 - spine(impact);
    grade(Math.abs(spine0 - 38), 6, 25);
    grade(loss, 4, 25);
    if (spine0 < 28) fault('posture_upright', spine0, spine0 < 12 ? 3 : spine0 < 20 ? 2 : 1);
    else if (spine0 > 52) fault('posture_bent', spine0, spine0 > 65 ? 2 : 1);
    else goods.push('posture');
    pro.push(row('Framåtböjning i uppställningen', `${Math.round(spine0)}°`, '28–52°', spine0 >= 28 && spine0 <= 52));

    const toBall = ((hip[impact].x - hip[a].x) * facing) / scale;
    grade(toBall, 0.04, 0.35);
    if (toBall > 0.15) fault('early_ext', toBall, sev(toBall, 0.15));
    else if (loss > 10) fault('posture_loss', loss, sev(loss, 10));
    else goods.push('keep');
    pro.push(row('Höfterna mot bollen', `${cm(Math.max(0, toBall))} cm`, 'högst ca 8 cm', toBall <= 0.15));
    pro.push(row('Tappad böjning i träffen', `${Math.round(Math.max(0, loss))}°`, 'högst 10°', loss <= 10));

    const headFwd = ((head[impact].x - head[a].x) * facing) / scale;
    grade(headFwd, 0.05, 0.4);
    if (headFwd > 0.18) fault('head_forward', headFwd, sev(headFwd, 0.18));

    // Svingbanan: var är händerna halvvägs upp jämfört med halvvägs ner?
    const yRef = (hands[a].y + hands[top].y) / 2;
    const outside = ((crossX(hands, top, impact, yRef) - crossX(hands, a, top, yRef)) * facing) / scale; // + = ut mot bollen
    grade(outside > 0 ? outside : Math.max(0, -outside - 0.3), 0.02, 0.35, 3);
    if (outside > 0.12) fault('over_the_top', outside, sev(outside, 0.12));
    else if (outside < -0.5) fault('too_inside', -outside, 1);
    else goods.push('path');
    pro.push(row('Svingbana på vägen ner', outside > 0.12 ? 'utifrån' : outside < -0.5 ? 'mycket inifrån' : 'inifrån', 'inifrån', outside <= 0.12 && outside >= -0.5));
  }

  faults.sort((x, y) => y.severity - x.severity);
  // Ärligt betyg: snittet av delbetygen, men aldrig högre än vad felen tillåter
  const mean = grades.reduce((s, x) => s + x.g * x.weight, 0) / grades.reduce((s, x) => s + x.weight, 0);
  const cap = 100 - faults.reduce((s, f) => s + [0, 6, 12, 18][f.severity], 0);
  const score = Math.max(20, Math.round(Math.min(mean, cap)));
  return {
    ok: true, view, righty, score, tempo, faults, goods, pro,
    phases: { address: a, top, down: Math.round((top + impact) / 2), impact, finish },
    path: hands.map(p => ({ x: p.x / width, y: p.y / height })),
  };
}

const row = (label, you, target, ok) => ({ label, you, target, ok });
const dec = v => v.toFixed(1).replace('.', ',');
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
const mid = (A, B) => A.map((p, i) => ({ x: (p.x + B[i].x) / 2, y: (p.y + B[i].y) / 2 }));

function median(values) {
  const s = [...values].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
}

// Index mellan from och to (inklusive) med högst värde
function best(from, to, value) {
  let bi = from, bv = -Infinity;
  for (let i = from; i <= to; i++) {
    const v = value(i);
    if (v > bv) { bv = v; bi = i; }
  }
  return bi;
}

// x-läget där banan första gången passerar höjden y (mellan två bildrutor räknas det ut)
function crossX(pts, from, to, y) {
  const startAbove = pts[from].y < y;
  for (let i = from + 1; i <= to; i++) {
    const p = pts[i - 1], q = pts[i];
    if ((q.y < y) !== startAbove) {
      const k = (y - p.y) / ((q.y - p.y) || 1);
      return p.x + k * (q.x - p.x);
    }
  }
  return pts[to].x;
}

// Fyller i bildrutor där kroppen inte syntes
function fillGaps(pts) {
  const out = pts.slice();
  let prev = -1;
  for (let i = 0; i < out.length; i++) {
    if (!out[i]) continue;
    for (let j = prev + 1; j < i; j++) {
      const k = prev < 0 ? 1 : (j - prev) / (i - prev);
      const from = prev < 0 ? out[i] : out[prev];
      out[j] = { x: from.x + k * (out[i].x - from.x), y: from.y + k * (out[i].y - from.y) };
    }
    prev = i;
  }
  for (let j = prev + 1; j < out.length; j++) out[j] = out[prev];
  return out;
}

function smooth(pts) {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    return { x: (a.x + 2 * p.x + b.x) / 4, y: (a.y + 2 * p.y + b.y) / 4 };
  });
}
