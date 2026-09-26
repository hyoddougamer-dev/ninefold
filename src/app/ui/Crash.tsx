import { Component, type ReactNode } from 'react';
import { CRASH } from '../copy.ts';

/**
 * 崩 The screen for when the game itself breaks.
 *
 * Before this, an error anywhere in a render took the whole tree down and left a phone
 * holding a blank page with the game's name in the tab: no way back and no way to know
 * the save was safe. The save lives in localStorage and the crash never touches it, so
 * this says so, offers to copy it out as text before anything else is tried, and opens
 * the game again. It reads the save straight from storage, because the state it would
 * otherwise ask is the thing that just failed.
 */
export class Crash extends Component<{ children: ReactNode }, { error: Error | null; copied: boolean }> {
  state = { error: null as Error | null, copied: false };

  static getDerivedStateFromError(error: Error) {
    return { error, copied: false };
  }

  componentDidCatch(error: Error) {
    console.error('ninefold crashed', error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    let raw = '';
    try { raw = localStorage.getItem('ninefold.save.v1') ?? ''; } catch { /* no storage */ }
    return (
      <div className="crash" role="alert">
        <b className="cjk">崩</b>
        <h2>{CRASH.title}</h2>
        <p>{CRASH.body}</p>
        <button className="act" onClick={() => location.reload()}>歸 <span>{CRASH.reload}</span></button>
        {raw && (
          <button className="act ghost" onClick={async () => {
            try { await navigator.clipboard.writeText(raw); this.setState({ copied: true }); } catch { /* shown below */ }
          }}>存 <span>{this.state.copied ? CRASH.copied : CRASH.copy}</span></button>
        )}
        <code>{String(this.state.error.message).slice(0, 160)}</code>
      </div>
    );
  }
}
