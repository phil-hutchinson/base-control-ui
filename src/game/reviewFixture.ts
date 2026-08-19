// TEMPORARY. A hand-built game state, not a position reachable by play — no
// sequence of legal moves from the real starting position produces this
// arrangement. It exists solely so a person checking scoring, the round
// counter and the end of the game on the board by eye can reach all three in
// a few clicks, instead of first having to play a hundred-round game to
// conclusion. This module is removed once that checking is done.

import {
  driftReturnPositionIndex,
  STARTING_RETURN_POSITION_INDEX,
} from "../rules/bays";
import { squareAt, squareName } from "../rules/board";
import {
  type GameState,
  type Ship,
  startingGameState,
} from "../rules/gameState";
import type { ShieldCount } from "../rules/shields";
import type { SiteState } from "../rules/sites";

/** The fixed random seed the fixture opens with, so reloading the page replays the same draws. */
const FIXTURE_SEED = 20260819;

/** Three rounds, so the whole game is six plies and an ending is a few clicks away. */
const FIXTURE_LENGTH_IN_ROUNDS = 3;

/**
 * Ply 3: green's second turn, both actions free, nothing moved yet. Green
 * takes odd plies, so the round counter must read 2/3 here.
 */
const FIXTURE_PLY_NUMBER = 3;

/** The two plies already played, drifting the return position ring forward from its start. */
const FIXTURE_RETURN_POSITION_INDEX = driftReturnPositionIndex(
  driftReturnPositionIndex(STARTING_RETURN_POSITION_INDEX),
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

function charged(enteredOnPly: number): {
  state: SiteState;
  enteredOnPly: number;
} {
  return { state: "charged", enteredOnPly };
}

/**
 * A hand-built game state for checking scoring, the round counter and the
 * end of the game on the board by eye only. Built from the real starting
 * position at a three-round length, then advanced two plies by hand: green
 * holds H8 and E5, both charged, and red holds K5, also charged, so this
 * turn's collection and the following one are both visible without playing
 * them out, and the whole game is four plies from its end. See the module
 * header for why this is not a reachable position.
 */
export function reviewFixtureGameState(): GameState {
  const base = startingGameState(FIXTURE_SEED, FIXTURE_LENGTH_IN_ROUNDS);

  let ships = base.ships;
  ships = withShipAt(ships, "green-1", squareAt("H", 8), 2);
  ships = withShipAt(ships, "green-2", squareAt("E", 5), 1);
  ships = withShipAt(ships, "red-1", squareAt("K", 5), 1);

  const siteStates = {
    ...base.siteStates,
    [squareName(squareAt("H", 8))]: charged(1),
    [squareName(squareAt("E", 5))]: charged(1),
    [squareName(squareAt("K", 5))]: charged(1),
  };

  return {
    ...base,
    ships,
    siteStates,
    sideToMove: "green",
    actionsRemaining: 2,
    movedThisPly: [],
    plyNumber: FIXTURE_PLY_NUMBER,
    returnPositionIndex: FIXTURE_RETURN_POSITION_INDEX,
    energy: { green: 4, red: 1 },
  };
}
