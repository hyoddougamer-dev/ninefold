import { useEffect, useMemo, useRef, useState } from 'react';
import { fightDeps } from '../memo.ts';
import { BEASTS, comingIn, huntable, plateOf } from '../../data/bestiary.ts';
import { realm as realmOf } from '../../data/realms.ts';
import { beastPower, effectiveBeastPower, isElite, lootFrom, oddsRaw } from '../../sim/combat.ts';
import { ELITE_LOOT, ODDS_CEILING, ODDS_FLOOR } from '../../sim/balance.ts';
import { power, type State } from '../../sim/state.ts';
import { lootTaken } from '../../sim/trials.ts';
import {
  DEEP_INFO, MARK_INFO, deepOf, marksOf, nextDeep, nextMark, stage, recordMaterial, recordPower, recordTally,
} from '../../sim/record.ts';
import { num } from '../../sim/format.ts';
import { Plate } from '../ui/Plate.tsx';
import { Term } from '../ui/Term.tsx';
import { schoolSays } from '../classes.ts';
import { Door } from '../ui/Secret.tsx';
import { isOpen } from '../../sim/unlocks.ts';
import { HUNT, PILE, QOL, UNIT } from '../copy.ts';
import { Bestiary } from './Bestiary.tsx';
import { DriveTag } from '../ui/Drive.tsx';
import { canDrive } from '../../sim/hunt.ts';
import { QuarryBand, WeekTag } from '../ui/Week.tsx';
import { isQuarry, weekLeft, weekOf } from '../../sim/week.ts';
import { ARCHETYPES, RARITIES, RARITY_INFO, SLOTS, SLOT_INFO, schoolOf, type Slot } from '../../data/gear.ts';
import { SCHOOLS, SCHOOL_INFO, type School } from '../../data/schools.ts';
import { oneOf, useRemembered } from '../prefs.ts';
import { gearTile } from '../../art/gear.ts';
import { Svg } from '../ui/Svg.tsx';
import { fateFull, fateOf, fatePromise } from '../../sim/fate.ts';

/**
 * 狩 Free hunting.
 *
 * Common beasts, hunted for material. It is what gives you something to do when the
 * app opens, and a three-month climb needs that. Entering costs nothing and losing
 * punishes nothing; what hunting buys is 材 material, which 妖丹 cores and 丹爐 the
 * furnace both eat.
 *
 * 錄 The bestiary lives at the bottom of this screen rather than on a tab of its own.
 * It is a record of what has been hunted, so it belongs next to the hunting, and the
 * tab it used to hold went to 塔 the tower, which is a place you go rather than a page
 * you read.
 */
type HuntOrder = 'mark' | 'strong' | 'material';
const ORDER_KEY = 'ninefold.huntorder';

export function Hunt({ state, onFight, onDrive, onPile, onAuto, onSecret, onKey }: {
  state: State;
  onFight: (key: string) => void;
  /** 圍 Open the drive sheet for a beast you have 熟 Known. */
  onDrive: (key: string) => void;
  /** 圍 Open the window for the pieces a drive left, which are still waiting for an answer. */
  onPile?: () => void;
  /** 自 Start the auto-hunt on a beast you have 熟 Known, straight from its row. */
  onAuto?: (key: string) => void;
  /** 秘境 Walk through the door, when it is open. */
  onSecret: () => void;
  /** 鑰 Open the shut door with a Realm Key. */
  onKey: () => void;
}) {
  const [record, setRecord] = useState(false);
  const seen = BEASTS.filter((b) => (state.killed[b.key] ?? 0) > 0).length;
  const tally = recordTally(state.killed);
  // 器 Nothing falls before gear opens, so the row says nothing about it either.
  const gearOpen = isOpen(state.realm, 'gear');

  /**
   * 錄 The order is the point of this screen.
   *
   * It used to be every beast you had ever reached, newest first, and by the fifth realm
   * that was fifteen rows all reading 98% of which only the top one was worth pressing.
   * Now a beast with a mark still to earn comes first: newest realm first among those,
   * and the ones with nothing left in them sink to the bottom and go quiet.
   */
  const [showDone, setShowDone] = useState(false);

  // 出 The commons of this realm that have not walked out yet.
  const coming = comingIn(state.realm, state.layer);

  /**
   * 序 And the order can be asked for. rekaris, on the Discord: *"I would expect the first
   * enemy in the list to either be the strongest, or the one dropping the most materials,
   * now it is neither."* The order below is right for somebody learning the hunt and wrong
   * for somebody farming it, so both are offered and the choice stays on the device.
   *
   * 序 And the order asked for is the order shown. A finished beast used to fold away at
   * the bottom whatever the order, so Strongest put the strongest beast last once it was
   * mastered, which is exactly the one a farmer wants. Only 印 Next mark folds.
   */
  const [order, setOrder] = useState<HuntOrder>(() => {
    try { const o = localStorage.getItem(ORDER_KEY); return o === 'strong' || o === 'material' ? o : 'mark'; } catch { return 'mark'; }
  });
  const pickOrder = (o: HuntOrder) => {
    setOrder(o);
    try { localStorage.setItem(ORDER_KEY, o); } catch { /* a private window keeps it for the visit */ }
  };
  const sorted = useMemo(() => {
    const all = [...huntable(state.realm, state.layer)];
    const pay = new Map(all.map((b) => [b.key, lootFrom(state, b)]));
    return all.sort((a, b) => {
      // A mark still to earn first, then only the deep marks left, then nothing left.
      const left = (x: typeof a) => stage(state.killed[x.key] ?? 0);
      if (order === 'strong') return beastPower(b) - beastPower(a);
      if (order === 'material') return (pay.get(b.key) ?? 0) - (pay.get(a.key) ?? 0) || beastPower(b) - beastPower(a);
      // 弱 Weakest first inside a realm, not alphabetical. At the first realm the
      // alphabet put 澤蛙 the frog (the hardest of the three) at the top, so a new
      // cultivator's first sight of 狩 was the one beast furthest out of reach.
      return left(a) - left(b) || b.realm - a.realm || beastPower(a) - beastPower(b);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.realm, state.layer, state.killed, order, weekOf(state.at)]);

  /**
   * 完 And the finished ones are folded, not listed.
   *
   * Sorting them to the bottom was the first half of this and it was not enough.
   * Measured over a whole climb: the ninth realm's hunt screen offers **25 beasts, 13 of
   * them with every mark earned**, and a screen of twenty-five rows is a screen nobody
   * reads, however well it is ordered. What is still a question stays on top as cards;
   * what is done goes behind one line that says how many, and opens if you want it.
   */
  // 精 絕 A beast at 通 still has the deep marks ahead, so it is not finished until they are
  // earned too. rekaris, on the Discord: *"My beasts are marked as 'finished' despite the
  // new milestones."*
  const finished = (b: (typeof BEASTS)[number]) => stage(state.killed[b.key] ?? 0) === 2;

  /**
   * 篩 And by what a beast leaves: the place on the body and the school. rekaris, on the
   * Discord: *"Fortune + Ring -> enemies that drop a fortune ring."* A beast shows if one
   * piece it leaves is both. Remembered on the device, like the chest's filters.
   */
  const [want, setWant] = useRemembered<'any' | Slot>('hunt.slot', 'any', oneOf(['any', ...SLOTS] as const));
  const [kin, setKin] = useRemembered<'any' | School>('hunt.school', 'any', oneOf(['any', ...SCHOOLS] as const));
  const leavesOf = (b: (typeof BEASTS)[number]) => b.leaves.flatMap((a) => {
    const arch = ARCHETYPES.find((x) => x.key === a);
    if (!arch) return [];
    const piece = { id: 'l', template: `${a}${Math.min(b.realm, state.realm)}`, rarity: RARITIES[0], rolls: [] };
    return [{ slot: arch.slot, school: schoolOf(piece) }];
  });
  const offeredSlots = gearOpen ? SLOTS.filter((x) => x === want || sorted.some((b) => leavesOf(b).some((l) => l.slot === x))) : [];
  const offeredSchools = gearOpen ? SCHOOLS.filter((x) => x === kin || sorted.some((b) => leavesOf(b).some((l) => l.school === x))) : [];
  const filtering = gearOpen && (want !== 'any' || kin !== 'any');
  // 見 A chip picked further along a row that scrolls sideways is scrolled to, so a filter
  // remembered from last time is in sight and not hidden off the edge of a phone.
  const filterRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    filterRef.current?.querySelectorAll<HTMLElement>('.hfrow').forEach((row) => {
      const on = row.querySelector<HTMLElement>('button[aria-pressed="true"]');
      if (!on) return;
      const left = on.offsetLeft;              // .hfrow is positioned, so this is within the row
      if (left < row.scrollLeft || left + on.offsetWidth > row.scrollLeft + row.clientWidth) {
        row.scrollLeft = Math.max(0, left + on.offsetWidth - row.clientWidth + 8);
      }
    });
  }, [want, kin, gearOpen]);
  const shown = filtering
    ? sorted.filter((b) => leavesOf(b).some((l) => (want === 'any' || l.slot === want) && (kin === 'any' || l.school === kin)))
    : sorted;

  // 序 Only the learning order folds; the two farming orders keep every beast in place.
  const folds = order === 'mark';
  const open = shown.filter((b) => !folds || !finished(b));
  /**
   * 算 Each beast's odds, once. oddsRaw fights forty-one times to answer, and the count in
   * the heading and the figure on every row both need it: asked twice, the hunt screen
   * took half a second to open on a phone with a slow processor.
   */
  // Keyed on what a fight reads, not on the whole state: the qi moves every second and
  // does not change a single fight, so keying on it redid the work once a second.
  const raws = useMemo(() => new Map(sorted.map((b) => [b.key, oddsRaw(state, b)])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sorted, ...fightDeps(state)]);
  const beatable = sorted.filter((b) => (raws.get(b.key) ?? 0) > 0).length;
  const done = folds ? shown.filter(finished) : [];
  const list = showDone ? [...open, ...done] : open;

  return (
    <>
      <div className="row">
        <span className="faint" style={{ fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase' }}>
          狩 Hunt
        </span>
        <span className="mono" style={{ fontSize: 13, color: 'var(--gold)' }}><Term han="材" plain /> {num(state.materials)}</span>
      </div>
      <p className="faint" style={{ margin: '6px 0 4px', fontSize: 13 }}>
        <Term han="力" /> {num(power(state))} power. {HUNT.free}
      </p>

      {/* 圍 What the last drive left, still waiting for the player. */}
      {state.pile.length > 0 && onPile && (
        <button type="button" className="pilewait" data-qol="pile-waiting" onClick={onPile}>
          <b className="cjk">圍</b>
          <span><em>{PILE.waiting(state.pile.length)}</em><i>{PILE.waitingSays}</i></span>
          <span className="go">{PILE.open}</span>
        </button>
      )}

      {/* 秘境 The door, at the top of the hunt because a secret realm is a hunt with a
          shape. It says when it opens again rather than going away, because it waits. */}
      {isOpen(state.realm, 'secret') && <Door state={state} onEnter={onSecret} onKey={onKey} />}

      {/* 直 The record is the page's second question, and a new cultivator has not asked
          its first one yet. Bruno: *"é preciso ser mais intuitivo."* Before the first
          kill it was three zeroes and two ×1.00 standing between the player and the rat
          the guide points at. It arrives with the first thing it has to count. */}
      {tally[0] > 0 && <div className="tally">
        {MARK_INFO.map((m, i) => (
          <span key={m.han} data-on={tally[i] > 0}>
            <b className="cjk">{m.han}</b>
            <em className="mono">{tally[i]}<i>/{BEASTS.length}</i></em>
            <i>{m.name}</i>
          </span>
        ))}
        {/* 通 The record pays twice and only said so once. A cultivator with a mastered
            beast was being given power by a page that never mentioned power. */}
        <span className="pay">
          <b className="mono">×{recordMaterial(state.killed).toFixed(2)}</b>
          <i>{HUNT.paysMaterial}</i>
        </span>
        <span className="pay">
          <b className="mono">×{recordPower(state.killed).toFixed(2)}</b>
          <i>{HUNT.paysPower}</i>
        </span>
      </div>}

      {/* 期 The week's quarry, above the list rather than inside it. The sort below is
          about what still has a mark to earn, which is a permanent question, and this is
          a question that expires on Monday. Two different questions, two places. */}
      <QuarryBand state={state} onFight={onFight} />

      <div className="huntrow">
        <h2 className="heading">{HUNT.reach(sorted.length, beatable)}</h2>
        <div className="huntorder" role="group" aria-label={HUNT.orderBy}>
          {(['mark', 'strong', 'material'] as const).map((o) => (
            <button key={o} data-on={order === o} aria-pressed={order === o} onClick={() => pickOrder(o)}>{HUNT.order[o]}</button>
          ))}
        </div>
      </div>
      {/* 篩 What it leaves: two rows, a place and a school, under the order. */}
      {gearOpen && sorted.length > 0 && (
        <div className="huntfilter" data-qol="hunt-filter" ref={filterRef}>
          <div className="hfrow" role="group" aria-label={QOL.hunt.byPlace}>
            <span className="hflab">{QOL.hunt.leavesLabel}</span>
            <button type="button" aria-pressed={want === 'any'} onClick={() => setWant('any')}>{QOL.hunt.anyPlace}</button>
            {offeredSlots.map((x) => (
              <button key={x} type="button" aria-pressed={want === x} onClick={() => setWant(want === x ? 'any' : x)}>
                <span className="cjk">{SLOT_INFO[x].han}</span> {SLOT_INFO[x].name}
              </button>
            ))}
          </div>
          <div className="hfrow" role="group" aria-label={QOL.hunt.bySchool}>
            <span className="hflab" aria-hidden="true" />
            <button type="button" aria-pressed={kin === 'any'} onClick={() => setKin('any')}>{QOL.hunt.anySchool}</button>
            {offeredSchools.map((x) => (
              <button key={x} type="button" aria-pressed={kin === x} onClick={() => setKin(kin === x ? 'any' : x)}
                style={{ ['--hue' as string]: SCHOOL_INFO[x].colour }}>
                <span className="cjk">{SCHOOL_INFO[x].seal}</span> {SCHOOL_INFO[x].short}
              </button>
            ))}
          </div>
          {filtering && <p className="faint hfsays">{shown.length === 0 ? QOL.hunt.noneLeave : QOL.hunt.leaveThat(shown.length, sorted.length)}</p>}
        </div>
      )}
      <div className="stack">
        {list.map((b, i) => {
          const r = realmOf(b.realm);
          /**
           * 誠 Out of reach is not two per cent.
           *
           * The floor under the quoted odds is there so a run of bad seeds does not read
           * as hopeless, and it was quietly flattening the whole first realm: the rat at
           * twice your power, the hound at six times and the frog at twelve all said the
           * same 2%, on the one screen whose entire job is choosing between them. A beast
           * that wins none of its sampled fights now says how far off it is instead.
           */
          const raw = raws.get(b.key) ?? oddsRaw(state, b);
          const c = Math.max(ODDS_FLOOR, Math.min(ODDS_CEILING, raw));
          const gap = effectiveBeastPower(state, b) / Math.max(1e-9, power(state));
          const tone = raw <= 0 ? 'var(--faint)'
            : c > 0.66 ? 'var(--jade)' : c > 0.33 ? 'var(--gold)' : 'var(--cinnabar)';
          const kills = state.killed[b.key] ?? 0;
          const marks = marksOf(kills);
          const next = nextMark(kills);
          return (
            /* 指 The sort already puts the beast worth pressing at the top, so that is
               the row 引 the guide points its arrow at. */
            <button key={b.key} className="beast" data-done={finished(b)} data-farm={!folds || undefined}
              data-coach={i === 0 ? 'beast-first' : undefined}
              onClick={() => onFight(b.key)}>
              {/* 牌 The plate, not the seal: thirty-six paintings exist now, and the
                  hunt list is the screen they are for. Where a file is missing the
                  frame keeps the silhouette, so this is safe for the nine heavens and
                  for anything painted later. */}
              <Plate kind="beast" subject={plateOf(b)} icon={b.icon} colour={r.colour}
                tier={b.warden ? 2 : 1} size={46} alt={b.name} />
              <span className="bname">
                <b style={{ color: r.colour }}>{b.han}</b>
                <i>
                  {b.name} · <span className="nw">力 {num(effectiveBeastPower(state, b))} {UNIT.power}</span> · <span className="nw">材 {num(lootTaken(state, lootFrom(state, b)))} {UNIT.material}</span>
                </i>
                {/* 期 And the same chip on the row, because the band at the top is not
                    where somebody scrolling a list of twenty-five is looking. */}
                {isQuarry(state, b) && <WeekTag left={weekLeft(state)} />}
                {/* 霸 The elite says so, because its power reads like a mistake otherwise. */}
                {isElite(b) && (
                  <span className="etag"><b className="cjk">{HUNT.elite(ELITE_LOOT).han}</b>
                    <i>{HUNT.elite(ELITE_LOOT).name} · {HUNT.elite(ELITE_LOOT).note}</i></span>
                )}
                {/* 註 The pips are the characters, so they are the tappable ones. A
                    second copy of 見 in the sentence beside them was the screen naming
                    the same thing twice on the same line. */}
                <span className="marks">
                  {MARK_INFO.map((m, i) => (
                    <em key={m.han} data-on={i < marks}><Term han={m.han} /></em>
                  ))}
                  {/* 註 The mark leads as a character you can tap, then the count and
                      the name. What it pays is on the same screen, once, rather than on
                      every one of twenty-five rows. */}
                  {/* 精 絕 Past 通, the deep marks: this beast pays most for them, every beast a little. */}
                  {!next && DEEP_INFO.map((m, i) => (
                    <em key={m.han} data-on={i < deepOf(kills)} data-deep><Term han={m.han} /></em>
                  ))}
                  <i className="mono">
                    {next ? HUNT.toward(kills, next.at, MARK_INFO[next.index].name)
                      : nextDeep(kills) ? HUNT.deepToward(kills, nextDeep(kills)!.at, DEEP_INFO[nextDeep(kills)!.index].name)
                      : HUNT.mastered}
                  </i>
                </span>
              </span>
              <span className="odds" style={{ color: tone }}>
                {raw > 0 ? `${Math.round(c * 100)}%` : `×${gap < 10 ? gap.toFixed(1) : Math.round(gap)}`}
                <em>{raw > 0 ? HUNT.odds : HUNT.toReach}</em>
              </span>
              {/* 圍 Ten wins earn the right to stop tapping. The tag sits inside the
                  row but swallows its own click, so the row still fights once. */}
              {/* 自 Auto on the row, by the same rule as the verdict's: Known, never a warden.
                  It swallows its own click like the drive tag, so the row still fights once.
                  The two tags stand one above the other, so the name column keeps its width. */}
              {canDrive(state, b) && (
                <span className="rowtags">
                  <DriveTag onOpen={() => onDrive(b.key)} />
                  {onAuto && (
                    <span className="autotag" role="button" tabIndex={0} aria-label={`自 ${QOL.hunt.autoSays(b.name)}`}
                      title={QOL.hunt.autoSays(b.name)} data-qol="row-auto"
                      onClick={(e) => { e.stopPropagation(); onAuto(b.key); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); e.preventDefault(); onAuto(b.key); } }}>
                      <b className="cjk">自</b><i>{QOL.hunt.auto}</i>
                    </span>
                  )}
                </span>
              )}
              {/* 行 Under the row, across its whole width: the name column is too narrow at
                  320 to hold three pieces and a bar beside the odds. */}
                {/* 物 What this beast leaves, drawn as it would fall to you now: its
                  lineage is the older of its realm and yours. */}
              {gearOpen && (
                <span className="bleaves">
                  <i>{HUNT.leaves}</i>
                  {b.leaves.map((a) => {
                    const arch = ARCHETYPES.find((x) => x.key === a);
                    if (!arch) return null;
                    // 職 And which school each piece is, so a cultivator after 運 Fortune
                    // pieces can see who leaves them. rekaris, on the Discord: *"I am looking
                    // for fortune pieces, but I don't know which monsters drop them."*
                    const piece = { id: 'l', template: `${a}${Math.min(b.realm, state.realm)}`,
                      rarity: RARITIES[fatePromise(state, b)], rolls: [] };
                    const key = schoolOf(piece);
                    const sc = SCHOOL_INFO[key];
                    return (
                      <em key={a}>
                        <Svg html={gearTile(piece, { size: 26 })} />
                        <span><b className="cjk lsch" style={{ color: sc.colour }}>
                          {/* 註 Hover or tap the seal and it says which school, in English.
                              rekaris: *"it would be great if I could hover over it and know what it is."* */}
                          <Term han={sc.seal} plain entry={{ han: sc.seal, name: `${sc.short} school`, note: schoolSays(key) }} />
                        </b> {QOL.slotted(arch.name, SLOT_INFO[arch.slot].name)}</span>
                      </em>
                    );
                  })}
                </span>
              )}
              {/* 緣 The bond: how many wins to a certain piece, and what it promises. */}
              {gearOpen && (() => {
                const f = fateOf(state, b.key);
                return (
                  <span className="bfate">
                    <b className="cjk"><Term han="緣" /></b>
                    <span className="bar"><i style={{ width: `${(f.n / fateFull(state)) * 100}%` }} /></span>
                    <i>{HUNT.bond(f.n, fateFull(state), RARITY_INFO[RARITIES[fatePromise(state, b)]].name)}</i>
                  </span>
                );
              })()}
            </button>
          );
        })}
      </div>
      {/* 完 The fold. It says the number and what they are still good for, so a player
          who wants the material knows where it went and everyone else reads one line
          instead of thirteen rows. */}
      {done.length > 0 && (
        <div className="folded">
          <button className="foldbtn" onClick={() => setShowDone((x) => !x)}>
            <b className="cjk">完</b>
            <i>{HUNT.finished(done.length)}</i>
            <em>{showDone ? HUNT.hideFinished : HUNT.showFinished}</em>
          </button>
          {!showDone && <p className="faint">{HUNT.finishedWhy}</p>}
        </div>
      )}

      {/* 出 What has not walked out yet. A beast held back and not shown is a beast
          taken away; shown, it is the next thing to climb toward, which is the same
          argument as a locked tab, and the reason locked tabs are drawn rather than
          hidden. */}
      {coming.length > 0 && (
        <div className="coming">
          <h2 className="heading" style={{ margin: '18px 0 8px' }}>出 {HUNT.coming}</h2>
          {coming.map((b) => {
            const r = realmOf(b.realm);
            return (
              <div key={b.key} className="row">
                <Plate kind="beast" subject={plateOf(b)} icon={b.icon} colour={r.colour}
                  tier={b.warden ? 2 : 1} size={46} alt={b.name} />
                <span className="bname">
                  <b style={{ color: r.colour }}>{b.han}</b>
                  <i>{b.name}</i>
                </span>
                <span className="at mono">{HUNT.walksOut(b.layer + 1)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* 註 The three marks stand beside the line instead of inside a paragraph
          explaining them. Each one answers for itself when tapped, from the same table
          釋 the key draws. See glossary.ts. */}
      <p className="faint" style={{ margin: '10px 0 0', fontSize: 12.5 }}>
        {HUNT.record}{' '}
        <Term han="見" /> <Term han="熟" /> <Term han="通" />
      </p>

      <button className="fold" data-open={record} onClick={() => setRecord((x) => !x)}>
        <span className="cjk">錄</span>
        <span>Bestiary</span>
        <span className="mono faint">{seen} / {BEASTS.length}</span>
      </button>
      {record && <Bestiary state={state} />}
    </>
  );
}
