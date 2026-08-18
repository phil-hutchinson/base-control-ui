import { describe, expect, it } from "vitest";
import { squareFromName } from "./board";
import type { ShipId } from "./fleet";
import type { GameState, Ship, SiteStatus } from "./gameState";
import type { ReachEntry } from "./movement";
import { wakeTouchedSites } from "./nodes";
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
  states: Readonly<Record<string, [SiteState, number]>>,
): Record<string, SiteStatus> {
  return Object.fromEntries(
    Object.entries(states).map(([name, [state, enteredOnPly]]) => [
      name,
      { state, enteredOnPly },
    ]),
  );
}

function buildState(config: {
  ships?: readonly Ship[];
  siteStates?: Readonly<Record<string, [SiteState, number]>>;
  plyNumber?: number;
}): GameState {
  return {
    ships: config.ships ?? [],
    siteStates: siteStatuses(config.siteStates ?? {}),
    sideToMove: "green",
    actionsRemaining: 2,
    movedThisPly: [],
    plyNumber: config.plyNumber ?? 1,
    randomSeed: 1,
  };
}

function path(
  destinationName: string,
  passedOverNames: readonly string[],
): ReachEntry {
  return {
    destination: squareFromName(destinationName),
    passedOver: passedOverNames.map(squareFromName),
  };
}

describe("wakeTouchedSites", () => {
  it("charges an active site the ship lands on, starting its clock on the current ply", () => {
    const state = buildState({
      siteStates: { K8: ["active", 0] },
      plyNumber: 7,
    });
    const mover = ship("green-1", "green", "H8");

    const result = wakeTouchedSites(state, mover, path("K8", ["I8", "J8"]));

    expect(result.state.siteStates.K8).toEqual({
      state: "charged",
      enteredOnPly: 7,
    });
    expect(result.effects).toEqual([
      {
        type: "site-charged",
        square: squareFromName("K8"),
        shipId: "green-1",
        side: "green",
        reach: "landed-on",
      },
    ]);
  });

  it("charges an active site the ship only flies over, without the ship stopping there", () => {
    const state = buildState({
      siteStates: { I8: ["active", 0] },
      plyNumber: 3,
    });
    const mover = ship("green-1", "green", "H8");

    const result = wakeTouchedSites(state, mover, path("K8", ["I8", "J8"]));

    expect(result.state.siteStates.I8).toEqual({
      state: "charged",
      enteredOnPly: 3,
    });
    expect(result.effects).toEqual([
      {
        type: "site-charged",
        square: squareFromName("I8"),
        shipId: "green-1",
        side: "green",
        reach: "flown-over",
      },
    ]);
  });

  it("wakes a site identically for either side's ship", () => {
    const state = buildState({
      siteStates: { K8: ["active", 0] },
      plyNumber: 4,
    });
    const mover = ship("red-1", "red", "H8");

    const result = wakeTouchedSites(state, mover, path("K8", ["I8", "J8"]));

    expect(result.state.siteStates.K8.state).toBe("charged");
    expect(result.effects).toEqual([
      {
        type: "site-charged",
        square: squareFromName("K8"),
        shipId: "red-1",
        side: "red",
        reach: "landed-on",
      },
    ]);
  });

  it("leaves an already-charged site unchanged, without restarting its clock", () => {
    const state = buildState({
      siteStates: { K8: ["charged", 2] },
      plyNumber: 9,
    });
    const mover = ship("green-1", "green", "H8");

    const result = wakeTouchedSites(state, mover, path("K8", ["I8", "J8"]));

    expect(result.state.siteStates).toEqual(state.siteStates);
    expect(result.effects).toEqual([]);
  });

  it("leaves dormant and depleted sites unaffected by a fly-over, with no effect", () => {
    const state = buildState({
      siteStates: { I8: ["dormant", 0], J8: ["depleted", 1] },
      plyNumber: 5,
    });
    const mover = ship("green-1", "green", "H8");

    const result = wakeTouchedSites(state, mover, path("K8", ["I8", "J8"]));

    expect(result.state.siteStates).toEqual(state.siteStates);
    expect(result.effects).toEqual([]);
  });

  it("reports no effect and leaves siteStates deeply unchanged when no site is touched", () => {
    const state = buildState({
      siteStates: { B4: ["active", 0] },
      plyNumber: 2,
    });
    const mover = ship("green-1", "green", "H8");

    const result = wakeTouchedSites(state, mover, path("K8", ["I8", "J8"]));

    expect(result.state).toBe(state);
    expect(result.state.siteStates).toEqual(state.siteStates);
    expect(result.effects).toEqual([]);
  });
});
