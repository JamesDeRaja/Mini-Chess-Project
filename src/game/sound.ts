let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  audioContext ??= new Ctor();
  if (audioContext.state === 'suspended') audioContext.resume();
  return audioContext;
}

function createNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
  const frameCount = Math.ceil(ctx.sampleRate * durationSec);
  const buf = ctx.createBuffer(1, frameCount, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < frameCount; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

/** Woody "thud" — filtered noise burst + short resonant sine, mimics chess.com piece sound */
function playWoodThud(isCapture: boolean) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  // --- Noise burst (the impact "click") ---
  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, 0.12);

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = isCapture ? 280 : 520;
  filter.Q.value = isCapture ? 0.8 : 1.1;

  const noiseGain = ctx.createGain();
  const peakGain = isCapture ? 0.55 : 0.38;
  noiseGain.gain.setValueAtTime(peakGain, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + (isCapture ? 0.11 : 0.08));

  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noise.start(now);
  noise.stop(now + 0.13);

  // --- Resonant body tone (short sine decay) ---
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  const startFreq = isCapture ? 180 : 380;
  const endFreq = isCapture ? 100 : 220;
  osc.frequency.setValueAtTime(startFreq, now);
  osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.06);

  const oscGain = ctx.createGain();
  oscGain.gain.setValueAtTime(isCapture ? 0.18 : 0.12, now);
  oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

  osc.connect(oscGain);
  oscGain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.08);
}

export function playMoveSound(isCapture = false) {
  playWoodThud(isCapture);
}

export function playCheckSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  // Two sharp high-pitched tones — alert pattern like chess.com
  const tones = [
    { freq: 880, delay: 0, dur: 0.07, gain: 0.028 },
    { freq: 1100, delay: 0.08, dur: 0.09, gain: 0.024 },
  ];

  for (const t of tones) {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(t.freq, now + t.delay);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now + t.delay);
    g.gain.exponentialRampToValueAtTime(t.gain, now + t.delay + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now + t.delay + t.dur);

    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now + t.delay);
    osc.stop(now + t.delay + t.dur + 0.02);
  }
}

export function playResultSound(playerWon: boolean) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  if (playerWon) {
    // Rising fanfare: C5 → E5 → G5 → C6
    const melody = [
      { freq: 523.25, delay: 0,    dur: 0.14 },
      { freq: 659.25, delay: 0.13, dur: 0.14 },
      { freq: 783.99, delay: 0.26, dur: 0.14 },
      { freq: 1046.5, delay: 0.38, dur: 0.22 },
    ];
    for (const note of melody) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.freq, now + note.delay);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now + note.delay);
      g.gain.exponentialRampToValueAtTime(0.038, now + note.delay + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + note.delay + note.dur);

      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now + note.delay);
      osc.stop(now + note.delay + note.dur + 0.02);
    }
    return;
  }

  // Descending defeat tones: E4 → C4 → A3
  const defeat = [
    { freq: 329.63, delay: 0,    dur: 0.18 },
    { freq: 261.63, delay: 0.17, dur: 0.2  },
    { freq: 220.0,  delay: 0.33, dur: 0.28 },
  ];
  for (const note of defeat) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(note.freq, now + note.delay);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now + note.delay);
    g.gain.exponentialRampToValueAtTime(0.028, now + note.delay + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + note.delay + note.dur);

    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now + note.delay);
    osc.stop(now + note.delay + note.dur + 0.02);
  }
}
