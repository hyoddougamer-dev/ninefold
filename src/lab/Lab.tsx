import { useCallback, useEffect, useMemo, useState } from 'react';
import { BEASTS, type Beast } from '../data/bestiary.ts';
import { REALMS, realm as realmOf } from '../data/realms.ts';
import { beastPower, fight, odds } from '../sim/combat.ts';
import { newState, power, type State } from '../sim/state.ts';
import { num } from '../sim/format.ts';
import { rollDrop } from '../sim/drops.ts';
import { Arena, BEAT_MS, beatsIn, type Battle } from '../app/ui/Arena.tsx';
import { ARTS, STANCES, SEQUENCE_SLOTS, WARDEN_ART } from '../data/arts.ts';

/**
 * 戰場 The arena bench.
 *
 * A second entry point that renders the game's *own* Arena with the knobs a fight
 * normally hides behind three months of play: pick the realm, pick the beast, set how
 * even the match is, and watch it again at whatever speed you like.
 *
 * It imports the real component rather than reproducing it. A test bench that drifts
 * from the thing it tests is worse than none, because it tells you a fight looks right
 * when it no longer does.
 */

/** Powers of ten around an even match, so a blowout and a nail-biter are one tap apart. */
const MATCH = [
  { k: 'crush', han: '碾', label: 'You crush it', mult: 2.6 },
  { k: 'ahead', han: '優', label: 'You are ahead', mult: 1.35 },
  { k: 'even', han: '均', label: 'An even match', mult: 1 },
  { k: 'behind', han: '劣', label: 'You are behind', mult: 0.74 },
  { k: 'doomed', han: '敗', label: 'You have no chance', mult: 0.38 },
] as const;

const SPEEDS = [
  { label: '¼×', mult: 4 },
  { label: '½×', mult: 2 },
  { label: '1×', mult: 1 },
] as const;

/** Every warden down, so the bench can reach for any art without a climb first. */
const ALL_WARDENS = Object.fromEntries(Object.keys(WARDEN_ART).map((k) => [k, 1]));

/** A cultivator whose power lands where the dial asks, found rather than guessed. */
function cultivatorFor(
  realm: number, beast: Beast, mult: number, stance: string | null, sequence: string[],
): State {
  const want = beastPower(beast) * mult;
  const at = (technique: number): State => ({
    ...newState(0),
    realm,
    layer: 8,
    levels: { technique, method: 0, pills: 0, cores: 0 },
    killed: ALL_WARDENS,
    stance,
    sequence,
  });
  let best = at(0);
  for (let t = 0; t <= 200; t++) {
    if (Math.abs(power(at(t)) - want) < Math.abs(power(best) - want)) best = at(t);
  }
  return best;
}

export function Lab() {
  const [realm, setRealm] = useState(6);
  const [beastKey, setBeastKey] = useState('centipede');
  const [match, setMatch] = useState<typeof MATCH[number]['k']>('even');
  const [speed, setSpeed] = useState(1);
  const [stance, setStance] = useState<string | null>(null);
  const [sequence, setSequence] = useState<string[]>([]);
  const [seed, setSeed] = useState(1);
  const [battle, setBattle] = useState<Battle | null>(null);
  const [pulse, setPulse] = useState(0);

  const beast = useMemo(() => BEASTS.find((b) => b.key === beastKey) ?? BEASTS[0], [beastKey]);
  const mult = MATCH.find((m) => m.k === match)!.mult;
  const hero = useMemo(
    () => cultivatorFor(realm, beast, mult, stance, sequence),
    [realm, beast, mult, stance, sequence],
  );

  const start = useCallback(() => {
    const s = (seed * 2654435761) >>> 0;
    setBattle({
      beast,
      outcome: fight(hero, beast, s),
      beat: 0,
      over: false,
      drop: rollDrop(beast, realm, s ^ 0x9e3779b9, { chance: 100, luck: 0, always: true }),
    });
  }, [beast, hero, realm, seed]);

  // The portrait breathes here too, or the cultivator stands frozen between beats.
  useEffect(() => {
    const id = setInterval(() => setPulse((p) => (p + 0.04) % 1), 90);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!battle || battle.over) return;
    const id = setTimeout(() => {
      setBattle((b) => {
        if (!b) return b;
        const next = b.beat + 1;
        return next >= beatsIn(b.outcome)
          ? { ...b, beat: beatsIn(b.outcome) - 1, over: true }
          : { ...b, beat: next };
      });
    }, BEAT_MS * speed);
    return () => clearTimeout(id);
  }, [battle, speed]);

  const r = realmOf(realm);
  const chance = Math.round(odds(hero, beast) * 100);

  return (
    <div className="app">
      <div className="sheet">
        <div className="row">
          <span className="faint" style={{ fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase' }}>
            戰場 Arena bench
          </span>
          <span className="mono faint" style={{ fontSize: 12 }}>
            力 {num(power(hero))} vs {num(beastPower(beast))} · {chance}%
          </span>
        </div>

        <p className="faint" style={{ fontSize: 12.5, margin: '6px 0 0' }}>
          The game's own arena, with the knobs a real fight hides. Pick who fights whom,
          how even it is, and how fast it plays — then hit 戰.
        </p>

        <h2 className="heading">Your realm</h2>
        <div className="chips">
          {REALMS.map((x) => (
            <button key={x.n} className="chip" data-on={realm === x.n}
                    style={{ ['--hue' as string]: x.colour }}
                    onClick={() => { setRealm(x.n); setBattle(null); }}>
              <b className="cjk">{x.han}</b>
              <i>{x.n}</i>
            </button>
          ))}
        </div>

        <h2 className="heading">The beast</h2>
        <div className="chips">
          {BEASTS.map((b) => (
            <button key={b.key} className="chip" data-on={beastKey === b.key}
                    style={{ ['--hue' as string]: realmOf(b.realm).colour }}
                    onClick={() => { setBeastKey(b.key); setBattle(null); }}>
              <b className="cjk">{b.han}</b>
              <i>{b.warden ? `warden ${b.realm}` : `realm ${b.realm}`}</i>
            </button>
          ))}
        </div>

        <h2 className="heading">How even</h2>
        <div className="chips">
          {MATCH.map((m) => (
            <button key={m.k} className="chip wide" data-on={match === m.k}
                    style={{ ['--hue' as string]: 'var(--cyan)' }}
                    onClick={() => { setMatch(m.k); setBattle(null); }}>
              <b className="cjk">{m.han}</b>
              <i>{m.label}</i>
            </button>
          ))}
        </div>

        <h2 className="heading">勢 Stance</h2>
        <div className="chips">
          {STANCES.map((x) => (
            <button key={x.key} className="chip" data-on={stance === x.key}
                    style={{ ['--hue' as string]: realmOf(x.realm).colour }}
                    onClick={() => { setStance(stance === x.key ? null : x.key); setBattle(null); }}>
              <b className="cjk">{x.han}</b>
              <i>{x.name}</i>
            </button>
          ))}
        </div>
        {stance && (
          <p className="faint" style={{ fontSize: 12.5, margin: '8px 0 0' }}>
            {STANCES.find((x) => x.key === stance)?.text}
          </p>
        )}

        <h2 className="heading">
          訣 Sequence
          <span className="mono faint" style={{ float: 'right', fontSize: 12 }}>
            {sequence.length} / {SEQUENCE_SLOTS}
          </span>
        </h2>
        <div className="chips">
          {ARTS.map((a) => {
            const at = sequence.indexOf(a.key);
            return (
              <button key={a.key} className="chip" data-on={at >= 0}
                      style={{ ['--hue' as string]: realmOf(a.realm).colour }}
                      title={a.text}
                      onClick={() => {
                        setSequence(at >= 0
                          ? sequence.filter((k) => k !== a.key)
                          : sequence.length < SEQUENCE_SLOTS ? [...sequence, a.key] : sequence);
                        setBattle(null);
                      }}>
                <b className="cjk">{a.han}</b>
                <i>{at >= 0 ? `slot ${at + 1}` : a.name}</i>
              </button>
            );
          })}
        </div>

        <h2 className="heading">Speed</h2>
        <div className="chips">
          {SPEEDS.map((sp) => (
            <button key={sp.label} className="chip" data-on={speed === sp.mult}
                    style={{ ['--hue' as string]: 'var(--gold)' }}
                    onClick={() => setSpeed(sp.mult)}>
              <b>{sp.label}</b>
            </button>
          ))}
        </div>

        <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
          <button className="act" data-tone="magenta" onClick={start}>
            戰 <span>Fight</span>
          </button>
          <button className="act" style={{ maxWidth: 130 }}
                  onClick={() => { setSeed((n) => n + 1); start(); }}>
            擲 <span>Reroll</span>
          </button>
        </div>

        <p className="faint" style={{ fontSize: 12, marginTop: 14 }}>
          {r.han} {r.name} · the scene behind the fight belongs to the beast's realm,
          so fighting down the ladder changes the sky.
        </p>
      </div>

      {battle && (
        <Arena
          battle={battle}
          state={hero}
          pulse={pulse}
          chestFull={false}
          onClose={() => setBattle(null)}
        />
      )}
    </div>
  );
}
