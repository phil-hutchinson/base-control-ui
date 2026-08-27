import { describe, expect, it } from "vitest";
import { squareFromName, squareName } from "./board";
import type { ShipId } from "./fleet";
import type { GameState, Ship, SiteStatus } from "./gameState";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "./gameLength";
import { moveRefusalReason, sideToMoveHasLegalMove } from "./movement";
import type { ShieldCount } from "./shields";
import type { SiteState } from "./sites";
import { strandedObligationBinds, strandedShipIds } from "./stranded";

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
  actionsRemaining?: number;
}): GameState {
  return {
    ships: config.ships,
    siteStates: siteStatuses(config.siteStates ?? {}),
    sideToMove: config.sideToMove ?? "green",
    actionsRemaining: config.actionsRemaining ?? 1,
    actedThisPly: config.actedThisPly ?? [],
    plyNumber: 1,
    randomSeed: 1,
    energy: { green: 0, red: 0 },
    lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
  };
}

/**
 * `green-1` boxed in on all four one-square orthogonal destinations, with 4
 * shields so those are its only reach: a stranded ship with no legal move at
 * all.
 */
function boxedInShip(square: string, shields: ShieldCount = 4): Ship {
  return ship("green-1", "green", square, shields);
}

function boxingShips(origin: string): readonly Ship[] {
  const { column, row } = squareFromName(origin);
  const columnIndex = "ABCDEFGHIJKLMNO".indexOf(column);
  const north = squareFromName(`${column}${row + 1}`);
  const south = squareFromName(`${column}${row - 1}`);
  const east = squareFromName(`${"ABCDEFGHIJKLMNO"[columnIndex + 1]}${row}`);
  const west = squareFromName(`${"ABCDEFGHIJKLMNO"[columnIndex - 1]}${row}`);

  return [
    ship("red-1", "red", squareName(north)),
    ship("red-2", "red", squareName(south)),
    ship("red-3", "red", squareName(east)),
    ship("red-4", "red", squareName(west)),
  ];
}

describe("strandedShipIds", () => {
  it("counts a ship on a dormant or depleted site, unmoved, with a legal move", () => {
    const dormant = buildState({
      ships: [ship("green-1", "green", "E7"), ship("green-2", "green", "A1")],
      siteStates: { E7: "dormant" },
    });
    expect(strandedShipIds(dormant)).toEqual(["green-1"]);

    const depleted = buildState({
      ships: [ship("green-1", "green", "E7"), ship("green-2", "green", "A1")],
      siteStates: { E7: "depleted" },
    });
    expect(strandedShipIds(depleted)).toEqual(["green-1"]);
  });

  it("leaves out an active or charged site, and a square that is not a site at all", () => {
    const active = buildState({
      ships: [ship("green-1", "green", "E7")],
      siteStates: { E7: "active" },
    });
    expect(strandedShipIds(active)).toEqual([]);

    const charged = buildState({
      ships: [ship("green-1", "green", "E7")],
      siteStates: { E7: "charged" },
    });
    expect(strandedShipIds(charged)).toEqual([]);

    const noSite = buildState({ ships: [ship("green-1", "green", "E7")] });
    expect(strandedShipIds(noSite)).toEqual([]);
  });

  it("only the side to move's ships count, never the opponent's", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "A1"), ship("red-1", "red", "E7")],
      sideToMove: "green",
      siteStates: { E7: "dormant" },
    });

    expect(strandedShipIds(state)).toEqual([]);
    expect(strandedObligationBinds(state)).toBe(false);
  });

  it("drops a ship that has already acted this ply", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "E7"), ship("green-2", "green", "A1")],
      siteStates: { E7: "dormant" },
      actedThisPly: ["green-1"],
      actionsRemaining: 1,
    });

    expect(strandedShipIds(state)).toEqual([]);
    expect(strandedObligationBinds(state)).toBe(false);
  });

  it("waives the requirement for a stranded ship with no legal move at all", () => {
    const boxedInSquare = "H8";
    const state = buildState({
      ships: [boxedInShip(boxedInSquare), ...boxingShips(boxedInSquare)],
      siteStates: { [boxedInSquare]: "depleted" },
      actionsRemaining: 1,
    });

    expect(strandedShipIds(state)).toEqual([]);
    expect(strandedObligationBinds(state)).toBe(false);

    const noStranding = buildState({
      ships: [boxedInShip(boxedInSquare), ...boxingShips(boxedInSquare)],
      actionsRemaining: 1,
    });
    expect(strandedShipIds(noStranding)).toEqual(strandedShipIds(state));
    expect(strandedObligationBinds(noStranding)).toBe(
      strandedObligationBinds(state),
    );
  });
});

describe("strandedObligationBinds", () => {
  it("binds from the first action with one stranded ship, and is free again once it has moved", () => {
    const beforeMoving = buildState({
      ships: [ship("green-1", "green", "E7"), ship("green-2", "green", "A1")],
      siteStates: { E7: "dormant" },
      actionsRemaining: 1,
    });
    expect(strandedObligationBinds(beforeMoving)).toBe(true);

    const afterMoving = buildState({
      ships: [ship("green-1", "green", "E7"), ship("green-2", "green", "A1")],
      siteStates: { E7: "dormant" },
      actedThisPly: ["green-1"],
      actionsRemaining: 1,
    });
    expect(strandedObligationBinds(afterMoving)).toBe(false);
  });

  it("binds the turn's one action with two stranded ships, and the second still owes on the next ply", () => {
    const state = buildState({
      ships: [
        ship("green-1", "green", "E7"),
        ship("green-2", "green", "K5"),
        ship("green-3", "green", "A1"),
      ],
      siteStates: { E7: "dormant", K5: "depleted" },
      actionsRemaining: 1,
    });
    expect(strandedShipIds(state)).toEqual(["green-1", "green-2"]);
    expect(strandedObligationBinds(state)).toBe(true);

    // The turn's one action frees green-1; a fresh ply begins with no
    // memory of it, and green-2 is still owing.
    const nextPly = buildState({
      ships: [
        ship("green-1", "green", "A2"),
        ship("green-2", "green", "K5"),
        ship("green-3", "green", "A1"),
      ],
      siteStates: { K5: "depleted" },
      actionsRemaining: 1,
    });
    expect(strandedShipIds(nextPly)).toEqual(["green-2"]);
    expect(strandedObligationBinds(nextPly)).toBe(true);
  });

  it("with three stranded ships, the player frees one and the rest still owe on the next ply", () => {
    const state = buildState({
      ships: [
        ship("green-1", "green", "E7"),
        ship("green-2", "green", "K5"),
        ship("green-3", "green", "N5"),
        ship("green-4", "green", "A1"),
      ],
      siteStates: { E7: "dormant", K5: "depleted", N5: "dormant" },
      actionsRemaining: 1,
    });
    expect(strandedShipIds(state)).toEqual(["green-1", "green-2", "green-3"]);
    expect(strandedObligationBinds(state)).toBe(true);

    // The turn's one action frees green-1, leaving green-2 and green-3
    // stranded going into the next ply — a fresh state, recomputed with no
    // memory of the ply that just ended.
    const nextPly = buildState({
      ships: [
        ship("green-2", "green", "K5"),
        ship("green-3", "green", "N5"),
        ship("green-4", "green", "A1"),
      ],
      siteStates: { K5: "depleted", N5: "dormant" },
      actionsRemaining: 1,
    });
    expect(strandedShipIds(nextPly)).toEqual(["green-2", "green-3"]);
    expect(strandedObligationBinds(nextPly)).toBe(true);
  });
});

describe("moveRefusalReason with the §8.5 obligation", () => {
  it("binds the first action with one stranded ship: another ship is refused, the stranded ship is allowed", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "E7"), ship("green-2", "green", "A1")],
      siteStates: { E7: "dormant" },
      actionsRemaining: 1,
    });

    expect(moveRefusalReason(state, "green-2", squareFromName("A2"))).toBe(
      "another-ship-stranded",
    );
    expect(
      moveRefusalReason(state, "green-1", squareFromName("E8")),
    ).toBeUndefined();
  });

  it("frees the second action once the stranded ship has moved", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "E7"), ship("green-2", "green", "A1")],
      siteStates: { E7: "dormant" },
      actedThisPly: ["green-1"],
      actionsRemaining: 1,
    });

    expect(
      moveRefusalReason(state, "green-2", squareFromName("A2")),
    ).toBeUndefined();
  });

  it("refuses a non-owed ship once the obligation binds, and allows the owed ship", () => {
    const state = buildState({
      ships: [
        ship("green-1", "green", "E7"),
        ship("green-2", "green", "A1"),
        ship("green-3", "green", "D1"),
      ],
      siteStates: { E7: "dormant" },
      actedThisPly: ["green-2"],
      actionsRemaining: 1,
    });

    expect(moveRefusalReason(state, "green-3", squareFromName("D2"))).toBe(
      "another-ship-stranded",
    );
    expect(
      moveRefusalReason(state, "green-1", squareFromName("E8")),
    ).toBeUndefined();
  });

  it("both dormant and depleted count on the same terms", () => {
    const dormant = buildState({
      ships: [ship("green-1", "green", "E7"), ship("green-2", "green", "A1")],
      siteStates: { E7: "dormant" },
      actionsRemaining: 1,
    });
    const depleted = buildState({
      ships: [ship("green-1", "green", "E7"), ship("green-2", "green", "A1")],
      siteStates: { E7: "depleted" },
      actionsRemaining: 1,
    });

    for (const state of [dormant, depleted]) {
      expect(moveRefusalReason(state, "green-2", squareFromName("A2"))).toBe(
        "another-ship-stranded",
      );
      expect(
        moveRefusalReason(state, "green-1", squareFromName("E8")),
      ).toBeUndefined();
    }
  });

  it("reports the stranded reason before out-of-range, when both would apply", () => {
    const state = buildState({
      ships: [
        ship("green-1", "green", "E7"),
        ship("green-2", "green", "A1"),
        ship("green-3", "green", "D1"),
      ],
      siteStates: { E7: "dormant" },
      actedThisPly: ["green-2"],
      actionsRemaining: 1,
    });

    // O15 is far out of D1's reach at 0 shields, so this would ordinarily be
    // "out-of-range" — but the ship itself is the wrong one to move at all.
    expect(moveRefusalReason(state, "green-3", squareFromName("O15"))).toBe(
      "another-ship-stranded",
    );
  });
});

describe("sideToMoveHasLegalMove alongside the obligation", () => {
  it("still passes when nothing at all is legal, stranded or not", () => {
    const boxedInSquare = "H8";
    const state = buildState({
      ships: [boxedInShip(boxedInSquare), ...boxingShips(boxedInSquare)],
      siteStates: { [boxedInSquare]: "depleted" },
      actionsRemaining: 1,
    });

    expect(strandedShipIds(state)).toEqual([]);
    expect(sideToMoveHasLegalMove(state)).toBe(false);
  });

  it("stays true when the obligation binds but some ship still has a legal move", () => {
    const state = buildState({
      ships: [
        ship("green-1", "green", "E7"),
        ship("green-2", "green", "A1"),
        ship("green-3", "green", "D1"),
      ],
      siteStates: { E7: "dormant" },
      actedThisPly: ["green-2"],
      actionsRemaining: 1,
    });

    expect(strandedObligationBinds(state)).toBe(true);
    expect(moveRefusalReason(state, "green-3", squareFromName("D2"))).toBe(
      "another-ship-stranded",
    );
    expect(sideToMoveHasLegalMove(state)).toBe(true);
  });

  it("completes without recursing: a large sweep of calls finishes promptly", () => {
    const state = buildState({
      ships: [
        ship("green-1", "green", "E7"),
        ship("green-2", "green", "A1"),
        ship("green-3", "green", "D1"),
      ],
      siteStates: { E7: "dormant" },
      actionsRemaining: 1,
    });

    for (let i = 0; i < 500; i++) {
      strandedShipIds(state);
      strandedObligationBinds(state);
      sideToMoveHasLegalMove(state);
      moveRefusalReason(state, "green-3", squareFromName("D2"));
    }
  });
});
