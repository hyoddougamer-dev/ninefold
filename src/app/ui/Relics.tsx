import { RELICS, shardBeast, shardsFor, relicPowerOf } from '../../data/relics.ts';
import { realm as realmOf } from '../../data/realms.ts';
import { RELIC_BOND_TILT, RELIC_SHARD_GIFT, RELIC_SHARD_ODDS } from '../../sim/balance.ts';
import { canMakeRelic, made, relicMaterial, relicSeen, relicsOf, shardChance, shardsHeld } from '../../sim/relics.ts';
import { num } from '../../sim/format.ts';
import type { State } from '../../sim/state.ts';
import { icon } from '../../art/icon.ts';
import { RELIC } from '../copy.ts';
import { Svg } from './Svg.tsx';

/** 神器 Whether a beast leaves shards right now, and how many its relic holds: for the hunt row. */
export function shardTag(state: State, key: string): { have: number; need: number; relic: string } | null {
  for (const r of RELICS) {
    if (shardBeast(r.realm).key !== key) continue;
    if (!relicSeen(state, r.realm) || made(state, r.realm)) return null;
    return { have: shardsHeld(state, r.realm), need: shardsFor(r.realm), relic: r.name };
  }
  return null;
}

/**
 * 神器 The relics, as the hunt shows them: a band that says how far along the chase is, and
 * under it, when opened, the nine of them. A relic whose warden has not fallen is a closed
 * row that says what opens it; one that has says its shards, where they fall, its material
 * and what it gives, with the one button that makes it.
 */
export function Relics({ state, open, onToggle, onMake }: {
  state: State;
  open: boolean;
  onToggle: () => void;
  onMake: (realm: number) => void;
}) {
  const r = relicsOf(state);
  const shards = r.shards.reduce((a, b) => a + b, 0);
  return (
    <div className="relics" data-qol="relics">
      <button type="button" className="relicband" aria-expanded={open} onClick={onToggle}>
        <b className="cjk">神器</b>
        <span><em>{RELIC.head}</em><i>{RELIC.band(r.made.length, shards)}</i></span>
        <span className="go">{open ? RELIC.close : RELIC.open}</span>
      </button>
      {open && (
        <div className="reliclist">
          <p className="faint relicintro">{RELIC.intro(Math.round(1 / RELIC_SHARD_ODDS), RELIC_BOND_TILT)}</p>
          {RELICS.map((x) => {
            const colour = realmOf(x.realm).colour;
            const seen = relicSeen(state, x.realm);
            const done = made(state, x.realm);
            if (!seen) {
              return (
                <div key={x.realm} className="relic" data-state="unseen">
                  <span className="rseal" style={{ color: 'var(--faint)' }}><Svg html={icon(x.icon, 26)} /></span>
                  <span className="rbody"><b>?</b><i>{RELIC.unseen(x.realm)}</i></span>
                </div>
              );
            }
            const need = shardsFor(x.realm);
            const have = shardsHeld(state, x.realm);
            const mat = relicMaterial(x.realm);
            const beast = shardBeast(x.realm);
            const chance = shardChance(state, beast);
            return (
              <div key={x.realm} className="relic" data-state={done ? 'made' : 'chase'} style={{ ['--hue' as string]: colour }}>
                <span className="rseal"><Svg html={icon(x.icon, 26)} /></span>
                <span className="rbody">
                  <b><span className="cjk">{x.han}</span> {x.name}</b>
                  <i className="rgift">{RELIC.gift(x.gift, relicPowerOf(x.realm), RELIC_SHARD_GIFT)}</i>
                  {done ? null : (
                    <>
                      <span className="rpips" role="img" aria-label={RELIC.shards(have, need, x.shard.name)}>
                        {Array.from({ length: need }, (_, i) => <i key={i} data-on={i < have} />)}
                        <small>{RELIC.shards(have, need, x.shard.name)} {RELIC.from(beast.name)}</small>
                      </span>
                      <small className="faint">{RELIC.material(num(mat), state.materials < mat)}</small>
                      {have < need && chance > 0 && <small className="faint">{RELIC.chance(Math.round(1 / chance))}</small>}
                      <small className="faint rlore">{x.lore}</small>
                    </>
                  )}
                </span>
                {done
                  ? <span className="rmade">{RELIC.made}</span>
                  : <button type="button" className="act small" disabled={!canMakeRelic(state, x.realm)}
                    onClick={() => onMake(x.realm)}>{RELIC.make}</button>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
