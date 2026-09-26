import { useEffect, useState } from 'react';
import { RANKS } from '../copy.ts';
import type { Board, Mine, Row, Synced, Who } from '../../net/cloud.ts';
import * as cloud from '../../net/cloud.ts';

/**
 * 榜 The rankings, and the one sign-in the game has.
 *
 * Bruno: *"ainda não temos página de login."* This is it, and it is deliberately small:
 * a name, and then a guest (this device) or an email link (every device). It lives
 * behind the Menu, because an idle game that asks for an account before it has shown
 * you anything has asked too early; the prologue offers it only to somebody who says
 * they already have a cultivator.
 *
 * What is ranked is never decided here. The boards come from the server, which verified
 * every row against its own clock (sim/verify.ts); this screen only shows them and says,
 * in words, where the player's own climb stands.
 */
export function Ranks({ who, synced, syncedAt, onEnter, onSignOut, onClose }: {
  who: Who | null;
  /** What the last sync said, and when. */
  synced: Synced | null;
  syncedAt: number | null;
  /** Called once a player is signed in, with the name they chose, so the app syncs at once. */
  onEnter: (w: Who, name: string) => void;
  onSignOut: () => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Board>('climb');
  const [rows, setRows] = useState<readonly Row[] | null>(null);
  const [me, setMe] = useState<Mine | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!who) return;
    let live = true;
    setRows(null);
    setFailed(false);
    cloud.board(tab).then((r) => { if (live) setRows(r); }).catch(() => { if (live) setFailed(true); });
    cloud.mine().then((m) => { if (live) setMe(m); });
    return () => { live = false; };
  }, [who, tab, syncedAt]);

  return (
    <div className="help ranks">
      <h2>{RANKS.title}</h2>
      {who ? (
        <>
          <Status synced={synced} syncedAt={syncedAt} suspect={me?.suspect ?? false} />
          <div className="rtabs" role="tablist">
            {(Object.keys(RANKS.boards) as Board[]).map((k) => (
              <button key={k} role="tab" aria-selected={tab === k} data-on={tab === k} onClick={() => setTab(k)}>
                <b className="cjk">{RANKS.boards[k].han}</b><span>{RANKS.boards[k].name}</span>
              </button>
            ))}
          </div>
          <p className="rwhat">{RANKS.boards[tab].what}</p>
          {failed ? <p className="rnote">{RANKS.offline}</p>
            : rows === null ? <p className="rnote">{RANKS.loading}</p>
              : rows.length === 0 ? <p className="rnote">{RANKS.empty}</p>
                : (
                  <ol className="rlist">
                    {rows.map((r) => (
                      <li key={`${r.rank}-${r.name}`} data-me={r.me} data-top={r.rank <= 3}>
                        <span className="rn">{r.rank}</span>
                        <span className="rw">
                          <b>{r.name}{r.me && <em> · {RANKS.you}</em>}</b>
                          {r.title && <i><span className="cjk">{r.title}</span> {RANKS.titleNames[r.title] ?? ''}</i>}
                        </span>
                        <span className="rv">
                          {tab === 'climb' ? RANKS.climbCell(r.climb, r.marks)
                            : tab === 'week' ? RANKS.gainCell(r.gain)
                              : RANKS.towerCell(r.tower)}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
          <p className="rnote small">
            <b>{RANKS.titlesHead}</b> {RANKS.titles}
          </p>
          <Account who={who} me={me} onSignOut={onSignOut} onRenamed={(m) => setMe(m)}
                   onLinked={async () => { const w = await cloud.who(); if (w) onEnter(w, ''); }} />
        </>
      ) : (
        <Join onEnter={onEnter} />
      )}
      <button className="act" style={{ marginTop: 'auto' }} onClick={onClose}>
        歸 <span>{RANKS.back}</span>
      </button>
    </div>
  );
}

function ago(seconds: number): string {
  if (seconds < 90) return 'a minute';
  if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
  return `${Math.round(seconds / 3600)} hours`;
}

function Status({ synced, syncedAt, suspect }: { synced: Synced | null; syncedAt: number | null; suspect: boolean }) {
  const line = suspect || synced?.suspect ? RANKS.status.suspect
    : !synced ? RANKS.status.never
      : synced.state === 'verified' ? RANKS.status.verified(ago(Date.now() / 1000 - (syncedAt ?? Date.now() / 1000)))
        : synced.state === 'waiting' ? RANKS.status.waiting(synced.behindHours >= 1 ? `${Math.round(synced.behindHours)} h` : 'a little')
          : synced.state === 'behind' ? RANKS.status.behind
            : RANKS.status.refused;
  const tone = suspect || synced?.suspect || synced?.state === 'refused' ? 'bad'
    : synced?.state === 'verified' ? 'good' : 'wait';
  return <p className="rstatus" data-tone={tone}>{line}</p>;
}

function Join({ onEnter }: { onEnter: (w: Who, name: string) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const okName = name.trim().length >= 2 && name.trim().length <= 20;
  const okMail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());

  return (
    <div className="rjoin">
      <b className="rhead">{RANKS.joinHead}</b>
      <p className="rnote">{RANKS.joinWhy}</p>
      <label>
        <span>{RANKS.namePrompt}</span>
        <input value={name} maxLength={20} autoComplete="nickname" onChange={(e) => setName(e.target.value)} />
      </label>
      <button className="act" disabled={!okName || busy} onClick={async () => {
        setBusy(true); setError(null);
        try { onEnter(await cloud.enterAsGuest(), name.trim()); } catch { setError(RANKS.offline); }
        setBusy(false);
      }}>
        入 <span>{RANKS.guest}</span>
      </button>
      <p className="rnote small">{RANKS.guestNote}</p>
      <p className="ror"><span>{RANKS.or}</span></p>
      <label>
        <span>{RANKS.emailPrompt}</span>
        <input type="email" value={email} autoComplete="email" inputMode="email" onChange={(e) => setEmail(e.target.value)} />
      </label>
      <button className="act ghost" disabled={!okMail || busy} onClick={async () => {
        setBusy(true); setError(null);
        try { await cloud.sendLink(email.trim(), false); setSent(email.trim()); } catch { setError(RANKS.offline); }
        setBusy(false);
      }}>
        信 <span>{RANKS.sendLink}</span>
      </button>
      {sent ? (
        <>
          <p className="rstatus" data-tone="good">{RANKS.linkSent(sent)}</p>
          <Code email={sent} guest={false} onIn={(w) => onEnter(w, name.trim())} />
        </>
      ) : <p className="rnote small">{RANKS.linkNote}</p>}
      {error && <p className="rstatus" data-tone="bad">{error}</p>}
      <a className="rlink" href="privacy/" target="_blank" rel="noopener">{RANKS.privacy}</a>
    </div>
  );
}

function Account({ who, me, onSignOut, onRenamed, onLinked }: {
  who: Who; me: Mine | null; onSignOut: () => void; onRenamed: (m: Mine) => void;
  /** A guest confirmed an email: the same account, now on every device. */
  onLinked: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(me?.name ?? '');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState<{ tone: 'good' | 'bad'; text: string } | null>(null);
  const [sure, setSure] = useState(false);
  const [linking, setLinking] = useState<string | null>(null);
  useEffect(() => { if (me) setName(me.name); }, [me]);

  return (
    <div className="raccount">
      <div className="rrow">
        {editing ? (
          <>
            <input value={name} maxLength={20} onChange={(e) => setName(e.target.value)} />
            <button className="act small" onClick={async () => {
              const r = await cloud.rename(name);
              if ('error' in r) { setNote({ tone: 'bad', text: RANKS.nameErrors[r.error as keyof typeof RANKS.nameErrors] }); return; }
              setEditing(false); setNote(null);
              if (me) onRenamed({ ...me, name: r.name });
            }}>{RANKS.save}</button>
          </>
        ) : (
          <>
            <b className="rname">{me?.name ?? '…'}</b>
            <button className="act ghost small" onClick={() => setEditing(true)}>{RANKS.rename}</button>
          </>
        )}
      </div>
      <p className="rnote small">{who.guest ? RANKS.guestAs : RANKS.signedAs(who.email ?? '')}</p>
      {who.guest && (
        <>
          <b className="rhead small">{RANKS.keepHead}</b>
          <p className="rnote small">{RANKS.keepNote}</p>
          <div className="rrow">
            <input type="email" value={email} placeholder={RANKS.emailPrompt} inputMode="email" onChange={(e) => setEmail(e.target.value)} />
            <button className="act small" disabled={!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())} onClick={async () => {
              try { await cloud.sendLink(email.trim(), true); setLinking(email.trim()); setNote({ tone: 'good', text: RANKS.linkSent(email.trim()) }); }
              catch { setNote({ tone: 'bad', text: RANKS.offline }); }
            }}>信 {RANKS.send}</button>
          </div>
        </>
      )}
      {note && <p className="rstatus" data-tone={note.tone}>{note.text}</p>}
      {linking && who.guest && <Code email={linking} guest onIn={() => { setLinking(null); setNote(null); onLinked(); }} />}
      <div className="rrow">
        <button className="act ghost small" onClick={onSignOut}>{RANKS.signOut}</button>
        <a className="rlink" href="privacy/" target="_blank" rel="noopener">{RANKS.privacy}</a>
      </div>
      {sure ? (
        <div className="rsure">
          <p className="rnote small">{RANKS.deleteSure}</p>
          <div className="rrow">
            <button className="act danger small" onClick={async () => {
              if (await cloud.deleteMe()) onSignOut(); else setNote({ tone: 'bad', text: RANKS.offline });
            }}>{RANKS.deleteYes}</button>
            <button className="act ghost small" onClick={() => setSure(false)}>{RANKS.deleteNo}</button>
          </div>
        </div>
      ) : (
        <button className="rdel" onClick={() => setSure(true)}>{RANKS.delete}</button>
      )}
    </div>
  );
}

/** 碼 The six digits from the email, for when the link would open somewhere else. */
function Code({ email, guest, onIn }: { email: string; guest: boolean; onIn: (w: Who) => void }) {
  const [code, setCode] = useState('');
  const [bad, setBad] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <div className="rcode">
      <label>
        <span>{RANKS.codePrompt}</span>
        <div className="rrow">
          <input inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={code}
                 onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setBad(false); }} />
          <button className="act small" disabled={code.length < 6 || busy} onClick={async () => {
            setBusy(true);
            try { onIn(await cloud.enterCode(email, code, guest)); } catch { setBad(true); }
            setBusy(false);
          }}>{RANKS.codeGo}</button>
        </div>
      </label>
      {bad && <p className="rstatus" data-tone="bad">{RANKS.codeBad}</p>}
    </div>
  );
}

/**
 * 雲 The one question the cloud asks: two cultivators, which one goes on. Asked only when
 * a sign-in finds a copy in the cloud that is further along than the one on this device.
 */
export function CloudPick({ there, here, onTake, onKeep }: {
  there: string; here: string; onTake: () => void; onKeep: () => void;
}) {
  return (
    <div className="cloudpick">
      <b className="cjk">雲</b>
      <h2>{RANKS.cloudHead}</h2>
      <p>{RANKS.cloudFound(there, here)}</p>
      <button className="act" onClick={onTake}>雲 <span>{RANKS.cloudTake}</span></button>
      <button className="act ghost" onClick={onKeep}>留 <span>{RANKS.cloudKeep}</span></button>
      <p className="rnote small">{RANKS.cloudNote}</p>
    </div>
  );
}
