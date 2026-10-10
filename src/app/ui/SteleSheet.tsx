import type { State } from '../../sim/state.ts';
import { Chronicle } from '../screens/Chronicle.tsx';

/**
 * 碑 The stele: the page of the whole run, kept on the header rather than in the tab bar.
 * A page you visit, not a loop you run; the screen above it is the same as it always was.
 */
export function SteleSheet({ state, pulse, onBack }: { state: State; pulse: number; onBack: () => void }) {
  return (
    <div className="stelepage">
      <Chronicle state={state} pulse={pulse} />
      <button className="act" style={{ marginTop: 18 }} onClick={onBack}>
        續 <span>Back</span>
      </button>
    </div>
  );
}
