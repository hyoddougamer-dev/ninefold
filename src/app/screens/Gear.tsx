import {
  AFFIXES, AFFIX_INFO, RARITY_INFO, SECONDARIES, SET_STEPS, SLOTS, SLOT_INFO,
  activeSets, primaryOf, templateOf, wornRarity, wornTotals, type Affix, type Item, type Slot,
} from '../../data/gear.ts';
import { FUSE_COUNT, chestLimit, fusable } from '../../sim/chest.ts';
import { canRefine, refinePrice } from '../../sim/trials.ts';
import { REFINE_GAIN, REFINE_LIMIT, clampRefine } from '../../sim/refine.ts';
import { num } from '../../sim/format.ts';
import { affinity } from '../../sim/dao.ts';
import type { State } from '../../sim/state.ts';
import { realm as realmOf } from '../../data/realms.ts';
import { portrait } from '../../art/aura.ts';
import { gearTile, wornRim } from '../../art/gear.ts';
import { Svg } from '../ui/Svg.tsx';
import { GEAR } from '../copy.ts';

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
export function Gear({ state, pulse, onEquip, onUnequip, onFuse, onRefine }: {
  state: State;
  pulse: number;
  onEquip: (item: Item) => void;
  onUnequip: (slot: Slot) => void;
  onFuse: (template: string, rarity: string) => void;
  /** 煉器 Refining the piece in a slot. Paid in 材 material and never in qi. */
  onRefine: (slot: Slot) => void;
}) {
  const totals = wornTotals(state.worn, (slot) => affinity(state.unlocked, slot));
  const sets = activeSets(state.worn);
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
          Your best piece is <span className="cjk" style={{ color: RARITY_INFO[best].colour }}>
            {RARITY_INFO[best].han}</span>. That is the rim you are wearing.
        </p>
      )}

      {/* 煉器 Where material goes. Everything else it buys is capped; this is not. */}
      {SLOTS.some((slot) => state.worn[slot]) && (
        <>
          <div className="row" style={{ marginTop: 18 }}>
            <h2 className="heading" style={{ margin: 0 }}>{GEAR.refineHead}</h2>
            <span className="mono" style={{ fontSize: 13, color: 'var(--gold)' }}>材 {num(state.materials)}</span>
          </div>
          <p className="faint" style={{ fontSize: 12.5, margin: '4px 0 8px' }}>{GEAR.refine}</p>
          <div className="stack">
            {SLOTS.filter((slot) => state.worn[slot]).map((slot) => {
              const item = state.worn[slot]!;
              const level = clampRefine(item.refine);
              const price = refinePrice(state, slot) ?? 0;
              const maxed = level >= REFINE_LIMIT;
              return (
                <button
                  key={slot}
                  className="refine"
                  disabled={maxed || !canRefine(state, slot)}
                  onClick={() => onRefine(slot)}
                >
                  <span className="tile"><Svg html={gearTile(item, { size: 40, slot })} /></span>
                  <span className="rname">
                    <b className="cjk" style={{ color: RARITY_INFO[item.rarity].colour }}>
                      {templateOf(item).han}
                    </b>
                    <i>{templateOf(item).name}</i>
                    <em>{GEAR.refineAt(level, Math.round(((1 + REFINE_GAIN) ** level - 1) * 100))}</em>
                  </span>
                  <span className="price">
                    <b>{maxed ? '滿' : `+${num(price)}`}</b>
                    <i className="tag">{maxed ? '' : '材'}</i>
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* 系 What lineage you are wearing. A set is the realm, so any shape of it counts. */}
      {sets.length > 0 && (
        <>
          <h2 className="heading">系 Sets</h2>
          <p className="faint" style={{ fontSize: 12.5, margin: '0 0 8px' }}>{GEAR.sets}</p>
          <div className="stack">
            {sets.map(({ set, worn, next }) => {
              const hue = realmOf(set.realm).colour;
              return (
                <div key={set.realm} className="setrow" style={{ ['--hue' as string]: hue }}>
                  <span className="pips" aria-label={`${worn} of ${SLOTS.length} worn`}>
                    {SLOTS.map((_, i) => <i key={i} className={i < worn ? 'on' : ''} />)}
                  </span>
                  <span className="sname">
                    <b className="cjk">{set.han}</b> <em>{set.name}</em>
                    <i>{set.lore}</i>
                  </span>
                  <span className="steps mono">
                    {SET_STEPS.map((n) => {
                      const step = set.steps.find((x) => x.pieces === n)!;
                      const live = worn >= n;
                      return (
                        <span key={n} className={live ? 'step on' : 'step'}>
                          <b>{n}</b>
                          {Object.entries(step.effects).map(([a, v]) => (
                            <em key={a}>
                              <span className="cjk">{AFFIX_INFO[a as Affix].han}</span>
                              {AFFIX_INFO[a as Affix].unit === '%' ? `+${v}%` : `+${v}`}
                            </em>
                          ))}
                        </span>
                      );
                    })}
                  </span>
                  {next && (
                    <span className="need faint">
                      {GEAR.setNeed(next.needs)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {groups.length > 0 && (
        <>
          <h2 className="heading">{GEAR.fuse}</h2>
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
        <p className="faint" style={{ fontSize: 13, margin: 0 }}>{GEAR.empty}</p>
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
                  {better && <em title={GEAR.better}> ▲</em>}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <p className="faint" style={{ fontSize: 12, marginTop: 12, lineHeight: 1.7 }}>
        {GEAR.howTo}<br />
        {GEAR.lines(SECONDARIES.spirit + 1, SECONDARIES.heaven + 1)}{' '}
        {GEAR.drops(state.realm)}
      </p>
    </>
  );
}
