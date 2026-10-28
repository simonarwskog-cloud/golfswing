// Ritar skelett och händernas bana ovanpå videon.
const BONES = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28]];
const UP = '#FFC531';
const DOWN = '#38B6FF';

// path = händernas bana (0–1), phases = { address, top, impact, finish }, upto = bildruta att rita fram till,
// zoom = hur mycket videon är förstorad (linjerna ritas tunnare så att de ser lika tjocka ut),
// club = klubbhuvudets bana (0–1 eller null per bildruta) om den gick att följa
export function drawOverlay(ctx, lm, path, phases, upto, zoom = 1, club = null) {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  const lw = Math.max(1.5, w / 150 / zoom);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (lm) {
    // skelettet tunt och nedtonat – det är banan man ska titta på
    const pt = i => [lm[i].x * w, lm[i].y * h];
    for (const [color, width] of [['rgba(0,0,0,.25)', lw * 1.4], ['rgba(255,255,255,.55)', lw * 0.6]]) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      for (const [a, b] of BONES) {
        ctx.moveTo(...pt(a));
        ctx.lineTo(...pt(b));
      }
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    for (const i of [11, 12, 23, 24, 25, 26]) {
      ctx.beginPath();
      ctx.arc(...pt(i), lw * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (path && phases && upto != null) {
    const bw = lw * 2.6;
    // klubbhuvudets bana om den gick att följa, annars händernas
    const main = club || path;
    segment(ctx, main, phases.address, Math.min(upto, phases.top), UP, bw);
    if (upto > phases.top) segment(ctx, main, phases.top, Math.min(upto, phases.impact), DOWN, bw);
    if (upto > phases.impact) segment(ctx, main, phases.impact, Math.min(upto, phases.finish), 'rgba(255,255,255,.8)', bw * 0.7);
    // lysande punkt där klubbhuvudet (eller händerna) är just nu
    const i = Math.min(upto, phases.finish);
    if (i >= phases.address && main[i]) {
      const color = i <= phases.top ? UP : i <= phases.impact ? DOWN : '#fff';
      const [x, y] = [main[i].x * w, main[i].y * h];
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      ctx.beginPath(); ctx.arc(x, y, bw * 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, y, bw * 1.1, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = lw * 0.8;
      ctx.stroke();
    }
  }
}

// En bit av banan som en mjuk kurva: mörk kant under och färgen ovanpå så att den syns mot alla bakgrunder.
// Bildrutor där punkten saknas (null) hoppas över, och dubbletter (samma läge två gånger) slås ihop.
function segment(ctx, path, from, to, color, width, edge = true) {
  if (to <= from) return;
  const W = ctx.canvas.width, H = ctx.canvas.height, minStep = Math.hypot(W, H) * 0.008;
  const runs = [[]];
  for (let i = from; i <= to; i++) {
    const p = path[i];
    if (!p) { if (runs[runs.length - 1].length) runs.push([]); continue; }
    const run = runs[runs.length - 1];
    const q = [p.x * W, p.y * H];
    const last = run[run.length - 1];
    if (!last || Math.hypot(q[0] - last[0], q[1] - last[1]) >= minStep || i === to) run.push(q);
  }
  const line = () => {
    ctx.beginPath();
    for (const run of runs) {
      if (!run.length) continue;
      ctx.moveTo(...run[0]);
      if (run.length < 3) { run.slice(1).forEach(q => ctx.lineTo(...q)); continue; }
      // böj genom mittpunkterna så att kurvan blir mjuk
      for (let k = 1; k < run.length - 1; k++) {
        const mx = (run[k][0] + run[k + 1][0]) / 2, my = (run[k][1] + run[k + 1][1]) / 2;
        ctx.quadraticCurveTo(run[k][0], run[k][1], mx, my);
      }
      ctx.lineTo(...run[run.length - 1]);
    }
    ctx.stroke();
  };
  if (edge) {
    ctx.strokeStyle = 'rgba(0,0,0,.55)';
    ctx.lineWidth = width * 1.7;
    line();
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  line();
}

// Liten bild av svingen (sparas i historiken), inzoomad på samma sätt som spelaren (crop = { x0, y0, z })
export function snapshot(video, lm, path, phases, upto, crop = { x0: 0, y0: 0, z: 1 }, club = null, maxSide = 320) {
  const k = (maxSide * crop.z) / Math.max(video.videoWidth, video.videoHeight);
  const full = document.createElement('canvas');
  full.width = Math.round(video.videoWidth * k);
  full.height = Math.round(video.videoHeight * k);
  const fctx = full.getContext('2d');
  fctx.drawImage(video, 0, 0, full.width, full.height);
  drawOverlay(fctx, lm, path, phases, upto, crop.z, club);
  const c = document.createElement('canvas');
  c.width = Math.round(full.width / crop.z);
  c.height = Math.round(full.height / crop.z);
  c.getContext('2d').drawImage(full, crop.x0 * full.width, crop.y0 * full.height, c.width, c.height, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.75);
}
