import { useState } from 'react';

/**
 * 記 Choices remembered on this device: the chest's filters, the melt rank, the workshop's
 * craft and list, the rankings tab, the ×1 or Max of buying and brewing.
 *
 * A way of looking is not a fact about the cultivator, so none of it goes in the save and
 * none of it reaches the ranked server. It lives in this browser's own storage, read and
 * written inside a try, because a private window or a full disk throws on the first touch
 * and the game has to go on exactly as if nothing had been remembered.
 */
const PREFIX = 'ninefold.pref.';

export function recall<T>(key: string, fallback: T, valid: (x: unknown) => x is T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    const value: unknown = JSON.parse(raw);
    return valid(value) ? value : fallback;
  } catch { return fallback; }
}

export function keep<T>(key: string, value: T): void {
  try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch { /* kept for the visit only */ }
}

/** useState, remembered on the device. `valid` is asked of whatever comes back. */
export function useRemembered<T>(key: string, fallback: T, valid: (x: unknown) => x is T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => recall(key, fallback, valid));
  const set = (v: T) => { setValue(v); keep(key, v); };
  return [value, set];
}

/** A guard for one of a fixed list of strings. */
export const oneOf = <T extends string>(list: readonly T[]) => (x: unknown): x is T =>
  typeof x === 'string' && (list as readonly string[]).includes(x);

/**
 * 盡 The ×1 or Max choice, shared by 修 buying and 爐 brewing. It is the key 修 has always
 * kept it under, so a player who chose Max before this keeps Max.
 */
const BUY_KEY = 'ninefold.buy';
export function useBuyMax(): [boolean, (max: boolean) => void] {
  const [many, setMany] = useState<boolean>(() => {
    try { return localStorage.getItem(BUY_KEY) === 'max'; } catch { return false; }
  });
  const pick = (max: boolean) => {
    setMany(max);
    try { localStorage.setItem(BUY_KEY, max ? 'max' : 'one'); } catch { /* a private window keeps it for the visit */ }
  };
  return [many, pick];
}
