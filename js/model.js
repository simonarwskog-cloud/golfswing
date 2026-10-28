// Den perfekta svingen: en skissad gubbe som svingar i samma vinkel som videon.
// Kroppen beskrivs i 3D (meter, högerhänt golfare) och ritas framifrån eller bakifrån.
// x = mot målet, y = upp, z = framåt mot bollen.

const BALL = [0.10, 0.03, 0.88];
const CLUB = 1.02;
const SPINE = 0.52, NECK = 0.22, SHOULDER = 0.19, HIP = 0.15, HEAD_R = 0.11;
const UPPER_ARM = 0.29, FOREARM = 0.27;
const LEAD_ANKLE = [0.20, 0.08, 0];

// s: 0 = uppställning, 1 = toppen, 2 = träffen, 3 = avslut.
// hip/turn = höftvridning/axelvridning (grader, + = bakåt), tilt = framåtböjning, side = lutning bort från målet,
// hands = händernas läge, club = klubbans riktning, trail = bakre fotleden, knees = [främre knä framåt, bakre knä mot målet, bakre knä framåt]
const KEYS = [
  { s: 0, pelvis: [0, 0.92, -0.10], hip: 0, tilt: 34, side: 8, turn: 0, hands: [0.04, 0.82, 0.30], club: [0.06, -0.79, 0.58], trail: [-0.20, 0.08, 0], knees: [0.10, 0, 0.10] },
  { s: 0.5, pelvis: [-0.01, 0.92, -0.10], hip: 18, tilt: 34, side: 9, turn: 45, hands: [-0.30, 0.95, 0.36], club: [-1, 0.05, 0.02], trail: [-0.20, 0.08, 0], knees: [0.12, 0, 0.10] },
  { s: 0.78, pelvis: [-0.02, 0.92, -0.10], hip: 32, tilt: 34, side: 10, turn: 72, hands: [-0.50, 1.28, 0.20], club: [0.05, 0.98, -0.05], trail: [-0.20, 0.08, 0], knees: [0.13, 0, 0.09] },
  { s: 1, pelvis: [-0.02, 0.92, -0.11], hip: 45, tilt: 33, side: 12, turn: 92, hands: [-0.38, 1.62, -0.05], club: [0.95, -0.12, -0.12], trail: [-0.20, 0.08, 0], knees: [0.14, 0, 0.09] },
  { s: 1.5, pelvis: [0.04, 0.90, -0.11], hip: 15, tilt: 34, side: 15, turn: 60, hands: [-0.45, 1.22, 0.16], club: [-0.15, 0.93, -0.33], trail: [-0.20, 0.08, 0], knees: [0.10, 0.03, 0.10] },
  { s: 1.78, pelvis: [0.07, 0.89, -0.12], hip: -20, tilt: 34, side: 20, turn: 25, hands: [-0.24, 0.98, 0.26], club: [-0.95, 0.20, -0.22], trail: [-0.20, 0.09, 0], knees: [0.08, 0.06, 0.11] },
  { s: 2, pelvis: [0.09, 0.90, -0.12], hip: -40, tilt: 33, side: 24, turn: -12, hands: [0.13, 0.84, 0.31], club: [-0.03, -0.81, 0.57], trail: [-0.18, 0.12, 0.02], knees: [0.06, 0.10, 0.12] },
  { s: 2.3, pelvis: [0.12, 0.91, -0.12], hip: -60, tilt: 30, side: 22, turn: -55, hands: [0.40, 1.00, 0.26], club: [0.96, 0.22, 0.12], trail: [-0.15, 0.16, 0.04], knees: [0.05, 0.16, 0.12] },
  { s: 2.6, pelvis: [0.15, 0.94, -0.10], hip: -80, tilt: 20, side: 15, turn: -95, hands: [0.35, 1.45, 0.05], club: [0.10, 0.90, -0.42], trail: [-0.12, 0.20, 0.04], knees: [0.03, 0.22, 0.10] },
  { s: 3, pelvis: [0.16, 0.98, -0.05], hip: -90, tilt: 6, side: 6, turn: -110, hands: [0.10, 1.65, -0.22], club: [-0.55, -0.45, -0.70], trail: [-0.10, 0.24, 0.02], knees: [0.02, 0.28, 0.08] },
];

const rad = d => (d * Math.PI) / 180;
const add = (a, b) => a.map((v, i) => v + b[i]);
const sub = (a, b) => a.map((v, i) => v - b[i]);
const mul = (a, k) => a.map(v => v * k);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = a => Math.hypot(a[0], a[1], a[2]);
const norm = a => mul(a, 1 / (len(a) || 1));
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const mix = (a, b, k) => (Array.isArray(a) ? a.map((v, i) => v + (b[i] - v) * k) : a + (b - a) * k);

// Vrid vektorn v runt axeln k (Rodrigues)
function rotate(v, k, angle) {
  const c = Math.cos(angle), s = Math.sin(angle);
  return add(add(mul(v, c), mul(cross(k, v), s)), mul(k, dot(k, v) * (1 - c)));
}

// Armbågen: armen böjs nedåt när handen är närmare axeln än armens längd
function elbow(shoulder, hand) {
  const d = sub(hand, shoulder);
  const dist = len(d) || 1e-6;
  const u = mul(d, 1 / dist);
  const reach = UPPER_ARM + FOREARM;
  if (dist >= reach) return add(shoulder, mul(u, (UPPER_ARM * dist) / reach));
  const a = (dist * dist + UPPER_ARM ** 2 - FOREARM ** 2) / (2 * dist);
  const h = Math.sqrt(Math.max(0, UPPER_ARM ** 2 - a * a));
  let bend = sub([0, -1, 0], mul(u, -u[1]));
  bend = len(bend) < 1e-3 ? [0, 0, 1] : norm(bend);
  return add(add(shoulder, mul(u, a)), mul(bend, h));
}

function keyAt(s) {
  s = Math.max(0, Math.min(3, s));
  let i = 1;
  while (i < KEYS.length - 1 && KEYS[i].s < s) i++;
  // mjuk kurva genom nyckellägena (Catmull-Rom) så att rörelsen inte rycker vid varje läge
  const k0 = KEYS[Math.max(0, i - 2)], k1 = KEYS[i - 1], k2 = KEYS[i], k3 = KEYS[Math.min(KEYS.length - 1, i + 1)];
  const span = k2.s - k1.s || 1;
  const t = Math.max(0, Math.min(1, (s - k1.s) / span));
  const t2 = t * t, t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
  const curve = (v0, v1, v2, v3) => {
    const m1 = ((v2 - v0) / (k2.s - k0.s || 1)) * span;
    const m2 = ((v3 - v1) / (k3.s - k1.s || 1)) * span;
    return h00 * v1 + h10 * m1 + h01 * v2 + h11 * m2;
  };
  const out = {};
  for (const key of Object.keys(k1)) {
    out[key] = Array.isArray(k1[key])
      ? k1[key].map((_, j) => curve(k0[key][j], k1[key][j], k2[key][j], k3[key][j]))
      : curve(k0[key], k1[key], k2[key], k3[key]);
  }
  return out;
}

// Alla kroppspunkter i 3D vid svingläget s
export function poseAt(s) {
  const k = keyAt(s);
  const tilt = rad(k.tilt), side = rad(k.side);
  const up = [-Math.cos(tilt) * Math.sin(side), Math.cos(tilt) * Math.cos(side), Math.sin(tilt)];
  const shoulderAxis = rotate([Math.cos(side), Math.sin(side), 0], up, -rad(k.turn));
  const hipAxis = [Math.cos(rad(k.hip)), 0, Math.sin(rad(k.hip))];
  const neck = add(k.pelvis, mul(up, SPINE));
  const head = add(neck, mul(norm(add(up, [0, 0.5, 0])), NECK));
  const dir = norm(k.club);
  const leadSh = add(neck, mul(shoulderAxis, SHOULDER));
  const trailSh = add(neck, mul(shoulderAxis, -SHOULDER));
  const leadHip = add(k.pelvis, mul(hipAxis, HIP));
  const trailHip = add(k.pelvis, mul(hipAxis, -HIP));
  const trailHand = add(k.hands, mul(dir, 0.08));
  return {
    head, neck, pelvis: k.pelvis, leadSh, trailSh, leadHip, trailHip,
    hands: k.hands, trailHand,
    leadElbow: elbow(leadSh, k.hands),
    trailElbow: elbow(trailSh, trailHand),
    clubHead: add(k.hands, mul(dir, CLUB)),
    leadKnee: add(mix(leadHip, LEAD_ANKLE, 0.5), [0, 0, k.knees[0]]),
    trailKnee: add(mix(trailHip, k.trail, 0.5), [k.knees[1], 0, k.knees[2]]),
    leadAnkle: LEAD_ANKLE, trailAnkle: k.trail,
    leadToe: add(LEAD_ANKLE, [0.05, -0.07, 0.15]),
    trailToe: [k.trail[0] + 0.04, 0.01, k.trail[2] + 0.15],
  };
}

// Framifrån ser vi x (mot målet åt höger), bakifrån ser vi z (mot bollen åt höger)
const project = (p, view) => [view === 'face' ? p[0] : p[2], p[1]];

// Skala som får plats med kroppen genom hela svingen (klubban får gå utanför). Räknas ut en gång per vinkel.
const fits = {};
function fitFor(view) {
  if (fits[view]) return fits[view];
  let x0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let s = 0; s <= 3; s += 0.05) {
    const { clubHead, ...body } = poseAt(s);
    for (const v of Object.values(body)) {
      const [x, y] = project(v, view);
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
  }
  return (fits[view] = { x0, x1, y1: y1 + HEAD_R });
}

const UP = '#FFC531', DOWN = '#38B6FF';
const C = { near: '#F4F8F6', far: '#8FA39A', club: '#B9C4BF', ball: '#FFFFFF' };
// Tjocklek (radie i meter) i början och slutet av varje kroppsdel – smalare mot händer och fötter
const R = {
  thigh: [0.078, 0.052], shin: [0.05, 0.036], foot: [0.034, 0.028],
  upperArm: [0.05, 0.04], forearm: [0.039, 0.03], neck: [0.05, 0.05],
  waist: 0.1, chest: 0.115, shoulders: 0.06, hips: 0.08, head: HEAD_R,
};

// Ritar gubben vid svingläget s som en stilren siluett. righty = false spegelvänder (vänsterhänt).
// place = { x, ground, height } (0–1 av bilden) ställer gubben där golfaren står i videon: höfternas mitt,
// fotlederna och avståndet fotled–näsa i uppställningen. Utan place fylls bilden.
export function drawModel(canvas, s, view = 'dtl', righty = true, place = null, trace = 'hands', ghost = false) {
  const key = trace === 'club' ? 'clubHead' : 'hands'; // vilken bana som ritas: klubbhuvudet eller händerna
  // ghost = gubben ritas grön och utan bakgrund, för att läggas genomskinlig ovanpå videon
  const col = ghost ? { ...C, near: '#3DDC84', far: '#249657', club: '#3DDC84' } : C;
  const dpr = window.devicePixelRatio || 1;
  const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
  if (!w || !h) return;
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  const ctx = canvas.getContext('2d');
  let scale, groundY, cx, mx;
  if (place) {
    const start = poseAt(0);
    scale = (place.height * h) / (start.head[1] - LEAD_ANKLE[1]);
    groundY = place.ground * h + LEAD_ANKLE[1] * scale;
    cx = place.x * w;
    mx = project(start.pelvis, view)[0];
  } else {
    const fit = fitFor(view);
    const pad = 0.08;
    scale = Math.min((w * (1 - 2 * pad)) / (fit.x1 - fit.x0), (h * (1 - 2 * pad)) / fit.y1);
    groundY = h * (1 - pad);
    cx = w / 2;
    mx = (fit.x0 + fit.x1) / 2;
  }
  const P = v => {
    const [x, y] = project(v, view);
    return [cx + (righty ? 1 : -1) * (x - mx) * scale, groundY - y * scale];
  };
  const px = m => Math.max(1, m * scale);
  const depth = v => (view === 'face' ? v[2] : -v[0]); // större = närmare kameran
  const circle = (c, r) => { ctx.beginPath(); ctx.arc(c[0], c[1], r, 0, Math.PI * 2); ctx.fill(); };
  // en kroppsdel: två cirklar ihopkopplade, smalare i ena änden
  const cap = (a, b, ra, rb) => {
    const A = P(a), B = P(b), r1 = px(ra), r2 = px(rb);
    const dx = B[0] - A[0], dy = B[1] - A[1], d = Math.hypot(dx, dy) || 1e-6;
    const nx = -dy / d, ny = dx / d;
    ctx.beginPath();
    ctx.moveTo(A[0] + nx * r1, A[1] + ny * r1);
    ctx.lineTo(B[0] + nx * r2, B[1] + ny * r2);
    ctx.lineTo(B[0] - nx * r2, B[1] - ny * r2);
    ctx.lineTo(A[0] - nx * r1, A[1] - ny * r1);
    ctx.closePath();
    ctx.fill();
    circle(A, r1);
    circle(B, r2);
  };

  // bakgrund
  const p = poseAt(s);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (ghost) {
    ctx.clearRect(0, 0, w, h);
  } else {
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#17261F');
    bg.addColorStop(1, '#0D1713');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    const grass = ctx.createLinearGradient(0, groundY, 0, h);
    grass.addColorStop(0, '#1E3A2C');
    grass.addColorStop(1, '#122219');
    ctx.fillStyle = grass;
    ctx.fillRect(0, groundY, w, h - groundY);
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath();
    ctx.ellipse(P(p.pelvis)[0], groundY, px(0.45), px(0.045), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (!ghost && s < 2.03) {
    ctx.fillStyle = C.ball;
    circle(P(BALL), px(0.03));
  }

  // Kroppsdelarna ritas bakifrån och fram; det som är längst bort blir mörkare så att man ser djupet
  const parts = [];
  const part = (d, draw) => parts.push({ d, draw });
  for (const side of ['lead', 'trail']) {
    const hip = p[`${side}Hip`], knee = p[`${side}Knee`], ankle = p[`${side}Ankle`], toe = p[`${side}Toe`];
    const other = side === 'lead' ? 'trail' : 'lead';
    const legColor = depth(knee) >= depth(p[`${other}Knee`]) ? col.near : col.far;
    part(depth(knee), () => {
      ctx.fillStyle = legColor;
      cap(hip, knee, ...R.thigh);
      cap(knee, ankle, ...R.shin);
      cap(ankle, toe, ...R.foot);
    });
    const sh = p[`${side}Sh`], elbow = p[`${side}Elbow`], hand = side === 'lead' ? p.hands : p.trailHand;
    const armColor = depth(elbow) >= depth(p[`${other}Elbow`]) ? col.near : col.far;
    part(depth(elbow), () => {
      ctx.fillStyle = armColor;
      cap(sh, elbow, ...R.upperArm);
      cap(elbow, hand, ...R.forearm);
    });
  }

  const hipMid = mix(p.leadHip, p.trailHip, 0.5);
  part((depth(p.neck) + depth(hipMid)) / 2, () => {
    ctx.fillStyle = col.near;
    const hipL = mix(hipMid, p.leadHip, 0.7), hipT = mix(hipMid, p.trailHip, 0.7);
    cap(hipL, hipT, R.hips, R.hips);
    cap(hipMid, p.neck, R.waist, R.chest);
    cap(p.leadSh, p.trailSh, R.shoulders, R.shoulders);
    const torso = [p.leadSh, p.trailSh, hipT, hipL].map(P);
    ctx.beginPath();
    torso.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
    cap(p.neck, p.head, ...R.neck);
    circle(P(p.head), px(R.head));
  });

  const dir = norm(sub(p.clubHead, p.hands));
  part((depth(p.hands) + depth(p.clubHead)) / 2, () => {
    ctx.strokeStyle = col.club;
    ctx.lineWidth = px(0.014);
    ctx.beginPath();
    ctx.moveTo(...P(p.hands));
    ctx.lineTo(...P(p.clubHead));
    ctx.stroke();
    ctx.fillStyle = col.near;
    cap(sub(p.clubHead, mul(dir, 0.02)), add(p.clubHead, mul(dir, 0.05)), 0.035, 0.04);
  });

  parts.sort((x, y) => x.d - y.d).forEach(q => q.draw());
  if (ghost) return; // ovanpå videon visas din egen linje, inte gubbens

  // händernas bana ovanpå kroppen: gul upp, blå ner, med mörk kant och en lysande punkt där händerna är
  const trail = (from, to, color) => {
    if (s <= from) return;
    const pts = [P(poseAt(from)[key])];
    for (let t = from + 0.02; t <= Math.min(s, to); t += 0.02) pts.push(P(poseAt(t)[key]));
    pts.push(P(poseAt(Math.min(s, to))[key]));
    for (const [c, width] of [['rgba(0,0,0,.55)', px(0.05)], [color, px(0.03)]]) {
      ctx.strokeStyle = c;
      ctx.lineWidth = width;
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    }
  };
  trail(0, 1, UP);
  trail(1, 2, DOWN);
  if (s > 0 && s <= 2.05) {
    const [x, y] = P(p[key]);
    ctx.fillStyle = 'rgba(0,0,0,.5)';
    circle([x, y], px(0.045));
    ctx.fillStyle = s <= 1 ? UP : DOWN;
    circle([x, y], px(0.033));
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = px(0.01);
    ctx.stroke();
  }
}
