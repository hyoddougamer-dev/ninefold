import { BRAND, DAO, OPENED, READY, RANKS, TABS_COPY } from '../copy.ts';
import { isOpen, opensIn, systemInfo, type System } from '../../sim/unlocks.ts';
import type { State } from '../../sim/state.ts';
import type { Place, Waiting } from '../ready.ts';
import { TAB_OF } from '../fresh.ts';
import { sfx } from '../sound.ts';
import { TABS, type TabKey } from '../tabs.ts';

/**
 * 開 The row of tabs, with the count of what is spent on each, the dot on the tab that has
 * something ready, the new-tab marks and the rankings tab. The screen above it is the same as it was.
 */
export function TabBar({ state, tab, setTab, setLocked, byTab, free, newTabs, ranks, setRanks, place }: {
  state: State;
  tab: TabKey;
  setTab: (t: TabKey) => void;
  setLocked: (s: System | null) => void;
  byTab: Partial<Record<Place, readonly Waiting[]>>;
  free: number;
  newTabs: readonly Place[];
  ranks: boolean;
  setRanks: (on: boolean) => void;
  place: number | null;
}) {
  return (
    <nav className="tabs">
      {/* 門 The logo at the head of the PC rail, as Bruno chose it: the ensō and the
          lettering from the same painting. Hidden on a phone, where the rail is the
          bar along the bottom and the home screen already wears the icon. */}
      <div className="railbrand" aria-label={BRAND.name}>
        <img className="mark" src="./brand/mark.webp" width="240" height="249" alt="" />
        <img className="name" src="./brand/name.webp" width="640" height="100" alt={BRAND.name} />
        <span><b className="cjk">九境</b> {BRAND.line}</span>
      </div>
      {TABS.map((t, i) => {
        const shut = t.needs !== null && !isOpen(state.realm, t.needs);
        // 點 An unspent 道 point is money on the floor, and the screen it is spent on
        // is three taps and a scroll away. So the tab carries the count: the one place
        // a player looking at any other screen will see it.
        const owed = t.key === 'dao' && !shut && isOpen(state.realm, 'tree') ? free : 0;
        // 待 Something ready on this tab: a dot, and the sentences in its label. Not on the
        // tab being looked at, and not the 道 points, which wear their own count.
        const here = shut ? [] : (byTab[t.key] ?? []).filter((w) => w.key !== 'points');
        const dot = here.length > 0 && tab !== t.key;
        // 新 A tab the last breakthrough put something on, until it is opened.
        const isNew = !shut && tab !== t.key && newTabs.includes(t.key);
        const opened = isNew ? opensIn(state.realm).filter((x) => TAB_OF[x.key] === t.key).map((x) => x.name) : [];
        const says = [
          ...(dot ? here.map((w) => w.long) : []),
          ...(isNew ? [OPENED.tabNew(opened.join(', '))] : []),
          ...(owed > 0 ? [DAO.freePoints(owed)] : []),
        ];
        const label = says.length ? READY.tabSays(t.label, says.join(' ')) : undefined;
        return (
          <button
            key={t.key}
            data-on={tab === t.key}
            data-shut={shut}
            data-coach={`tab-${t.key}`}
            data-ready={dot || undefined}
            data-new={isNew || undefined}
            aria-label={label}
            title={label}
            onClick={() => (shut ? setLocked(t.needs) : setTab(t.key))}
          >
            {/* 鍵 The key that opens it, on a computer's rail. */}
            <kbd className="tabkey" aria-hidden="true">{i + 1}</kbd>
            {dot && <i className="readydot" aria-hidden="true" />}
            {isNew && <i className="newdot" aria-hidden="true"><b className="cjk">新</b> {OPENED.newWord}</i>}
            {/* A locked tab keeps its own character and swaps its name for the realm
                that opens it. Four identical padlocks in a row say nothing.
                譯 It says the realm's *number* and not its name. 化神 sat under 塔 on
                every screen in the game, in Chinese and nothing else, which is the
                complaint Bruno made in its purest form: a permanent label nobody who
                does not read Chinese can read. The realm page still names it. */}
            <span className="g cjk">
              {t.han}
              {owed > 0 && <i className="owed" title={DAO.freePoints(owed)}>{owed}</i>}
            </span>
            <span className="l">{shut ? TABS_COPY.opensAt(systemInfo(t.needs!).realm) : t.label}</span>
            {/* 名 On the PC rail there is room for the name as well as the realm that
                opens it, and three rows reading REALM 5, REALM 2, REALM 2 said nothing. */}
            {shut && <span className="ln">{t.label}</span>}
          </button>
        );
      })}
      {/* 榜 The rankings are a tab, not a line in the corner menu. Bruno: *"os rankings
          devem aparecer como destaque e não escondido no menu."* It opens the same
          panel the menu did, it is never locked, and once the player is on the board
          it carries their place, the way 道 carries its unspent points. */}
      <button className="ranktab" data-on={ranks} data-coach="tab-ranks"
        aria-label={place ? RANKS.tabPlace(place) : RANKS.tab}
        onClick={() => { setRanks(true); sfx.tap(); }}>
        <kbd className="tabkey" aria-hidden="true">{TABS.length + 1}</kbd>
        <span className="g cjk">
          榜
          {place !== null && <i className="owed rankplace">#{place}</i>}
        </span>
        <span className="l">{RANKS.tab}</span>
      </button>
    </nav>
  );
}
