import type { Notice } from '../notices.ts';
import { NOTICE, UPDATE } from '../copy.ts';

/** The one notice a player has not read yet, with the button that reads it and goes where it points. */
export function NoticeCard({ notice, onRead }: {
  notice: Notice;
  onRead: () => void;
}) {
  return (
    <div className="notice">
      <b className="cjk">{notice.han}</b>
      <span>
        <em>{notice.title}</em>
        <i>{notice.text}</i>
      </span>
      <button onClick={onRead}>{NOTICE.read}</button>
    </div>
  );
}

/** A new version is waiting to be taken, or can be left for later. */
export function UpdateBar({ onTake, onLater }: {
  onTake: () => void;
  onLater: () => void;
}) {
  return (
    <div className="newver">
      <span>
        <b className="cjk">新</b>
        <i>{UPDATE.ready}</i>
      </span>
      <button onClick={onTake}>{UPDATE.take}</button>
      <button className="later" onClick={onLater} aria-label={UPDATE.later}>✕</button>
    </div>
  );
}
