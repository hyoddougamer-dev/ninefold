/**
 * 樂 Music: Bruno's own tracks, one mood per place in the game.
 *
 * The cues in sound.ts are made at the moment they play and weigh nothing. Music is the
 * other way round: it is recorded, made in Suno by Bruno on a plan that lets a game use
 * it, and turned into light files by tools/music.mjs. So nothing is fetched until a mood
 * first needs a track, and a track that has never been needed is never downloaded.
 *
 * 流 It streams. Each track plays from an audio element rather than being decoded whole
 * into memory, which for three minutes of stereo would be sixty megabytes on a phone. The
 * element is routed through a gain in its own audio context, because an iPhone ignores
 * an element's own volume and a fade needs a gain to ramp.
 *
 * 換 Two decks. A change of mood, or a track nearing its end, starts the next track on
 * the idle deck and crossfades into it, so there is never a gap and never a seam where a
 * loop restarts. Cultivating alternates between the two cultivation tracks.
 *
 * 靜 It never plays before the player has touched the game (browsers refuse, and a game
 * that opens shouting is rude), stops when the game is hidden and picks up when it comes
 * back, and has its own volume, apart from the sound of the game.
 */

/** 譜 The tracks that exist, by file (without its extension). Named after their mood. */
export const TRACKS = {
  cultivate1: 'music/cultivate-1',
  cultivate2: 'music/cultivate-2',
  hunt: 'music/hunt',
} as const;

/**
 * 碼 AAC, which Safari, Chrome and both phones play, unless this browser says it cannot:
 * a few Chromium builds ship without it, and those get the same track as Opus.
 */
let ext: string | null = null;
function fileOf(track: Track): string {
  if (ext === null) {
    const probe = new Audio();
    ext = probe.canPlayType('audio/mp4; codecs="mp4a.40.2"') ? 'm4a' : probe.canPlayType('audio/webm; codecs="opus"') ? 'webm' : 'm4a';
  }
  return `${TRACKS[track]}.${ext}`;
}
export type Track = keyof typeof TRACKS;

export type Mood = 'cultivate' | 'hunt' | 'battle' | 'heavens';

/**
 * 替 What plays in each mood. The warden's and the heavens' own tracks have not been made
 * yet, so until they are each borrows the nearest one: a fight the hunt, and the calm
 * above the ninth realm the second cultivation track. Adding a track is a line here.
 */
export const PLAYLIST: Record<Mood, readonly Track[]> = {
  cultivate: ['cultivate1', 'cultivate2'],
  hunt: ['hunt'],
  battle: ['hunt'],
  heavens: ['cultivate2', 'cultivate1'],
};

/** Where the player is, as far as the music cares. */
export interface Place {
  readonly tab: string;
  /** 鬥 A fight on the screen, and whether it is one of the big ones. */
  readonly fight: null | 'beast' | 'boss';
  /** 天 Crossed into the heavens above the ninth realm. */
  readonly heavens: boolean;
}

/**
 * 情 The mood for a place. The big fights (a warden, the tribulation, a heart demon)
 * are their own mood; an ordinary fight keeps the hunt playing, since it is over in
 * seconds and a change of music for each one would be a jolt a minute.
 */
export function moodFor(p: Place): Mood {
  if (p.fight === 'boss') return 'battle';
  if (p.tab === 'hunt' || p.fight === 'beast') return 'hunt';
  return p.heavens ? 'heavens' : 'cultivate';
}

const KEY = 'ninefold.music';

/** 量 Off, quiet, on: the same three steps as the sound, and its own button. */
export const MUSIC_LEVELS = [
  { volume: 0, icon: '♪', label: 'Music off' },
  { volume: 0.28, icon: '♪', label: 'Music quiet' },
  { volume: 0.55, icon: '♫', label: 'Music on' },
] as const;

let level = MUSIC_LEVELS.length - 1;
try {
  const raw = localStorage.getItem(KEY);
  const held = raw === null ? null : Number(raw);
  if (held !== null && Number.isInteger(held) && held >= 0 && held < MUSIC_LEVELS.length) level = held;
} catch { /* storage blocked: default to on */ }

export function musicLevel(): number {
  return level;
}

/** How long a change of mood takes, and how early a track hands over to the next. */
const FADE = 2.5;
const HANDOVER = 6;

interface Deck { el: HTMLAudioElement; gain: GainNode; track: Track | null; gen: number }

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let decks: [Deck, Deck] | null = null;
let on = 0;                                // which deck is playing
let mood: Mood = 'cultivate';
let touched = false;
let primed = false;
const turn: Record<Mood, number> = { cultivate: 0, hunt: 0, battle: 0, heavens: 0 };

function build(): boolean {
  if (decks) return true;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return false;
  try {
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = MUSIC_LEVELS[level].volume;
    master.connect(ctx.destination);
    const deck = (): Deck => {
      const el = new Audio();
      el.preload = 'none';
      el.crossOrigin = 'anonymous';
      const gain = ctx!.createGain();
      gain.gain.value = 0;
      ctx!.createMediaElementSource(el).connect(gain).connect(master!);
      el.addEventListener('timeupdate', () => nearEnd(el));
      return { el, gain, track: null, gen: 0 };
    };
    decks = [deck(), deck()];
    return true;
  } catch {
    decks = null;
    return false;
  }
}

const silent = () => MUSIC_LEVELS[level].volume === 0;
const playing = () => !!decks && decks[on].track !== null && !decks[on].el.paused;

/** 接 A track about to end hands over to the next one in its mood, overlapping. */
function nearEnd(el: HTMLAudioElement): void {
  if (!decks || decks[on].el !== el || !Number.isFinite(el.duration)) return;
  if (el.duration - el.currentTime < HANDOVER) start(mood, true);
}

/** Ramps one deck's gain to a value over `secs`, from wherever it is now. */
function ramp(d: Deck, to: number, secs: number): void {
  const now = ctx!.currentTime;
  d.gain.gain.cancelScheduledValues(now);
  d.gain.gain.setValueAtTime(d.gain.gain.value, now);
  d.gain.gain.linearRampToValueAtTime(to, now + secs);
}

/**
 * Starts the mood's next track on the idle deck and fades across to it.
 *
 * 待 The fade waits for the new track to be *playing*, not for the tap: on a slow
 * connection the file takes seconds to arrive, and fading out on the tap left a gap of
 * silence and then a track starting at full volume. 退 If the new one is refused or
 * never arrives, the old one comes back up, so a failure is never silence.
 */
function start(m: Mood, next: boolean): void {
  if (!ctx || !decks || silent()) return;
  const list = PLAYLIST[m];
  const from = decks[on];
  if (!next && from.track !== null && list.includes(from.track) && !from.el.paused) return;
  if (next) turn[m] = (turn[m] + 1) % list.length;
  const track = list[turn[m]];
  const to = decks[1 - on];
  const gen = ++to.gen;
  from.gen++;
  to.track = track;
  to.el.src = fileOf(track);
  to.el.currentTime = 0;
  to.gain.gain.cancelScheduledValues(ctx.currentTime);
  to.gain.gain.setValueAtTime(0, ctx.currentTime);
  on = 1 - on;
  const leaving = from.track !== null && !from.el.paused ? from : null;
  const cross = () => {
    if (to.gen !== gen) return;
    ramp(to, 1, FADE);
    if (!leaving) return;
    ramp(leaving, 0, FADE);
    const g = leaving.gen;
    // 蹤 Paused only if nothing has picked this deck up again in the meantime.
    window.setTimeout(() => { if (leaving.gen === g && decks && decks[on] !== leaving) leaving.el.pause(); }, (FADE + 0.3) * 1000);
  };
  const giveUp = () => {
    if (to.gen !== gen || !decks) return;
    to.gen++;
    to.el.pause();
    if (leaving && decks[on] === to) { on = 1 - on; ramp(leaving, 1, 0.6); }
  };
  to.el.addEventListener('playing', cross, { once: true });
  window.setTimeout(() => { if (to.gen === gen && to.el.paused) giveUp(); }, 9000);
  to.el.play().catch(giveUp);
}

/** 情 Tell the music where the player is. Cheap to call on every render. */
export function setMood(m: Mood): void {
  if (m === mood && playing()) return;
  mood = m;
  if (touched) start(m, false);
}

/**
 * 啟 A touch of the game. Browsers let sound start only from inside a gesture, and a
 * finger going *down* is not one (only lifting it is), so App calls this on every
 * pointerup, click and key, not once. Each call wakes the audio if the phone put it to
 * sleep and starts the music if nothing is playing, which is also how a refused start
 * is tried again: on the next tap.
 */
export function unlockMusic(): void {
  touched = true;
  if (silent() || !build()) return;
  if (ctx!.state !== 'running') void ctx!.resume();
  if (!playing()) start(mood, false);
  // 啟 An iPhone lets an audio element play on its own only once it has played inside
  // a gesture. The first track plays on one deck; the handover three minutes later
  // plays on the other. So the other is woken here too, silently, and put back.
  if (!primed && decks) {
    primed = true;
    const idle = decks[1 - on];
    if (idle.track === null) {
      idle.el.src = hush();
      idle.el.play().then(() => { if (decks && decks[on] !== idle) idle.el.pause(); }).catch(() => { primed = false; });
    }
  }
}

/** A tenth of a second of silence, made here, so waking a deck downloads nothing. */
function hush(): string {
  const n = 800, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const text = (o: number, t: string) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  text(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); text(8, 'WAVEfmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true); v.setUint32(28, 16000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  text(36, 'data'); v.setUint32(40, n * 2, true);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

/** Steps to the next level and returns it, so the button can say what it became. */
export function cycleMusic(): number {
  level = (level + 1) % MUSIC_LEVELS.length;
  try { localStorage.setItem(KEY, String(level)); } catch { /* nothing to do */ }
  const volume = MUSIC_LEVELS[level].volume;
  if (volume === 0) {
    decks?.forEach((d) => d.el.pause());
    if (ctx && ctx.state === 'running') void ctx.suspend();
  } else if (touched && build()) {
    master!.gain.setTargetAtTime(volume, ctx!.currentTime, 0.2);
    if (ctx!.state !== 'running') void ctx!.resume();
    // 續 Back on, the same track carries on where it stopped rather than from 0:00.
    const d = decks![on];
    if (d.track !== null && PLAYLIST[mood].includes(d.track)) d.el.play().catch(() => {});
    else start(mood, false);
  }
  return level;
}

/** 隱 Hidden, the music stops; back, it carries on where it was. */
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!ctx || !decks) return;
    if (document.hidden) {
      decks.forEach((d) => d.el.pause());
      void ctx.suspend();
    } else if (!silent() && touched) {
      void ctx.resume();
      const d = decks[on];
      if (d.track) d.el.play().catch(() => {});
    }
  });
}
