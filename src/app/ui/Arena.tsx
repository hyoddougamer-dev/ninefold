import { AFFIX_INFO, RARITY_INFO, templateOf, type Item } from '../../data/gear.ts';
import { realm as realmOf } from '../../data/realms.ts';
import type { Beast } from '../../data/bestiary.ts';
import { beastPower, loot, type Outcome } from '../../sim/combat.ts';
import { num } from '../../sim/format.ts';
import { portrait } from '../../art/aura.ts';
import { arenaScene } from '../../art/scene.ts';
import { gearTile } from '../../art/gear.ts';
import { ICONS } from '../../art/icons.generated.ts';
import { ART_BY_KEY } from '../../data/arts.ts';
import { blowLine, verdictLine } from './blows.ts';
import { Svg } from './Svg.tsx';
import { ARENA } from '../copy.ts';

/**
 * 對 The facing.
 *
 * The fight is horizontal now, in a place: the beast's own realm behind it, a floor to
 * stand on, and a gap in the middle where the blow lands. What the old window got wrong
 * was not the art — it was that two figures stacked on a translucent scrim over the hunt
 * list reads as a dialog over a list, and a fight has to read as a fight.
 *
 * The sim settles everything the moment you press the button — that is what lets losing
 * cost nothing — so this file's only job is to *play it back*.
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
 * cultivator's — so between the two you can see which blow did which damage.
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
    /** True when this blow took a real bite — the frame shakes only for those. */
    heavy: (player ? here.playerDamage / o.beastPower : here.beastDamage / o.playerPower) / 10 > HEAVY,
  };
}

export function Arena({ battle, realm, pulse, onClose, chestFull }: {
  battle: Battle;
  realm: number;
  pulse: number;
  chestFull: boolean;
  onClose: () => void;
}) {
  const { beast, outcome, beat, over } = battle;
  const f = frameAt(outcome, beat);
  const r = realmOf(realm);
  const br = realmOf(beast.realm);
  const hit: Striker | null = over ? null : f.striker === 'player' ? 'beast' : 'player';
  const say = over ? verdictLine(outcome.won, !!beast.warden) : blowLine(f.striker, f.round);
  const arts = f.arts.map((k) => ART_BY_KEY[k]).filter(Boolean);

  return (
    <div className="arena" data-over={over} data-by={f.striker} data-heavy={!over && f.heavy}>
      <div className="stage">
        <div className="scene"><Svg html={arenaScene(beast.realm)} /></div>

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
            <span className="art"><Svg html={portrait({ realm, pulse, focus: true })} /></span>
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
            <span className="art" style={{ color: br.colour }}>
              <svg viewBox="-70 -70 652 652" aria-label={beast.name} role="img">
                <g fill="currentColor" dangerouslySetInnerHTML={{ __html: ICONS[beast.icon] ?? '' }} />
              </svg>
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
            <b className="cjk" style={{ color: br.colour }}>{beast.han}</b>
            <em className="mono">力 {num(beastPower(beast))}</em>
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
            {outcome.won && !beast.warden && ` · +${num(loot(beast))} 材`}
          </p>
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
