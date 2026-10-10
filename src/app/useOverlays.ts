import { useState } from 'react';
import type { Beast } from '../data/bestiary.ts';
import type { Item } from '../data/gear.ts';
import type { System } from '../sim/unlocks.ts';
import type { Receipt } from '../sim/meet.ts';

/**
 * The sheets, the pages and the screens that are open or shut. Each is a flag of its own, and
 * several can be open at once, as they always were; this hook only gathers them in one place.
 */
export function useOverlays() {
  const [help, setHelp] = useState(false);
  // 序 The prologue, which a brand new save opens on in place of the help sheet.
  const [prologue, setPrologue] = useState(false);
  // 釋 The key: what every character on the screen means.
  const [key, setKey] = useState(false);
  /** 譜 The page of which piece is which school, opened from the class on 器. */
  const [book, setBook] = useState(false);
  /** 較 The class comparison, opened from the class line on 器. */
  const [comparing, setComparing] = useState(false);
  /** 改 The cards already taken, where one can be traded. */
  const [cards, setCards] = useState(false);
  /** 轉世 The page of a new life, and whether this visit has just begun one. */
  const [rebirth, setRebirth] = useState(false);
  // 碑 The stele. A page you visit, not a loop you run, so it lives on the header rather
  // than taking a sixth place in a tab bar that has to fit on a phone.
  const [stele, setStele] = useState(false);
  const [credits, setCredits] = useState(false);
  const [saving, setSaving] = useState(false);
  // 收 The corner. Shut by default, and shut again on every open: the game's own
  // screen is what a player came back for, not its settings.
  const [menu, setMenu] = useState(false);
  // 境 The page that says what this realm is, reached from the realm's own name.
  const [realmPage, setRealmPage] = useState(false);
  /**
   * 悟道 Whether the three cards are on the screen right now.
   *
   * Only this is state. *Whether a choice is owed* is derived from the save, so it
   * cannot be lost by a reload and nothing has to remember to raise it. This is the
   * one thing that has to be remembered: that the player put it aside for a minute.
   */
  const [awakenShut, setAwakenShut] = useState(false);
  const [whom, setWhom] = useState(false);
  // 圍 The beast whose drive sheet is open, if any.
  // 據 What the last meeting gave, shown once on 修 until it is read; never stored.
  const [meetDone, setMeetDone] = useState<Receipt | null>(null);
  const [driving, setDriving] = useState<Beast | null>(null);
  /** 圍 Whether the window for a drive's waiting pieces is open without a drive sheet behind it. */
  const [pileOpen, setPileOpen] = useState(false);
  // 鑑 The piece being looked at, and whether it is the one on the body.
  const [inspect, setInspect] = useState<{ item: Item; wearing: boolean } | null>(null);
  const [fresh, setFresh] = useState(false);
  /** 突破 The breakthrough moment: the realm just left, held for its animation. */
  const [bloom, setBloom] = useState<number | null>(null);
  /** 鎖 A tab the realm has not opened yet, held for the panel that says so. */
  const [locked, setLocked] = useState<System | null>(null);
  /**
   * 出 Whether the end of a run is on the screen.
   *
   * The tally itself is in the save, because it is a record of what the rooms already
   * paid. This is only whether the player has read it yet, which is a screen's worth of
   * state and not a save's: closing the app in room five and coming back tomorrow comes
   * back to the game, not to yesterday's receipt.
   */

  const [tally, setTally] = useState(false);

  return {
    help,
    setHelp, prologue, setPrologue, key, setKey, book, setBook, comparing, setComparing, cards, setCards, rebirth, setRebirth, stele, setStele, credits, setCredits, saving, setSaving, menu, setMenu, realmPage, setRealmPage, awakenShut, setAwakenShut, whom, setWhom, meetDone, setMeetDone, driving, setDriving, pileOpen, setPileOpen, inspect, setInspect, fresh, setFresh, bloom, setBloom, locked, setLocked, tally, setTally,
  };
}
