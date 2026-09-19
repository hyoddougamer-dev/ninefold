import {
  AFFIXES, AFFIX_INFO, RARITY_INFO, SECONDARIES, SLOTS, SLOT_INFO, gearTotals,
  primaryOf, templateOf, wornRarity, type Item, type Slot,
} from '../../data/gear.ts';
import { FUSE_COUNT, chestLimit, fusable } from '../../sim/chest.ts';
import { affinity } from '../../sim/dao.ts';
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
  const totals = gearTotals(state.worn, (slot) => affinity(state.unlocked, slot));
  const best = wornRarity(state.worn);
  const groups = fusable(state.chest);
  const limit = chestLimit(state.unlocked, totals.capacity);
  const S = 200;
  const shown = AFFIXES.filter((a) => (AFFIX_INFO[a].unit === 'flat' ? Math.floor(totals[a]) : totals[a]) > 0);

  return (
    <>
      <div className="row">
        <span className="faint" style={{ fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase' }}>
          器 Gear
        </span>
        <span className="mono faint" style={{ fontSize: 12 }}>
          {shown.length} lines worn
        </span>
      </div>

      {shown.length > 0 && (
        <div className="totals">
          {shown.map((a) => (
            <span key={a} className="tot">
              <b className="cjk">{AFFIX_INFO[a].han}</b>
              <em className="mono">
                {AFFIX_INFO[a].unit === '%'
                  ? `+${Math.round(totals[a] * 10) / 10}%`
                  : `+${Math.floor(totals[a])}`}
              </em>
              <i>{AFFIX_INFO[a].label}</i>
            </span>
          ))}
        </div>
      )}

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
              const tpl = templateOf({ id: '', template: g.template, rarity: g.rarity, rolls: [] });
              const rar = RARITY_INFO[g.rarity];
              return (
                <button key={`${g.template}-${g.rarity}`} className="beast" onClick={() => onFuse(g.template, g.rarity)}>
                  <span className="seal" style={{ width: 44, height: 44 }}>
                    <Svg html={gearTile({ id: 'x', template: g.template, rarity: g.rarity, rolls: [] }, { size: 44 })} />
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
          color: state.chest.length >= limit ? 'var(--magenta)' : 'var(--faint)',
        }}>
          {state.chest.length} / {limit}
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
            const worn = state.worn[tpl.slot];
            const primary = primaryOf(item);
            // "Better" is judged on the lines, not on one number: a piece with three
            // useful rolls can beat a bigger single line.
            const weight = (it?: Item) => (it?.rolls ?? []).reduce((s, x) => s + x.value, 0);
            const better = weight(item) > weight(worn);
            return (
              <button key={item.id} className="chestit" onClick={() => onEquip(item)}
                      aria-label={`Wear ${tpl.name}`}>
                <Svg html={gearTile(item, { size: 56, spin: pulse })} />
                <span className="pct mono" style={{ color: rar.colour }}>
                  {primary && <>
                    <span className="cjk">{AFFIX_INFO[primary.affix].han}</span>
                    {Math.round(primary.value * 10) / 10}
                  </>}
                  {item.rolls.length > 1 && <span className="faint"> +{item.rolls.length - 1}</span>}
                  {better && <em title="worth more than what you wear"> ▲</em>}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <p className="faint" style={{ fontSize: 12, marginTop: 12 }}>
        Tap a piece to wear it · tap a ring slot to take it off · a 靈 piece carries
        {' '}{SECONDARIES.spirit + 1} lines, a 天 piece {SECONDARIES.heaven + 1} ·
        {' '}{r.name} drops up to realm {state.realm} gear ·
        {' '}{num(state.materials)} 材 held
      </p>
    </>
  );
}
