/**
 * 音 Sound, synthesised rather than sampled.
 *
 * Every cue here is a few oscillators and an envelope, so the game ships no audio files:
 * nothing to download, nothing to license, and nothing added to the APK. It also means
 * the cues can be tuned by changing a number instead of re-recording.
 *
 * Browsers refuse to start audio before a gesture, so the context is created lazily on
 * the first cue — which is always a tap — and everything before that is a silent no-op.
 */

const KEY = 'ninefold.volume';

/**
 * 量 Three steps, not a slider.
 *
 * A slider on a phone is a drag inside a scrolling sheet, which is a fight. Three states
 * on the one button that was already there covers what anybody actually wants: off,
 * quiet enough for a room with other people in it, and on.
 */
export const LEVELS = [
  { volume: 0, icon: '🔇', label: 'Sound off' },
  { volume: 0.4, icon: '🔈', label: 'Sound quiet' },
  { volume: 1, icon: '🔊', label: 'Sound on' },
] as const;

let ctx: AudioContext | null = null;
let level = LEVELS.length - 1;

try {
  const raw = localStorage.getItem(KEY);
  // `Number(null)` is 0, not NaN, so a missing key read as "silent" and the game
  // started muted for everybody. The null has to be ruled out before the number is.
  const held = raw === null ? null : Number(raw);
  if (held !== null && Number.isInteger(held) && held >= 0 && held < LEVELS.length) level = held;
  // The old key held a boolean mute. Honour it once so nobody's silence is undone.
  else if (localStorage.getItem('ninefold.muted') === '1') level = 0;
} catch { /* storage blocked: default to audible */ }

export function soundLevel(): number {
  return level;
}

export function isMuted(): boolean {
  return LEVELS[level].volume === 0;
}

/** Steps to the next level and returns it, so the button can say what it became. */
export function cycleSound(): number {
  level = (level + 1) % LEVELS.length;
  try {
    localStorage.setItem(KEY, String(level));
  } catch { /* nothing to do */ }
  return level;
}

function audio(): AudioContext | null {
  if (LEVELS[level].volume === 0) return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

interface Note {
  readonly freq: number;
  /** Seconds from the cue's start. */
  readonly at?: number;
  readonly length?: number;
  readonly gain?: number;
  readonly type?: OscillatorType;
  /** Slide to this frequency across the note. */
  readonly to?: number;
}

function play(notes: readonly Note[]): void {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime;
  for (const n of notes) {
    const at = t0 + (n.at ?? 0);
    const length = n.length ?? 0.09;
    const osc = a.createOscillator();
    const amp = a.createGain();
    osc.type = n.type ?? 'sine';
    osc.frequency.setValueAtTime(n.freq, at);
    if (n.to) osc.frequency.exponentialRampToValueAtTime(n.to, at + length);
    // A short attack and an exponential tail: a square wave cut off square clicks.
    amp.gain.setValueAtTime(0.0001, at);
    amp.gain.exponentialRampToValueAtTime((n.gain ?? 0.09) * LEVELS[level].volume, at + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, at + length);
    osc.connect(amp).connect(a.destination);
    osc.start(at);
    osc.stop(at + length + 0.02);
  }
}

export const sfx = {
  tap: () => play([{ freq: 660, length: 0.05, gain: 0.05 }]),
  buy: () => play([
    { freq: 520, length: 0.06, gain: 0.06 },
    { freq: 780, at: 0.05, length: 0.08, gain: 0.06 },
  ]),
  /** The cultivator lands a blow. Bright, short, up. */
  strike: () => play([{ freq: 340, to: 520, length: 0.07, gain: 0.07, type: 'triangle' }]),
  /** The beast lands one. Lower, blunter, down. */
  wound: () => play([{ freq: 190, to: 120, length: 0.1, gain: 0.07, type: 'square' }]),
  win: () => play([
    { freq: 523, length: 0.12, gain: 0.07 },
    { freq: 659, at: 0.09, length: 0.12, gain: 0.07 },
    { freq: 784, at: 0.18, length: 0.24, gain: 0.08 },
  ]),
  lose: () => play([
    { freq: 330, length: 0.16, gain: 0.06, type: 'triangle' },
    { freq: 262, at: 0.13, length: 0.3, gain: 0.06, type: 'triangle' },
  ]),
  /** 突破 The breakthrough: a rising chord under a shimmer. */
  breakthrough: () => play([
    { freq: 392, length: 0.5, gain: 0.06, type: 'triangle' },
    { freq: 523, at: 0.06, length: 0.5, gain: 0.06, type: 'triangle' },
    { freq: 659, at: 0.12, length: 0.55, gain: 0.06, type: 'triangle' },
    { freq: 1047, at: 0.2, to: 1568, length: 0.5, gain: 0.04 },
  ]),
  /** A layer opens. Quiet on purpose: it happens hundreds of times. */
  layer: () => play([{ freq: 880, length: 0.05, gain: 0.03 }]),
  /** 塔 A floor falls. A step up, because that is what it is. */
  floor: () => play([
    { freq: 440, length: 0.09, gain: 0.06, type: 'triangle' },
    { freq: 587, at: 0.07, length: 0.09, gain: 0.06, type: 'triangle' },
    { freq: 880, at: 0.14, length: 0.18, gain: 0.05 },
  ]),
  /** 爐 A pill comes out of the furnace. Round and low, like something cooling. */
  brew: () => play([
    { freq: 300, to: 200, length: 0.22, gain: 0.07, type: 'sine' },
    { freq: 600, at: 0.04, length: 0.16, gain: 0.03, type: 'triangle' },
  ]),
  /** 錄 A mark is earned. Two clear notes, rare enough to be worth hearing. */
  mark: () => play([
    { freq: 784, length: 0.1, gain: 0.06 },
    { freq: 1175, at: 0.09, length: 0.2, gain: 0.05 },
  ]),
};
