import { describe, expect, it } from "vitest";
import { STARTING_RETURN_POSITION_INDEX } from "./bays";
import { squareFromName } from "./board";
import { shipHasLegalAction, sideToMoveHasLegalAction } from "./actions";
import type { ShipId } from "./fleet";
import type { GameState, Ship, SiteStatus } from "./gameState";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "./gameLength";
import type { ShieldCount } from "./shields";
import type { SiteState } from "./sites";

function ship(
  id: ShipId,
  side: "green" | "red",
  square: string,
  shields: ShieldCount = 0,
): Ship {
  return { id, side, square: squareFromName(square), shields };
}

function siteStatuses(
  states: Readonly<Record<string, SiteState>>,
): Record<string, SiteStatus> {
  return Object.fromEntries(
    Object.entries(states).map(([name, state]) => [
      name,
      { state, enteredOnPly: 0 },
    ]),
  );
}

function buildState(config: {
  ships: readonly Ship[];
  sideToMove?: "green" | "red";
  actedThisPly?: readonly ShipId[];
  siteStates?: Readonly<Record<string, SiteState>>;
}): GameState {
  return {
    ships: config.ships,
    siteStates: siteStatuses(config.siteStates ?? {}),
    sideToMove: config.sideToMove ?? "green",
    actionsRemaining: 2,
    actedThisPly: config.actedThisPly ?? [],
    plyNumber: 1,
    randomSeed: 1,
    returnPositionIndex: STARTING_RETURN_POSITION_INDEX,
    energy: { green: 0, red: 0 },
    lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
  };
}

describe("sideToMoveHasLegalAction", () => {
  it("is true with a legal move and no legal target", () => {
    const state = buildState({ ships: [ship("green-1", "green", "H8")] });

    expect(sideToMoveHasLegalAction(state)).toBe(true);
  });

  it("is true with a legal target and no legal move", () => {
    // green-1 at H8 (3 shields) reaches only its eight neighbours, every
    // one of which is occupied by a red ship: no legal move, but every one
    // of those red ships is a legal attack target.
    const state = buildState({
      ships: [
        ship("green-1", "green", "H8", 3),
        ship("red-1", "red", "G7"),
        ship("red-2", "red", "H7"),
        ship("red-3", "red", "I7"),
        ship("red-4", "red", "G8"),
        ship("red-5", "red", "I8"),
        ship("red-6", "red", "G9"),
        ship("red-7", "red", "H9"),
        ship("red-8", "red", "I9"),
      ],
    });

    expect(sideToMoveHasLegalAction(state)).toBe(true);
  });

  it("is false with neither a legal move nor a legal target", () => {
    const state = buildState({
      ships: [
        ship("green-1", "green", "A2", 4),
        ship("red-1", "red", "A1"),
        ship("red-2", "red", "A3"),
        ship("red-3", "red", "B2"),
      ],
    });

    expect(sideToMoveHasLegalAction(state)).toBe(false);
  });
});

describe("shipHasLegalAction", () => {
  it("is true for a ship that has moved and still has a legal target", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H9", 3), ship("red-1", "red", "H10")],
      actedThisPly: ["green-1"],
    });

    expect(shipHasLegalAction(state, "green-1")).toBe(true);
  });

  it("is false for a ship that has moved and has no legal target", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H9", 3)],
      actedThisPly: ["green-1"],
    });

    expect(shipHasLegalAction(state, "green-1")).toBe(false);
  });

  it("is false for a ship held back by another ship's stranded obligation, even though it could otherwise attack", () => {
    const state = buildState({
      ships: [
        ship("green-1", "green", "E5", 0),
        ship("green-2", "green", "H9", 3),
        ship("red-1", "red", "H10"),
      ],
      siteStates: { E5: "dormant" },
    });

    expect(shipHasLegalAction(state, "green-2")).toBe(false);
  });

  it("is true once the freeing move is made, for the ship just freed", () => {
    const state = buildState({
      ships: [
        ship("green-1", "green", "E5", 0),
        ship("green-2", "green", "H9", 3),
        ship("red-1", "red", "H10"),
      ],
      siteStates: { E5: "dormant" },
      actedThisPly: ["green-1"],
    });

    expect(shipHasLegalAction(state, "green-2")).toBe(true);
  });
});
