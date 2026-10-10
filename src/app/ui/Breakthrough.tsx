import { opensIn } from '../../sim/unlocks.ts';
import { realm as realmOf } from '../../data/realms.ts';
import { TAB_OF } from '../fresh.ts';
import { TABS } from '../tabs.ts';
import type { Place } from '../ready.ts';
import { BLOOM, OPENED } from '../copy.ts';

/**
 * 突破 The breakthrough card: the realm opened, what it opened, and a way to each of them.
 * Each row names the tab it is on and goes there. The cards wait until this has been read
 * (see cardsUp in App), and every tab named here wears 新 until it is opened.
 */
export function Breakthrough({ realm, onGo, onDone }: {
  realm: number;
  onGo: (place: Place) => void;
  onDone: () => void;
}) {
  const info = realmOf(realm);
  return (
    <div className="bloom" data-held={opensIn(realm).length > 0}
         style={{ color: info.colour }}>
      <span className="wash" />
      <span className="ring" /><span className="ring" /><span className="ring" />
      <div className="mid">
        <span className="han" style={{ color: info.colour }}>{info.han}</span>
        <p>{info.gains}</p>
        {opensIn(realm).length > 0 && (
          <>
            <p className="openedhead">{OPENED.head}</p>
            <div className="opened">
              {opensIn(realm).map((sys) => {
                const place = TAB_OF[sys.key];
                const t = TABS.find((x) => x.key === place)!;
                return (
                  <button key={sys.key} type="button" className="openedrow" onClick={() => onGo(place)}>
                    <b className="cjk">{sys.han}</b>
                    <em>{sys.name}</em>
                    <i>{sys.gives}</i>
                    <u className="openedtab">{OPENED.where(t.han, t.label)}</u>
                  </button>
                );
              })}
            </div>
            <button className="act" onClick={onDone}>
              續 <span>{BLOOM.on}</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
