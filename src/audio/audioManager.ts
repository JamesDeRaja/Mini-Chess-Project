export type SoundName = 'move' | 'capture' | 'check' | 'win' | 'invalid' | 'button';

type SoundSettings = {
  enabled: boolean;
  volume: number;
};

const STORAGE_KEY = 'mini_chess_sound_settings';
const SOUND_COOLDOWN_MS = 60;

let audioCtx: AudioContext | null = null;
let settings: SoundSettings = { enabled: true, volume: 0.7 };
const lastPlayedAt: Partial<Record<SoundName, number>> = {};

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) settings = { ...settings, ...(JSON.parse(raw) as Partial<SoundSettings>) };
  } catch { /* ignore */ }
}

function saveSettings() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* ignore */ }
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  type WinExt = typeof window & { webkitAudioContext?: typeof AudioContext };
  const Ctor = window.AudioContext ?? (window as WinExt).webkitAudioContext;
  if (!Ctor) return null;
  audioCtx ??= new Ctor();
  if (audioCtx.state === 'suspended') void audioCtx.resume();
  return audioCtx;
}

type ToneParams = {
  freq: number;
  dur: number;
  delay?: number;
  wave?: OscillatorType;
  peak?: number;
};

function tone(ctx: AudioContext, { freq, dur, delay = 0, wave = 'sine', peak = 0.04 }: ToneParams) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const t = ctx.currentTime + delay;
  osc.type = wave;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0001), t + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** Sound implementations — volume-scaled tones via Web Audio API. */
const soundFns: Record<SoundName, (v: number) => void> = {
  move(v) {
    const ctx = getCtx(); if (!ctx) return;
    tone(ctx, { freq: 520, dur: 0.09, wave: 'triangle', peak: v * 0.034 });
    tone(ctx, { freq: 780, dur: 0.07, delay: 0.065, wave: 'triangle', peak: v * 0.026 });
  },
  capture(v) {
    const ctx = getCtx(); if (!ctx) return;
    tone(ctx, { freq: 210, dur: 0.11, wave: 'triangle', peak: v * 0.042 });
    tone(ctx, { freq: 165, dur: 0.13, delay: 0.075, wave: 'triangle', peak: v * 0.032 });
  },
  check(v) {
    const ctx = getCtx(); if (!ctx) return;
    tone(ctx, { freq: 660, dur: 0.09, wave: 'square', peak: v * 0.02 });
    tone(ctx, { freq: 550, dur: 0.11, delay: 0.08, wave: 'square', peak: v * 0.016 });
  },
  win(v) {
    const ctx = getCtx(); if (!ctx) return;
    tone(ctx, { freq: 523, dur: 0.14, wave: 'triangle', peak: v * 0.044 });
    tone(ctx, { freq: 659, dur: 0.16, delay: 0.12, wave: 'triangle', peak: v * 0.044 });
    tone(ctx, { freq: 784, dur: 0.24, delay: 0.26, wave: 'triangle', peak: v * 0.044 });
  },
  invalid(v) {
    const ctx = getCtx(); if (!ctx) return;
    tone(ctx, { freq: 150, dur: 0.09, wave: 'sine', peak: v * 0.022 });
  },
  button(v) {
    const ctx = getCtx(); if (!ctx) return;
    tone(ctx, { freq: 860, dur: 0.07, wave: 'sine', peak: v * 0.018 });
  },
};

export function preloadSounds(): void {
  loadSettings();
}

export function playSound(sound: SoundName): void {
  if (!settings.enabled) return;
  const now = Date.now();
  if ((lastPlayedAt[sound] ?? 0) + SOUND_COOLDOWN_MS > now) return;
  lastPlayedAt[sound] = now;
  try { soundFns[sound](settings.volume); } catch { /* ignore missing AudioContext */ }
}

export function setSoundEnabled(enabled: boolean): void {
  settings = { ...settings, enabled };
  saveSettings();
}

export function setMasterVolume(volume: number): void {
  settings = { ...settings, volume: Math.max(0, Math.min(1, volume)) };
  saveSettings();
}

export function getSoundSettings(): SoundSettings {
  return { ...settings };
}

/**
 * Plays the correct sequence of sounds for a completed move.
 * Call this from UI event handlers ONLY — never from pure game logic.
 */
export function playMoveFeedback(params: {
  isCapture: boolean;
  isCheck: boolean;
  isCheckmate: boolean;
}): void {
  if (params.isCapture) {
    playSound('capture');
  } else {
    playSound('move');
  }

  if (params.isCheckmate) {
    setTimeout(() => playSound('win'), 150);
  } else if (params.isCheck) {
    setTimeout(() => playSound('check'), 120);
  }
}
