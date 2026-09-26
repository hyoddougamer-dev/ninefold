import { useMemo, useState } from 'react';
import { BEASTS, comingIn, huntable, plateOf } from '../../data/bestiary.ts';
import { realm as realmOf } from '../../data/realms.ts';
import { beastPower, effectiveBeastPower, lootFrom, oddsRaw } from '../../sim/combat.ts';
import { power, type State } from '../../sim/state.ts';
import { lootTaken } from '../../sim/trials.ts';
import {
  MARK_INFO, marksOf, nextMark, recordMaterial, recordPower, recordTally,
} from '../../sim/record.ts';
import { num } from '../../sim/format.ts';
import { Plate } from '../ui/Plate.tsx';
import { Term } from '../ui/Term.tsx';
import { Door } from '../ui/Secret.tsx';
import { isOpen } from '../../sim/unlocks.ts';
import { HUNT } from '../copy.ts';
import { Bestiary } from './Bestiary.tsx';
import { DriveTag } from '../ui/Drive.tsx';
import { canDrive } from '../../sim/hunt.ts';
import { QuarryBand, WeekTag } from '../ui/Week.tsx';
import { isQuarry, weekLeft } from '../../sim/week.ts';

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
export function Hunt({ state, onFight, onDrive, onSecret }: {
  state: State;
  onFight: (key: string) => void;
  /** 圍 Open the drive sheet for a beast you have 熟 Known. */
  onDrive: (key: string) => void;
  /** 秘境 Walk through the door, when it is open. */
  onSecret: () => void;
}) {
  const [record, setRecord] = useState(false);
  const seen = BEASTS.filter((b) => (state.killed[b.key] ?? 0) > 0).length;
  const tally = recordTally(state.killed);

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

  const sorted = useMemo(() => {
    const all = [...huntable(state.realm, state.layer)];
    return all.sort((a, b) => {
      const left = (x: typeof a) => (nextMark(state.killed[x.key] ?? 0) ? 0 : 1);
      // 弱 Weakest first inside a realm, not alphabetical. At the first realm the
      // alphabet put 澤蛙 the frog (the hardest of the three) at the top, so a new
      // cultivator's first sight of 狩 was the one beast furthest out of reach.
      return left(a) - left(b) || b.realm - a.realm || beastPower(a) - beastPower(b);
    });
  }, [state.realm, state.layer, state.killed]);

  /**
   * 完 And the finished ones are folded, not listed.
   *
   * Sorting them to the bottom was the first half of this and it was not enough.
   * Measured over a whole climb: the ninth realm's hunt screen offers **25 beasts, 13 of
   * them with every mark earned**, and a screen of twenty-five rows is a screen nobody
   * reads, however well it is ordered. What is still a question stays on top as cards;
   * what is done goes behind one line that says how many, and opens if you want it.
   */
  const open = sorted.filter((b) => nextMark(state.killed[b.key] ?? 0));
  /**
   * 算 Each beast's odds, once. oddsRaw fights forty-one times to answer, and the count in
   * the heading and the figure on every row both need it: asked twice, the hunt screen
   * took half a second to open on a phone with a slow processor.
   */
  // Keyed on what a fight reads, not on the whole state: the qi moves every second and
  // does not change a single fight, so keying on it redid the work once a second.
  const raws = useMemo(() => new Map(sorted.map((b) => [b.key, oddsRaw(state, b)])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sorted, state.realm, state.layer, state.levels, state.stance, state.sequence, state.worn,
     state.awakened, state.unlocked, state.brewed, state.tribulation]);
  const beatable = sorted.filter((b) => (raws.get(b.key) ?? 0) > 0).length;
  const done = sorted.filter((b) => !nextMark(state.killed[b.key] ?? 0));
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

      {/* 秘境 The door, at the top of the hunt because a secret realm is a hunt with a
          shape. It says when it opens again rather than going away, because it waits. */}
      {isOpen(state.realm, 'secret') && <Door state={state} onEnter={onSecret} />}

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

      <h2 className="heading">{HUNT.reach(sorted.length, beatable)}</h2>
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
          const c = Math.max(0.02, Math.min(0.98, raw));
          const gap = effectiveBeastPower(state, b) / Math.max(1e-9, power(state));
          const tone = raw <= 0 ? 'var(--faint)'
            : c > 0.66 ? 'var(--jade)' : c > 0.33 ? 'var(--gold)' : 'var(--cinnabar)';
          const kills = state.killed[b.key] ?? 0;
          const marks = marksOf(kills);
          const next = nextMark(kills);
          return (
            /* 指 The sort already puts the beast worth pressing at the top, so that is
               the row 引 the guide points its arrow at. */
            <button key={b.key} className="beast" data-done={!next}
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
                  {b.name} · 力 {num(beastPower(b))} · 材 {num(lootTaken(state, lootFrom(state, b)))}
                </i>
                {/* 期 And the same chip on the row, because the band at the top is not
                    where somebody scrolling a list of twenty-five is looking. */}
                {isQuarry(state, b) && <WeekTag left={weekLeft(state)} />}
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
                  <i className="mono">
                    {next ? HUNT.toward(kills, next.at, MARK_INFO[next.index].name) : HUNT.mastered}
                  </i>
                </span>
              </span>
              <span className="odds" style={{ color: tone }}>
                {raw > 0 ? `${Math.round(c * 100)}%` : `×${gap < 10 ? gap.toFixed(1) : Math.round(gap)}`}
                <em>{raw > 0 ? HUNT.odds : HUNT.toReach}</em>
              </span>
              {/* 圍 Ten wins earn the right to stop tapping. The tag sits inside the
                  row but swallows its own click, so the row still fights once. */}
              {canDrive(state, b) && <DriveTag onOpen={() => onDrive(b.key)} />}
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
