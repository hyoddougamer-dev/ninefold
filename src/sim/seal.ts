/**
 * 封 The seal on a save.
 *
 * Bruno, after a tester edited his save to the ninth realm and said so: *"penso ser melhor
 * encriptar para descansar os players, todos querem um jogo justo."*
 *
 * What this is, said plainly so nobody builds on more than it gives: the save written to
 * the phone, and the copy a player takes of it, are no longer readable text, and they
 * carry a seal that breaks when anything in them is changed by hand. Opening the phone's
 * storage shows noise, not `"realm": 3`. That stops the casual edit, which is the only
 * kind most people would ever try.
 *
 * What it is not: a lock. The game runs on the phone, so whatever opens the seal is on
 * the phone too, and someone who reads this code can make a seal of their own. The lock
 * is on the server (sim/verify.ts): a ranked save is measured against the server's own
 * clock, and a save that could not have been played in the time that passed never
 * reaches the boards, sealed or not. The seal keeps honest players honest and tells the
 * game when a save was touched; the server is what keeps the boards fair.
 *
 * Pure and synchronous on purpose: the app writes its save as the page is hidden, and a
 * browser gives an async cipher no time to finish there.
 */

/** Every sealed text starts with this, so an old plain save is still told apart. */
export const MAGIC = 'NF1.';

// Not a secret (see above). It makes a seal this game's own rather than any checksum.
const PEPPER = '九境·ninefold·封·jiujing';

/** cyrb53: a small, fast 53-bit string hash. Not cryptographic; it does not need to be. */
function cyrb53(text: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

const hex = (n: number, width: number) => n.toString(16).padStart(width, '0').slice(-width);

/** The same bytes back for the same seed: xorshift32, one byte of it per byte of save. */
function stream(bytes: Uint8Array, seed: number): Uint8Array {
  let x = (seed ^ cyrb53(PEPPER)) >>> 0 || 0x9e3779b9;
  const out = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5; x >>>= 0;
    out[i] = bytes[i] ^ (x & 0xff);
  }
  return out;
}

function toBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function fromBase64(text: string): Uint8Array {
  const bin = atob(text);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const mark = (json: string, nonce: number) => hex(cyrb53(`${PEPPER}|${nonce}|${json}`, nonce), 14);

/** 封 JSON in, sealed text out. The same JSON always seals to the same text. */
export function seal(json: string): string {
  const nonce = cyrb53(json) >>> 0;
  const body = stream(new TextEncoder().encode(json), nonce);
  return `${MAGIC}${hex(nonce, 8)}${mark(json, nonce)}${toBase64(body)}`;
}

export interface Opened {
  /** The JSON inside, or null if this was not a sealed text at all. */
  readonly json: string | null;
  /** False when the text opened but its seal does not match: it was changed by hand. */
  readonly intact: boolean;
}

/** 啟 Sealed text in, the JSON and whether its seal still holds out. */
export function open(text: string): Opened {
  const t = text.trim();
  if (!t.startsWith(MAGIC)) return { json: null, intact: false };
  try {
    const nonce = parseInt(t.slice(MAGIC.length, MAGIC.length + 8), 16);
    const sealed = t.slice(MAGIC.length + 8, MAGIC.length + 22);
    const bytes = stream(fromBase64(t.slice(MAGIC.length + 22)), nonce);
    const json = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return { json, intact: Number.isFinite(nonce) && sealed === mark(json, nonce) };
  } catch {
    return { json: null, intact: false };
  }
}

export const isSealed = (text: string) => text.trim().startsWith(MAGIC);
