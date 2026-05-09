type Tone = {
  frequency: number;
  duration: number;
  delay?: number;
  type?: OscillatorType;
  gain?: number;
};

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextConstructor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) return null;
  audioContext ??= new AudioContextConstructor();
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

function playTone({ frequency, duration, delay = 0, type = 'sine', gain = 0.04 }: Tone) {
  const context = getAudioContext();
  if (!context) return;

  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  const startTime = context.currentTime + delay;
  const endTime = startTime + duration;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);
  gainNode.gain.setValueAtTime(0.0001, startTime);
  gainNode.gain.exponentialRampToValueAtTime(gain, startTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, endTime);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start(startTime);
  oscillator.stop(endTime + 0.02);
}

export function playMoveSound(isCapture = false) {
  playTone({ frequency: isCapture ? 220 : 360, duration: 0.08, type: 'triangle', gain: 0.035 });
  playTone({ frequency: isCapture ? 170 : 540, duration: 0.08, delay: 0.055, type: 'triangle', gain: 0.03 });
}

export function playCheckSound() {
  playTone({ frequency: 680, duration: 0.08, type: 'square', gain: 0.025 });
  playTone({ frequency: 510, duration: 0.12, delay: 0.07, type: 'square', gain: 0.02 });
}

export function playResultSound(playerWon: boolean) {
  if (playerWon) {
    playTone({ frequency: 523, duration: 0.1, type: 'triangle', gain: 0.035 });
    playTone({ frequency: 659, duration: 0.12, delay: 0.09, type: 'triangle', gain: 0.035 });
    playTone({ frequency: 784, duration: 0.18, delay: 0.2, type: 'triangle', gain: 0.035 });
    return;
  }

  playTone({ frequency: 260, duration: 0.12, type: 'sine', gain: 0.025 });
  playTone({ frequency: 196, duration: 0.16, delay: 0.1, type: 'sine', gain: 0.022 });
}
