// Synthesized tactical UI sound effects via WebAudio — no audio assets.
// Valorant-family sound language: soft filtered-noise ticks for input, deep
// sine thocks for actions, restrained layered stingers with a sub hit and an
// airy shimmer — no square-wave chiptune.

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

const MASTER_VOLUME = 0.22;

interface ToneSpec {
  kind: 'tone';
  at: number;
  freq: number;
  glideTo?: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
  /** Slow attack (seconds) for swelling stinger tones; default is a fast hit. */
  attack?: number;
  /** Cents of detune — used for the doubled, slightly-chorused stinger layers. */
  detune?: number;
  /** Route through the echo bus for a sense of space. */
  echo?: boolean;
}

interface NoiseSpec {
  kind: 'noise';
  at: number;
  duration: number;
  gain?: number;
  /** Filter shaping: bandpass tick, lowpass thud, highpass shimmer. */
  filterType: BiquadFilterType;
  filterFreq: number;
  filterQ?: number;
  attack?: number;
  echo?: boolean;
}

type SoundSpec = ToneSpec | NoiseSpec;

const t = (spec: Omit<ToneSpec, 'kind'>): ToneSpec => ({ kind: 'tone', ...spec });
const n = (spec: Omit<NoiseSpec, 'kind'>): NoiseSpec => ({ kind: 'noise', ...spec });

const SOUNDS: Record<ArcadeSoundName, SoundSpec[]> = {
  // Soft digital tick — filtered noise with a faint sine body.
  tap: [
    n({ at: 0, duration: 0.035, gain: 0.5, filterType: 'bandpass', filterFreq: 1900, filterQ: 1.4 }),
    t({ at: 0, freq: 950, duration: 0.025, type: 'sine', gain: 0.18 }),
  ],
  // Deep tactile thock: sine pitch-drop + muffled noise transient.
  placeX: [
    t({ at: 0, freq: 215, glideTo: 122, duration: 0.13, type: 'sine', gain: 0.85 }),
    n({ at: 0, duration: 0.045, gain: 0.4, filterType: 'lowpass', filterFreq: 950 }),
  ],
  placeO: [
    t({ at: 0, freq: 265, glideTo: 155, duration: 0.13, type: 'sine', gain: 0.85 }),
    n({ at: 0, duration: 0.045, gain: 0.4, filterType: 'lowpass', filterFreq: 1200 }),
  ],
  // Priority ping: two soft rising tones with a breath of shimmer.
  layerWin: [
    t({ at: 0, freq: 660, duration: 0.09, type: 'sine', gain: 0.5, echo: true }),
    t({ at: 0.1, freq: 990, duration: 0.16, type: 'sine', gain: 0.55, echo: true }),
    n({ at: 0.1, duration: 0.2, gain: 0.12, filterType: 'highpass', filterFreq: 4500, echo: true }),
  ],
  layerLost: [
    t({ at: 0, freq: 620, duration: 0.09, type: 'sine', gain: 0.45, echo: true }),
    t({ at: 0.1, freq: 415, duration: 0.18, type: 'sine', gain: 0.5, echo: true }),
    n({ at: 0, duration: 0.12, gain: 0.1, filterType: 'lowpass', filterFreq: 800 }),
  ],
  // Match won: sub hit, then a restrained rising triad with detuned doubles
  // and a long airy shimmer. Cinematic, not chiptune.
  victory: [
    t({ at: 0, freq: 72, glideTo: 48, duration: 0.35, type: 'sine', gain: 0.9 }),
    t({ at: 0.05, freq: 440, duration: 0.5, type: 'sine', gain: 0.34, attack: 0.05, echo: true }),
    t({ at: 0.05, freq: 440, duration: 0.5, type: 'sine', gain: 0.2, attack: 0.05, detune: 9, echo: true }),
    t({ at: 0.2, freq: 554.4, duration: 0.5, type: 'sine', gain: 0.34, attack: 0.05, echo: true }),
    t({ at: 0.35, freq: 659.3, duration: 0.62, type: 'sine', gain: 0.4, attack: 0.05, echo: true }),
    t({ at: 0.35, freq: 880, duration: 0.62, type: 'sine', gain: 0.22, attack: 0.12, detune: -7, echo: true }),
    n({ at: 0.35, duration: 0.7, gain: 0.14, filterType: 'highpass', filterFreq: 5200, attack: 0.08, echo: true }),
  ],
  // Match lost: dark descending pair over a deep sub, lowpass wash.
  defeat: [
    t({ at: 0, freq: 58, glideTo: 40, duration: 0.55, type: 'sine', gain: 0.85 }),
    t({ at: 0.05, freq: 330, glideTo: 262, duration: 0.4, type: 'sine', gain: 0.4, attack: 0.04, echo: true }),
    t({ at: 0.4, freq: 220, glideTo: 165, duration: 0.6, type: 'sine', gain: 0.45, attack: 0.05, echo: true }),
    n({ at: 0, duration: 0.5, gain: 0.14, filterType: 'lowpass', filterFreq: 500, attack: 0.05, echo: true }),
  ],
  // Draw: flat, neutral double tone — deliberately unresolved.
  draw: [
    t({ at: 0, freq: 392, duration: 0.16, type: 'sine', gain: 0.45, echo: true }),
    t({ at: 0.22, freq: 392, duration: 0.28, type: 'sine', gain: 0.4, echo: true }),
    n({ at: 0, duration: 0.04, gain: 0.2, filterType: 'bandpass', filterFreq: 1500, filterQ: 1.2 }),
  ],
  invalid: [
    t({ at: 0, freq: 110, glideTo: 82, duration: 0.09, type: 'sine', gain: 0.6 }),
    n({ at: 0, duration: 0.05, gain: 0.25, filterType: 'lowpass', filterFreq: 600 }),
  ],
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
let echoBus: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let resumeHooksInstalled = false;

/** Shared 1s white-noise buffer for filtered ticks, thuds, and shimmer. */
function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (!noiseBuffer || noiseBuffer.sampleRate !== ctx.sampleRate) {
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }
  return noiseBuffer;
}

/** Feedback-delay echo bus — a cheap sense of space for the stingers. */
function getEchoBus(ctx: AudioContext, master: GainNode): GainNode {
  if (!echoBus) {
    echoBus = ctx.createGain();
    echoBus.gain.value = 1;
    const delay = ctx.createDelay(0.5);
    delay.delayTime.value = 0.17;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.28;
    const wet = ctx.createGain();
    wet.gain.value = 0.16;
    echoBus.connect(master);
    echoBus.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    wet.connect(master);
  }
  return echoBus;
}

function tryResume(): void {
  // iOS reports the WebKit-specific state 'interrupted' after a screen lock
  // or phone call — not 'suspended' — so compare against 'running' instead of
  // matching specific paused states.
  if (audioContext && audioContext.state !== 'running') {
    void audioContext.resume();
  }
}

function installResumeHooks(): void {
  if (resumeHooksInstalled) return;
  resumeHooksInstalled = true;
  // iOS only honors resume() inside a user gesture, so retry on every tap and
  // whenever the page returns to the foreground.
  window.addEventListener('pointerdown', tryResume, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') tryResume();
  });
}

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (audioContext && audioContext.state === 'closed') {
    // iOS occasionally hard-closes background contexts; rebuild from scratch.
    audioContext = null;
    masterGain = null;
    echoBus = null;
    noiseBuffer = null;
  }
  if (!audioContext) {
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioContext = new Ctor();
    masterGain = audioContext.createGain();
    masterGain.gain.value = MASTER_VOLUME;
    masterGain.connect(audioContext.destination);
    installResumeHooks();
  }
  tryResume();
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
  for (const spec of SOUNDS[name]) {
    const start = now + spec.at;
    const end = start + spec.duration;
    const peak = spec.gain ?? 0.6;
    const attack = spec.attack ?? 0.008;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, start);
    env.gain.linearRampToValueAtTime(peak, start + attack);
    env.gain.exponentialRampToValueAtTime(0.001, end);

    const destination = spec.echo ? getEchoBus(ctx, masterGain) : masterGain;
    env.connect(destination);

    if (spec.kind === 'tone') {
      const osc = ctx.createOscillator();
      osc.type = spec.type ?? 'sine';
      osc.frequency.setValueAtTime(spec.freq, start);
      if (spec.glideTo) {
        osc.frequency.exponentialRampToValueAtTime(spec.glideTo, end);
      }
      if (spec.detune) {
        osc.detune.value = spec.detune;
      }
      osc.connect(env);
      osc.start(start);
      osc.stop(end + 0.02);
    } else {
      const src = ctx.createBufferSource();
      src.buffer = getNoiseBuffer(ctx);
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = spec.filterType;
      filter.frequency.value = spec.filterFreq;
      if (spec.filterQ) {
        filter.Q.value = spec.filterQ;
      }
      src.connect(filter);
      filter.connect(env);
      src.start(start);
      src.stop(end + 0.02);
    }
  }
}
