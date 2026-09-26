/**
 * 音 Sound, synthesised rather than sampled, and played on the instruments of the genre.
 *
 * Every cue here is built in the Web Audio graph at the moment it plays, so the game ships
 * no audio files: nothing to download, nothing to license, nothing added to the APK.
 *
 * 樂 Bruno: *"os sounds e animation carecem de melhorias, preciso de mais sumo
 * xianxia/wuxia, está muito desenquadrado."* He was right, and the reason was plain on the
 * page: every cue was a sine or a square wave with an envelope, which is the sound of a
 * 1990s handheld, in a game painted in ink. So the cues are played on what a cultivation
 * story is scored with, each one made out of the physics of the real thing rather than a
 * recording of it:
 *
 *   琴 the guqin, a plucked silk string: Karplus-Strong, a burst of noise fed back through
 *     a delay the length of one period, which is how a plucked string actually decays.
 *   鐘 a bronze bell: a handful of inharmonic partials, the upper ones dying first.
 *   磬 a stone chime: the same with a stone's partials, shorter and drier.
 *   木魚 the temple wood block: a pitched knock and a click of noise.
 *   鑼 a gong: low, slightly detuned partials that bloom after the strike.
 *   劍 a blade: a sweep of filtered air and a thin metallic ring.
 *
 * Everything melodic stays inside one pentatonic scale on D (宮商角徵羽), so any two cues
 * that overlap are in tune with each other. And everything goes through one short hall,
 * a reverb made of decaying noise, which is the difference between a beep and a sound in
 * a room.
 *
 * Browsers refuse to start audio before a gesture, so the context is created lazily on
 * the first cue, which is always a tap, and everything before that is a silent no-op.
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
  if (bus) bus.master.gain.value = LEVELS[level].volume;
  return level;
}

// ─────────────────────────────────────────────────────────────── the room ──

/** Where a cue plays: the context, its dry output, and the hall it can send into. */
export interface Stage {
  readonly ctx: BaseAudioContext;
  readonly dry: AudioNode;
  readonly hall: AudioNode;
}

interface Bus extends Stage { readonly master: GainNode }

let live: AudioContext | null = null;
let bus: Bus | null = null;

/**
 * 殿 The hall. Two seconds of noise falling away exponentially is, to the ear, a stone
 * room: every reflection at once, thinning out. Made once, per context.
 */
function hallOf(ctx: BaseAudioContext): ConvolverNode {
  const seconds = 2.2;
  const len = Math.floor(ctx.sampleRate * seconds);
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 * 2 - 1; };
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const t = i / ctx.sampleRate;
      // A little pre-delay, then the tail. The early part is darker than pure noise.
      d[i] = t < 0.012 ? 0 : rnd() * Math.exp(-t * 3.1) * (0.6 + 0.4 * Math.exp(-t * 9));
    }
  }
  const conv = ctx.createConvolver();
  conv.buffer = ir;
  return conv;
}

/** The whole chain: cues → dry and hall → a soft limiter → the volume → the speaker. */
export function stageOn(ctx: BaseAudioContext, volume: number): Bus {
  const master = ctx.createGain();
  master.gain.value = volume;
  const limit = ctx.createDynamicsCompressor();
  limit.threshold.value = -10;
  limit.knee.value = 8;
  limit.ratio.value = 6;
  limit.attack.value = 0.004;
  limit.release.value = 0.2;
  const dry = ctx.createGain();
  dry.gain.value = 0.9;
  const send = ctx.createGain();
  send.gain.value = 0.32;
  const hall = hallOf(ctx);
  // The hall's own return is filtered: a bright tail sounds like a bathroom.
  const warm = ctx.createBiquadFilter();
  warm.type = 'lowpass';
  warm.frequency.value = 3800;
  dry.connect(limit);
  send.connect(hall).connect(warm).connect(limit);
  limit.connect(master).connect(ctx.destination);
  return { ctx, dry, hall: send, master };
}

function stage(): Stage | null {
  if (LEVELS[level].volume === 0) return null;
  if (!live) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      live = new Ctor();
      bus = stageOn(live, LEVELS[level].volume);
    } catch {
      return null;
    }
  }
  if (live.state === 'suspended') void live.resume();
  return bus;
}

// ─────────────────────────────────────────────────────────── the scale ──

/**
 * 五音 D 宮 pentatonic, from the guqin's low strings to the bells: D E F♯ A B.
 * Named by octave so a cue reads as music rather than as a list of numbers.
 */
const D2 = 73.42, A2 = 110, D3 = 146.83, A3 = 220;
const D4 = 293.66, Fs4 = 369.99, A4 = 440, B4 = 493.88;
const D5 = 587.33, E5 = 659.25, Fs5 = 739.99, A5 = 880, B5 = 987.77, D6 = 1174.66, E6 = 1318.51;

/** Where a sound goes: dry only, or dry with some of it in the hall. */
function out(s: Stage, node: AudioNode, wet: number): void {
  node.connect(s.dry);
  if (wet > 0) {
    const g = s.ctx.createGain();
    g.gain.value = wet;
    node.connect(g).connect(s.hall);
  }
}

/** A seeded noise source, so the same cue is the same sound every time. */
function noiseBuffer(ctx: BaseAudioContext, seconds: number, seed = 1): AudioBuffer {
  const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const b = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = b.getChannelData(0);
  let s = seed * 48271 + 11;
  for (let i = 0; i < len; i++) { s = (s * 16807) % 2147483647; d[i] = s / 2147483647 * 2 - 1; }
  return b;
}

// ─────────────────────────────────────────────────────────── instruments ──

const strings = new WeakMap<BaseAudioContext, Map<string, AudioBuffer>>();

/**
 * 琴 One pluck of a silk string. Karplus-Strong: a short burst of softened noise loops
 * through a delay one period long, averaged with its neighbour on every pass, so the high
 * partials die first exactly as they do on a real string. Rendered once per pitch.
 */
function stringBuffer(ctx: BaseAudioContext, freq: number, seconds: number): AudioBuffer {
  let cache = strings.get(ctx);
  if (!cache) { cache = new Map(); strings.set(ctx, cache); }
  const key = `${freq.toFixed(2)}:${seconds}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * seconds);
  // The averaging filter below delays by half a sample, so the loop is set half a sample
  // short and the remainder is made up by interpolating between two taps. Without it a
  // high string is out of tune by the rounding of its period.
  const period = sr / freq - 0.5;
  const n = Math.max(2, Math.floor(period));
  const frac = period - n;
  const buf = ctx.createBuffer(1, len, sr);
  const y = buf.getChannelData(0);
  // The pluck: noise, softened, which is a finger on silk rather than a pick on steel.
  let seed = Math.round(freq * 7) + 3;
  const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 * 2 - 1; };
  let prev = 0;
  for (let i = 0; i <= n + 1; i++) { const v = r(); y[i] = (v + prev) * 0.5; prev = v; }
  // Silk loses its brightness faster than steel, and low strings ring longer than high.
  const keep = 0.9975 - Math.min(0.004, freq / 250000);
  const avg = (k: number) => 0.5 * (y[k] + y[k - 1]);
  for (let i = n + 2; i < len; i++) {
    y[i] = keep * ((1 - frac) * avg(i - n) + frac * avg(i - n - 1));
  }
  cache.set(key, buf);
  return buf;
}

interface Pluck {
  readonly at?: number;
  readonly gain?: number;
  readonly ring?: number;
  /** 猱 Slide the string by this many semitones as it rings, the guqin's bent note. */
  readonly bend?: number;
  readonly wet?: number;
}

function pluck(s: Stage, t0: number, freq: number, o: Pluck = {}): void {
  const { ctx } = s;
  const at = t0 + (o.at ?? 0);
  const ring = o.ring ?? 1.6;
  const src = ctx.createBufferSource();
  src.buffer = stringBuffer(ctx, freq, ring);
  if (o.bend) {
    src.detune.setValueAtTime(0, at + 0.08);
    src.detune.linearRampToValueAtTime(o.bend * 100, at + 0.45);
  }
  // The body of the instrument: a gentle lowpass, and a little of the wood's resonance.
  const body = ctx.createBiquadFilter();
  body.type = 'lowpass';
  body.frequency.value = Math.min(5200, freq * 9);
  body.Q.value = 0.4;
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(o.gain ?? 0.5, at);
  amp.gain.setTargetAtTime(0.0001, at + ring * 0.7, ring * 0.12);
  src.connect(body).connect(amp);
  out(s, amp, o.wet ?? 0.5);
  src.start(at);
  src.stop(at + ring + 0.05);
}

interface Struck {
  readonly at?: number;
  readonly gain?: number;
  readonly ring?: number;
  readonly wet?: number;
}

/** A struck body: a set of partials, each with its own share and its own life. */
function struck(s: Stage, t0: number, freq: number, partials: readonly (readonly [number, number, number])[], o: Struck): void {
  const { ctx } = s;
  const at = t0 + (o.at ?? 0);
  const ring = o.ring ?? 2;
  const sum = ctx.createGain();
  sum.gain.value = o.gain ?? 0.2;
  for (const [ratio, share, life] of partials) {
    const f = freq * ratio;
    if (f > ctx.sampleRate / 2.2) continue;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(share, at + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, at + ring * life);
    osc.connect(g).connect(sum);
    osc.start(at);
    osc.stop(at + ring * life + 0.05);
  }
  out(s, sum, o.wet ?? 0.6);
}

/** 鐘 A small bronze bell. Its partials are the ones a real bell's profile gives. */
const BELL = [[1, 1, 1], [2.01, 0.45, 0.7], [2.76, 0.32, 0.55], [5.4, 0.14, 0.3], [8.93, 0.07, 0.16]] as const;
function bell(s: Stage, t0: number, freq: number, o: Struck = {}): void {
  struck(s, t0, freq, BELL, { ring: 2.4, ...o });
}

/** 磬 A stone chime: fewer, stranger partials, and a shorter, drier life than bronze. */
const STONE = [[1, 1, 1], [2.32, 0.5, 0.5], [4.25, 0.25, 0.3], [6.63, 0.1, 0.18]] as const;
function stone(s: Stage, t0: number, freq: number, o: Struck = {}): void {
  struck(s, t0, freq, STONE, { ring: 1.3, ...o });
}

/** 木魚 The temple wood block: a pitched knock that drops, and a click of noise on top. */
function wood(s: Stage, t0: number, freq: number, gain = 0.25, wet = 0.15): void {
  const { ctx } = s;
  const at = t0;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, at);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.78, at + 0.06);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.09);
  osc.connect(g);
  out(s, g, wet);
  osc.start(at);
  osc.stop(at + 0.12);
  const click = ctx.createBufferSource();
  click.buffer = noiseBuffer(ctx, 0.02, Math.round(freq));
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = freq * 3;
  bp.Q.value = 2;
  const cg = ctx.createGain();
  cg.gain.setValueAtTime(gain * 0.5, at);
  cg.gain.exponentialRampToValueAtTime(0.0001, at + 0.02);
  click.connect(bp).connect(cg);
  out(s, cg, wet);
  click.start(at);
}

/**
 * 鑼 A gong. Low partials a hair out of tune with each other, so they beat, and the upper
 * ones swell a moment after the strike, which is the bloom a gong is recognised by.
 */
function gong(s: Stage, t0: number, freq: number, gain = 0.35): void {
  const { ctx } = s;
  const at = t0;
  const sum = ctx.createGain();
  sum.gain.value = gain;
  const parts: [number, number, number, number][] = [
    // ratio, share, when it peaks, how long it lasts
    [1, 1, 0.01, 3.6], [1.007, 0.6, 0.02, 3.2], [1.48, 0.45, 0.12, 2.6],
    [2.02, 0.35, 0.25, 2.2], [2.76, 0.22, 0.4, 1.6], [3.51, 0.12, 0.5, 1.1],
  ];
  for (const [ratio, share, peak, life] of parts) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq * ratio;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(share, at + peak);
    g.gain.exponentialRampToValueAtTime(0.0001, at + life);
    osc.connect(g).connect(sum);
    osc.start(at);
    osc.stop(at + life + 0.05);
  }
  // The mallet: a soft thump of low noise under the first instant.
  const hit = ctx.createBufferSource();
  hit.buffer = noiseBuffer(ctx, 0.12, 3);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 400;
  const hg = ctx.createGain();
  hg.gain.setValueAtTime(0.6, at);
  hg.gain.exponentialRampToValueAtTime(0.0001, at + 0.12);
  hit.connect(lp).connect(hg).connect(sum);
  hit.start(at);
  out(s, sum, 0.7);
}

/** 風 Air moving: noise through a band that sweeps, which is a sleeve or a blade. */
function whoosh(s: Stage, t0: number, from: number, to: number, length: number, gain = 0.25, wet = 0.25): void {
  const { ctx } = s;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, length + 0.05, Math.round(from + to));
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 1.4;
  bp.frequency.setValueAtTime(from, t0);
  bp.frequency.exponentialRampToValueAtTime(to, t0 + length);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + length * 0.35);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + length);
  src.connect(bp).connect(g);
  out(s, g, wet);
  src.start(t0);
  src.stop(t0 + length + 0.05);
}

/** 劍鳴 The ring a blade gives when it cuts air: thin, high and quick to go. */
function blade(s: Stage, t0: number, gain = 0.12): void {
  struck(s, t0, 2350, [[1, 1, 1], [1.53, 0.6, 0.7], [2.17, 0.35, 0.5]], { gain, ring: 0.45, wet: 0.4 });
}

/** 擊 A blow landing on a body: a low drop in pitch and a dull slap of noise. */
function thud(s: Stage, t0: number, gain = 0.45): void {
  const { ctx } = s;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(130, t0);
  osc.frequency.exponentialRampToValueAtTime(48, t0 + 0.16);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
  osc.connect(g);
  out(s, g, 0.15);
  osc.start(t0);
  osc.stop(t0 + 0.22);
  const n = ctx.createBufferSource();
  n.buffer = noiseBuffer(ctx, 0.08, 9);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 900;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(gain * 0.5, t0);
  ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08);
  n.connect(lp).connect(ng);
  out(s, ng, 0.1);
  n.start(t0);
}

// ─────────────────────────────────────────────────────────────── the cues ──

type Cue = (s: Stage, t0: number) => void;

/**
 * 譜 The score. Each cue is written against a stage and a start time, so the same cue
 * plays live in the game and renders offline for `npm run sounds`, which writes every
 * one of them to a file a person can listen to.
 */
export const CUES = {
  /** 木 Every press: the lightest knock on the wood block, dry. It happens constantly. */
  tap: (s, t) => wood(s, t, 1250, 0.13, 0.05),
  /** 琴 A purchase: two plucked notes up the scale, a small decision settled. */
  buy: (s, t) => {
    pluck(s, t, A4, { gain: 0.42, ring: 1.1 });
    pluck(s, t, D5, { at: 0.075, gain: 0.38, ring: 1.3 });
  },
  /** 劍 The cultivator strikes: a sleeve of air and the ring of the blade. */
  strike: (s, t) => {
    whoosh(s, t, 700, 3400, 0.16, 0.22, 0.2);
    blade(s, t + 0.07, 0.1);
  },
  /** 擊 The beast lands one: a blunt blow, low and dry. */
  wound: (s, t) => thud(s, t, 0.42),
  /** 勝 A fight won: the guqin runs up the scale and a bell answers. */
  win: (s, t) => {
    [D4, Fs4, A4, D5].forEach((f, i) => pluck(s, t, f, { at: i * 0.07, gain: 0.36, ring: 1.4 }));
    bell(s, t + 0.3, D6, { gain: 0.12, ring: 2.2 });
  },
  /**
   * 敗 A fight lost costs nothing, and the sound must not say otherwise: one low string,
   * bent down a little as it rings. Rueful, not a failure jingle.
   */
  lose: (s, t) => {
    pluck(s, t, A3, { gain: 0.42, ring: 1.8, bend: -2 });
    pluck(s, t, D3, { at: 0.16, gain: 0.3, ring: 2 });
  },
  /** 突破 A breakthrough: the gong, then bells climbing over it, then the hall. */
  breakthrough: (s, t) => {
    gong(s, t, D2, 0.34);
    whoosh(s, t + 0.05, 300, 5200, 0.9, 0.12, 0.6);
    [D5, A5, D6, E6].forEach((f, i) => bell(s, t + 0.35 + i * 0.16, f, { gain: 0.11, ring: 2.6 }));
  },
  /** 悟 A card taken: three stone chimes, a door closing on two others. */
  awaken: (s, t) => {
    stone(s, t, E5, { gain: 0.2 });
    stone(s, t + 0.2, A5, { gain: 0.18 });
    stone(s, t + 0.42, B4, { gain: 0.22, ring: 1.8 });
  },
  /** 層 A layer opens. One small bell, quiet on purpose: it happens hundreds of times. */
  layer: (s, t) => bell(s, t, E6, { gain: 0.045, ring: 1.2, wet: 0.8 }),
  /** 塔 A floor falls: a step up on the strings, and a bell at the top of it. */
  floor: (s, t) => {
    pluck(s, t, D4, { gain: 0.36, ring: 1 });
    pluck(s, t, A4, { at: 0.09, gain: 0.34, ring: 1.2 });
    bell(s, t + 0.2, A5, { gain: 0.12, ring: 2 });
  },
  /** 爐 A pill from the furnace: the bronze cauldron rings low, and something bubbles. */
  brew: (s, t) => {
    struck(s, t, A2, BELL, { gain: 0.22, ring: 1.6, wet: 0.5 });
    [0.12, 0.2, 0.26, 0.37].forEach((d, i) => wood(s, t + d, 520 + i * 90, 0.06, 0.2));
  },
  /** 錄 A mark earned: two bells, rare enough to be worth hearing. */
  mark: (s, t) => {
    bell(s, t, Fs5, { gain: 0.12, ring: 1.8 });
    bell(s, t + 0.11, B5, { gain: 0.11, ring: 2.2 });
  },
} satisfies Record<string, Cue>;

export type CueName = keyof typeof CUES;

function play(name: CueName): void {
  const s = stage();
  if (!s) return;
  try {
    CUES[name](s, s.ctx.currentTime + 0.01);
  } catch { /* a cue that fails is a silent cue, never a broken game */ }
}

export const sfx = Object.fromEntries(
  (Object.keys(CUES) as CueName[]).map((k) => [k, () => play(k)]),
) as { readonly [K in CueName]: () => void };
