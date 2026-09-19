import {
  RARITY_INFO, SLOTS, SLOT_INFO, setBonus, templateOf, wornRarity,
  type Item, type Slot,
} from '../../data/gear.ts';
import { CHEST_LIMIT, FUSE_COUNT, fusable } from '../../sim/chest.ts';
import type { State } from '../../sim/state.ts';
import { num } from '../../sim/format.ts';
import { realm as realmOf } from '../../data/realms.ts';
import { portrait } from '../../art/aura.ts';
import { gearTile, wornRim } from '../../art/gear.ts';
import { Svg } from '../ui/Svg.tsx';

/**
 * 器 The gear screen — the ring.
 *
 * The six slots orbit the cultivator, which is the layout Bruno chose and the one the
 * art was already heading toward: by the sixth realm the aura itself has an orbit ring,
 * so the gear turning on the same circle costs nothing to justify.
 *
 * An empty slot is drawn dashed and faint on purpose: you have to see that it is empty
 * as fast as you see what is full.
 */
export function Gear({ state, pulse, onEquip, onUnequip, onFuse }: {
  state: State;
  pulse: number;
  onEquip: (item: Item) => void;
  onUnequip: (slot: Slot) => void;
  onFuse: (template: string, rarity: string) => void;
}) {
  const r = realmOf(state.realm);
  const bonus = setBonus(state.worn);
  const best = wornRarity(state.worn);
  const groups = fusable(state.chest);
  const S = 200;

  return (
    <>
      <div className="row">
        <span className="faint" style={{ fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase' }}>
          器 Gear
        </span>
        <span className="mono" style={{ fontSize: 12.5 }}>
          <b style={{ color: 'var(--cyan)' }}>力 ×{bonus.power.toFixed(2)}</b>
          <b style={{ color: 'var(--gold)', marginLeft: 10 }}>氣 ×{bonus.rate.toFixed(2)}</b>
        </span>
      </div>

      <div className="wheel">
        <div className="wring" />
        <div className="wcore">
          <svg viewBox={`0 0 ${S} ${S}`} width="100%" height="100%">
            <g dangerouslySetInnerHTML={{
              __html: portrait({ realm: state.realm, pulse })
                .replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, ''),
            }} />
            <g dangerouslySetInnerHTML={{ __html: wornRim(best, S) }} />
          </svg>
        </div>
        {SLOTS.map((slot, i) => {
          const a = (i / SLOTS.length) * Math.PI * 2 - Math.PI / 2;
          const x = 50 + Math.cos(a) * 38;
          const y = 50 + Math.sin(a) * 38;
          const item = state.worn[slot];
          return (
            <button
              key={slot}
              className="orb"
              style={{ left: `${x}%`, top: `${y}%` }}
              onClick={() => item && onUnequip(slot)}
              aria-label={item ? `Remove ${templateOf(item).name}` : `${SLOT_INFO[slot].name}, empty`}
            >
              <Svg html={gearTile(item, { size: 54, slot, spin: pulse })} />
            </button>
          );
        })}
      </div>

      {best && (
        <p className="faint" style={{ fontSize: 12.5, textAlign: 'center', margin: 0 }}>
          Your rarest piece is <span className="cjk" style={{ color: RARITY_INFO[best].colour }}>
            {RARITY_INFO[best].han}</span> — it shows as the rim around you.
        </p>
      )}

      {groups.length > 0 && (
        <>
          <h2 className="heading">煉 Fuse · three become one</h2>
          <div className="stack">
            {groups.map((g) => {
              const tpl = templateOf({ id: '', template: g.template, rarity: g.rarity, percent: 0 });
              const rar = RARITY_INFO[g.rarity];
              return (
                <button key={`${g.template}-${g.rarity}`} className="beast" onClick={() => onFuse(g.template, g.rarity)}>
                  <span className="seal" style={{ width: 44, height: 44 }}>
                    <Svg html={gearTile({ id: 'x', template: g.template, rarity: g.rarity, percent: 0 }, { size: 44 })} />
                  </span>
                  <span className="bname">
                    <b style={{ color: rar.colour }}>{tpl.han}</b>
                    <i>{tpl.name} · {g.count} in the chest</i>
                  </span>
                  <span className="odds" style={{ color: 'var(--cyan)' }}>
                    {FUSE_COUNT}→1<em>fuse</em>
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      <h2 className="heading">
        藏 Chest
        <span className="mono" style={{
          float: 'right',
          color: state.chest.length >= CHEST_LIMIT ? 'var(--magenta)' : 'var(--faint)',
        }}>
          {state.chest.length} / {CHEST_LIMIT}
        </span>
      </h2>

      {state.chest.length === 0 ? (
        <p className="faint" style={{ fontSize: 13, margin: 0 }}>
          Empty. Beasts drop gear — wardens always do.
        </p>
      ) : (
        <div className="chest">
          {state.chest.map((item) => {
            const tpl = templateOf(item);
            const rar = RARITY_INFO[item.rarity];
            const equipped = state.worn[tpl.slot];
            const better = !equipped || item.percent > equipped.percent;
            return (
              <button key={item.id} className="chestit" onClick={() => onEquip(item)}
                      aria-label={`Wear ${tpl.name}`}>
                <Svg html={gearTile(item, { size: 56, spin: pulse })} />
                <span className="pct mono" style={{ color: rar.colour }}>
                  +{item.percent}%{better && <em title="better than what you wear"> ▲</em>}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <p className="faint" style={{ fontSize: 12, marginTop: 12 }}>
        Tap a piece to wear it · tap a ring slot to take it off · {r.name} drops up to
        realm {state.realm} gear · {num(state.materials)} 材 material held
      </p>
    </>
  );
}
