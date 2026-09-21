// The badge state a bonus planet panel cell draws (rules.md §3.4), decided
// purely from a `BonusPlanetEntry`'s claim ply and the state's current ply
// number, so `PlanetBonusPanel` never needs a timer, a component state or an
// event-diffing hook to know what to show — the same reason the entry itself
// stores a ply rather than a boolean (see `gameState.ts`, `BonusPlanetEntry`).

/**
 * The three things a panel cell can draw over its planet's drawing: nothing
 * (never claimed), the amount just paid, or the settled mark.
 */
export type BonusBadgeState = "none" | "amount" | "claimed";

/**
 * Which badge an entry draws at the given ply number. Unclaimed
 * (`claimedOnPly` undefined) always draws nothing. A claim made on ply N
 * draws the amount through ply N and ply N+1 — the whole of the opponent's
 * reply, since the session sits at N+1 with the opponent to move once the
 * claiming ply has ended — and settles into the claimed mark from ply N+2
 * on. Known and accepted: if the pass guard advances the ply number twice in
 * one event, the amount window can be skipped over entirely; that is a pure
 * consequence of reading the state, not a bug, and is a reply the opponent
 * never got to make. Likewise, a bonus claimed on the game's last ply never
 * settles: the ply number stops advancing once the game is over, so the
 * amount stays on screen behind the game-over panel for the rest of the
 * session — also seen and accepted.
 */
export function bonusBadgeState(
  claimedOnPly: number | undefined,
  plyNumber: number,
): BonusBadgeState {
  if (claimedOnPly === undefined) {
    return "none";
  }
  return plyNumber - claimedOnPly <= 1 ? "amount" : "claimed";
}
