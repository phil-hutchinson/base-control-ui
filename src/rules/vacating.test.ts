import { describe, expect, it } from "vitest";
import { squareFromName } from "./board";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "./gameLength";
import type { GameState, Ship, SiteStatus } from "./gameState";
import type { ShipId } from "./fleet";
import type { ShieldCount } from "./shields";
import type { SiteState } from "./sites";
import { applyVacating } from "./vacating";

function ship(
  id: ShipId,
  side: "green" | "red",
  square: string,
  shields: ShieldCount = 0,
): Ship {
  return { id, side, square: squareFromName(square), shields };
}

function siteStatuses(
  states: Readonly<Record<string, readonly [SiteState, number]>>,
): Record<string, SiteStatus> {
  return Object.fromEntries(
    Object.entries(states).map(([name, [state, level]]) => [
      name,
      { state, level },
    ]),
  );
}

function buildState(config: {
  ships?: readonly Ship[];
  siteStates?: Readonly<Record<string, readonly [SiteState, number]>>;
}): GameState {
  return {
    ships: config.ships ?? [],
    siteStates: siteStatuses(config.siteStates ?? {}),
    sideToMove: "green",
    actionsRemaining: 1,
    actedThisPly: [],
    plyNumber: 1,
    randomSeed: 1,
    energy: { green: 0, red: 0 },
    lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
  };
}

describe("applyVacating (rules.md §8.7)", () => {
  it("sends a node dormant, carrying its drain, when a ship moves off it", () => {
    const before = buildState({
      ships: [ship("green-1", "green", "H8")],
      siteStates: { H8: ["charged", 23] },
    });
    const after = buildState({
      ships: [ship("green-1", "green", "H9")],
      siteStates: { H8: ["charged", 23] },
    });

    const result = applyVacating(before, after);

    expect(result.state.siteStates.H8).toEqual({
      state: "dormant",
      level: 23,
    });
    expect(result.effects).toEqual([
      {
        type: "node-vacated",
        square: squareFromName("H8"),
        shipId: "green-1",
        side: "green",
      },
    ]);
  });

  it("leaves a node untouched when a ship arrives on it — arriving is not a departure", () => {
    const before = buildState({
      ships: [ship("green-1", "green", "H9")],
      siteStates: { H8: ["charged", 10] },
    });
    const after = buildState({
      ships: [ship("green-1", "green", "H8")],
      siteStates: { H8: ["charged", 10] },
    });

    const result = applyVacating(before, after);

    expect(result.state.siteStates).toEqual(before.siteStates);
    expect(result.effects).toEqual([]);
  });

  it("leaves a node charged, at the same drain, when a beaten defender is replaced by the advancing attacker", () => {
    // The square stays occupied throughout — red-1 before, green-1 after —
    // so it is never unoccupied and the rule leaves it alone. This is the
    // case §8.7 is shaped around: a node changes hands intact.
    const before = buildState({
      ships: [ship("green-1", "green", "H7"), ship("red-1", "red", "H8")],
      siteStates: { H8: ["charged", 41] },
    });
    const after = buildState({
      ships: [ship("green-1", "green", "H8"), ship("red-1", "red", "A1")],
      siteStates: { H8: ["charged", 41] },
    });

    const result = applyVacating(before, after);

    expect(result.state.siteStates.H8).toEqual({ state: "charged", level: 41 });
    expect(result.effects).toEqual([]);
  });

  it("sends a node dormant when a drawn fight over it returns both ships to bays", () => {
    const before = buildState({
      ships: [ship("green-1", "green", "H7"), ship("red-1", "red", "H8")],
      siteStates: { H8: ["charged", 5] },
    });
    const after = buildState({
      ships: [ship("green-1", "green", "A1"), ship("red-1", "red", "A3")],
      siteStates: { H8: ["charged", 5] },
    });

    const result = applyVacating(before, after);

    expect(result.state.siteStates.H8).toEqual({ state: "dormant", level: 5 });
    expect(result.effects).toEqual([
      {
        type: "node-vacated",
        square: squareFromName("H8"),
        shipId: "red-1",
        side: "red",
      },
    ]);
  });

  it("sends a node dormant when the winner's advance onto it is blocked and it is left empty", () => {
    // From the vacating rule's point of view a blocked advance looks
    // exactly like any other case where the site ends unoccupied — the
    // defeated defender that stood there is gone and nothing replaced it.
    const before = buildState({
      ships: [ship("green-1", "green", "H7"), ship("red-1", "red", "H8")],
      siteStates: { H8: ["charged", 12] },
    });
    const after = buildState({
      ships: [ship("green-1", "green", "H7"), ship("red-1", "red", "A5")],
      siteStates: { H8: ["charged", 12] },
    });

    const result = applyVacating(before, after);

    expect(result.state.siteStates.H8).toEqual({ state: "dormant", level: 12 });
    expect(result.effects).toEqual([
      {
        type: "node-vacated",
        square: squareFromName("H8"),
        shipId: "red-1",
        side: "red",
      },
    ]);
  });

  it("sends the origin node dormant when its occupant wins a fight and advances off it", () => {
    const before = buildState({
      ships: [ship("green-1", "green", "H8"), ship("red-1", "red", "H9")],
      siteStates: { H8: ["charged", 30] },
    });
    const after = buildState({
      ships: [ship("green-1", "green", "H9"), ship("red-1", "red", "A5")],
      siteStates: { H8: ["charged", 30] },
    });

    const result = applyVacating(before, after);

    expect(result.state.siteStates.H8).toEqual({ state: "dormant", level: 30 });
    expect(result.effects).toEqual([
      {
        type: "node-vacated",
        square: squareFromName("H8"),
        shipId: "green-1",
        side: "green",
      },
    ]);
  });

  it("sends a losing attacker's own node dormant when it is pushed back to a bay", () => {
    const before = buildState({
      ships: [ship("green-1", "green", "H8"), ship("red-1", "red", "H9")],
      siteStates: { H8: ["charged", 8] },
    });
    const after = buildState({
      ships: [ship("green-1", "green", "A1"), ship("red-1", "red", "H9")],
      siteStates: { H8: ["charged", 8] },
    });

    const result = applyVacating(before, after);

    expect(result.state.siteStates.H8).toEqual({ state: "dormant", level: 8 });
    expect(result.effects).toEqual([
      {
        type: "node-vacated",
        square: squareFromName("H8"),
        shipId: "green-1",
        side: "green",
      },
    ]);
  });

  it("sends two nodes dormant, in SITES order, when a drawn fight vacates both", () => {
    // E5 and K5 are both real sites, and K5 sorts after E5 in SITES'
    // declared order — the effects must come out in that order regardless
    // of which ship is listed first.
    const before = buildState({
      ships: [ship("green-1", "green", "K5"), ship("red-1", "red", "E5")],
      siteStates: { E5: ["charged", 7], K5: ["charged", 19] },
    });
    const after = buildState({
      ships: [ship("green-1", "green", "A1"), ship("red-1", "red", "A3")],
      siteStates: { E5: ["charged", 7], K5: ["charged", 19] },
    });

    const result = applyVacating(before, after);

    expect(result.state.siteStates.E5).toEqual({ state: "dormant", level: 7 });
    expect(result.state.siteStates.K5).toEqual({ state: "dormant", level: 19 });
    expect(result.effects).toEqual([
      {
        type: "node-vacated",
        square: squareFromName("E5"),
        shipId: "red-1",
        side: "red",
      },
      {
        type: "node-vacated",
        square: squareFromName("K5"),
        shipId: "green-1",
        side: "green",
      },
    ]);
  });

  it("does nothing to a site that was already active or dormant, even if it changed occupancy", () => {
    const before = buildState({
      ships: [ship("green-1", "green", "H8")],
      siteStates: { H8: ["active", 12] },
    });
    const after = buildState({
      ships: [ship("green-1", "green", "H9")],
      siteStates: { H8: ["active", 12] },
    });

    const result = applyVacating(before, after);

    expect(result.state.siteStates).toEqual(before.siteStates);
    expect(result.effects).toEqual([]);
  });

  it("carries a drain above capacity into dormancy unclamped", () => {
    const before = buildState({
      ships: [ship("green-1", "green", "H8")],
      siteStates: { H8: ["charged", 62] },
    });
    const after = buildState({
      ships: [ship("green-1", "green", "H9")],
      siteStates: { H8: ["charged", 62] },
    });

    const result = applyVacating(before, after);

    expect(result.state.siteStates.H8).toEqual({ state: "dormant", level: 62 });
  });
});
