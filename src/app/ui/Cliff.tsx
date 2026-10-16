import { Fragment, useEffect, useState } from 'react';
import { FORERUNNER, RANKS } from '../copy.ts';
import { ForerunnerSeal } from './Forerunner.tsx';
import { Named } from './Named.tsx';
import { pictureOf } from '../../data/pictures.ts';
import { columns, FIRST, foot, seenAt, shown, type Column } from '../cliff.ts';
import type { Carved } from '../../net/cloud.ts';
import * as cloud from '../../net/cloud.ts';

/**
 * 題名崖 The Cliff of Names, inside 榜 Rankings (docs/SEASON0-THEME.md, 2c).
 *
 * Nine columns, one per gate, each headed by its realm's painting. A column stays in ink
 * until its first name is carved and then takes its colour, so by December the Cliff is a
 * picture of how far the world has climbed. Each holds the first 81 through its gate with
 * the server's date; your own place is lit. At its foot, 先行 those who walked before: every
 * Forerunner's name (2c), from forerunners(), carved or not. If that one call fails, the foot
 * falls back to the Forerunners carved on the Cliff and says so, rather than going blank.
 *
 * It reads cliff() through fetchCliff(), which anybody may call, so a player who has not
 * joined the boards can look at it too. On a phone the nine columns scroll sideways inside
 * their own frame (.rcliffscroll), never the page.
 *
 * Every class here starts with rcliff or rcol and is scoped under .help.ranks in theme.css:
 * nothing is shared with another screen.
 */
export function Cliff({ me, onBack }: {
  /** The name the boards show for the signed-in player, to light their place. */
  me: string | null;
  onBack: () => void;
}) {
  const [rows, setRows] = useState<readonly Carved[] | null>(null);
  const [failed, setFailed] = useState(false);
  // 先行 Every Forerunner, or null while it is read and if it could not be.
  const [walked, setWalked] = useState<readonly string[] | null>(null);
  const [all, setAll] = useState(false);
  const C = RANKS.cliff;

  useEffect(() => {
    let live = true;
    cloud.fetchCliff().then((r) => { if (live) setRows(r); }).catch(() => { if (live) setFailed(true); });
    cloud.fetchForerunners().then((n) => { if (live) setWalked(n); }).catch(() => {});
    return () => { live = false; };
  }, []);

  const cols = rows ? columns(rows, me) : null;
  // The whole list when the server gave it; the carved ones only when it did not.
  const { names: before, whole } = foot(walked, rows);
  const long = cols?.some((c) => c.rows.length > FIRST) ?? false;
  const mine = cols?.filter((c) => c.mine !== null) ?? [];

  return (
    <section className="rcliff" aria-label={C.name}>
      <button type="button" className="rcliffback" onClick={onBack}>
        <span aria-hidden="true">‹</span> {C.back}
      </button>
      <header className="rcliffhead">
        <b className="cjk">{C.han}</b>
        <span><em>{C.name}</em><small>{C.door}</small></span>
      </header>
      <p className="rcliffwhat">{C.what}</p>
      {mine.length > 0 && (
        <div className="rcliffmine">
          {mine.map((c) => <p key={c.gate}>{C.yours(c.mine!, C.gateOf(c.name))}</p>)}
        </div>
      )}
      {failed ? <p className="rcliffnote">{C.offline}</p>
        : !cols ? <p className="rcliffnote">{C.loading}</p>
          : (
            <>
              {cols.every((c) => !c.on) && <p className="rcliffempty">{C.empty}</p>}
              <p className="rcliffswipe">{C.scroll}</p>
              {/* 捲 The one thing on this screen allowed to scroll sideways, and only inside itself. */}
              <div className="rcliffscroll" role="region" aria-label={C.name} tabIndex={0}>
                <div className="rcliffcols" role="list">
                  {cols.map((c) => <Gate key={c.gate} col={c} all={all} />)}
                </div>
              </div>
              {long && (
                <button type="button" className="rcliffall" aria-pressed={all} onClick={() => setAll(!all)}>
                  {all ? C.fewer : C.all}
                </button>
              )}
              <p className="rcliffwhen">{C.when}</p>
            </>
          )}
      {/* 先行 Those who walked before: names only, never a number (2c, 2d). */}
      <footer className="rclifffoot">
        <ForerunnerSeal className="rcliffseal" />
        <div>
          <b><span className="cjk">{FORERUNNER.han}</span> {C.footHead}</b>
          <small>{whole ? (before.length ? C.foot : C.footNobody) : before.length ? C.footCarved : C.footNone}</small>
          {before.length > 0 && (
            <p className="rcliffnames">
              {/* Each name holds together on its line ("Jin He", never "Jin" / "He"); the line breaks between names. */}
              {before.map((n, i) => (
                <Fragment key={n}><span data-me={n === me || undefined}>{n}</span>{i < before.length - 1 ? ' · ' : ''}</Fragment>
              ))}
            </p>
          )}
        </div>
      </footer>
    </section>
  );
}

/** 門 One gate's column: the painting, the warden, and the names carved through it. */
function Gate({ col, all }: { col: Column; all: boolean }) {
  const C = RANKS.cliff;
  const list = shown(col, all);
  const hidden = col.rows.length - list.length;
  const sky = pictureOf('realm', String(col.gate));
  return (
    <div className="rcol" role="listitem" data-on={col.on} data-mine={col.mine !== null || undefined}
         data-gate={col.gate}>
      <div className="rcolpic" aria-hidden="true" style={sky ? { backgroundImage: `url(${sky})` } : undefined} />
      <div className="rcolname">
        <b className="cjk">{col.han}</b>
        <span>{col.name}</span>
        <small>{C.gate(col.gate)}</small>
      </div>
      <p className="rcolcount">{col.on ? C.count(col.rows.length) : C.nobody}</p>
      {col.on ? (
        <div className="rcollist" role="list">
          {list.map((r, i) => (
            <div key={`${r.rank}-${r.name}`} role="listitem" className="rcolrow"
                 data-me={r.rank === col.mine || undefined}
                 data-gap={i > 0 && r.rank !== list[i - 1].rank + 1 || undefined}>
              <span className="rcoln">{r.rank}</span>
              <span className="rcolw">
                <b><Named name={r.name} />{r.rank === col.mine && <em> · {C.you}</em>}</b>
                <i>{seenAt(r.at)}</i>
              </span>
            </div>
          ))}
        </div>
      ) : <p className="rcolnone">{C.first}</p>}
      {hidden > 0 && <p className="rcolmore">{C.more(hidden)}</p>}
    </div>
  );
}
