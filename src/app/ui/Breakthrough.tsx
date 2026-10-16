import { opensIn, isOpen } from '../../sim/unlocks.ts';
import { arriving } from '../../sim/arriving.ts';
import { FEEDER, openBy } from '../../sim/crafts.ts';
import { CRAFT_FEED_LEVEL } from '../../sim/balance.ts';
import { SKILLS, SKILL_BY_KEY, levelOf } from '../../data/crafts.ts';
import { LINEAGE_LAYER, realmSet } from '../../data/gear.ts';
import { realm as realmOf } from '../../data/realms.ts';
import type { State } from '../../sim/state.ts';
import { TAB_OF } from '../fresh.ts';
import { TABS } from '../tabs.ts';
import type { Place } from '../ready.ts';
import { BLOOM, OPENED, REALMCARD, standing } from '../copy.ts';

/**
 * 器 Whether the card names the realm's own gear: from the second realm, where gear opens,
 * because a tester reported "no sixth-realm gear" as a bug while it was two layers away.
 */
function namesGear(realm: number): boolean {
  return realm > 1 && isOpen(realm, 'gear');
}

/**
 * 來 What the realm brings across its layers, for a realm that opens no system. The eighth
 * is the longest climb in the game and its card used to be its colour for 1.4 seconds:
 * the beasts, the stance and the warden it walks toward are what it has to say. The gear
 * has its own line under it, so it is not listed twice.
 */
function comingOf(realm: number) {
  return opensIn(realm).length > 0 ? [] : arriving(realm, 0).filter((a) => a.kind !== 'gear');
}

/**
 * 待 Whether the card waits for a tap. Every realm from the second has something to read
 * now (what it opened, or what it brings, and its gear), so only a realm with none of it
 * goes by on its own. App reads this rather than opensIn, so the two cannot disagree.
 */
export function bloomHolds(realm: number): boolean {
  return opensIn(realm).length > 0 || comingOf(realm).length > 0 || namesGear(realm);
}

/**
 * 開 A late craft its feeder already opened (Alchemy from Herb Gathering at 40, and so on):
 * the realm's arrival is no news to whoever climbed the craft, so the row says since when
 * rather than announcing it as new. Null for anything that is new.
 */
function openedEarly(state: State | undefined, realm: number, sys: string): { name: string; level: number } | null {
  if (!state) return null;
  const skill = SKILLS.find((k) => k.opens === sys && FEEDER[k.key]);
  if (!skill) return null;
  // Open one realm down means a feeder opened it: the realm alone had not yet.
  if (!openBy(realm - 1, skill.key, (k) => levelOf(state.crafts.xp[k] ?? 0))) return null;
  return { name: SKILL_BY_KEY[FEEDER[skill.key]!].name, level: CRAFT_FEED_LEVEL };
}

/**
 * 突破 The breakthrough card: the realm opened, what it opened, and a way to each of them.
 * Each row names the tab it is on and goes there. The cards wait until this has been read
 * (see cardsUp in App), and every tab named here wears 新 until it is opened.
 */
export function Breakthrough({ realm, state, onGo, onDone }: {
  realm: number;
  /** The save as the realm opened, to tell a craft already climbed from a new one. */
  state?: State;
  onGo: (place: Place) => void;
  onDone: () => void;
}) {
  const info = realmOf(realm);
  const opened = opensIn(realm);
  const coming = comingOf(realm);
  const set = realmSet(realm);
  return (
    <div className="bloom" data-held={bloomHolds(realm)}
         style={{ color: info.colour }}>
      <span className="wash" />
      <span className="ring" /><span className="ring" /><span className="ring" />
      <div className="mid">
        <span className="han" style={{ color: info.colour }}>{info.han}</span>
        <p>{info.gains}</p>
        {opened.length > 0 && (
          <>
            <p className="openedhead">{OPENED.head}</p>
            <div className="opened">
              {opened.map((sys) => {
                const place = TAB_OF[sys.key];
                const t = TABS.find((x) => x.key === place)!;
                const early = openedEarly(state, realm, sys.key);
                return (
                  <button key={sys.key} type="button" className="openedrow" data-early={early ? true : undefined}
                          onClick={() => onGo(place)}>
                    <b className="cjk">{sys.han}</b>
                    <em>{sys.name}</em>
                    <i>{early ? OPENED.early(early.name, early.level) : sys.gives}</i>
                    <u className="openedtab">{OPENED.where(t.han, t.label)}</u>
                  </button>
                );
              })}
            </div>
          </>
        )}
        {coming.length > 0 && (
          <>
            <p className="openedhead">{BLOOM.comingHead}</p>
            <ul className="bloomcoming">
              {coming.map((a) => (
                <li key={a.key}>
                  <u className="mono">{REALMCARD.comingAt(standing(a.layer))}</u>
                  <b className="cjk">{a.han}</b>
                  <span><em>{a.name}</em> <i>{REALMCARD.comingKind[a.kind]}</i></span>
                </li>
              ))}
            </ul>
          </>
        )}
        {namesGear(realm) && (
          <p className="bloomgear"><b className="cjk">器</b> {BLOOM.gear(set.han, set.name, standing(LINEAGE_LAYER))}</p>
        )}
        {bloomHolds(realm) && (
          <button className="act" onClick={onDone}>
            續 <span>{BLOOM.on}</span>
          </button>
        )}
      </div>
    </div>
  );
}
