import { breachHeld, kitFor, kitWhere } from '../../sim/crafts.ts';
import { focusBonus } from '../../sim/dao.ts';
import {
  CORE_QI_RUNGS, FOCUS_MAX, LAYERS, LEVELS_PER_HEAVEN, ODDS_CEILING, ODDS_FLOOR, TRIBULATION_GAIN,
} from '../../sim/balance.ts';
import { fightDeps } from '../memo.ts';
import { plateOf } from '../../data/bestiary.ts';
import { Plate } from '../ui/Plate.tsx';
import { bottleneck, crossNow, currentWarden, effectiveBeastPower, oddsRaw, wallOf } from '../../sim/combat.ts';
import { BOTTLENECK_LOOSEN, ECHO_CEILING } from '../../sim/balance.ts';
import {
  UPGRADES, UPGRADE_INFO, atCeiling, atTribulation, breakThrough, buy, buyAll, buyMax, canBreakThrough,
  canBuy, canCondense, canCross, canFightWarden, capOf, condense, condenseCost,
  power, tribulationPool, upgradeCost,
  type State,
} from '../../sim/state.ts';
import { duration, num } from '../../sim/format.ts';
import { affordableIn, gathering, ladderDone, layersOpened, progress } from '../../sim/time.ts';
import { canReincarnate, echoAfter, echoOf, lifeOf, lifeStart, lifeTitle } from '../../sim/rebirth.ts';
import { echoPct } from '../ui/Rebirth.tsx';
import { REALMS, realm as realmOf } from '../../data/realms.ts';
import { HEAVENS, heavenAt, marksToNext, nextHeaven } from '../../data/heavens.ts';
import { portraitLayers, seal } from '../../art/aura.ts';
import { pool as poolArt } from '../../art/trials.ts';
import { icon } from '../../art/icon.ts';
import { Svg } from '../ui/Svg.tsx';
import { Ladder } from '../ui/Ladder.tsx';
import { Term } from '../ui/Term.tsx';
import { Meet, MeetDone } from '../ui/Meet.tsx';
import type { Receipt } from '../../sim/meet.ts';
import { Cave } from '../ui/Cave.tsx';
import { Seclusion } from '../ui/Seclusion.tsx';
import { demonDue, seclude } from '../../sim/seclusion.ts';
import type { Meeting } from '../../sim/meet.ts';
import { AWAKEN, CULTIVATE, GUIDE, HUNT, PACE, QOL, RANKS, REBIRTH } from '../copy.ts';
import { harvestAll, harvestAndReplant, plantAll } from '../../sim/cave.ts';
import { useBuyMax } from '../prefs.ts';
import { advice } from '../advice.ts';
import { pace } from '../../sim/pace.ts';
import { DISMISSED, guide, heldAtFirstRung } from '../guide.ts';
import { isOpen } from '../../sim/unlocks.ts';
import { useMemo, useRef, useState } from 'react';
import { INCENSE, READY, SIT } from '../copy.ts';
import { INCENSE_BONUS } from '../../sim/balance.ts';
import { incenseLeft } from '../../sim/secret.ts';
import type { Waiting } from '../ready.ts';

/** 入定 A sitting's time left as a clock, 14:05, which is how a countdown is read. */
const clockOf = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
/** 香 A clock that can run past the hour, 1:35:58, for incense that burns for hours. */
const longClock = (s: number) => (s >= 3600
  ? `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  : clockOf(s));
import { bloom, burst, float } from '../juice.ts';

export function Cultivate({ state, pulse, focus, satOut, opened, set, onFight, onGo, onRealm,
  owesCard, onAwaken, onCards, meeting, onMeet, meetDone, onMeetDone, onMeetSee, onPlant, onHarvest, onDemon, title,
  sitLeft = 0, onSitAgain, waiting = [], onReady, onRebirth }: {
  state: State;
  /** 轉世 Open the page of the new life, from the quiet card at the summit. */
  onRebirth?: () => void;
  /** 入定 Whole seconds left in this visit's sitting; 0 when it has ended or not begun. */
  sitLeft?: number;
  /** 坐 Start a new sitting now, which is what coming back to the game does. */
  onSitAgain?: () => void;
  /** 待 What is waiting, read off the save. See app/ready.ts. */
  waiting?: readonly Waiting[];
  /** 待 Take one of them. */
  onReady?: (w: Waiting) => void;
  /** 冠 The title the rankings gave this player, if any. */
  title?: string | null;
  pulse: number;
  /** 入定 How deep this visit has gone. 1 while away, up to FOCUS_MAX while watched. */
  focus: number;
  /** 入定 True once this visit's sitting has run its half hour (FOCUS_HOLD). */
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
  onGo: (tab: 'hunt' | 'trials' | 'dao' | 'gear' | 'crafts') => void;
  /** 境 Open the page that says what this realm is. */
  onRealm: () => void;
  /** 悟道 True while a breakthrough still owes a card and the sheet is put aside. */
  owesCard: boolean;
  /** 悟道 Put the three cards back on the screen. */
  onAwaken: () => void;
  /** 改 Open the cards already taken, where one can be traded. */
  onCards: () => void;
  /** 緣 Somebody waiting on the road, or nobody. */
  meeting: Meeting | null;
  /** 緣 Answer them, one way or the other. */
  onMeet: (which: 0 | 1) => void;
  /** 據 What the last answer gave, until it is read. */
  meetDone: Receipt | null;
  onMeetDone: () => void;
  onMeetSee: () => void;
  /** 洞天 Put a seed in a bed, and take a ripe one. */
  onPlant: (which: number, key: string) => void;
  onHarvest: (which: number) => void;
  /** 心魔 Face the heart demon waiting behind the door. */
  onDemon: () => void;
}) {
  // 勁 Which box was just bought, for the half second it settles.
  const [bought, setBought] = useState<string | null>(null);
  /**
   * 盡 One tap buys one, or as many as the qi will pay for. The idle convention, asked for
   * by Bruno after rekaris's post about clicking: a realm's six levels of each upgrade were
   * six taps on the same box. Remembered on this device only; it changes no number.
   */
  // 記 Kept in prefs.ts now, under the same key, because 爐 the furnace shares it.
  const [many, pickMany] = useBuyMax();
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const r = realmOf(state.realm);
  const w = currentWarden(state);
  const dragon = effectiveBeastPower(state, w);
  // 雷池 Once the last rung is open there is no layer left to fill, so the bar becomes
  // the thunder pool: two days of gathering at the summit, and the gate on the Dragon.
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
  const left = top && !full ? (pool - state.qi) / (gathering(state) * focus) : 0;
  // 世 The day of this life: a reborn cultivator counts from the day it began.
  const day = Math.floor((state.at - lifeStart(state)) / 86_400) + 1;
  const life = lifeOf(state);
  const lifeName = lifeTitle(state);
  // 宿慧 The Echo the lives before this one carry, on every second gathered.
  const echo = echoOf(state.lives);
  const reborn = canReincarnate(state);
  // 入定 As deep as this cultivator's sitting goes: 神 the Spirit branch takes it past three.
  const deepest = FOCUS_MAX + focusBonus(state.unlocked);
  // 香 Seconds of incense still burning.
  const burning = incenseLeft(state);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  // 攜 Quoted with what is carried, because that is the fight that will be fought.
  const wardenRaw = useMemo(() => oddsRaw(state, w, undefined, kitFor(state, w, kitWhere(state, w)).kit),
    [w, ...fightDeps(state)]);
  const wardenGap = dragon / Math.max(1e-9, power(state));
  // 瓶頸 How far above its old self the warden still stands, and the days until it is not.
  const over = bottleneck(state, w) * wallOf(w.realm);
  const loosens = over > 1.01 ? Math.log(over) / -Math.log(1 - BOTTLENECK_LOOSEN) : 0;
  const carriedBreach = loosens ? kitFor(state, w, 'warden').kit.breach ?? 0 : 0;
  const heldBreach = loosens && !carriedBreach ? breachHeld(state, w) : 0;
  const tip = advice(state);
  // 階 What a rung and a realm ask for, read off the same ladder the game climbs.
  const p = pace(state);
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
              {step.chapter === 2
                ? (step.ready ? GUIDE.chapter(step.n, step.of) : GUIDE.chapterNext(step.n, step.of))
                : (step.ready ? GUIDE.step(step.n, step.of) : GUIDE.next(step.n, step.of))}
            </span>
            <b><span className="cjk">{step.step.han}</span> {step.step.title}</b>
            <i>
              {step.text}
              {step.step.toward && (
                <span className="toward">
                  <span style={{ transform: `scaleX(${Math.min(1, step.step.toward(state))})` }} />
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

      {/* 桌 Two columns on a computer, one on a phone. On a phone these two wrappers are
          display: contents and the screen is exactly what it was; on a wide screen the
          cultivator, the number and the ladder stand on the left and stay there, and what
          you do with them runs down the right. See .c-hero in theme.css. */}
      <div className="c-hero">
      <div className="row">
        {/* 日 The day count never truncates: the line wraps before "day", and the number
            stays with its word. At 320 wide day 121 read "DAY 1…". */}
        <span className="faint c-title" style={{ fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase' }}>
          修 Cultivate · <span className="c-day">{life > 1 ? REBIRTH.lifeDay(life, day) : `day ${day}`}</span>
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
      {/* 冠 A title earned on the boards, worn where the player looks every visit. */}
      {title && (
        <span className="wears"><b className="cjk">{title}</b> {RANKS.titleNames[title] ?? ''}</span>
      )}
      {/* 世 The title of a life lived again, beside the one from the boards. */}
      {lifeName && (
        <span className="lifewears"><b className="cjk">{lifeName.han}</b> {lifeName.name}</span>
      )}
      <div className="row" style={{ alignItems: 'baseline', marginTop: 4 }}>
        {/* 梯 The layer number used to live here, and now lives on the ladder below
            with the eight other rungs around it. One number in one place. */}
        {top && (
          <span className="faint mono" style={{ fontSize: 13 }}>
            {/* 劫 The crossings already made, which are the marks held: one number, said
                as what it is. The heading below names the crossing still to come. */}
            劫 {CULTIVATE.crossed(state.tribulation)} · {CULTIVATE.marks(state.tribulation)}
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

      {/* 待 Ready now: everything waiting, one tap each. Up here because the audit's
          check-ins spent most of their taps finding these, and the screen a player opens
          on is where they should be found. Taking one goes to its tab, or on this screen
          brings it into view. */}
      {waiting.length > 0 && onReady && (
        <div className="readystrip" role="group" aria-label={READY.strip}>
          <span className="rs-head">{READY.strip}</span>
          {waiting.map((w) => (
            <button key={w.key} type="button" className="rs-chip" data-tab={w.tab}
              title={w.long} aria-label={w.long} onClick={() => onReady(w)}>
              <b className="cjk">{w.han}</b> {w.short}
            </button>
          ))}
        </div>
      )}

      {/* 雷池 Once the ladder runs out the portrait gives the screen over to the pool:
          the basin fills with the qi, and the bolts only come down when it is full. It
          is the same bar, drawn as the place it actually is. */}
      {/* 塵 The motes behind her are drawn in the realm's colour and thicken as it
          climbs, so the air on this screen says where you are the way the aura does.
          --busy is that thickening: nothing at all in the first three realms. */}
      <div className="portrait" style={{
        ['--hue' as string]: r.colour,
        ['--busy' as string]: Math.max(0, Math.min(1, (state.realm - 3) / 5)),
      }}>
        {top
          ? <>
            <Svg html={poolArt(Math.round(filled * 200) / 200, state.tribulation, 0.125, { who: state.self, sky: heaven?.colour, figure: false })} />
            {/* 動 Her, as the moving stack the other realms show, laid where the pool's own
                drawing seats her: rekaris found the summit the one still aura (2026-10-06). */}
            <div className="poolfig"><Svg html={portraitLayers({ realm: 9, pulse, who: state.self })} /></div>
          </>
          : <Svg html={portraitLayers({ realm: state.realm, pulse, who: state.self })} />}
      </div>

      <div className="qi">
        <div className="n mono" data-opened={opened || undefined} style={{ color: r.colour }}>
          {num(state.qi)}
        </div>
        {/* 氣 The standing rate leads, because it is the one fixed by what you have
            bought and climbed. 入定 rides alongside it with its own name and its own
            number, so nothing on this line moves without saying why it moved. */}
        <div className="r mono">
          {CULTIVATE.standing(`+${num(gathering(state))} qi / s`)}
          {/* 宿慧 Already inside the number beside it, and named, so nothing moves unexplained. */}
          {echo > 0 && <span className="echochip"><Term han="宿慧" /> {REBIRTH.chip(echoPct(echo))}</span>}
          {focus > 1.15 && (
            <span className="deep" data-full={focus >= deepest - 0.001}>
              <Term han="入定" /> ×{focus.toFixed(1)}
            </span>
          )}
          {/* 香 Incense from the vault, beside the sitting and never inside it: it adds to
              the standing rate, it does not multiply what the sitting deepens. */}
          {burning > 0 && (
            <span className="incchip"><Term han="香" /> {INCENSE.chip(`${Math.round(INCENSE_BONUS * 100)}%`)}</span>
          )}
        </div>
        {(focus > 1.15 || burning > 0) && (
          <div className="rnow mono">{burning > 0
            ? INCENSE.now(num(gathering(state) * (focus + INCENSE_BONUS)))
            : `${num(gathering(state) * focus)} qi / s now`}</div>
        )}
        {/* 入定 Which part of the sitting this is, said every moment of it: deepening or
            holding with the time it has left, or over with what starts the next one.
            rekaris: "the player knows exactly when they start meditating, when it ends
            and when to check back." */}
        {sitLeft > 0 && !satOut && (
          <div className="sitline" data-full={focus >= deepest - 0.001}>
            <span className="sitchip mono"><Term han="入定" /> {SIT.chip(focus.toFixed(1), clockOf(sitLeft))}</span>
            <p className="faint">{focus >= deepest - 0.001 ? CULTIVATE.deepFull : SIT.rising}</p>
          </div>
        )}
        {/* 香 How long the incense has left, every moment it burns, and that it burns on
            while the app is shut: it is the first thing that moves the rate for a while,
            so the screen says for how long. */}
        {burning > 0 && (
          <div className="incline">
            <span className="incense mono"><Term han="香" /> {INCENSE.line(`${Math.round(INCENSE_BONUS * 100)}%`, longClock(burning))}</span>
            <p className="faint">{INCENSE.says}</p>
          </div>
        )}
        {satOut && (
          <div className="sitline" data-over="true">
            <p className="faint"><Term han="入定" /> {SIT.over(num(gathering(state)))} {SIT.how}</p>
            {onSitAgain && (
              <button className="act small sitagain" onClick={onSitAgain}>坐 <span>{SIT.again}</span></button>
            )}
          </div>
        )}
      </div>

      <div className="bar" data-opened={opened || undefined} style={{ margin: '14px 0 6px' }}>
        <i className="fill" style={{ transform: `scaleX(${filled})`, background: r.colour }} />
      </div>
      <div className="row" style={{ fontSize: 12 }}>
        <span className="faint">
          {top
            ? (full ? CULTIVATE.toward(num(dragon)) : CULTIVATE.poolFilling(duration(left)))
            : r.gains}
        </span>
        <span className="mono" style={{ color: 'var(--gold)' }}><Term han="材" /> {num(state.materials)}</span>
      </div>

      {/* 階 What the bar is actually filling, which the screen never said.
          Bruno: *"é necessário os players perceberem quanto qi é necessário por
          layer/realm aprox."* A bar with no price on it cannot be read: the player
          cannot tell a ten-minute rung from a two-day one, so the whole shape of the
          climb has to be guessed at. It rides the standing rate on purpose, the same
          way 待 the price countdowns do: sitting gets you there sooner, and that is the
          only direction this is allowed to be wrong in. */}
      {!top && (
        <p className="pace mono" onClick={onRealm}>
          {/* 守 At the ceiling the bar is full and the rung is the warden, so "0 qi to go ·
              about 0s" was a countdown to something that was already there. It says
              who is waiting instead. 囊 And a fresh cultivator's first rung waits for the
              first purchase (see clockUntil), which it says rather than freezing at 0s. */}
          {standing ? PACE.wardenWaits(w.han, w.name)
            : ready ? PACE.breakOpen
            : heldAtFirstRung(state) ? PACE.held
            : PACE.rungLeft(num(p.rungLeft), duration(p.rungSeconds))}
        </p>
      )}

      {/* 梯 The bar above is one rung. This is the other eight, the realm they sit in,
          and the warden at the end of them. Bruno had read "layer 3 / 9" and "realm 1 of
          9" for a week without the screen ever showing that one is inside the other. */}
      {!top && <Ladder state={state} />}

      {/* 雷池 The ninth realm still has nine layers to climb before the pool takes the bar.
          The breakthrough card names the pool, so this says how far off it is. */}
      {state.realm === 9 && !top && (
        <p className="faint" style={{ margin: '8px 0 0', fontSize: 12.5 }}>{CULTIVATE.lastLayers(LAYERS - 1 - layersOpened(state))}</p>
      )}
      </div>

      <div className="c-side">
      {standing && (
        <>
          <h2 className="heading">
            {top ? CULTIVATE.tribulationNext(state.tribulation + 1) : CULTIVATE.wardenHead}
          </h2>
          <div className="card">
            <div className="row">
              <Plate kind="beast" subject={plateOf(w)} icon={w.icon} colour={r.colour}
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
                  ? `${Math.round(Math.max(ODDS_FLOOR, Math.min(ODDS_CEILING, wardenRaw)) * 100)}%`
                  : `×${wardenGap < 10 ? wardenGap.toFixed(1) : Math.round(wardenGap)}`}
                <em className="faint" style={{ display: 'block', fontStyle: 'normal', fontSize: 9.5, letterSpacing: '.12em', textTransform: 'uppercase', fontFamily: 'Archivo' }}>
                  {wardenRaw > 0 ? HUNT.odds : HUNT.toReach}
                </em>
              </span>
            </div>
            <p className="faint" style={{ margin: '11px 0 12px', fontSize: 12.5 }}>
              {top ? CULTIVATE.tribulation : CULTIVATE.warden}
            </p>
            {loosens > 0 && (
              <p className="bneck" style={{ margin: '-4px 0 12px', fontSize: 12.5 }}>
                {CULTIVATE.bottleneck(over, loosens)}{' '}
                <span className="faint">
                  {carriedBreach > 0 ? CULTIVATE.breachCarried(carriedBreach)
                    : heldBreach >= 0.1 ? CULTIVATE.breachHeld(heldBreach) : CULTIVATE.breachNone}
                </span>
              </p>
            )}
            <button className="act" data-tone="cinnabar" data-coach="fight-warden" onClick={onFight}>
              戰 <span>Fight</span>
            </button>
          </div>
        </>
      )}

      {/* 緣 Somebody on the road. Above 示 the advice, because a person waiting is more
          interesting than a number, and below everything that is actually blocking. */}
      {meetDone
        ? <MeetDone receipt={meetDone} onClose={onMeetDone} onSee={onMeetSee} />
        : meeting && <Meet state={state} meeting={meeting} onAnswer={onMeet} />}

      {/* 心魔 A demon waiting is an event, so it stands up here with the road. The door
          the rest of the time is a thing to do, so it lives with the cave below. */}
      {demonDue(state) && <Seclusion state={state} onShut={() => set(seclude)} onFace={onDemon} />}

      {/* 悟道 The offer is derived from the save, so putting the sheet aside cannot lose
          it. This is what says so: it stays until the card is taken. */}
      {owesCard && (
        <button className="owes" onClick={onAwaken}>
          <b className="cjk">悟道</b>
          <i>{AWAKEN.waiting}</i>
          <em className="cjk">›</em>
        </button>
      )}
      {/* 改 The cards already taken, one tap away, and quiet: it is not a thing to do. */}
      {!owesCard && state.awakened.length > 0 && (
        <button className="handline" onClick={onCards}>{AWAKEN.hand.line(state.awakened.length)} ›</button>
      )}

      {ready && (
        <div style={{ marginTop: 16 }}>
          <button className="act" data-coach="breakthrough" onClick={() => {
            set((s) => breakThrough(s));
            bloom('gold'); burst('gold', null, 22, 150);
          }}>
            突破 <span>Break through</span>
          </button>
        </div>
      )}

      {crossing && (
        <div style={{ marginTop: 16 }} data-ready="cross">
          <button className="act" onClick={() => {
            set((s) => crossNow(s));
            bloom('violet'); burst('violet', null, 22, 150);
          }}>
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
                <span style={{ transform: `scaleX(${Math.min(1, tip.toward)})` }} />
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

      {/* 轉世 The other road from the top, offered quietly and never pressed: a line, not a
          card, under the heaven the cultivator stands in. Nothing is lost by leaving it. */}
      {reborn && onRebirth && (
        <button className="rebirthline" onClick={onRebirth}>
          <span><Svg html={seal('cosmic-egg', '#B49AE0')} /></span>
          <span><b className="cjk">轉世</b> {REBIRTH.title}. {echo >= ECHO_CEILING - 1e-9
            ? REBIRTH.offerFull : REBIRTH.offer(echoPct(echoAfter(state)))}</span>
          <em className="cjk">›</em>
        </button>
      )}

      {/* 入定 The sitting is said under the qi now, where its number is (see .sitline):
          when it ends the screen says so, because a number that falls by two thirds with
          nothing beside it reads as something taken away. */}

      <div className="spendrow">
        <h2 className="heading">{CULTIVATE.spend}</h2>
        <div className="buymode" role="group" aria-label={CULTIVATE.buyMode}>
          <button data-on={!many} onClick={() => pickMany(false)}>{CULTIVATE.buyOne}</button>
          <button data-on={many} onClick={() => pickMany(true)}>{CULTIVATE.buyMax}</button>
        </div>
      </div>
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
          // 盡 In Max mode the box shows what one tap will now buy, and for how much.
          const lot = many ? buyMax(state, u) : null;
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
              data-bought={bought === u}
              disabled={!canBuy(state, u)} onClick={() => {
                const n = many ? buyMax(state, u).n : 1;
                set((s) => (many ? buyMax(s, u).state : buy(s, u)));
                // 勁 What was bought rises from the finger that bought it.
                const tone = i.affects === 'power' ? 'gold' : 'jade';
                float(n > 1 ? `${i.effect} ×${n}` : i.effect, tone);
                burst(tone, null, 10, 56);
                setBought(u);
                if (settle.current) clearTimeout(settle.current);
                settle.current = setTimeout(() => setBought(null), 450);
              }}>
              <span className="ic"><Svg html={icon(i.icon, 26)} /></span>
              {/* 譯 The English name leads and the characters follow it, rather than the
                  other way round. A player who does not read Chinese was being sold four
                  things called 劍訣, 功法, 吐納 and 妖丹, told what each one did, and
                  never told, first, what any of them was. */}
              <span>
                <b>{i.name} <span className="cjk faint">{i.han}</span></b>
                <i>{i.effect} <span className="mono faint lvl" key={held}><span className="dot">· </span>{CULTIVATE.cap(held, cap)}</span></i>
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
                    {lot && lot.n > 1 && <i className="lot">{CULTIVATE.lot(lot.n)}</i>}
                    <b>{num(lot && lot.n > 1 ? lot.cost : cost)}</b>
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
      {/* 盡 Every level that can be paid for, cheapest first: the loop the measuring
          cultivators buy by (buyAll). Shown when it would buy more than one tap does. */}
      {(() => {
        const all = buyAll(state);
        if (all.n < 2) return null;
        return (
          <button className="act ghost buyall" onClick={() => {
            set((s) => buyAll(s).state);
            float(QOL.buy.bought(all.n), 'jade');
            burst('jade', null, 12, 60);
          }}>
            盡 <span>{QOL.buy.all}</span> <i>{QOL.buy.allSays(all.n)}</i>
          </button>
        );
      })()}
      {/* 階 Said once under the boxes rather than on every row that needs it. */}
      {UPGRADES.some((u) => (u !== 'cores' || isOpen(state.realm, 'cores'))
        && UPGRADE_INFO[u].currency === 'qi' && state.levels[u] < capOf(state, u)
        && !canBuy(state, u) && affordableIn(state, upgradeCost(state, u)).seconds === null) && (
        <p className="faint" style={{ margin: '8px 0 0', fontSize: 12.5 }}>{CULTIVATE.overRung}</p>
      )}

      {/* 洞天 Under the boxes, because it is the other place material goes and the
          question is always the same one: cores, refining, or the ground. */}
      {isOpen(state.realm, 'cave') && (
        <Cave state={state} onPlant={onPlant} onHarvest={onHarvest}
          onTakeAll={(again) => set((s) => (again ? harvestAndReplant(s) : harvestAll(s)))}
          onPlantAll={(key) => set((s) => plantAll(s, key))} />
      )}
      {!demonDue(state) && <Seclusion state={state} onShut={() => set(seclude)} onFace={onDemon} />}

      {/* 凝丹 The way out of the one dead end the game has.
          It appears only when 材 material has actually run out and a core is still to be
          had, which is the moment it answers a question instead of asking one.

          先 And never before the first kill. A new cultivator holds no material because
          nothing has fallen yet, not because it ran out, and on the very first screen of
          the game this card stood under the boxes in red saying "No material left" while
          引 the guide was still on its first step. The guide's third step is the one that
          teaches material, and it teaches it by hunting. */}
      {isOpen(state.realm, 'cores') && state.levels.cores < capOf(state, 'cores')
        && !canBuy(state, 'cores') && Object.values(state.killed).some((n) => n > 0) && (
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
      </div>
    </>
  );
}
