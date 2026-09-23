import { AFFIX_INFO, RARITY_INFO, templateOf, type Item } from '../../data/gear.ts';
import { plateOf } from '../../data/bestiary.ts';
import { realm as realmOf } from '../../data/realms.ts';
import type { Beast } from '../../data/bestiary.ts';
import { type Outcome } from '../../sim/combat.ts';
import { num } from '../../sim/format.ts';
import { portrait } from '../../art/aura.ts';
import { arenaScene } from '../../art/scene.ts';
import { gearTile } from '../../art/gear.ts';
import { ART_BY_KEY } from '../../data/arts.ts';
import { blowLine, verdictLine } from './blows.ts';
import { Svg } from './Svg.tsx';
import { Plate } from './Plate.tsx';
import { pictureOf } from '../../data/pictures.ts';
import { floorLoot, lootBonus } from '../../sim/tower.ts';
import { ARENA } from '../copy.ts';
import { lootTaken } from '../../sim/trials.ts';
import { lootFrom, seenBounty } from '../../sim/combat.ts';
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
 * **Cyan is you and magenta is the beast, always.** Colour by realm is right for the
 * bestiary and wrong here: at the sixth realm a sixth-realm cultivator and a sixth-realm
 * beast are the same purple, and the two lives become one colour.
 */

export const BEAT_MS = 175;

/** A blow worth shaking the frame for, as a share of the cultivator's whole health. */
const HEAVY = 0.09;

export interface Battle {
  /** 塔 Which floor of the tower this is, if it is one at all. */
  readonly floor?: number;
  /** 吸 The qi the floor gives up when it falls. Tower fights only. */
  readonly qi?: number;
  readonly beast: Beast;
  readonly outcome: Outcome;
  /** Two beats to a round: even is the cultivator striking, odd is the beast. */
  readonly beat: number;
  readonly over: boolean;
  readonly drop: Item | null;
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
    heavy: (player ? here.playerDamage / o.beastPower : here.beastDamage / o.playerPower) / 10 > HEAVY,
  };
}

export function Arena({ battle, state, pulse, onClose, chestFull }: {
  battle: Battle;
  /**
   * 得 The whole state, not only the realm, because what a kill is *worth* depends on
   * the cultivator: 熟 marks and 塔印 seals both multiply what a beast pays, and the
   * arena was showing the table's number while the save was credited the real one.
   */
  state: State;
  pulse: number;
  chestFull: boolean;
  onClose: () => void;
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
  const say = over ? verdictLine(outcome.won, !!beast.warden) : blowLine(f.striker, f.round);
  /**
   * 熟 Whether this kill is the one that earns a mark. It is asked of the state *before*
   * the kill is written, so the arena is describing the fight it just played rather than
   * the save it is about to become.
   */
  const before = state.killed[beast.key] ?? 0;
  // 見 What this kill pays in qi, which is only ever on the very first one.
  const bounty = outcome.won && battle.floor === undefined && before === 0
    ? seenBounty(beast) : 0;
  const earned = outcome.won && battle.floor === undefined && marksOf(before + 1) > marksOf(before)
    ? { index: marksOf(before + 1) - 1 }
    : null;
  const arts = f.arts.map((k) => ART_BY_KEY[k]).filter(Boolean);

  return (
    <div className="arena" data-over={over} data-by={f.striker} data-heavy={!over && f.heavy}>
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

        <div className="duel">
          <div className="fighter you" data-hit={hit === 'player'} data-strike={!over && f.striker === 'player'}>
            <span className="art"><Svg html={portrait({ realm, pulse, focus: true, who: state.self })} /></span>
            {hit === 'player' && (
              f.missed
                ? <span className="dmg miss" key={`p${beat}`}>turned aside</span>
                : <span className="dmg" key={`p${beat}`}>−{num(f.damage)}</span>
            )}
          </div>

          <div className="gap">
            {!over && (
              <span key={beat} className="clash">
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
            <span className="art" data-cut={!!cut} data-warden={!!beast.warden}>
              {cut
                ? <img className="beastcut" src={cut} alt={beast.name} />
                : (
                  <Plate kind="beast" subject={plateOf(beast)} icon={beast.icon} colour={br.colour}
                         tier={beast.realm >= 9 ? 3 : beast.warden ? 2 : 1} size={94}
                         alt={beast.name} />
                )}
            </span>
            {hit === 'beast' && (
              <span className="dmg" key={`b${beat}`}>−{num(f.damage)}</span>
            )}
          </div>
        </div>
      </div>

      <div className="feet">
        <div className="who">
          <span className="nm">
            <b className="cjk" style={{ color: r.colour }}>{r.han}</b>
            <em className="mono">力 {num(outcome.playerPower)}</em>
          </span>
          <span className="bar"><i style={{ width: `${f.playerHealth * 100}%` }} /></span>
        </div>
        <div className="who r">
          <span className="nm">
            <b className="cjk" style={{ color: br.colour }}>
              {battle.floor === undefined ? beast.han : `${battle.floor}層`}
            </b>
            {/* What it *brings*, not what the table says it is worth. A tower floor
                carries its own power and the 渡劫 Dragon rises every crossing, so the
                table's number would be a different beast's. */}
            <em className="mono">力 {num(outcome.beastPower)}</em>
          </span>
          <span className="bar"><i style={{ width: `${f.beastHealth * 100}%` }} /></span>
        </div>
      </div>

      {!over && (
        <p className="saying" key={beat}>
          <b className="cjk">{say.han}</b>
          <i>{say.text}</i>
        </p>
      )}

      {over && (
        <div className="verdict">
          <span className="han" style={{ color: outcome.won ? 'var(--cyan)' : 'var(--magenta)' }}>
            {say.han}
          </span>
          <p>
            {say.text}
            {outcome.won && battle.floor !== undefined && (
              ` · +${num(floorLoot(battle.floor) * lootBonus(battle.floor - 1))} 材`
              + (battle.qi ? ` · +${num(battle.qi)} qi` : '')
            )}
            {outcome.won && battle.floor === undefined
              && ` · +${num(lootTaken(state, lootFrom(state, beast)))} 材`}
          </p>

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
                    ? ARENA.firstSight(num(bounty), beast.han)
                    : ARENA.earned(beast.han, MARK_INFO[earned.index].pays)}
                </i>
              </span>
            </p>
          )}
          {outcome.won && battle.drop && (
            <div className="spoil">
              <Svg html={gearTile(battle.drop, { size: 62, spin: pulse })} />
              <span>
                <b className="cjk" style={{ color: RARITY_INFO[battle.drop.rarity].colour }}>
                  {templateOf(battle.drop).han}
                </b>
                <i>
                  {templateOf(battle.drop).name}
                  {battle.drop.rolls.map((roll) => (
                    <span key={roll.affix} style={{ marginLeft: 7 }}>
                      <span className="cjk">{AFFIX_INFO[roll.affix].han}</span>
                      +{Math.round(roll.value * 10) / 10}
                    </span>
                  ))}
                </i>
                {chestFull && <em className="full">{ARENA.chestFull}</em>}
              </span>
            </div>
          )}
          <button className="act" onClick={onClose}>
            {outcome.won ? '收' : '退'}{' '}
            <span>{outcome.won ? 'Collect' : 'Withdraw'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
