// Waking a site (rules.md §8.2): a ship charges any active site it touches,
// whether it lands on the site or only passes over it on the way somewhere
// else. This module holds the pure state transition; `ply.ts` calls it as
// part of applying a move, because the wake happens the moment the ship
// touches the site, not at the end of the turn.

import { type Square, squareName } from "./board";
import type { Side, ShipId } from "./fleet";
import type { GameState, Ship } from "./gameState";
import type { ReachEntry } from "./movement";

/** Whether a ship reached a site by landing on it or only by flying over it. */
export type SiteReach = "landed-on" | "flown-over";

/** A site went from active to charged because a ship touched it (rules.md §8.2). */
export interface SiteChargedEffect {
  readonly type: "site-charged";
  readonly square: Square;
  readonly shipId: ShipId;
  readonly side: Side;
  readonly reach: SiteReach;
}

/** The state resulting from a wake, and the effects it produced. */
export interface WakeResult {
  readonly state: GameState;
  readonly effects: readonly SiteChargedEffect[];
}

/**
 * Charges every **active** site among the squares a move touched — its
 * destination and everything it passed over, in path order — leaving sites
 * in any other state untouched. `ship` is the ship that made the move, and
 * `path` is the matching `reachFrom` entry, so callers never re-derive it.
 *
 * The §3.2 spacing property means a legal move can touch at most one site,
 * but this loops over the whole path rather than assuming it — that
 * assumption belongs to the site layout, not to this module.
 */
export function wakeTouchedSites(
  state: GameState,
  ship: Ship,
  path: ReachEntry,
): WakeResult {
  const touched: ReadonlyArray<{
    readonly square: Square;
    readonly reach: SiteReach;
  }> = [
    ...path.passedOver.map((square) => ({
      square,
      reach: "flown-over" as const,
    })),
    { square: path.destination, reach: "landed-on" as const },
  ];

  let siteStates = state.siteStates;
  const effects: SiteChargedEffect[] = [];

  for (const { square, reach } of touched) {
    const name = squareName(square);
    const status = siteStates[name];
    if (status === undefined || status.state !== "active") {
      continue;
    }

    siteStates = {
      ...siteStates,
      [name]: { state: "charged", enteredOnPly: state.plyNumber },
    };
    effects.push({
      type: "site-charged",
      square,
      shipId: ship.id,
      side: ship.side,
      reach,
    });
  }

  if (effects.length === 0) {
    return { state, effects };
  }

  return { state: { ...state, siteStates }, effects };
}
