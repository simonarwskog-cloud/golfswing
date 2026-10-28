// Hittar kroppens leder i varje bildruta med Googles MediaPipe (körs direkt i mobilen, ingen server).
const VERSION = '0.10.14';
const LIB = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/vision_bundle.mjs`;
const WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`;
const MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task';

export const FPS = 30;          // så många bilder per sekund vi analyserar runt svingen
const SEARCH_FPS = 5;           // snabb genomgång för att hitta var i videon svingen är
const MAX_SECONDS = 30;         // längre videor kortas av
const BEFORE = 3, AFTER = 1.5;  // sekunder före och efter händernas högsta punkt

let landmarker = null;
let loading = null;
let lastTimestamp = 0;          // MediaPipe kräver att tidsstämplarna alltid ökar

export function loadPose() {
  if (landmarker) return Promise.resolve(landmarker);
  if (!loading) {
    loading = (async () => {
      const { PoseLandmarker, FilesetResolver } = await import(LIB);
      const files = await FilesetResolver.forVisionTasks(WASM);
      const options = delegate => ({
        baseOptions: { modelAssetPath: MODEL, delegate },
        runningMode: 'VIDEO',
        numPoses: 1,
      });
      try {
        landmarker = await PoseLandmarker.createFromOptions(files, options('GPU'));
      } catch {
        landmarker = await PoseLandmarker.createFromOptions(files, options('CPU'));
      }
      return landmarker;
    })().catch(err => { loading = null; throw err; });
  }
  return loading;
}

export function seekTo(video, t) {
  return new Promise(resolve => {
    if (Math.abs(video.currentTime - t) < 0.001 && video.readyState >= 2) return resolve();
    const timer = setTimeout(done, 1500);
    function done() {
      clearTimeout(timer);
      video.removeEventListener('seeked', done);
      resolve();
    }
    video.addEventListener('seeked', done);
    video.currentTime = t;
  });
}

// Hittar svingen och går igenom den bild för bild. Returnerar [{ t, lm }] där lm är 33 kroppspunkter (eller null).
export async function trackVideo(video, { onProgress, onFrame, isCancelled } = {}) {
  const pose = await loadPose();
  video.pause();
  const end = Math.min(video.duration || 0, MAX_SECONDS);
  if (!end || !isFinite(end)) throw new Error('video');

  const search = await track(pose, video, 0, end, SEARCH_FPS, isCancelled, p => onProgress?.(p * 0.3), onFrame);
  if (!search) return null;
  const peak = highestHands(search);
  if (peak == null) return search; // ingen sving syns – analysen säger vad som är fel
  const from = Math.max(0, peak - BEFORE);
  const to = Math.min(end, peak + AFTER);
  return track(pose, video, from, to, FPS, isCancelled, p => onProgress?.(0.3 + p * 0.7), onFrame, true);
}

// capture = spara en liten gråskalebild av varje bildruta (används för att hitta klubbhuvudet)
async function track(pose, video, from, to, fps, isCancelled, onProgress, onFrame, capture = false) {
  const total = Math.max(1, Math.floor((to - from) * fps));
  const base = lastTimestamp + 1000;
  const frames = [];
  let grab = null;
  if (capture) {
    const k = Math.min(1, 240 / Math.max(video.videoWidth, video.videoHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(video.videoWidth * k);
    c.height = Math.round(video.videoHeight * k);
    const g = c.getContext('2d', { willReadFrequently: true });
    frames.gray = { w: c.width, h: c.height };
    grab = () => {
      g.drawImage(video, 0, 0, c.width, c.height);
      const rgba = g.getImageData(0, 0, c.width, c.height).data;
      const out = new Uint8Array(c.width * c.height);
      for (let j = 0; j < out.length; j++) out[j] = (rgba[j * 4] * 3 + rgba[j * 4 + 1] * 6 + rgba[j * 4 + 2]) / 10;
      return out;
    };
  }

  for (let i = 0; i < total; i++) {
    if (isCancelled?.()) return null;
    const t = from + i / fps;
    await seekTo(video, t);
    const ts = Math.round(base + (t - from) * 1000);
    const result = pose.detectForVideo(video, ts);
    lastTimestamp = ts;
    const raw = result.landmarks?.[0];
    const frame = { t, lm: raw ? raw.map(p => ({ x: p.x, y: p.y })) : null };
    if (grab) frame.gray = grab();
    frames.push(frame);
    onFrame?.(frame);
    onProgress?.((i + 1) / total);
  }
  return frames;
}

// Tiden då händerna är högst ovanför höfterna (mitt i svingen), eller null om ingen sving syns
function highestHands(frames) {
  let best = null, bestHeight = 0.6; // händerna måste minst upp en bit över höfterna
  for (const { t, lm } of frames) {
    if (!lm) continue;
    const hip = (lm[23].y + lm[24].y) / 2;
    const torso = hip - (lm[11].y + lm[12].y) / 2;
    const height = (hip - (lm[15].y + lm[16].y) / 2) / (torso || 1);
    if (height > bestHeight) { bestHeight = height; best = t; }
  }
  return best;
}
