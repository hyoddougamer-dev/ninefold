import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import * as cloud from '../net/cloud.ts';
import type { State } from '../sim/state.ts';
import { importSave } from '../sim/save.ts';
import { progressOf } from '../sim/echo.ts';
import { now } from './clock.ts';

/**
 * 榜 The ranked server, as the screen uses it: who is signed in, when the save was last
 * synced, a sync that is pulled back from an email link, and the sync that goes out on a
 * timer and when the app is put away. Nothing here waits on the network to play.
 */
export function useCloud(ready: boolean, latest: MutableRefObject<State>) {
  // ── 榜 The ranked server ────────────────────────────────────────────────
  // A player who has signed in is synced when the game opens, every five minutes, and
  // whenever the app is put away. Nothing here waits on the network to play: a sync that
  // fails is a sync that did not happen, and the game goes on exactly as it was.
  const [ranks, setRanks] = useState(false);
  const [who, setWho] = useState<cloud.Who | null>(null);
  const [synced, setSynced] = useState<cloud.Synced | null>(null);
  const [syncedAt, setSyncedAt] = useState<number | null>(null);
  // 拒 Why the last sync came back empty, if it did: a closed account and an unreachable
  // server used to read alike, as "Not synced yet", for a day (speculaether, 2026-10-04).
  const [syncError, setSyncError] = useState<string | null>(null);
  const [cloudPick, setCloudPick] = useState<{ there: State; here: State } | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [place, setPlace] = useState<number | null>(null);
  const pushing = useRef(false);
  const push = useCallback(async (name?: string) => {
    if (pushing.current) return;
    pushing.current = true;
    try {
      const r = await cloud.sync(latest.current, name);
      if ('error' in r) {
        if (r.error !== 'too-soon') setSyncError(r.error);
      } else {
        setSyncError(null);
        setSynced(r); setSyncedAt(Date.now() / 1000);
        cloud.mine().then((m) => setTitle(m?.title ?? null)).catch(() => {});
        cloud.place().then(setPlace).catch(() => {});
      }
    } catch { setSyncError('offline'); /* the next one will do */ }
    pushing.current = false;
  }, []);
  useEffect(() => {
    if (!ready) return;
    // Read before anything else runs: the library takes the link out of the address as
    // soon as it has read it, and after that there is no telling it was ever there.
    const fromLink = cloud.returningFromLink();
    if (!cloud.remembered() && !fromLink) return;
    let live = true;
    (async () => {
      const w = await cloud.who().catch(() => null);
      if (!live || !w) return;
      setWho(w);
      // 雲 Arriving from an email link on a device that may not be the one the cultivator
      // grew up on: if the cloud holds one further along, ask which goes on.
      if (fromLink && !w.guest) {
        const got = await cloud.pull().catch(() => null);
        const there = got?.save ? importSave(JSON.stringify(got.save), now()).state : null;
        history.replaceState(null, '', location.pathname);
        if (there && progressOf(there) > progressOf(latest.current)) {
          setCloudPick({ there, here: latest.current });
          return;
        }
      }
      void push();
    })();
    return () => { live = false; };
  }, [ready, push]);
  useEffect(() => {
    if (!who) return;
    const id = setInterval(() => { void push(); }, 5 * 60 * 1000);
    const away = () => { if (document.visibilityState === 'hidden') void push(); };
    document.addEventListener('visibilitychange', away);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', away); };
  }, [who, push]);

  return {
    ranks, setRanks, who, setWho, synced, setSynced, syncedAt, syncError, setSyncError,
    cloudPick, setCloudPick, title, setTitle, place, setPlace, push,
  };
}
