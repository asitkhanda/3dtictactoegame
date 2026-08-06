// Synthesized arcade sound effects via WebAudio — no audio assets needed.
// All sounds are short oscillator envelopes mixed through a master gain.

export type ArcadeSoundName =
  | 'tap'
  | 'placeX'
  | 'placeO'
  | 'layerWin'
  | 'layerLost'
  | 'victory'
  | 'defeat'
  | 'draw'
  | 'invalid';

export const SOUND_MUTED_STORAGE_KEY = '3dttt-sound-muted';

const MASTER_VOLUME = 0.16;

interface Note {
  /** Seconds after sound start. */
  at: number;
  /** Start frequency in Hz. */
  freq: number;
  /** Optional frequency to glide to over the note. */
  glideTo?: number;
  /** Note length in seconds. */
  duration: number;
  type: OscillatorType;
  /** Peak gain relative to the master (0..1). */
  gain?: number;
}

const SOUNDS: Record<ArcadeSoundName, Note[]> = {
  tap: [{ at: 0, freq: 340, duration: 0.05, type: 'square', gain: 0.5 }],
  placeX: [
    { at: 0, freq: 230, glideTo: 170, duration: 0.09, type: 'triangle' },
    { at: 0, freq: 460, glideTo: 340, duration: 0.05, type: 'sine', gain: 0.4 },
  ],
  placeO: [
    { at: 0, freq: 300, glideTo: 220, duration: 0.09, type: 'triangle' },
    { at: 0, freq: 600, glideTo: 440, duration: 0.05, type: 'sine', gain: 0.4 },
  ],
  layerWin: [
    { at: 0, freq: 523, duration: 0.09, type: 'square', gain: 0.7 },
    { at: 0.09, freq: 784, duration: 0.16, type: 'square', gain: 0.7 },
  ],
  layerLost: [
    { at: 0, freq: 392, duration: 0.09, type: 'square', gain: 0.6 },
    { at: 0.09, freq: 262, duration: 0.16, type: 'square', gain: 0.6 },
  ],
  victory: [
    { at: 0, freq: 523, duration: 0.11, type: 'square', gain: 0.7 },
    { at: 0.11, freq: 659, duration: 0.11, type: 'square', gain: 0.7 },
    { at: 0.22, freq: 784, duration: 0.11, type: 'square', gain: 0.7 },
    { at: 0.33, freq: 1047, duration: 0.28, type: 'square', gain: 0.8 },
    { at: 0.33, freq: 523, duration: 0.28, type: 'triangle', gain: 0.5 },
  ],
  defeat: [
    { at: 0, freq: 330, glideTo: 300, duration: 0.16, type: 'sawtooth', gain: 0.45 },
    { at: 0.17, freq: 262, glideTo: 240, duration: 0.16, type: 'sawtooth', gain: 0.45 },
    { at: 0.34, freq: 196, glideTo: 150, duration: 0.4, type: 'sawtooth', gain: 0.5 },
  ],
  draw: [
    { at: 0, freq: 440, duration: 0.12, type: 'triangle', gain: 0.6 },
    { at: 0.14, freq: 440, duration: 0.2, type: 'triangle', gain: 0.5 },
  ],
  invalid: [{ at: 0, freq: 110, duration: 0.08, type: 'square', gain: 0.5 }],
};

// Haptic patterns (ms vibrate / pause / vibrate…) matched to each sound cue.
// navigator.vibrate is Android-only; iOS silently ignores it.
const VIBRATIONS: Record<ArcadeSoundName, number | number[]> = {
  tap: 8,
  placeX: 18,
  placeO: 18,
  layerWin: [30, 40, 60],
  layerLost: [20, 50, 20],
  victory: [40, 60, 40, 60, 130],
  defeat: [90, 60, 170],
  draw: [30, 60, 30],
  invalid: 50,
};

// iOS exposes no vibration API to web pages, but toggling a hidden
// <input type="checkbox" switch> produces the system's light haptic tick on
// iOS 17.4+ Safari/WebKit. Single fixed tick only — no patterns.
let iosHapticInput: HTMLInputElement | null = null;

function iosHapticTick(times: number): void {
  if (!iosHapticInput) {
    iosHapticInput = document.createElement('input');
    iosHapticInput.type = 'checkbox';
    iosHapticInput.setAttribute('switch', '');
    iosHapticInput.setAttribute('aria-hidden', 'true');
    iosHapticInput.tabIndex = -1;
    iosHapticInput.style.cssText =
      'position:fixed;top:-100px;left:-100px;width:1px;height:1px;opacity:0;pointer-events:none;';
    document.body.appendChild(iosHapticInput);
  }
  for (let i = 0; i < times; i++) {
    if (i === 0) {
      iosHapticInput.click();
    } else {
      setTimeout(() => iosHapticInput?.click(), i * 120);
    }
  }
}

function vibrateFor(name: ArcadeSoundName): void {
  try {
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(VIBRATIONS[name]);
      return;
    }
    // Best-effort iOS fallback: approximate patterns with repeated ticks.
    const pattern = VIBRATIONS[name];
    const pulses = Array.isArray(pattern) ? Math.ceil(pattern.length / 2) + 1 : 1;
    iosHapticTick(name === 'tap' ? 1 : pulses);
  } catch {
    /* ignore */
  }
}

let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioContext = new Ctor();
    masterGain = audioContext.createGain();
    masterGain.gain.value = MASTER_VOLUME;
    masterGain.connect(audioContext.destination);
  }
  // Contexts start suspended until a user gesture; resume is a no-op when running.
  if (audioContext.state === 'suspended') {
    void audioContext.resume();
  }
  return audioContext;
}

export function isSoundMuted(): boolean {
  try {
    return localStorage.getItem(SOUND_MUTED_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setSoundMuted(muted: boolean): void {
  try {
    localStorage.setItem(SOUND_MUTED_STORAGE_KEY, muted ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export function playArcadeSound(name: ArcadeSoundName): void {
  if (isSoundMuted()) return;
  vibrateFor(name);
  const ctx = getContext();
  if (!ctx || !masterGain) return;

  const now = ctx.currentTime;
  for (const note of SOUNDS[name]) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    const start = now + note.at;
    const end = start + note.duration;
    const peak = note.gain ?? 0.6;

    osc.type = note.type;
    osc.frequency.setValueAtTime(note.freq, start);
    if (note.glideTo) {
      osc.frequency.exponentialRampToValueAtTime(note.glideTo, end);
    }

    env.gain.setValueAtTime(0, start);
    env.gain.linearRampToValueAtTime(peak, start + 0.008);
    env.gain.exponentialRampToValueAtTime(0.001, end);

    osc.connect(env);
    env.connect(masterGain);
    osc.start(start);
    osc.stop(end + 0.02);
  }
}
