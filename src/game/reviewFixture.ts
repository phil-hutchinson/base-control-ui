// TEMPORARY. A hand-built game state, not a position reachable by play — no
// sequence of legal moves from the real starting position produces this
// arrangement. It exists solely so a person checking the app's visuals by
// eye can see every state at once — all four site states, ships at every
// shield count, a stranded ship and a game-ending score roll — without
// first having to play a hundred-round game to conclusion. This module is
// removed once that checking is done.

import {
  driftReturnPositionIndex,
  STARTING_RETURN_POSITION_INDEX,
} from "../rules/bays";
import { squareAt, squareName } from "../rules/board";
import {
  ACTIONS_PER_PLY,
  type GameState,
  type Ship,
  type SiteStatus,
  startingGameState,
} from "../rules/gameState";
import type { ShieldCount } from "../rules/shields";

/** The fixed random seed the fixture opens with, so reloading the page replays the same draws. */
const FIXTURE_SEED = 20260820;

/** Three rounds, so the game's end is two actions away. */
const FIXTURE_LENGTH_IN_ROUNDS = 3;

/**
 * Ply 5: green's third turn, one action free, nothing acted yet. Green
 * takes odd plies, so this is green's last turn and the round counter must
 * read 3/3.
 */
const FIXTURE_PLY_NUMBER = 5;

/** The ply the charged and depleted sites below entered their current state on. */
const FIXTURE_SITE_ENTERED_ON_PLY = 4;

/** The four plies already played, drifting the return position ring forward from its start. */
const FIXTURE_RETURN_POSITION_INDEX = driftReturnPositionIndex(
  driftReturnPositionIndex(
    driftReturnPositionIndex(
      driftReturnPositionIndex(STARTING_RETURN_POSITION_INDEX),
    ),
  ),
);

function withShipAt(
  ships: readonly Ship[],
  id: string,
  square: ReturnType<typeof squareAt>,
  shields: ShieldCount,
): readonly Ship[] {
  return ships.map((ship) =>
    ship.id === id ? { ...ship, square, shields } : ship,
  );
}

function status(state: SiteStatus["state"]): SiteStatus {
  return { state, enteredOnPly: FIXTURE_SITE_ENTERED_ON_PLY };
}

/**
 * A hand-built game state for checking the board's visuals by eye only. Built
 * from the real starting position at a three-round length, then advanced by
 * hand to ply 5: four sites charged, one depleted, one still active and the
 * rest dormant; ships at 0, 1, 2, 3 and 4 shields; and a green ship stranded
 * on the depleted site. See the module header for why this is not a
 * reachable position.
 */
export function reviewFixtureGameState(): GameState {
  const base = startingGameState(FIXTURE_SEED, FIXTURE_LENGTH_IN_ROUNDS);

  let ships = base.ships;
  ships = withShipAt(ships, "green-1", squareAt("H", 8), 2);
  ships = withShipAt(ships, "green-2", squareAt("E", 5), 4);
  ships = withShipAt(ships, "green-3", squareAt("D", 8), 1);
  ships = withShipAt(ships, "red-1", squareAt("K", 5), 3);
  ships = withShipAt(ships, "red-2", squareAt("K", 11), 0);

  const siteStates = {
    ...base.siteStates,
    [squareName(squareAt("H", 8))]: status("charged"),
    [squareName(squareAt("E", 5))]: status("charged"),
    [squareName(squareAt("K", 5))]: status("charged"),
    [squareName(squareAt("K", 11))]: status("charged"),
    [squareName(squareAt("D", 8))]: status("depleted"),
  };

  return {
    ...base,
    ships,
    siteStates,
    sideToMove: "green",
    actionsRemaining: ACTIONS_PER_PLY,
    actedThisPly: [],
    plyNumber: FIXTURE_PLY_NUMBER,
    returnPositionIndex: FIXTURE_RETURN_POSITION_INDEX,
    energy: { green: 4, red: 1 },
  };
}
