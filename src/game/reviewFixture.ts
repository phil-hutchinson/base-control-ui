// TEMPORARY. A hand-built game state, not a position reachable by play — no
// sequence of legal moves from the real starting position produces this
// arrangement. It exists solely so a person checking combat on the board by
// eye has a fight ready to take in a couple of clicks, instead of first
// having to play many minutes of turns to grow shields on a node. This
// module is removed once that checking is done.

import { squareAt, squareName } from "../rules/board";
import type { Side, ShipId } from "../rules/fleet";
import { type GameState, type Ship, type SiteStatus } from "../rules/gameState";
import { SITES } from "../rules/sites";
import type { ShieldCount } from "../rules/shields";

/** The site standing at the middle of a fight, charged with plenty of life left. */
const CHARGED_SQUARE = squareAt("K", 5);
const CHARGED_ENTERED_ON_PLY = 5;

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
      siteStates[name] = {
        state: "charged",
        enteredOnPly: CHARGED_ENTERED_ON_PLY,
      };
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
  // Green: a strong attacker beside the charged node's defender, a weaker
  // ship that will lose on purpose against a stronger enemy, a ship matched
  // for a mutual return, and four spares sitting in their bays.
  ship("green-1", "green", "J", 4, 4),
  ship("green-2", "green", "G", 9, 1),
  ship("green-3", "green", "C", 6, 2),
  ship("green-4", "green", "A", 6, 0),
  ship("green-5", "green", "H", 1, 0),
  ship("green-6", "green", "O", 6, 0),
  ship("green-7", "green", "D", 15, 0),
  // Red: the charged node's weak holder, a stronger ship for green to lose
  // against, a ship matched for the mutual return, and four spares — one of
  // them sitting on return position 1, so the receptacle sits elsewhere.
  ship("red-1", "red", "O", 10, 0),
  ship("red-2", "red", "K", 5, 0),
  ship("red-3", "red", "H", 9, 3),
  ship("red-4", "red", "L", 1, 0),
  ship("red-5", "red", "C", 7, 2),
  ship("red-6", "red", "A", 10, 0),
  ship("red-7", "red", "A", 14, 0),
];

/**
 * The fixed random seed the fixture opens with, so reloading the page
 * replays the same replacement draws and a check can be repeated.
 */
const FIXTURE_SEED = 20260818;

/**
 * Ply 9, so return position 1 is L1 (the ring starts at H15 on ply 1 and
 * drifts one bay counter-clockwise per ply); see `src/rules/bays.ts`.
 */
const FIXTURE_PLY_NUMBER = 9;

/** The ring index of L1 in `CLOCKWISE_BAYS`, return position 1 on ply 9. */
const FIXTURE_RETURN_POSITION_INDEX = 6;

/**
 * A hand-built game state for checking combat on the board by eye only. Ply
 * 9, green to move with both actions free and nothing moved: K5 is charged
 * and held by a weak defender next to a strong green attacker, a second pair
 * is set up for green to lose on purpose, a third pair is matched for a
 * mutual return, and return position 1 (L1) is already occupied so the
 * receptacle sits elsewhere. See the module header for why this is not a
 * reachable position.
 */
export function reviewFixtureGameState(): GameState {
  return {
    ships: FIXTURE_SHIPS,
    siteStates: fixtureSiteStates(),
    sideToMove: "green",
    actionsRemaining: 2,
    movedThisPly: [],
    plyNumber: FIXTURE_PLY_NUMBER,
    randomSeed: FIXTURE_SEED,
    returnPositionIndex: FIXTURE_RETURN_POSITION_INDEX,
  };
}
