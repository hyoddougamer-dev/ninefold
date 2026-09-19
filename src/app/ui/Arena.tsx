import { AFFIX_INFO, RARITY_INFO, templateOf, type Item } from '../../data/gear.ts';
import { realm as realmOf } from '../../data/realms.ts';
import type { Beast } from '../../data/bestiary.ts';
import { beastPower, loot, type Outcome } from '../../sim/combat.ts';
import { num } from '../../sim/format.ts';
import { portrait, seal } from '../../art/aura.ts';
import { gearTile } from '../../art/gear.ts';
import { Svg } from './Svg.tsx';

/**
 * 戰 The fight, watched.
 *
 * The sim settles the whole thing the moment you press the button — that is what lets
 * losing cost nothing — so this file's only job is to *play it back*, and playing it
 * back well is the difference between a fight and a progress bar.
 *
 * The one rule here: **a round is two beats, not one**. The sim trades blows
 * simultaneously, which is right for the arithmetic and unwatchable on screen: both
 * bars twitch at once and you cannot tell who did what. So the same round is shown as
 * the cultivator's strike, then the beast's answer. Nothing about the outcome changes;
 * what changes is that you can see it happen.
 */

export const BEAT_MS = 175;

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
  const hit = over ? null : f.striker === 'player' ? 'beast' : 'player';

  return (
    <div className="arena" data-over={over}>
      <div
        className="side"
        data-who="player"
        data-hit={hit === 'player'}
        data-strike={!over && f.striker === 'player'}
        style={{ ['--tone' as string]: 'var(--magenta)', ['--hue' as string]: r.colour }}
      >
        <div className="fig">
          <span><Svg html={portrait({ realm, pulse, focus: true })} /></span>
        </div>
        {hit === 'player' && (
          <span className="dmg" key={`p${beat}`} style={{ color: 'var(--magenta)' }}>
            −{num(f.damage)}
          </span>
        )}
        <div className="row" style={{ fontSize: 12.5 }}>
          <span className="cjk" style={{ color: r.colour }}>{r.han}</span>
          <span className="mono faint">力 {num(outcome.playerPower)}</span>
        </div>
        <div className="hp">
          <i style={{ width: `${f.playerHealth * 100}%`, background: 'var(--cyan)' }} />
        </div>
      </div>

      {/* The clash: one mark in the middle, thrown by whoever is striking. */}
      <div className="versus">
        {over ? '' : (
          <span key={beat} className="clash" data-by={f.striker}>
            <i />
            <b>{f.striker === 'player' ? '擊' : '反'}</b>
          </span>
        )}
      </div>

      <div
        className="side"
        data-who="beast"
        data-hit={hit === 'beast'}
        data-strike={!over && f.striker === 'beast'}
        style={{ ['--tone' as string]: 'var(--cyan)', ['--hue' as string]: br.colour }}
      >
        <div className="fig beastfig">
          <span><Svg html={seal(beast.icon, br.colour, !!beast.warden)} /></span>
        </div>
        {hit === 'beast' && (
          <span className="dmg" key={`b${beat}`} style={{ color: 'var(--cyan)' }}>
            −{num(f.damage)}
          </span>
        )}
        <div className="row" style={{ fontSize: 12.5 }}>
          <span className="cjk" style={{ color: br.colour }}>{beast.han}</span>
          <span className="mono faint">力 {num(beastPower(beast))}</span>
        </div>
        <div className="hp">
          <i style={{ width: `${f.beastHealth * 100}%`, background: 'var(--magenta)' }} />
        </div>
      </div>

      {over && (
        <div className="verdict">
          <span className="han" style={{ color: outcome.won ? 'var(--cyan)' : 'var(--magenta)' }}>
            {outcome.won ? '勝' : '敗'}
          </span>
          <p>
            {outcome.won
              ? beast.warden
                ? 'The warden has fallen. The breakthrough is open.'
                : `+${num(loot(beast))} material.`
              : 'Nothing was lost. Come back with more power.'}
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
                {chestFull && <em className="full">Chest full — this one is lost</em>}
              </span>
            </div>
          )}
          <button className="act" style={{ marginTop: 16 }} onClick={onClose}>
            {outcome.won ? '收' : '退'}{' '}
            <span>{outcome.won ? 'Collect' : 'Withdraw'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
