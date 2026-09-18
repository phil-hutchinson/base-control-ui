// Navigation: which screen is showing, and the three ways the app changes it.
// The address is the single source of truth — the screen is read from it on
// every render, never stored alongside it, so the address bar and the screen
// cannot disagree.
//
// `#game` names a game only while there is one to show. With no game — a
// reload, a cold link, or Forward after leaving one — it quietly means the
// main menu, and the address is corrected to say so. Backing out of a game in
// progress asks first, from inside the event that performed it, because a
// traversal cannot be cancelled once the browser has done it. Closing or
// reloading the tab is guarded the same way, through the browser's own
// prompt (`useLeaveConfirmation`).

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  currentHash,
  goBack,
  pushHash,
  registerAddressGuard,
  replaceHash,
  subscribeToAddress,
} from "./browserAddress";
import {
  GAME_HASH,
  GUIDE_HASH,
  LEAVE_GAME_PROMPT,
  type Screen,
  hashForScreen,
  screenFromHash,
} from "./screenAddress";
import { useLeaveConfirmation } from "./useLeaveConfirmation";

/** The screen showing, and the three actions that change it. */
export interface ScreenAddress {
  readonly screen: Screen;
  readonly showGame: () => void;
  readonly showGuide: () => void;
  readonly leaveToStart: () => void;
}

/**
 * Reads the screen from the address and keeps the two in step. `gameOver`
 * says the game showing has finished, which is what silences the prompt: a
 * finished game has nothing left to lose.
 */
export function useScreenAddress(gameOver: boolean): ScreenAddress {
  const hash = useSyncExternalStore(subscribeToAddress, currentHash);
  const [hasGame, setHasGame] = useState(false);

  const addressed = screenFromHash(hash);
  const screen: Screen = addressed === "game" && !hasGame ? "start" : addressed;

  // A game in progress is one that is showing and has not finished. It is
  // what both guards are armed by, so they cover exactly the same window.
  const gameInProgress = screen === "game" && !gameOver;

  useLeaveConfirmation(gameInProgress);

  useEffect(() => {
    if (hasGame && screen !== "game") {
      setHasGame(false);
    }
    // Replace, never push: StrictMode runs effects twice in development, and
    // a push would leave a duplicate entry behind each time.
    if (hash !== hashForScreen(screen)) {
      replaceHash(hashForScreen(screen));
    }
  }, [hash, hasGame, screen]);

  useEffect(() => {
    if (!gameInProgress) {
      return;
    }
    // The address has already changed by the time this runs, so the guard
    // asks and then puts it back. It runs inside the address change, before
    // anything can react to it, and declining puts the address back
    // synchronously — so no render ever shows the menu, and the game screen,
    // with the clocks and the board's selection inside it, never unmounts.
    return registerAddressGuard(() => {
      if (currentHash() === GAME_HASH) {
        return;
      }
      if (!window.confirm(LEAVE_GAME_PROMPT)) {
        pushHash(GAME_HASH);
      }
    });
  }, [gameInProgress]);

  const showGame = useCallback(() => {
    setHasGame(true);
    pushHash(GAME_HASH);
  }, []);

  const showGuide = useCallback(() => {
    pushHash(GUIDE_HASH);
  }, []);

  const leaveToStart = useCallback(() => {
    goBack();
  }, []);

  return { screen, showGame, showGuide, leaveToStart };
}
