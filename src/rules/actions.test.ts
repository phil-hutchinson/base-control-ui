import { describe, expect, it } from "vitest";
import { squareFromName } from "./board";
import { shipHasLegalAction, sideToMoveHasLegalAction } from "./actions";
import type { ShipId } from "./fleet";
import type { GameState, Ship, SiteStatus } from "./gameState";
import { DEFAULT_GAME_LENGTH_ROUNDS, pliesForGameLength } from "./gameLength";
import type { PowerLevel } from "./power";
import type { SiteState } from "./sites";

function ship(
  id: ShipId,
  side: "green" | "red",
  square: string,
  power: PowerLevel = 4,
): Ship {
  return { id, side, square: squareFromName(square), power };
}

function siteStatuses(
  states: Readonly<Record<string, SiteState>>,
): Record<string, SiteStatus> {
  return Object.fromEntries(
    Object.entries(states).map(([name, state]) => [name, { state, level: 0 }]),
  );
}

function buildState(config: {
  ships: readonly Ship[];
  sideToMove?: "green" | "red";
  actedThisPly?: readonly ShipId[];
  siteStates?: Readonly<Record<string, SiteState>>;
  plyNumber?: number;
}): GameState {
  return {
    ships: config.ships,
    siteStates: siteStatuses(config.siteStates ?? {}),
    sideToMove: config.sideToMove ?? "green",
    actionsRemaining: 1,
    actedThisPly: config.actedThisPly ?? [],
    plyNumber: config.plyNumber ?? 1,
    randomSeed: 1,
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
    // green-1 at H8 (1 power) reaches only its eight neighbours, every
    // one of which is occupied by a red ship: no legal move, but every one
    // of those red ships is a legal attack target.
    const state = buildState({
      ships: [
        ship("green-1", "green", "H8", 1),
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
        ship("green-1", "green", "A2", 0),
        ship("red-1", "red", "A1"),
        ship("red-2", "red", "A3"),
        ship("red-3", "red", "B2"),
      ],
    });

    expect(sideToMoveHasLegalAction(state)).toBe(false);
  });

  it("is false when the side's only ship holds a charged node and has no legal move, even surrounded by enemies (rules.md §7)", () => {
    // Without the charged-node protection, every one of these four
    // neighbours would be a legal target — see the "is true with a legal
    // target and no legal move" case above. Standing on a charged node
    // removes the attack entirely, so the side has no legal action at all.
    const state = buildState({
      ships: [
        ship("green-1", "green", "H8", 0),
        ship("red-1", "red", "G8"),
        ship("red-2", "red", "I8"),
        ship("red-3", "red", "H7"),
        ship("red-4", "red", "H9"),
      ],
      siteStates: { H8: "charged" },
    });

    expect(sideToMoveHasLegalAction(state)).toBe(false);
  });

  it("answers false once the game has ended, even with an obvious legal move (rules.md §9)", () => {
    const ships = [ship("green-1", "green", "H8")];
    const lastPly = pliesForGameLength(DEFAULT_GAME_LENGTH_ROUNDS);

    expect(
      sideToMoveHasLegalAction(buildState({ ships, plyNumber: lastPly })),
    ).toBe(true);
    expect(
      sideToMoveHasLegalAction(buildState({ ships, plyNumber: lastPly + 1 })),
    ).toBe(false);
  });
});

describe("shipHasLegalAction", () => {
  it("is false for a ship that has moved, even with an enemy in range: one action per ship (rules.md §5)", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H9", 1), ship("red-1", "red", "H10")],
      actedThisPly: ["green-1"],
    });

    expect(shipHasLegalAction(state, "green-1")).toBe(false);
  });

  it("is false for a ship that has moved and has no legal target", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H9", 1)],
      actedThisPly: ["green-1"],
    });

    expect(shipHasLegalAction(state, "green-1")).toBe(false);
  });

  it("is false for a ship holding a charged node with no legal move, even with an enemy in range (rules.md §7)", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 0), ship("red-1", "red", "H9")],
      siteStates: { H8: "charged" },
    });

    expect(shipHasLegalAction(state, "green-1")).toBe(true);
    // The move above is still legal from H8's other three neighbours; pin
    // the case where every one of them is also blocked, leaving only the
    // (refused) attack.
    const boxedIn = buildState({
      ships: [
        ship("green-1", "green", "H8", 0),
        ship("green-2", "green", "G8"),
        ship("green-3", "green", "I8"),
        ship("green-4", "green", "H7"),
        ship("red-1", "red", "H9"),
      ],
      siteStates: { H8: "charged" },
    });

    expect(shipHasLegalAction(boxedIn, "green-1")).toBe(false);
  });

  it("is true for a ship standing on a dormant site, and for a sibling elsewhere, with neither held back (§8.5)", () => {
    const state = buildState({
      ships: [
        ship("green-1", "green", "E5", 4),
        ship("green-2", "green", "H9", 1),
        ship("red-1", "red", "H10"),
      ],
      siteStates: { E5: "dormant" },
    });

    expect(shipHasLegalAction(state, "green-1")).toBe(true);
    expect(shipHasLegalAction(state, "green-2")).toBe(true);
  });
});
