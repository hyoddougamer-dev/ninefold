import { useState } from 'react';
import { Camp } from './screens/Camp.tsx';
import { MountainScreen } from './screens/MountainScreen.tsx';
import { Self } from './screens/Self.tsx';
import { Sect } from './screens/Sect.tsx';

const TABS = [
  { key: 'camp', han: '營', label: 'Camp' },
  { key: 'mountain', han: '山', label: 'Mountain' },
  { key: 'self', han: '身', label: 'Self' },
  { key: 'sect', han: '宗', label: 'Sect' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

/**
 * Four screens, one bar, nothing more than two deep. An idle game is opened in a queue
 * and read one-handed; a menu you have to navigate is a menu you stop opening.
 */
export function App() {
  const [tab, setTab] = useState<TabKey>('camp');
  return (
    <div className="app">
      <div className="sheet" key={tab}>
        {tab === 'camp' && <Camp />}
        {tab === 'mountain' && <MountainScreen />}
        {tab === 'self' && <Self />}
        {tab === 'sect' && <Sect />}
      </div>
      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.key} data-on={tab === t.key} onClick={() => setTab(t.key)}>
            <span className="g han">{t.han}</span>
            <span className="l">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
