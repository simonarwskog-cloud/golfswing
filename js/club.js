// Följer klubbhuvudet. AI-modellen ser bara kroppen, så vi letar i stället efter det som rör sig
// i bilden ungefär en klubblängd från händerna – längst ut på klubban sitter klubbhuvudet.
// Returnerar [{ x, y } (0–1) eller null] per bildruta, eller null om klubban inte gick att följa.

const MOVING = 22; // så mycket en pixel måste ändras för att räknas som rörelse

export function trackClub(frames, res) {
  const info = frames.gray;
  if (!info) return null;
  const { w, h } = info;
  const { address, finish } = res.phases;
  const at = (lm, j) => ({ x: lm[j].x * w, y: lm[j].y * h });
  const mid = (p, q) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
  const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);

  const torsos = frames.filter(f => f.lm).map(f => dist(mid(at(f.lm, 11), at(f.lm, 12)), mid(at(f.lm, 23), at(f.lm, 24))));
  torsos.sort((a, b) => a - b);
  const torso = torsos[Math.floor(torsos.length / 2)] || 1;

  // Punkter på kroppen (inklusive mitt på benen) – rörelse nära dem är kroppen, inte klubban
  const bodyPoints = lm => {
    const pts = [11, 12, 23, 24, 25, 26, 27, 28].map(j => ({ ...at(lm, j), r: 0.33 }));
    for (const [a, b] of [[23, 25], [24, 26], [25, 27], [26, 28], [11, 23], [12, 24]]) pts.push({ ...mid(at(lm, a), at(lm, b)), r: 0.33 });
    // huvudet (med keps) är större än en led: spärra ett område runt och ovanför näsan
    const nose = at(lm, 0), neck = mid(at(lm, 11), at(lm, 12));
    pts.push({ ...nose, r: 0.7 }, { x: nose.x + (nose.x - neck.x) * 0.6, y: nose.y + (nose.y - neck.y) * 0.6, r: 0.7 });
    return pts;
  };

  // Komprimerade videor (t.ex. skickade på mail) har ofta dubbletter: samma bild två gånger i rad.
  // Därför jämför vi med närmaste bildruta före och efter som faktiskt är annorlunda.
  const differs = (p, q) => {
    let s = 0;
    for (let k = 0; k < p.length; k += 7) s += Math.abs(p[k] - q[k]);
    return s / (p.length / 7) > 0.6;
  };
  const neighbour = (i, step) => {
    for (let j = i + step; j >= 0 && j < frames.length && Math.abs(j - i) <= 4; j += step) {
      if (frames[j].gray && differs(frames[j].gray, frames[i].gray)) return frames[j].gray;
    }
    return null;
  };

  const from = Math.max(1, address - 2), to = Math.min(frames.length - 2, finish + 2);
  const search = (minD, maxD) => {
    const found = new Array(frames.length).fill(null);
    for (let i = from; i <= to; i++) {
      const b = frames[i].gray, a = b && neighbour(i, -1), c = b && neighbour(i, 1), lm = frames[i].lm;
      if (!a || !b || !c || !lm) continue;
      const hands = { x: res.path[i].x * w, y: res.path[i].y * h };
      const body = bodyPoints(lm);
      // bålen (rygg och rumpa) rör sig mycket när höfterna vrider – klubbhuvudet är aldrig där
      const tx = [11, 12, 23, 24].map(j => at(lm, j).x), ty = [11, 12, 23, 24].map(j => at(lm, j).y);
      const box = {
        x0: Math.min(...tx) - torso * 0.45, x1: Math.max(...tx) + torso * 0.45,
        y0: Math.min(...ty) - torso * 0.1, y1: Math.max(...ty) + torso * 0.25,
      };
      const cand = [];
      const y0 = Math.max(0, Math.floor(hands.y - maxD)), y1 = Math.min(h - 1, Math.ceil(hands.y + maxD));
      const x0 = Math.max(0, Math.floor(hands.x - maxD)), x1 = Math.min(w - 1, Math.ceil(hands.x + maxD));
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const k = y * w + x;
          // rör sig både in i och ut ur den här bildrutan = är här just nu
          if (Math.min(Math.abs(b[k] - a[k]), Math.abs(c[k] - b[k])) < MOVING) continue;
          const d = Math.hypot(x - hands.x, y - hands.y);
          if (d < minD || d > maxD) continue;
          if (x > box.x0 && x < box.x1 && y > box.y0 && y < box.y1) continue;
          if (body.some(p => Math.hypot(x - p.x, y - p.y) < p.r * torso)) continue;
          cand.push([x, y, d]);
        }
      }
      if (cand.length < 3) continue;
      cand.sort((p, q) => q[2] - p[2]);
      const top = cand.slice(0, 10);
      found[i] = {
        x: top.reduce((s, p) => s + p[0], 0) / top.length,
        y: top.reduce((s, p) => s + p[1], 0) / top.length,
        d: top.reduce((s, p) => s + p[2], 0) / top.length,
      };
    }
    return found;
  };

  // Först brett sök, sedan smalare runt den klubblängd vi hittade
  let pts = search(torso * 1.1, torso * 3);
  const lengths = pts.filter(Boolean).map(p => p.d).sort((a, b) => a - b);
  if (lengths.length < 5) return null;
  const club = lengths[Math.floor(lengths.length / 2)];
  // klubban kan se kortare ut när den pekar mot kameran (t.ex. i träffen bakifrån)
  pts = search(club * 0.4, club * 1.25);

  // Klubbhuvudet rör sig i en jämn båge: jämför varje punkt med medianen av grannarna och släng de som hoppar
  const median = v => v.sort((a, b) => a - b)[Math.floor(v.length / 2)];
  const clean = pts.map((p, i) => {
    if (!p) return null;
    const nb = pts.slice(Math.max(0, i - 2), i + 3).filter(Boolean);
    if (nb.length < 3) return null;
    const mx = median(nb.map(q => q.x)), my = median(nb.map(q => q.y));
    return Math.hypot(p.x - mx, p.y - my) > club * 0.3 ? null : p;
  });

  // Fyll små luckor (högst 3 bildrutor) så att linjen blir sammanhängande
  for (let i = from; i <= to; i++) {
    if (clean[i]) continue;
    let j = i;
    while (j <= to && !clean[j]) j++;
    const prev = clean[i - 1];
    const next = clean[j];
    if (prev && next && j - i <= 3) {
      for (let k = i; k < j; k++) {
        const f = (k - i + 1) / (j - i + 1);
        clean[k] = { x: prev.x + (next.x - prev.x) * f, y: prev.y + (next.y - prev.y) * f };
      }
    }
    i = j;
  }

  // mjuka till linjen lite
  const smooth = clean.map((p, i) => {
    const a = clean[i - 1], b = clean[i + 1];
    return p && a && b ? { x: (a.x + 2 * p.x + b.x) / 4, y: (a.y + 2 * p.y + b.y) / 4 } : p;
  });
  clean.splice(0, clean.length, ...smooth);

  const span = clean.slice(res.phases.top, res.phases.impact + 1);
  const covered = span.filter(Boolean).length / Math.max(1, span.length);
  if (covered < 0.5) return null; // klubban syns inte tillräckligt i nedsvingen – visa händerna i stället
  return clean.map(p => (p ? { x: p.x / w, y: p.y / h } : null));
}
