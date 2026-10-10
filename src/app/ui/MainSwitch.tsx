import type { Dispatch, SetStateAction } from 'react';
import { BUILD, MENU } from '../copy.ts';
import { canReincarnate } from '../../sim/rebirth.ts';
import type { State } from '../../sim/state.ts';
import { sfx } from '../sound.ts';
import { Volumes } from './Volume.tsx';

/** 版 Filled in by the build (vite.config.ts). */
declare const __BUILD__: string;

/**
 * 收 The corner Menu, the strip behind it once a phone screen is scrolled, and the scrim that
 * shuts it. Each entry opens a sheet the screen owns, so the sheets are passed in as setters.
 */
export function MainSwitch({ state, menu, setMenu, scrolled, covered, shade, setSaving, setHelp, setKey, setStele, setCards, setRebirth, setCredits }: {
  state: State;
  menu: boolean;
  setMenu: Dispatch<SetStateAction<boolean>>;
  scrolled: boolean;
  covered: boolean;
  shade: boolean;
  setSaving: (on: boolean) => void;
  setHelp: (on: boolean) => void;
  setKey: (on: boolean) => void;
  setStele: (on: boolean) => void;
  setCards: (on: boolean) => void;
  setRebirth: (on: boolean) => void;
  setCredits: (on: boolean) => void;
}) {
  return (
    <>
      <div className="topband" aria-hidden="true" data-on={scrolled && !covered} />
      {/* 收 One button, not five.
          Five bare characters floating over the corner of a screen that is already
          asking a new player to learn characters is five unanswered questions, and
          Bruno said so: *"fica muito confuso"*. They fold into one, and when it opens
          each one arrives with its name in English beside it, which is the same rule
          the upgrades follow, applied to the one place that had escaped it. */}
      <div className="switches" data-open={menu} hidden={shade && !menu}>
        <button className="mainswitch" data-on={menu} aria-expanded={menu}
          aria-label={MENU.label} onClick={() => { setMenu((m) => !m); sfx.tap(); }}>
          {menu ? '✕' : '≡'}
        </button>
        {menu && (
          <div className="switchmenu">
            {([
              ['存', MENU.save, () => setSaving(true)],
              ['?', MENU.help, () => setHelp(true)],
              ['釋', MENU.key, () => setKey(true)],
              ['碑', MENU.stele, () => setStele(true)],
              ['悟', MENU.cards, () => setCards(true)],
              // 轉世 Only once it has ever been possible: before the summit it is a word for nothing.
              ...((canReincarnate(state) || state.lives.length > 0)
                ? [['轉', MENU.rebirth, () => setRebirth(true)] as const] : []),
              ['謝', MENU.credits, () => setCredits(true)],
            ] as const).map(([han, label, go]) => (
              <button key={label} onClick={() => { setMenu(false); go(); sfx.tap(); }}>
                <b className="cjk">{han}</b><span>{label}</span>
              </button>
            ))}
            {/* 報 Out to the testers' Discord, where the build line below goes in the post. */}
            <a href={MENU.discord} target="_blank" rel="noopener noreferrer" onClick={() => { setMenu(false); sfx.tap(); }}>
              <b className="cjk">報</b><span>{MENU.report}</span>
            </a>
            {/* 量 Sound and music: a slider and a mute each (ui/Volume.tsx). */}
            <Volumes />
            <span className="build">{BUILD.label(typeof __BUILD__ === 'string' ? __BUILD__ : 'dev')}</span>
          </div>
        )}
      </div>
      {/* Anywhere else shuts it, which is what a menu that floats over a live game has
          to do or the player is left tapping the game through a list. */}
      {menu && <div className="scrim" onClick={() => setMenu(false)} />}
    </>
  );
}
