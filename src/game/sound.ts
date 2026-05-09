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

/** Woody "thud" — multi-layer impact sound with click transient, noise burst, and body resonance */
function playWoodThud(isCapture: boolean) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  const out = ctx.createGain();
  out.gain.value = isCapture ? 0.72 : 0.52;
  out.connect(ctx.destination);

  // ── High click (initial contact) ──
  const clickNoise = ctx.createBufferSource();
  clickNoise.buffer = createNoiseBuffer(ctx, 0.025);
  const hpf = ctx.createBiquadFilter();
  hpf.type = 'highpass'; hpf.frequency.value = 1800;
  const clickGain = ctx.createGain();
  clickGain.gain.setValueAtTime(0.55, now);
  clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.022);
  clickNoise.connect(hpf); hpf.connect(clickGain); clickGain.connect(out);
  clickNoise.start(now); clickNoise.stop(now + 0.028);

  // ── Mid impact (bandpass noise) ──
  const impNoise = ctx.createBufferSource();
  impNoise.buffer = createNoiseBuffer(ctx, 0.1);
  const bpf = ctx.createBiquadFilter();
  bpf.type = 'bandpass';
  bpf.frequency.value = isCapture ? 310 : 550;
  bpf.Q.value = isCapture ? 0.7 : 1.0;
  const impGain = ctx.createGain();
  impGain.gain.setValueAtTime(isCapture ? 0.9 : 0.65, now);
  impGain.gain.exponentialRampToValueAtTime(0.001, now + (isCapture ? 0.1 : 0.07));
  impNoise.connect(bpf); bpf.connect(impGain); impGain.connect(out);
  impNoise.start(now); impNoise.stop(now + 0.11);

  // ── Body resonance (falling sine) ──
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  const f0 = isCapture ? 155 : 260;
  osc.frequency.setValueAtTime(f0, now);
  osc.frequency.exponentialRampToValueAtTime(f0 * 0.65, now + 0.09);
  const oscGain = ctx.createGain();
  oscGain.gain.setValueAtTime(0.001, now);
  oscGain.gain.linearRampToValueAtTime(isCapture ? 0.32 : 0.22, now + 0.006);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + (isCapture ? 0.2 : 0.14));
  osc.connect(oscGain); oscGain.connect(out);
  osc.start(now); osc.stop(now + 0.22);
}

export function playMoveSound(isCapture = false) {
  playWoodThud(isCapture);
}

export function playCheckSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const tones = [
    { freq: 740,  delay: 0,    dur: 0.1,  gain: 0.034 },
    { freq: 988,  delay: 0.1,  dur: 0.1,  gain: 0.028 },
    { freq: 1318, delay: 0.2,  dur: 0.14, gain: 0.022 },
  ];
  for (const t of tones) {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = t.freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now + t.delay);
    g.gain.exponentialRampToValueAtTime(t.gain, now + t.delay + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + t.delay + t.dur);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(now + t.delay); osc.stop(now + t.delay + t.dur + 0.02);
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
