import { CORE_QI_RUNGS, FOCUS_MAX, LAYERS, LEVELS_PER_HEAVEN, TRIBULATION_GAIN } from '../../sim/balance.ts';
import { Plate } from '../ui/Plate.tsx';
import { currentWarden, effectiveBeastPower, oddsRaw } from '../../sim/combat.ts';
import {
  UPGRADES, UPGRADE_INFO, atCeiling, atTribulation, breakThrough, buy, canBreakThrough,
  canBuy, canCondense, canCross, canFightWarden, capOf, condense, condenseCost,
  crossTribulation, power, tribulationPool, upgradeCost,
  type State,
} from '../../sim/state.ts';
import { duration, num } from '../../sim/format.ts';
import { affordableIn, ladderDone, layersOpened, progress, rate } from '../../sim/time.ts';
import { REALMS, realm as realmOf } from '../../data/realms.ts';
import { HEAVENS, heavenAt, marksToNext, nextHeaven } from '../../data/heavens.ts';
import { portrait, seal } from '../../art/aura.ts';
import { pool as poolArt } from '../../art/trials.ts';
import { icon } from '../../art/icon.ts';
import { Svg } from '../ui/Svg.tsx';
import { Ladder } from '../ui/Ladder.tsx';
import { Term } from '../ui/Term.tsx';
import { Meet } from '../ui/Meet.tsx';
import { Cave } from '../ui/Cave.tsx';
import type { Meeting } from '../../sim/meet.ts';
import { AWAKEN, CULTIVATE, GUIDE, HUNT } from '../copy.ts';
import { advice } from '../advice.ts';
import { DISMISSED, guide } from '../guide.ts';
import { isOpen } from '../../sim/unlocks.ts';

export function Cultivate({ state, pulse, focus, satOut, opened, set, onFight, onGo, onRealm,
  owesCard, onAwaken, meeting, onMeet, onPlant, onHarvest }: {
  state: State;
  pulse: number;
  /** 入定 How deep this visit has gone. 1 while away, up to FOCUS_MAX while watched. */
  focus: number;
  /** 入定 True once this visit's sitting has run its quarter of an hour. */
  satOut: boolean;
  /** 階 True for half a second after a rung opens, so the bar can say so. */
  opened: boolean;
  /**
   * 手 A change is handed over as a **function of the state**, never as a finished one.
   *
   * A screen holds the state its last render was given. The clock moves the real one
   * every fifth of a second, so a button that hands back `buy(state, u)` is handing back
   * a state assembled from a copy that is already behind, and the app would put it over
   * whatever had happened since. Everything the bar does is re-derived from the stamp in
   * the save, so that never cost qi, but a kill or a harvest that landed in the same
   * fifth of a second was thrown away by the next tap. Handing over the *change* instead
   * of the *result* closes it for good.
   */
  set: (make: (s: State) => State) => void;
  onFight: () => void;
  /** 示 Where the advice points, when it points anywhere. */
  onGo: (tab: 'hunt' | 'trials' | 'dao' | 'gear') => void;
  /** 境 Open the page that says what this realm is. */
  onRealm: () => void;
  /** 悟道 True while a breakthrough still owes a card and the sheet is put aside. */
  owesCard: boolean;
  /** 悟道 Put the three cards back on the screen. */
  onAwaken: () => void;
  /** 緣 Somebody waiting on the road, or nobody. */
  meeting: Meeting | null;
  /** 緣 Answer them, one way or the other. */
  onMeet: (which: 0 | 1) => void;
  /** 洞天 Put a seed in a bed, and take a ripe one. */
  onPlant: (which: number, key: string) => void;
  onHarvest: (which: number) => void;
}) {
  const r = realmOf(state.realm);
  const w = currentWarden(state);
  const dragon = effectiveBeastPower(state, w);
  // 雷池 Once the last rung is open there is no layer left to fill, so the bar becomes
  // the thunder pool: two days of your own gathering, and the gate on the Dragon.
  const top = ladderDone(state);
  // 境外 Which heaven this cultivator stands in, and the one after it.
  const heaven = heavenAt(state.tribulation);
  const coming2 = nextHeaven(state.tribulation);
  const left2 = marksToNext(state.tribulation);
  const pool = tribulationPool(state);
  const full = top ? atTribulation(state) : atCeiling(state);
  // 守 Whether the warden is standing there, which is no longer the same question as
  // whether the bar is full. See wardenStands: buying the upgrades that beat it used to
  // make it vanish.
  const standing = canFightWarden(state);
  const ready = canBreakThrough(state);
  const crossing = canCross(state);
  const filled = top ? Math.min(1, state.qi / pool) : progress(state);
  const left = top && !full ? (pool - state.qi) / (rate(state) * focus) : 0;
  const day = Math.floor((state.at - state.startedAt) / 86_400) + 1;

  const wardenRaw = oddsRaw(state, w);
  const wardenGap = dragon / Math.max(1e-9, power(state));
  const tip = advice(state);
  // 引 The first session, one step at a time. It is computed, never stored, so it ends
  // by itself and cannot come back.
  const step = guide(state);

  return (
    <>
      {/* 引 Two states, one card.
          Ready: "Step 2 of 5 · go and kill something", bright, with the ring on the
          beast. Waiting: "Next · step 2 of 5", dimmer, the line that says what to do
          in the meantime, and the ring on *that* instead. The step never changes under
          the player; only whether the game is asking for it yet. */}
      {step && (
        <div className="guidewrap">
          <button className="guide" data-waiting={!step.ready} disabled={!step.tab}
            onClick={() => step.tab && onGo(step.tab)}>
            <span className="n mono">
              {step.ready ? GUIDE.step(step.n, step.of) : GUIDE.next(step.n, step.of)}
            </span>
            <b><span className="cjk">{step.step.han}</span> {step.step.title}</b>
            <i>
              {step.text}
              {step.step.toward && (
                <span className="toward">
                  <span style={{ width: `${Math.round(Math.min(1, step.step.toward(state)) * 100)}%` }} />
                </span>
              )}
            </i>
            <span className="art"><Svg html={icon(step.step.art, 30)} /></span>
            {step.tab && <em className="cjk">›</em>}
          </button>
          {/* 退 A way out. It is one key in the save, so it stays shut across a reload,
              and the ? panel puts it back. Nothing in a game should be unclosable. */}
          <button className="guidex" aria-label={GUIDE.close}
            onClick={() => set((s) => ({ ...s, seen: [...s.seen, DISMISSED] }))}>✕</button>
        </div>
      )}

      <div className="row">
        <span className="faint" style={{ fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase' }}>
          修 Cultivate · day {day}
        </span>
        {/* 註 修 is the screen a player is on for most of the game and it had two
            answerable characters on it, both of them inside 梯 the ladder. Every other
            character here was a shape with a number beside it. These four are the ones
            that name a thing the player owns or is doing, so these four answer. */}
        <span className="faint mono" style={{ fontSize: 12 }}><Term han="力" /> {num(power(state))}</span>
      </div>

      {/* 境 The realm's own name is the way in to the page that explains it. A player
          asking "what is this realm" reaches for the realm, not for a tab. */}
      <button className="realmname" onClick={onRealm}>
        <h1 className="cjk" style={{
          margin: 0, fontSize: 30, fontWeight: 400, color: heaven?.colour ?? r.colour,
        }}>{heaven?.han ?? r.han}</h1>
        <span className="ask" aria-hidden="true">?</span>
      </button>
      <div className="row" style={{ alignItems: 'baseline', marginTop: 4 }}>
        {/* 梯 The layer number used to live here, and now lives on the ladder below
            with the eight other rungs around it. One number in one place. */}
        {top && (
          <span className="faint mono" style={{ fontSize: 13 }}>
            劫 {state.tribulation} · {CULTIVATE.marks(state.tribulation)}
          </span>
        )}
      </div>
      {/* 境 "Qi Refining" alone never says how far this is out of. A player three hours
          in has no idea whether they are near the start of something or the end of it,
          and nine is a number worth knowing on the first day. */}
      <p className="faint" style={{ margin: '1px 0 8px', fontSize: 13 }}>
        {/* 境外 Above the summit the player is standing in a heaven, not in the ninth
            realm, and the name at the top of the screen is where they read that. */}
        {heaven ? heaven.name : r.name}{' '}
        <span className="mono" style={{ opacity: .65 }}>
          · {heaven ? CULTIVATE.ofHeavens(heaven.n, HEAVENS.length)
                    : CULTIVATE.ofNine(state.realm, REALMS.length)}
        </span>
      </p>

      {/* 雷池 Once the ladder runs out the portrait gives the screen over to the pool:
          the basin fills with the qi, and the bolts only come down when it is full. It
          is the same bar, drawn as the place it actually is. */}
      <div className="portrait">
        {top
          ? <Svg html={poolArt(filled, state.tribulation, pulse)} />
          : <Svg html={portrait({ realm: state.realm, pulse })} />}
      </div>

      <div className="qi">
        <div className="n mono" data-opened={opened || undefined} style={{ color: r.colour }}>
          {num(state.qi)}
        </div>
        {/* 氣 The standing rate leads, because it is the one fixed by what you have
            bought and climbed. 入定 rides alongside it with its own name and its own
            number, so nothing on this line moves without saying why it moved. */}
        <div className="r mono">
          {CULTIVATE.standing(`+${num(rate(state))} qi / s`)}
          {focus > 1.15 && (
            <span className="deep" data-full={focus >= FOCUS_MAX - 0.001}>
              <Term han="入定" /> ×{focus.toFixed(1)}
            </span>
          )}
        </div>
        {focus > 1.15 && (
          <div className="rnow mono">{num(rate(state) * focus)} qi / s now</div>
        )}
      </div>

      <div className="bar" data-opened={opened || undefined} style={{ margin: '14px 0 6px' }}>
        <i style={{ width: `${filled * 100}%`, background: r.colour }} />
      </div>
      <div className="row" style={{ fontSize: 12 }}>
        <span className="faint">
          {top
            ? (full ? CULTIVATE.toward(num(dragon)) : CULTIVATE.poolFilling(duration(left)))
            : r.gains}
        </span>
        <span className="mono" style={{ color: 'var(--gold)' }}><Term han="材" /> {num(state.materials)}</span>
      </div>

      {/* 梯 The bar above is one rung. This is the other eight, the realm they sit in,
          and the warden at the end of them. Bruno had read "layer 3 / 9" and "realm 1 of
          9" for a week without the screen ever showing that one is inside the other. */}
      {!top && <Ladder state={state} />}

      {/* 雷池 The ninth realm still has nine layers to climb before the pool takes the bar.
          The breakthrough card names the pool, so this says how far off it is. */}
      {state.realm === 9 && !top && (
        <p className="faint" style={{ margin: '8px 0 0', fontSize: 12.5 }}>{CULTIVATE.lastLayers(LAYERS - 1 - layersOpened(state))}</p>
      )}

      {standing && (
        <>
          <h2 className="heading">
            {top ? `${CULTIVATE.tribulationHead} ${state.tribulation + 1}` : CULTIVATE.wardenHead}
          </h2>
          <div className="card">
            <div className="row">
              <Plate kind="beast" subject={w.key} icon={w.icon} colour={r.colour}
                tier={2} size={52} alt={w.name} />
              <span style={{ flex: 1 }}>
                <b className="cjk" style={{ fontSize: 17, color: r.colour, display: 'block' }}>{w.han}</b>
                <i className="faint" style={{ fontStyle: 'normal', fontSize: 12 }}>{w.name}</i>
              </span>
              {/* 誠 The same honesty the hunt screen uses: a warden that wins none of
                  its sampled fights says how far off it is, rather than quoting a two
                  per cent that is really a zero. */}
              <span className="tech mono" style={{ fontSize: 17, textAlign: 'right' }}>
                {wardenRaw > 0
                  ? `${Math.round(Math.max(0.02, Math.min(0.98, wardenRaw)) * 100)}%`
                  : `×${wardenGap < 10 ? wardenGap.toFixed(1) : Math.round(wardenGap)}`}
                <em className="faint" style={{ display: 'block', fontStyle: 'normal', fontSize: 9.5, letterSpacing: '.12em', textTransform: 'uppercase', fontFamily: 'Archivo' }}>
                  {wardenRaw > 0 ? HUNT.odds : HUNT.toReach}
                </em>
              </span>
            </div>
            <p className="faint" style={{ margin: '11px 0 12px', fontSize: 12.5 }}>
              {top ? CULTIVATE.tribulation : CULTIVATE.warden}
            </p>
            <button className="act" data-tone="magenta" data-coach="fight-warden" onClick={onFight}>
              戰 <span>Fight</span>
            </button>
          </div>
        </>
      )}

      {/* 緣 Somebody on the road. Above 示 the advice, because a person waiting is more
          interesting than a number, and below everything that is actually blocking. */}
      {meeting && <Meet state={state} meeting={meeting} onAnswer={onMeet} />}

      {/* 悟道 The offer is derived from the save, so putting the sheet aside cannot lose
          it. This is what says so: it stays until the card is taken. */}
      {owesCard && (
        <button className="owes" onClick={onAwaken}>
          <b className="cjk">悟道</b>
          <i>{AWAKEN.waiting}</i>
          <em className="cjk">›</em>
        </button>
      )}

      {ready && (
        <div style={{ marginTop: 16 }}>
          <button className="act" data-coach="breakthrough" onClick={() => set((s) => breakThrough(s))}>
            突破 <span>Break through</span>
          </button>
        </div>
      )}

      {crossing && (
        <div style={{ marginTop: 16 }}>
          <button className="act" onClick={() => set((s) => crossTribulation(s, dragon))}>
            渡劫 <span>Cross the tribulation</span>
          </button>
          {/* 價 The one button left in the game that took qi without saying so. */}
          <p className="faint" style={{ margin: '7px 0 0', fontSize: 12.5, lineHeight: 1.5 }}>
            {CULTIVATE.crossPrice(num(pool))}
          </p>
        </div>
      )}

      {/* 示 sits above the 雷印 card, not below it. The card is five lines of reference
          and the tip is the only thing on the screen that says what to do, so at the top
          of the endgame it was the one line a player had to scroll to find. */}
      {/* 引 While the guide is running it is the only instruction on the screen. Two
          voices telling a new player what to do at once is worse than either alone. */}
      {tip && !step && (
        <button className="tip" disabled={!tip.tab} onClick={() => tip.tab && onGo(tip.tab)}>
          <b className="cjk">{tip.han}</b>
          <i>
            {tip.text}
            {/* 尺 The same fact as a bar. It moves on every level and every layer. */}
            {tip.toward !== undefined && (
              <span className="toward">
                <span style={{ width: `${Math.round(tip.toward * 100)}%` }} />
              </span>
            )}
          </i>
          {tip.tab && <em className="cjk">›</em>}
        </button>
      )}

      {/* 境外 Above the ninth realm the card is a ladder rather than a tally: the heaven
          you stand in, the one after it, and how many crossings away it is. */}
      {top && (
        <div className="heaven" style={{ ['--hue' as string]: heaven?.colour ?? r.colour }}>
          <div className="hhead">
            <span className="hnow">
              <b className="cjk">{heaven?.han ?? '渡劫'}</b>
              <em>{heaven?.name ?? realmOf(9).name}</em>
            </span>
            <span className="hmarks mono">
              <b>{state.tribulation}</b>
              <i>{CULTIVATE.marks(state.tribulation)}</i>
            </span>
          </div>
          {heaven && <>
            <p className="hgain">{heaven.gains}</p>
            <p className="hroom">{CULTIVATE.heavenRoom(LEVELS_PER_HEAVEN)}</p>
          </>}
          <p className="faint" style={{ margin: '7px 0 0', fontSize: 12.5 }}>
            {CULTIVATE.ceiling(state.tribulation, `${(1 + TRIBULATION_GAIN).toFixed(2)}x`)}
          </p>
          {coming2 && left2 !== null && (
            <div className="hnext">
              {/* 境外 A heaven's creature is not in the bestiary and has no painting to find, so
                  this one keeps 印 the seal. */}
              <span className="seal"><Svg html={seal(coming2.dragon.icon, coming2.colour)} /></span>
              <span>
                <em>{CULTIVATE.nextHeaven(left2)}</em>
                <i><b className="cjk" style={{ color: coming2.colour }}>{coming2.han}</b>{' '}
                  {coming2.name} · {coming2.dragon.han} {coming2.dragon.name}</i>
              </span>
            </div>
          )}
          {!coming2 && <p className="hgain">{CULTIVATE.lastHeaven}</p>}
        </div>
      )}

      {focus > 1.15 && (
        <p className="faint" style={{ margin: '8px 0 0', fontSize: 12.5 }}>
          {focus >= FOCUS_MAX - 0.001 ? CULTIVATE.deepFull : CULTIVATE.deep}
          {' '}{CULTIVATE.sitting}
        </p>
      )}
      {/* 入定 And when it ends the screen says so, because a number that falls by two
          thirds with nothing beside it reads as something taken away. */}
      {satOut && (
        <p className="faint" style={{ margin: '8px 0 0', fontSize: 12.5 }}>
          {CULTIVATE.sittingOver(num(rate(state)))}
        </p>
      )}

      <h2 className="heading">{CULTIVATE.spend}</h2>
      {UPGRADES.every((u) => state.levels[u] >= capOf(state, u)
        || (u === 'cores' && !isOpen(state.realm, 'cores'))) && (
        <p className="faint" style={{ margin: '0 0 8px', fontSize: 12.5 }}>
          {top ? CULTIVATE.cappedTop : CULTIVATE.capped}
        </p>
      )}
      <div className="upgrades">
        {/* 妖丹 is not shown before the realm that sells it: a box you cannot use is a
            question the first realm should not be asking. */}
        {UPGRADES.filter((u) => u !== 'cores' || isOpen(state.realm, 'cores')).map((u) => {
          const i = UPGRADE_INFO[u];
          const cost = upgradeCost(state, u);
          const held = state.levels[u];
          // 境外 The cap is per upgrade above the summit: a heaven opens room on 力 and
          // never on 氣. See capOf.
          const cap = capOf(state, u);
          const maxed = held >= cap;
          /**
           * 待 A price you cannot pay says when you can, and there are two answers.
           *
           * The rung you stand on is the most qi you may ever hold: the bar takes it
           * the instant it can afford the layer, so an upgrade dearer than that rung
           * cannot be waited for at all, only climbed to. Measured, from the fourth
           * realm on, the home screen has nothing to press in eighty per cent of visits
           * and this is the whole of why. See affordableIn.
           */
          const wait = !maxed && i.currency === 'qi' && !canBuy(state, u)
            ? affordableIn(state, cost) : null;
          return (
            /* 指 Named so 引 the guide can put an arrow on this exact box. */
            <button key={u} className="upg" data-full={maxed} data-coach={`upg-${u}`}
              disabled={!canBuy(state, u)} onClick={() => set((s) => buy(s, u))}>
              <span className="ic"><Svg html={icon(i.icon, 26)} /></span>
              {/* 譯 The English name leads and the characters follow it, rather than the
                  other way round. A player who does not read Chinese was being sold four
                  things called 劍訣, 功法, 吐納 and 妖丹, told what each one did, and
                  never told, first, what any of them was. */}
              <span>
                <b>{i.name} <span className="cjk faint">{i.han}</span></b>
                <i>{i.effect} <span className="mono faint">· {CULTIVATE.cap(held, cap)}</span></i>
              </span>
              <span className="price">
                {maxed
                  ? <>
                    <b className="cjk" style={{ color: 'var(--gold)' }}>滿</b>
                    {/* 譯 A box at its ceiling said 滿 and nothing else, which is a word
                        in Chinese standing alone on the screen the game is played on. */}
                    <i className="faint" style={{ fontStyle: 'normal', fontSize: 10, display: 'block' }}>
                      {CULTIVATE.fullWord}
                    </i>
                  </>
                  : <>
                    <b>{num(cost)}</b>
                    <i className="faint" style={{ fontStyle: 'normal', fontSize: 10, display: 'block' }}>
                      {i.currency === 'qi' ? 'qi' : CULTIVATE.materialWord}
                    </i>
                    {wait && (
                      <i className="when">
                        {wait.seconds === null
                          ? CULTIVATE.afterRungs(wait.rungs)
                          : CULTIVATE.soon(duration(wait.seconds))}
                      </i>
                    )}
                  </>}
              </span>
            </button>
          );
        })}
      </div>
      {/* 階 Said once under the boxes rather than on every row that needs it. */}
      {UPGRADES.some((u) => (u !== 'cores' || isOpen(state.realm, 'cores'))
        && UPGRADE_INFO[u].currency === 'qi' && state.levels[u] < capOf(state, u)
        && !canBuy(state, u) && affordableIn(state, upgradeCost(state, u)).seconds === null) && (
        <p className="faint" style={{ margin: '8px 0 0', fontSize: 12.5 }}>{CULTIVATE.overRung}</p>
      )}

      {/* 洞天 Under the boxes, because it is the other place material goes and the
          question is always the same one: cores, refining, or the ground. */}
      {isOpen(state.realm, 'cave') && (
        <Cave state={state} onPlant={onPlant} onHarvest={onHarvest} />
      )}

      {/* 凝丹 The way out of the one dead end the game has.
          It appears only when 材 material has actually run out and a core is still to be
          had, which is the moment it answers a question instead of asking one. */}
      {isOpen(state.realm, 'cores') && state.levels.cores < capOf(state, 'cores')
        && !canBuy(state, 'cores') && (
        <div className="condense">
          <div className="chead">
            <b className="cjk"><Term han="凝丹" /></b>
            <em>{CULTIVATE.condenseHead}</em>
            <span className="mono">
              {CULTIVATE.condensePrice(num(condenseCost(state)), String(CORE_QI_RUNGS))}
            </span>
          </div>
          <p>{CULTIVATE.condense}</p>
          <button className="act" disabled={!canCondense(state)}
                  onClick={() => set((s) => condense(s))}>
            凝 <span>Condense a core</span>
          </button>
          <button className="tip" onClick={() => onGo('hunt')}>
            <b className="cjk">狩</b>
            <i>{CULTIVATE.condenseHunt}</i>
            <em className="cjk">›</em>
          </button>
        </div>
      )}
    </>
  );
}
