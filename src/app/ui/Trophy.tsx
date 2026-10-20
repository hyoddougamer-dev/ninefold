import type { Beast } from '../../data/bestiary.ts';
import { realm as realmOf } from '../../data/realms.ts';
import type { State } from '../../sim/state.ts';
import { num } from '../../sim/format.ts';
import { TROPHY_RENDER } from '../../sim/balance.ts';
import {
  PAGE_TITLES, TROPHY_BY_BEAST, barOf, bookTitle, canGild, canRender, giltCost, giltReady,
  held, pageBeasts, pageLevel, pageWhole, pagesHeld, trophyCeiling, trophyPower,
} from '../../sim/trophies.ts';
import { TROPHY } from '../copy.ts';
import { Term } from './Term.tsx';

/**
 * 珍 One beast's trophy, as a line under its hunt row: the bar it is in, the honest chance on
 * the next kill, and how many are held. Commons only; a warden leaves none.
 */
export function TrophyLine({ state, beast }: { state: State; beast: Beast }) {
  const t = TROPHY_BY_BEAST[beast.key];
  if (!t || beast.warden) return null;
  const bar = barOf(state, beast.key);
  const have = held(state, beast.key);
  const oneIn = bar.chance > 0 ? Math.max(1, Math.round(1 / bar.chance)) : 0;
  return (
    <span className="btrophy" data-fallen={bar.fallen || undefined} data-held={have > 0 || undefined}>
      <b className="cjk"><Term han="珍" /></b>
      <span className="bar"><i style={{ width: `${Math.min(100, (bar.into / bar.size) * 100)}%` }} /></span>
      <i>
        {bar.fallen ? TROPHY.fallen(t.name, num(bar.killsLeft)) : TROPHY.odds(t.name, num(oneIn), num(bar.killsLeft))}
        {have > 0 && <em> · {TROPHY.held(have)}</em>}
      </i>
    </span>
  );
}

/**
 * 冊 A realm's page in the trophy book, under its heading in the bestiary: how many of its three
 * are held, the title it gives, and the two things that can be done with spares.
 */
export function TrophyPage({ state, realm, onRender, onGild }: {
  state: State;
  realm: number;
  onRender?: (key: string) => void;
  onGild?: (realm: number) => void;
}) {
  const of = pageBeasts(realm);
  if (of.length === 0) return null;
  const have = of.filter((b) => held(state, b.key) > 0).length;
  const level = pageLevel(state, realm);
  const title = PAGE_TITLES[realm - 1];
  const kept = level > 0 && !pageWhole(state, realm);
  const missing = of.find((b) => held(state, b.key) === 0);
  const cost = giltCost(realm);
  const colour = realmOf(realm).colour;
  return (
    <div className="tpage" data-level={level}>
      <span className="tphead">
        <b style={{ color: level > 0 ? colour : undefined }}>
          {level === 2 ? TROPHY.pageGilt(`${title.han} ${title.name}`)
            : level === 1 ? TROPHY.pageWhole(`${title.han} ${title.name}`)
            : TROPHY.page(have, of.length)}
        </b>
        {kept && <i className="faint">{TROPHY.pageKept}</i>}
      </span>
      {missing && onRender && canRender(state, missing.key) && (
        <button type="button" className="act tpact" onClick={() => onRender(missing.key)}>
          {TROPHY.render(TROPHY_RENDER, TROPHY_BY_BEAST[missing.key].name)}
        </button>
      )}
      {level === 1 && !kept && giltReady(state, realm) && onGild && (
        <button type="button" className="act tpact" disabled={!canGild(state, realm)} onClick={() => onGild(realm)}>
          {TROPHY.gild(num(cost))}
        </button>
      )}
      {level === 1 && !kept && !giltReady(state, realm) && (
        <i className="faint tpnote">{TROPHY.gildNeeds(num(cost))}</i>
      )}
    </div>
  );
}

/** 珍 A trophy on a beast's card in the bestiary: its name, and held or not yet. */
export function TrophyCard({ state, beast }: { state: State; beast: Beast }) {
  const t = TROPHY_BY_BEAST[beast.key];
  if (!t || beast.warden) return null;
  const have = held(state, beast.key);
  return (
    <span className="tcard" data-held={have > 0 || undefined}>
      <b className="cjk">{have > 0 ? t.han : '珍'}</b>
      <i>{have > 0 ? `${t.name} · ${TROPHY.cardHeld(have)}` : TROPHY.cardMissing}</i>
    </span>
  );
}

/** 冊 The whole book in one line, above the bestiary's realms: pages, power, title. */
export function TrophyBook({ state }: { state: State }) {
  const title = bookTitle(state);
  return (
    <div className="tbook">
      <b>{TROPHY.book(pagesHeld(state), trophyPower(state).toFixed(2), trophyCeiling().toFixed(2))}</b>
      {title && <i>{TROPHY.bookTitle(`${title.han} ${title.name}`)}</i>}
    </div>
  );
}
