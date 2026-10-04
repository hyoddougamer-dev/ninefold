import { useEffect } from 'react';
import { AFFIX_INFO, RARITY_INFO, SLOT_INFO, templateOf, type Item } from '../../data/gear.ts';
import { lifted, type Stashed } from '../../sim/stash.ts';
import { marksUp } from '../../sim/inspect.ts';
import { demonsFor } from '../../sim/seclusion.ts';
import { QOL } from '../copy.ts';
import { plateOf } from '../../data/bestiary.ts';
import { realm as realmOf } from '../../data/realms.ts';
import type { Beast } from '../../data/bestiary.ts';
import { type Outcome } from '../../sim/combat.ts';
import { DEMON_DAO, HEALTH_PER_POWER } from '../../sim/balance.ts';
import { num } from '../../sim/format.ts';
import { portraitLayers } from '../../art/aura.ts';
import { arenaScene } from '../../art/scene.ts';
import { gearTile } from '../../art/gear.ts';
import { ART_BY_KEY } from '../../data/arts.ts';
import { blowLine, verdictLine } from './blows.ts';
import { Svg } from './Svg.tsx';
import { Plate } from './Plate.tsx';
import { pictureOf } from '../../data/pictures.ts';
import { ARENA, CRAFTS, PLATFORM, SECLUSION, UNIT, meltPays } from '../copy.ts';
import {
  PLATFORM_EDGE, PLATFORM_HOURS, answerOf, beatenNow, challengerOf, challengerPays, temperOf, type Tier,
} from '../../sim/platform.ts';
import { ITEM_BY_KEY, splitKey } from '../../data/crafts.ts';
import { tookPart, type Used } from '../../sim/crafts.ts';
import { burst, float } from '../juice.ts';
import { floorMaterial, lootTaken } from '../../sim/trials.ts';
import { isQuarry, quarryOwed } from '../../sim/week.ts';
import { lootFrom, quarryPaid, seenPaid } from '../../sim/combat.ts';
import { MARK_INFO, marksOf } from '../../sim/record.ts';
import type { State } from '../../sim/state.ts';

/**
 * 對 The facing.
 *
 * The fight is horizontal now, in a place: the beast's own realm behind it, a floor to
 * stand on, and a gap in the middle where the blow lands. What the old window got wrong
 * was not the art. It was that two figures stacked on a translucent scrim over the hunt
 * list reads as a dialog over a list, and a fight has to read as a fight.
 *
 * The sim settles everything the moment you press the button. That is what lets losing
 * cost nothing, so this file's only job is to *play it back*.
 *
 * The one rule of the playback: **a round is two beats, not one**. The sim trades blows
 * simultaneously, which is right for the arithmetic and unwatchable on screen, because
 * both bars twitch at once and you cannot tell who did what. So the same round is shown
 * as the cultivator's strike, then the beast's answer. Nothing about the outcome
 * changes; what changes is that you can see it happen.
 *
 * **玉 jade is you and 硃 cinnabar is the beast, always.** Colour by realm is right for
 * the bestiary and wrong here: at the sixth realm a sixth-realm cultivator and a
 * sixth-realm beast are the same copper, and the two lives become one colour.
 */

export const BEAT_MS = 175;
/** 自 The auto-hunt: blows watched before the skip, and how long a verdict is held. */
const AUTO_WATCH_MS = 450;
const AUTO_VERDICT_MS = 700;
const AUTO_READ_MS = 2200;

/** A blow worth shaking the frame for, as a share of the cultivator's whole health. */
const HEAVY = 0.09;

export interface Battle {
  /** 塔 Which floor of the tower this is, if it is one at all. */
  readonly floor?: number;
  /** 吸 The qi the floor gives up when it falls. Tower fights only. */
  readonly qi?: number;
  /** 心魔 The heart demon: the cultivator's own shape, darkened, and never a kill. */
  readonly demon?: boolean;
  /** 擂 A challenger on the Platform, by position: never a kill, never a drop, on the week's dice. */
  readonly challenger?: Tier;
  readonly beast: Beast;
  readonly outcome: Outcome;
  /** Two beats to a round: even is the cultivator striking, odd is the beast. */
  readonly beat: number;
  readonly over: boolean;
  readonly drop: Item | null;
  /** 造化 A second piece from the same kill, with Creation and the dice. */
  readonly extra?: Item | null;
  /** 業 What was carried into this fight and took part in it; a win spends it. */
  readonly kit?: Used;
  /** 尋 A waiting sure drop was used on this fight, and a win spends it. */
  readonly sought?: boolean;
  /** 續 This fight, among the ones the arena shows without closing (Again, the auto-hunt). */
  readonly id?: number;
}

export type Striker = 'player' | 'beast';

export const roundOf = (beat: number) => Math.floor(beat / 2);
export const strikerOf = (beat: number): Striker => (beat % 2 === 0 ? 'player' : 'beast');

/** How many beats a whole fight lasts. */
export const beatsIn = (o: Outcome) => o.rounds.length * 2;

/**
 * What the bars read at this beat.
 *
 * The cultivator's health only drops on the beast's beat, and the beast's only on the
 * cultivator's, so between the two you can see which blow did which damage.
 */
export function frameAt(o: Outcome, beat: number) {
  // Clamped to the fight's own length: asked for a beat past the end, the last beat is
  // the honest answer. Without this the round clamps but the *striker* does not, and a
  // health bar that has already emptied reads full again.
  const b = Math.max(0, Math.min(beat, beatsIn(o) - 1));
  const i = Math.min(roundOf(b), o.rounds.length - 1);
  const here = o.rounds[i];
  const before = i > 0 ? o.rounds[i - 1] : { playerHealth: 1, beastHealth: 1 };
  const player = strikerOf(b) === 'player';
  return {
    round: i,
    striker: strikerOf(b),
    playerHealth: player ? before.playerHealth : here.playerHealth,
    beastHealth: here.beastHealth,
    damage: player ? here.playerDamage : here.beastDamage,
    // An art belongs to the cultivator's beat. On the beast's beat there is nothing to
    // announce, or the name of the art would hang over the blow that answered it.
    arts: player ? here.arts : [],
    missed: !player && here.missed,
    /** True when this blow took a real bite: the frame shakes only for those. */
    heavy: (player ? here.playerDamage / o.beastPower : here.beastDamage / o.playerPower) / HEALTH_PER_POWER > HEAVY,
  };
}

export function Arena({ battle, state, pulse, onClose, onAgain, onSkip, overflow, auto, onAuto, onAutoNext, onStop, autoLeft = 0, onNext, onWearDrop }: {
  battle: Battle;
  /**
   * 得 The whole state, not only the realm, because what a kill is *worth* depends on
   * the cultivator: 熟 marks and 塔印 seals both multiply what a beast pays, and the
   * arena was showing the table's number while the save was credited the real one.
   */
  state: State;
  pulse: number;
  /** 藏 What a full chest will do with the piece, worked out by the same stash() that does it. */
  overflow: Stashed | null;
  onClose: () => void;
  /** 再 Collect, then the same beast again. Absent where again makes no sense: a warden
   *  that fell, a floor of the tower, the heart demon. */
  onAgain?: () => void;
  /** 略 The fight is settled before the first blow, so a tap jumps to how it ends. */
  onSkip?: () => void;
  /** 自 The auto-hunt running on this beast: kills so far and the material they made. */
  auto?: { kills: number; gained: number } | null;
  /** 自 Start the auto-hunt from this verdict. Absent where it cannot run. */
  onAuto?: () => void;
  /** 自 Take this kill and go again, on the auto-hunt's own clock. */
  onAutoNext?: () => void;
  onStop?: () => void;
  /** 熟 Kills of this beast still to go before Auto opens for it, after this one. */
  autoLeft?: number;
  /** 登 Collect, then the next floor of the tower. Only on a floor that fell. */
  onNext?: () => void;
  /** 著 Collect, and put the piece that fell straight on. */
  onWearDrop?: () => void;
}) {
  const realm = state.realm;
  const { beast, outcome, beat, over } = battle;
  const f = frameAt(outcome, beat);
  const r = realmOf(realm);
  const br = realmOf(beast.realm);
  const cut = pictureOf('cut', plateOf(beast));
  /**
   * 畫 The place this fight happens in.
   *
   * 境外 Above the ninth realm it is the heaven's own, not the ninth realm's. The audit
   * found nine heaven backdrops declared in 畫 the picture list with nothing on any
   * screen asking for them, which is the quiet kind of gap: the slot existed, the files
   * would have been made, and they would have hung there unseen.
   */
  const aboveSummit = beast.plate?.startsWith('heaven-') ? beast.plate.slice(7) : null;
  const sky = (aboveSummit && pictureOf('heaven', aboveSummit))
    ?? pictureOf('realm', String(beast.realm));
  const hit: Striker | null = over ? null : f.striker === 'player' ? 'beast' : 'player';
  const names = (ks: readonly (string | null | undefined)[]) => ks.filter((k): k is string => !!k)
    .map((k) => ITEM_BY_KEY[splitKey(k).key]?.name ?? k).join(' · ') || null;
  const kitNames = names([battle.kit?.elixir, battle.kit?.sigil]);
  // 九轉 On a win, what was spent and what was carried in but never needed.
  const took = battle.kit && tookPart(battle.kit, !!outcome.revived);
  const spentNames = took ? names([took.elixir, took.sigil]) : null;
  const unneeded = battle.kit && took && battle.kit.elixir !== took.elixir ? names([battle.kit.elixir]) : null;
  /** 擂 A challenger, which is neither a kill nor a floor: the verdict says what it is. */
  const tier = battle.challenger;
  const platform = tier !== undefined;
  const ordinal = platform ? PLATFORM.ordinal[tier] : '';
  const say = over
    ? (platform ? (outcome.won ? { han: '勝', text: PLATFORM.won(ordinal) } : { han: '再來', text: PLATFORM.lost })
      : battle.demon ? (outcome.won ? SECLUSION.won : SECLUSION.lost) : verdictLine(outcome.won, !!beast.warden,
        realm === 9 && beast.key === 'dragon' && battle.floor === undefined))
    : blowLine(f.striker, f.round);
  /** 心魔 A beast of the world, which is what a kill, a bounty and the week are paid for. */
  const worldly = battle.floor === undefined && !battle.demon && !platform;
  // 擂 What a challenger pays, read before the win is written, and where the week stands after it.
  const platformQi = platform && outcome.won ? challengerPays(state, tier) : 0;
  const platformDown = platform ? beatenNow(state) + (outcome.won ? 1 : 0) : 0;
  const temper = platform ? temperOf(state) : null;
  const nextUp = platform && platformDown < PLATFORM_EDGE.length ? (platformDown as Tier) : null;
  const nextShape = nextUp !== null ? challengerOf(state, nextUp) : null;
  const answer = temper ? answerOf(state, temper) : null;
  /**
   * 熟 Whether this kill is the one that earns a mark. It is asked of the state *before*
   * the kill is written, so the arena is describing the fight it just played rather than
   * the save it is about to become.
   */
  const before = state.killed[beast.key] ?? 0;
  // 見 What this kill pays in qi, which is only ever on the very first one.
  const bounty = outcome.won && worldly && before === 0
    ? seenPaid(state, beast) : 0;
  const earned = outcome.won && worldly && marksOf(before + 1) > marksOf(before)
    ? { index: marksOf(before + 1) - 1 }
    : null;
  const arts = f.arts.map((k) => ART_BY_KEY[k]).filter(Boolean);
  /**
   * 期 The week's first kill of its quarry pays qi, and the arena never said so: the
   * number moved and nothing on the screen said why. It is asked of the state before the
   * kill, like everything else here.
   */
  const weekly = outcome.won && worldly && isQuarry(state, beast) && quarryOwed(state)
    ? quarryPaid(state, beast) : 0;
  /**
   * ▲ Whether the piece that fell is better than what is worn, by the chest's own ▲ rule
   * (marksUp), read as it would go in (空囊 applied) and as it would be worn (承 the slot's
   * levels). Only when the chest will keep it: a piece a full chest melts cannot be worn.
   */
  const dropUp = outcome.won && !!battle.drop && !(overflow?.dropped && overflow.dropped.id === overflow.item?.id)
    && marksUp(state, lifted(state, battle.drop));
  // 關 The demon fell and the realm still has one: the door has shut again by itself.
  const soulLock = !!battle.kit?.sigil && splitKey(battle.kit.sigil).key === 'sigil:soullock';
  const reshut = !!battle.demon && outcome.won && state.demons + (soulLock ? 2 : 1) < demonsFor(state.realm);

  /** 勁 What was won rises off the button that takes it, whichever button that is. */
  const take = () => {
    if (outcome.won && battle.demon) {
      float(SECLUSION.pays(DEMON_DAO), 'jade');
      burst('jade', null, 12, 64);
    } else if (outcome.won && platform) {
      float(`+${num(platformQi)} qi`, 'jade');
      burst('jade', null, 12, 64);
    } else if (outcome.won) {
      const mat = battle.floor !== undefined
        ? floorMaterial(state, battle.floor) : lootTaken(state, lootFrom(state, beast));
      float(`+${num(mat)} ${UNIT.material}`, 'gold');
      const qi = (battle.qi ?? 0) + bounty + weekly;
      if (qi > 0) setTimeout(() => float(`+${num(qi)} qi`, 'jade'), 160);
      burst('gold', null, 12, 64);
    }
  };

  /**
   * 自 The auto-hunt's clock. A blow or two is watched, then the fight jumps to how it
   * ends; the verdict stays long enough to read, longer when it says something new (a
   * mark, a piece, the week's quarry), then the kill is taken and the next one begins.
   * A loss stops it: the verdict stays, and the player decides.
   */
  const running = !!auto;
  const notable = outcome.won && (!!earned || !!battle.drop || weekly > 0);
  useEffect(() => {
    if (!running || over) return;
    const id = setTimeout(() => onSkip?.(), AUTO_WATCH_MS);
    return () => clearTimeout(id);
  }, [running, over]);
  useEffect(() => {
    if (!running || !over) return;
    if (!outcome.won) { onStop?.(); return; }
    const id = setTimeout(() => { take(); onAutoNext?.(); }, notable ? AUTO_READ_MS : AUTO_VERDICT_MS);
    return () => clearTimeout(id);
  }, [running, over]);

  return (
    <div className="arena" data-over={over} data-won={over && outcome.won} data-lost={over && !outcome.won}
         data-by={f.striker} data-heavy={!over && f.heavy} onClick={over ? undefined : onSkip}>
      {/* 景 The same painting, soft and dark, behind the whole arena. The stage used to
          be a strip of landscape between two bands of flat black, which on a computer
          screen read as a letterbox rather than a place. */}
      {sky && <div className="asky" aria-hidden="true" style={{ backgroundImage: `url(${sky})` }} />}
      <div className="stage">
        {/* 畫 The realm's own landscape, behind the fight, where there is one. The drawn
            sky and ridges stand down for it: see art/scene.ts. */}
        {sky && <img className="skyline" data-heaven={!!aboveSummit} src={sky} alt="" aria-hidden="true" />}
        <div className="scene"><Svg html={arenaScene(beast.realm, !!sky)} /></div>

        {/* 訣 The art firing. It is the payoff for the whole sequence screen, so it gets
            the top of the stage to itself rather than a line among the numbers. */}
        {arts.length > 0 && (
          <div className="fired" key={`a${beat}`}>
            {arts.map((a) => (
              <span key={a.key} className="one">
                <b className="cjk">{a.han}</b>
                <i>{a.name}</i>
              </span>
            ))}
          </div>
        )}

        {/* 續 Keyed by the fight, so a fight that follows another without the arena closing
            draws its beast afresh rather than keeping the last one's death. */}
        <div className="duel" key={battle.id}>
          <div className="fighter you" data-hit={hit === 'player'} data-strike={!over && f.striker === 'player'}>
            <span className="art"><Svg html={portraitLayers({ realm, pulse, focus: true, who: state.self })} /></span>
            {/* 勝 A ring of her own light going out from her when it is over and she won. */}
            {over && outcome.won && <span className="victory" aria-hidden="true"><i /><i /></span>}
            {hit === 'player' && !f.missed && <Sparks key={`sp${beat}`} />}
            {hit === 'player' && !f.missed && <Cut kind="claw" heavy={f.heavy} key={`cp${beat}`} />}
            {hit === 'player' && (
              f.missed
                ? <span className="dmg miss" key={`p${beat}`}>{ARENA.missed}</span>
                : <span className="dmg" key={`p${beat}`}>−{num(f.damage)}</span>
            )}
          </div>

          <div className="gap">
            {!over && (
              <span key={beat} className="clash" aria-hidden="true">
                <i /><b>{f.striker === 'player' ? '擊' : '反'}</b>
              </span>
            )}
          </div>

          <div className="fighter foe" data-hit={hit === 'beast'} data-strike={!over && f.striker === 'beast'}>
            {/**
              * 剪 The creature, standing in the place, with the paper keyed off it.
              *
              * For the whole of this game's life one side of every fight was a drawing
              * with an aura and the other side was a flat silhouette at 94 pixels. 牌 the
              * plate closed that, and then went too far the other way: at full size a
              * painting on a paper disc inside a ring is a sticker, and Bruno said so the
              * first time he saw one, *"está um badge ampliado e mal cortado circular."*
              * A circle is right at 46 pixels in a list. It is wrong here.
              *
              * So here the beast is the beast: no disc, no ring, no circle to clip its
              * claws, standing on the same floor line as the cultivator. Where the cut-out
              * is missing it falls back to the plate, which falls back to the silhouette,
              * so nothing is ever half-drawn.
              */}
            <span className="art" data-cut={!!cut && !battle.demon} data-warden={!!beast.warden} data-demon={!!battle.demon}>
              {battle.demon
                /* 心魔 Your own figure, turned to face you and darkened. */
                ? <Svg html={portraitLayers({ realm, pulse, focus: true, who: state.self })} />
                : cut
                ? <img className="beastcut" src={cut} alt={beast.name} />
                : (
                  <Plate kind="beast" subject={plateOf(beast)} icon={beast.icon} colour={br.colour}
                         tier={beast.realm >= 9 ? 3 : beast.warden ? 2 : 1} size={94}
                         alt={beast.name} />
                )}
            </span>
            {hit === 'beast' && <Sparks key={`sb${beat}`} />}
            {hit === 'beast' && <Cut kind="ink" heavy={f.heavy} key={`cb${beat}`} />}
            {over && outcome.won && <Ashes />}
            {hit === 'beast' && (
              <span className="dmg" key={`b${beat}`}>−{num(f.damage)}</span>
            )}
          </div>
        </div>
      </div>

      <div className="feet">
        <div className="who">
          {/* 譯 The realm and the beast by name, beside their characters. The arena
              was the one screen that named both fighters in Chinese alone. */}
          <span className="nm">
            <b className="cjk" style={{ color: r.colour }}>{r.han}</b>
            <span className="en">{r.name}</span>
          </span>
          <em className="pw mono"><b className="cjk">力</b> {num(outcome.playerPower)} {UNIT.power}</em>
          <span className="bar"><i style={{ width: `${f.playerHealth * 100}%` }} /></span>
        </div>
        <div className="who r">
          <span className="nm">
            <b className="cjk" style={{ color: br.colour }}>
              {battle.floor === undefined ? beast.han : `${battle.floor}層`}
            </b>
            <span className="en">{platform ? PLATFORM.who(ordinal)
              : battle.floor === undefined ? beast.name : ARENA.floor(battle.floor)}</span>
          </span>
          {/* What it *brings*, not what the table says it is worth. A tower floor
              carries its own power and the 渡劫 Dragon rises every crossing, so the
              table's number would be a different beast's. */}
          <em className="pw mono"><b className="cjk">力</b> {num(outcome.beastPower)} {UNIT.power}</em>
          <span className="bar"><i style={{ width: `${f.beastHealth * 100}%` }} /></span>
        </div>
      </div>

      {!over && (
        <p className="saying" key={beat}>
          <b className="cjk">{say.han}</b>
          <i>{say.text}</i>
        </p>
      )}
      {!over && kitNames && <p className="kitchip"><b className="cjk">攜</b> {CRAFTS.kitIn(kitNames)}</p>}
      {!over && onSkip && !auto && <p className="skiphint">{ARENA.skip}</p>}
      {auto && (
        <div className="autobar" onClick={(e) => e.stopPropagation()}>
          <span>
            <b className="cjk">自</b> {ARENA.autoOn(beast.name)}
            <i>{ARENA.autoTally(auto.kills, num(auto.gained))}</i>
          </span>
          <button className="act ghost" onClick={onStop}>止 <span>{ARENA.stop}</span><kbd>Esc</kbd></button>
        </div>
      )}

      {over && (
        <div className="verdict">
          <span className="han" style={{ color: outcome.won ? 'var(--jade)' : 'var(--cinnabar)' }}>
            {say.han}
          </span>
          <p>{say.text}</p>
          {/* 攜 A kit is said to be spent on a win and kept on a loss, every time. */}
          {kitNames && (
            <p className="kitline"><b className="cjk">攜</b> {!outcome.won ? CRAFTS.kitKept(kitNames)
              : [spentNames && CRAFTS.kitSpent(spentNames), unneeded && CRAFTS.kitUnneeded(unneeded)].filter(Boolean).join(' ')}</p>
          )}
          {battle.sought && !outcome.won && <p className="kitline"><b className="cjk">尋</b> {CRAFTS.seekKept}</p>}
          {/* 得 What it paid, as things you can see arrive rather than the tail of a
              sentence. 材 is the same number the save is credited, from the same function. */}
          {outcome.won && battle.demon && (
            <div className="gains">
              <span className="gain dao" style={{ animationDelay: '.25s' }}>
                {SECLUSION.pays(DEMON_DAO)}
              </span>
            </div>
          )}
          {reshut && <p className="kitline"><b className="cjk">關</b> {QOL.seclusion.shutAgain}</p>}
          {/* 擂 A challenger pays hours of gathering and nothing else, and the week's count,
              its temper and what stands next are said under it. A loss says that it cost
              nothing and that the dice are set: pressing again unchanged is the same fight. */}
          {outcome.won && platform && (
            <div className="gains">
              <span className="gain qi" style={{ animationDelay: '.25s' }}>+{num(platformQi)} <b>qi</b></span>
              <span className="gain" style={{ animationDelay: '.4s' }}>{PLATFORM.hours(PLATFORM_HOURS[tier])}</span>
            </div>
          )}
          {platform && temper && (
            <div className="platbox">
              <b className="cjk">擂</b>
              <span>
                <em>{outcome.won ? PLATFORM.count(platformDown) : `${beast.han} ${beast.name}`}</em>
                <i>
                  {answer
                    ? PLATFORM.answeredLine(`${temper.han} ${temper.name}`, `${answer.han} ${answer.name}`)
                    : PLATFORM.unansweredLine(`${temper.han} ${temper.name}`)}{' '}
                  {!outcome.won ? PLATFORM.dice
                    : nextShape && nextUp !== null
                      ? PLATFORM.next(PLATFORM.ordinal[nextUp], `${nextShape.han} ${nextShape.name}`, String(PLATFORM_EDGE[nextUp]), PLATFORM_HOURS[nextUp])
                      : PLATFORM.done}
                </i>
              </span>
            </div>
          )}
          {outcome.won && !battle.demon && !platform && (
            <div className="gains">
              <span className="gain" style={{ animationDelay: '.25s' }}>
                +{num(battle.floor !== undefined
                  ? floorMaterial(state, battle.floor)
                  : lootTaken(state, lootFrom(state, beast)))} <b className="cjk">材</b> {UNIT.material}
              </span>
              {(battle.qi ?? 0) + bounty + weekly > 0 && (
                <span className="gain qi" style={{ animationDelay: '.4s' }}>
                  +{num((battle.qi ?? 0) + bounty + weekly)} <b>qi</b>
                </span>
              )}
            </div>
          )}

          {/* 熟 A mark earned is the most valuable thing a kill can do in the first hour
              and the arena used to let it pass in silence. It is permanent, it is the
              reason to kill the same animal again, and it has to be said out loud where
              it happens. */}
          {outcome.won && earned && (
            /* 見 The first mark and 見 the first-sight bounty are the same event, and
               for a while they were two cards stacked on top of each other saying
               nearly the same sentence. They are one card: the mark names it, and the
               qi is the first thing the line says, because the qi is the part that
               moves the number the player has been watching all day. */
            <p className="mark" data-seen={earned.index === 0 && bounty > 0}>
              <b className="cjk">{MARK_INFO[earned.index].han}</b>
              <span>
                <em>{MARK_INFO[earned.index].name}</em>
                <i>
                  {bounty > 0 && earned.index === 0
                    ? ARENA.firstSight(num(bounty), `${beast.han} ${beast.name}`)
                    : ARENA.earned(`${beast.han} ${beast.name}`, MARK_INFO[earned.index].pays)}
                </i>
              </span>
            </p>
          )}
          {weekly > 0 && (
            <p className="mark" data-week="true">
              <b className="cjk">期</b>
              <span>
                <em>{ARENA.weekHead}</em>
                <i>{ARENA.week(num(weekly))}</i>
              </span>
            </p>
          )}
          {outcome.won && battle.drop && (
            <div className="spoil">
              <Svg html={gearTile(battle.drop, { size: 62 })} />
              <span>
                <b className="cjk" style={{ color: RARITY_INFO[battle.drop.rarity].colour }}>
                  {templateOf(battle.drop).han}
                </b>
                {/* ▲ Better than what is worn, said before the lines so it is never under the buttons. */}
                {dropUp && <em className="dropup"><span aria-hidden="true">▲</span> {QOL.arena.better}</em>}
                <i>
                  {QOL.slotted(templateOf(battle.drop).name, SLOT_INFO[templateOf(battle.drop).slot].name)}
                  {battle.drop.rolls.map((roll) => (
                    <span key={roll.affix} style={{ marginLeft: 7 }}>
                      <span className="cjk">{AFFIX_INFO[roll.affix].han}</span>
                      {' '}+{Math.round(roll.value * 10) / 10}{AFFIX_INFO[roll.affix].unit === '%' ? '%' : ''}
                      {' '}{AFFIX_INFO[roll.affix].label}
                    </span>
                  ))}
                </i>
                {overflow?.dropped && (
                  <em className="full">
                    {overflow.dropped.id === overflow.item?.id
                      ? ARENA.chestFullNew(meltPays(num(overflow.melted), num(overflow.meltedMaterial),
                        overflow.melted > 0, overflow.meltedMaterial > 0))
                      : ARENA.chestFullOld(templateOf(overflow.dropped).name, meltPays(num(overflow.melted),
                        num(overflow.meltedMaterial), overflow.melted > 0, overflow.meltedMaterial > 0))}
                  </em>
                )}
              </span>
            </div>
          )}
          {/* 造化 Creation's second piece from the same kill, said as one line under the first. */}
          {outcome.won && battle.extra && (
            <div className="spoil" data-extra>
              <Svg html={gearTile(battle.extra, { size: 40 })} />
              <span>
                <em className="cjk">造化</em>{' '}
                <i>{ARENA.secondPiece(templateOf(battle.extra).name, RARITY_INFO[battle.extra.rarity].name)}</i>
              </span>
            </div>
          )}
          {autoLeft > 0 && <p className="kitline"><b className="cjk">自</b> {ARENA.autoIn(autoLeft, beast.name)}</p>}
          {!auto && <div className="vacts">
            <button className="act collect" onClick={() => { take(); onClose(); }}>
              {outcome.won ? '收' : '退'}{' '}
              <span>{outcome.won ? ARENA.collect : ARENA.withdraw}</span>
              <kbd>{ARENA.keyCollect}</kbd>
            </button>
            {/* 著 Collect and put the piece straight on, beside Collect, when it is ▲. */}
            {dropUp && onWearDrop && (
              <button className="act ghost wearit" data-qol="wear-drop" onClick={() => { take(); onWearDrop(); }}>
                著 <span>{QOL.arena.wearIt}</span>
              </button>
            )}
            {onAgain && (
              <button className="act ghost again" onClick={() => { take(); onAgain(); }}>
                再 <span>{ARENA.again}</span>
                <kbd>{ARENA.keyAgain}</kbd>
              </button>
            )}
            {/* 登 The next floor, on the pace of Again and on its key. A lost floor has none.
                擂 For a challenger it is the next challenger, and only after a win. */}
            {onNext && outcome.won && (
              <button className="act ghost again nextfloor" onClick={() => { take(); onNext(); }}>
                {platform ? '擂' : '登'} <span>{platform && nextUp !== null
                  ? PLATFORM.nextButton(PLATFORM.ordinal[nextUp]) : QOL.arena.nextFloor}</span>
                <kbd>{QOL.arena.keyNext}</kbd>
              </button>
            )}
            {onAuto && (
              <button className="act ghost auto" onClick={onAuto}>
                自 <span>{ARENA.auto}</span>
                <kbd>{ARENA.keyAuto}</kbd>
              </button>
            )}
          </div>}
        </div>
      )}
    </div>
  );
}

/**
 * 斬 The blow itself, drawn across whoever took it.
 *
 * Sparks and a number were the whole of a hit, which is the aftermath without the
 * stroke. Her blow is one brush stroke across the beast; the beast's is three claw
 * marks across her. Both are drawn on, not faded in, and gone in a third of a second.
 */
function Cut({ kind, heavy }: { kind: 'ink' | 'claw'; heavy: boolean }) {
  return (
    <svg className="cut" data-kind={kind} data-heavy={heavy} viewBox="0 0 100 100" aria-hidden="true">
      {kind === 'ink'
        ? <path d="M12 78 Q 46 50 90 18" pathLength={100} />
        : [0, 1, 2].map((i) => (
          <path key={i} d={`M${30 + i * 16} 16 Q ${36 + i * 16} 50 ${26 + i * 16} 86`} pathLength={100}
                style={{ animationDelay: `${i * 30}ms` }} />
        ))}
    </svg>
  );
}

/**
 * 灰 What is left of a beast that fell: ink lifting off it into the air, slowly, the
 * way the paintings let a figure dissolve at its edges.
 */
function Ashes() {
  return (
    <span className="ashes" aria-hidden="true">
      {Array.from({ length: 14 }, (_, i) => (
        <i key={i} style={{ ['--x' as string]: `${((i * 37) % 100) - 50}%`,
                            ['--dx' as string]: `${((i * 23) % 40) - 20}px`,
                            animationDelay: `${120 + (i * 70) % 700}ms` }} />
      ))}
    </span>
  );
}

/**
 * 墨 Ink thrown off a blow where it lands: six drops on six headings, each its own
 * distance. It is remounted by its key on every beat, so every hit throws its own.
 */
function Sparks() {
  return (
    <span className="sparks" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <i key={i} style={{ ['--a' as string]: `${i * 60 + (i % 2 ? 18 : -12)}deg`,
                            ['--d' as string]: `${26 + (i * 7) % 20}px` }} />
      ))}
    </span>
  );
}
