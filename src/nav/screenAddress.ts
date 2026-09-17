// The app's three addresses and the screen each one names. The main menu is
// the page's own URL with no fragment, the quick guide is `#how-to-play`, and
// a game in progress is `#game`. An address the app never issued is not an
// error: it reads as the main menu, so the app always has a screen to show.
// Pure — no DOM, no React; `browserAddress.ts` does the touching.

/** Which screen is showing: the main menu, a game in progress, or the guide. */
export type Screen = "start" | "game" | "guide";

/** The main menu's address: the page's own URL, with no fragment on it. */
export const MENU_HASH = "";

/** The quick guide's address. */
export const GUIDE_HASH = "#how-to-play";

/** A game in progress. */
export const GAME_HASH = "#game";

/**
 * The screen an address names. Matching is exact — `#GAME` is not `#game` —
 * and anything unrecognised names the main menu.
 */
export function screenFromHash(hash: string): Screen {
  switch (hash) {
    case GUIDE_HASH:
      return "guide";
    case GAME_HASH:
      return "game";
    default:
      return "start";
  }
}

/**
 * The address a screen is shown at: the inverse of `screenFromHash` over the
 * three screens, and total, so the address bar can always be corrected to
 * name the screen actually showing.
 */
export function hashForScreen(screen: Screen): string {
  switch (screen) {
    case "guide":
      return GUIDE_HASH;
    case "game":
      return GAME_HASH;
    case "start":
      return MENU_HASH;
  }
}

/**
 * What the player is asked before backing out of a game in progress. The
 * browser supplies the OK and Cancel buttons, so this is a question.
 */
export const LEAVE_GAME_PROMPT = "Leave this game? It will be lost.";
