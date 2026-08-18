// TEMPORARY. A hand-built game state, not a position reachable by play — no
// sequence of legal moves from the real starting position produces this
// arrangement. It exists solely so a person checking the board by eye has a
// node close to running out, ships placed to wake sites by landing and by
// flying over, and a pinned ship to look at, without first having to play a
// dozen plies to get there. This module is removed once that checking is
// done.

import { squareAt, squareName } from "../rules/board";
import type { Side, ShipId } from "../rules/fleet";
import { type GameState, type Ship, type SiteStatus } from "../rules/gameState";
import { SITES } from "../rules/sites";
import type { ShieldCount } from "../rules/shields";

/** The site one turn from running out: charged since ply 1, so it depletes at the end of ply 9. */
const CHARGED_SQUARE = squareAt("K", 5);

/** The other four sites that make up the five-active-or-charged invariant. */
const ACTIVE_SQUARES = [
  squareAt("E", 5),
  squareAt("H", 8),
  squareAt("E", 11),
  squareAt("K", 11),
];

const ACTIVE_NAMES: ReadonlySet<string> = new Set(
  ACTIVE_SQUARES.map(squareName),
);

function fixtureSiteStates(): Record<string, SiteStatus> {
  const siteStates: Record<string, SiteStatus> = {};
  for (const site of SITES) {
    const name = squareName(site);
    if (name === squareName(CHARGED_SQUARE)) {
      siteStates[name] = { state: "charged", enteredOnPly: 1 };
    } else if (ACTIVE_NAMES.has(name)) {
      siteStates[name] = { state: "active", enteredOnPly: 0 };
    } else {
      siteStates[name] = { state: "dormant", enteredOnPly: 0 };
    }
  }
  return siteStates;
}

function ship(
  id: ShipId,
  side: Side,
  column: Parameters<typeof squareAt>[0],
  row: number,
  shields: ShieldCount,
): Ship {
  return { id, side, square: squareAt(column, row), shields };
}

const FIXTURE_SHIPS: readonly Ship[] = [
  // Green: the node holder, a wing that wakes H8 by landing, a spare, a
  // pinned ship boxed in by its own fleet and the opponent, and two spares.
  ship("green-1", "green", "K", 5, 3),
  ship("green-2", "green", "H", 6, 0),
  ship("green-3", "green", "C", 7, 0),
  ship("green-4", "green", "A", 1, 4),
  ship("green-5", "green", "A", 2, 0),
  ship("green-6", "green", "D", 1, 0),
  ship("green-7", "green", "A", 14, 0),
  // Red: the blocker that pins green-4, a wing that wakes K11 by flying
  // over it, and four spares.
  ship("red-1", "red", "B", 1, 0),
  ship("red-2", "red", "K", 9, 0),
  ship("red-3", "red", "O", 10, 0),
  ship("red-4", "red", "O", 2, 0),
  ship("red-5", "red", "H", 1, 0),
  ship("red-6", "red", "L", 15, 0),
  ship("red-7", "red", "D", 15, 0),
];

/**
 * The fixed random seed the fixture opens with, so reloading the page
 * replays the same replacement draws and a check can be repeated.
 */
const FIXTURE_SEED = 20260818;

/**
 * A hand-built game state for checking the board by eye only. Ply 9, green to move
 * with both actions free: K5 is charged and one turn from running out,
 * E5/H8/E11/K11 are active, and the rest of the seventeen sites are
 * dormant. See the module header for why this is not a reachable position.
 */
export function reviewFixtureGameState(): GameState {
  return {
    ships: FIXTURE_SHIPS,
    siteStates: fixtureSiteStates(),
    sideToMove: "green",
    actionsRemaining: 2,
    movedThisPly: [],
    plyNumber: 9,
    randomSeed: FIXTURE_SEED,
  };
}
