import { describe, expect, it } from "vitest";
import {
  CLOCKWISE_BAYS,
  driftReturnPositionIndex,
  STARTING_RETURN_POSITION_INDEX,
} from "./bays";
import { squareFromName, squareName } from "./board";
import { runEndOfTurn } from "./endOfTurn";
import type { ShipId } from "./fleet";
import type { GameState, Ship, SiteStatus } from "./gameState";
import type { ShieldCount } from "./shields";
import { SITES, type SiteState } from "./sites";

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
    Object.entries(states).map(([name, [state, enteredOnPly]]) => [
      name,
      { state, enteredOnPly },
    ]),
  );
}

function buildState(config: {
  ships?: readonly Ship[];
  siteStates?: Readonly<Record<string, readonly [SiteState, number]>>;
  sideToMove?: "green" | "red";
  plyNumber?: number;
  randomSeed?: number;
  returnPositionIndex?: number;
}): GameState {
  return {
    ships: config.ships ?? [],
    siteStates: siteStatuses(config.siteStates ?? {}),
    sideToMove: config.sideToMove ?? "green",
    actionsRemaining: 1,
    movedThisPly: [],
    plyNumber: config.plyNumber ?? 1,
    randomSeed: config.randomSeed ?? 1,
    returnPositionIndex:
      config.returnPositionIndex ?? STARTING_RETURN_POSITION_INDEX,
  };
}

function countActiveOrCharged(state: GameState): number {
  return SITES.filter((square) => {
    const status = state.siteStates[squareName(square)];
    return status?.state === "active" || status?.state === "charged";
  }).length;
}

describe("runEndOfTurn — step 1, the shield grant", () => {
  it("gains a shield only for the moving side's ships standing on a charged node", () => {
    const state = buildState({
      sideToMove: "green",
      plyNumber: 5,
      siteStates: {
        H8: ["charged", 1],
        K5: ["active", 0],
        L8: ["charged", 1],
        E11: ["charged", 1],
        H12: ["charged", 1],
      },
      ships: [
        ship("green-1", "green", "H8", 1), // charged: gains, 1 -> 2
        ship("green-2", "green", "K5", 1), // active: gains nothing
        ship("green-3", "green", "D2", 1), // not a site: gains nothing
        ship("green-4", "green", "L8", 4), // already capped: gains nothing
        ship("green-5", "green", "H12", 0), // charged: gains, 0 -> 1
        ship("red-1", "red", "E11", 1), // charged, but not the mover
      ],
    });

    const result = runEndOfTurn(state);

    const shipShields = (id: ShipId): ShieldCount | undefined =>
      result.state.ships.find((s) => s.id === id)?.shields;

    expect(shipShields("green-1")).toBe(2);
    expect(shipShields("green-2")).toBe(1);
    expect(shipShields("green-3")).toBe(1);
    expect(shipShields("green-4")).toBe(4);
    expect(shipShields("green-5")).toBe(1);
    expect(shipShields("red-1")).toBe(1);

    expect(result.effects).toEqual([
      {
        type: "shield-gained",
        shipId: "green-1",
        side: "green",
        square: squareFromName("H8"),
        shields: 2,
      },
      {
        type: "shield-gained",
        shipId: "green-5",
        side: "green",
        square: squareFromName("H12"),
        shields: 1,
      },
    ]);
  });

  it("grants a shield on exactly five of the waker's own plies over the node's nine-turn life (§8.3)", () => {
    // The node is charged from ply 1 (N = 1); green woke it and green takes
    // the odd plies. Each ply is built independently, with the ship reset to
    // a shield count below the cap, so the cap never masks an opportunity.
    let grantedOnGreenPlies = 0;
    let totalGreenPlies = 0;

    for (let ply = 1; ply <= 9; ply++) {
      const sideToMove = ply % 2 === 1 ? "green" : "red";
      const state = buildState({
        sideToMove,
        plyNumber: ply,
        siteStates: { H8: ["charged", 1] },
        ships: [ship("green-1", "green", "H8", 0)],
      });

      const result = runEndOfTurn(state);
      const gained = result.effects.some(
        (effect) =>
          effect.type === "shield-gained" && effect.shipId === "green-1",
      );

      if (sideToMove === "green") {
        totalGreenPlies += 1;
        if (gained) {
          grantedOnGreenPlies += 1;
        }
      } else {
        expect(gained).toBe(false);
      }
    }

    expect(totalGreenPlies).toBe(5);
    expect(grantedOnGreenPlies).toBe(5);
  });
});

describe("runEndOfTurn — the order of steps, and §8.3's second property", () => {
  it("gains the shield at step 1 before the ship is stranded by the node running out at step 4", () => {
    // Woken on ply 1 (N = 1), so ply 9 (N + 8) is the waker's own ply on
    // which the node finishes its nine turns.
    const state = buildState({
      sideToMove: "green",
      plyNumber: 9,
      siteStates: {
        H8: ["charged", 1],
        E5: ["dormant", 0], // the only dormant candidate for the replacement
      },
      ships: [ship("green-1", "green", "H8", 3)],
    });

    const result = runEndOfTurn(state);

    expect(result.effects).toEqual([
      {
        type: "shield-gained",
        shipId: "green-1",
        side: "green",
        square: squareFromName("H8"),
        shields: 4,
      },
      { type: "node-ran-out", square: squareFromName("H8") },
      {
        type: "ship-stranded",
        shipId: "green-1",
        side: "green",
        square: squareFromName("H8"),
      },
      {
        type: "site-woken",
        square: squareFromName("E5"),
        wokeInto: "active",
      },
    ]);

    const strandedShip = result.state.ships.find((s) => s.id === "green-1");
    expect(strandedShip?.shields).toBe(4);
    expect(result.state.siteStates.H8).toEqual({
      state: "depleted",
      enteredOnPly: 9,
    });
  });
});

describe("runEndOfTurn — steps 3 and 5, a site freed this ply is drawable this same ply", () => {
  it("carries a site through the full eighteen-ply round trip, ending eligible for the same ply's draw", () => {
    // Woken on ply 1 (N = 1): charged through ply 9, depleted from the end
    // of ply 9 through ply 17, dormant again at step 3 of ply 18 (N + 17).
    // K5 sits in the dormant pool throughout, so H8's own replacement draw
    // at ply 9 (mandatory the instant a node runs out) lands there instead
    // of triggering the empty-pool safety net on H8 itself.
    let state = buildState({
      sideToMove: "green",
      plyNumber: 1,
      siteStates: { H8: ["charged", 1], K5: ["dormant", 0] },
    });

    for (let ply = 1; ply <= 17; ply++) {
      const result = runEndOfTurn({ ...state, plyNumber: ply });
      state = { ...result.state, plyNumber: ply + 1 };

      if (ply < 9) {
        expect(state.siteStates.H8).toEqual({
          state: "charged",
          enteredOnPly: 1,
        });
      } else {
        expect(state.siteStates.H8).toEqual({
          state: "depleted",
          enteredOnPly: 9,
        });
      }
    }

    expect(state.plyNumber).toBe(18);
    expect(state.siteStates.H8).toEqual({ state: "depleted", enteredOnPly: 9 });
    // K5 was drawn as H8's own replacement back at ply 9, and stays active.
    expect(state.siteStates.K5).toEqual({ state: "active", enteredOnPly: 9 });

    // A second node (D8) finishes on this same ply, so a replacement draw
    // happens — and H8 is the only site the cooling step could have freed
    // this ply, so it is the only dormant candidate.
    const withRunningOutNode: GameState = {
      ...state,
      siteStates: {
        ...state.siteStates,
        D8: { state: "charged", enteredOnPly: 10 },
      },
    };

    const finalResult = runEndOfTurn(withRunningOutNode);

    expect(finalResult.effects).toEqual([
      { type: "site-cooled", square: squareFromName("H8") },
      { type: "node-ran-out", square: squareFromName("D8") },
      {
        type: "site-woken",
        square: squareFromName("H8"),
        wokeInto: "active",
      },
    ]);
    expect(finalResult.state.siteStates.H8).toEqual({
      state: "active",
      enteredOnPly: 18,
    });
    expect(finalResult.state.siteStates.D8).toEqual({
      state: "depleted",
      enteredOnPly: 18,
    });
  });
});

describe("runEndOfTurn — step 2 stays empty", () => {
  it("keeps influence out of scope: no effect and no other state change when nothing is due", () => {
    const state = buildState({
      sideToMove: "green",
      plyNumber: 3,
      siteStates: { H8: ["active", 0], K5: ["dormant", 0] },
      ships: [ship("green-1", "green", "D2")],
    });

    const result = runEndOfTurn(state);

    expect(result.effects).toEqual([]);
    expect(result.state).toEqual({
      ...state,
      returnPositionIndex: driftReturnPositionIndex(state.returnPositionIndex),
    });
  });
});

describe("runEndOfTurn — step 6, the return position's drift (§7.1)", () => {
  it("moves the return position one bay counter-clockwise, from H15 to D15", () => {
    const state = buildState({
      returnPositionIndex: STARTING_RETURN_POSITION_INDEX,
    });

    const result = runEndOfTurn(state);

    expect(CLOCKWISE_BAYS[STARTING_RETURN_POSITION_INDEX]).toEqual(
      squareFromName("H15"),
    );
    expect(CLOCKWISE_BAYS[result.state.returnPositionIndex]).toEqual(
      squareFromName("D15"),
    );
  });

  it("returns to H15 after fourteen calls, and produces no effect", () => {
    let state = buildState({
      returnPositionIndex: STARTING_RETURN_POSITION_INDEX,
    });

    for (let i = 0; i < 14; i++) {
      const result = runEndOfTurn(state);
      expect(result.effects).toEqual([]);
      state = result.state;
    }

    expect(state.returnPositionIndex).toBe(STARTING_RETURN_POSITION_INDEX);
  });

  it("is the only field the step changes", () => {
    const state = buildState({
      sideToMove: "green",
      plyNumber: 3,
      siteStates: { H8: ["active", 0], K5: ["dormant", 0] },
      ships: [ship("green-1", "green", "D2")],
      returnPositionIndex: 5,
    });

    const result = runEndOfTurn(state);

    expect(result.state).toEqual({
      ...state,
      returnPositionIndex: driftReturnPositionIndex(5),
    });
  });
});

describe("runEndOfTurn — the five-sites invariant (§8.1)", () => {
  it("leaves exactly five sites active or charged after a ply that runs one out and draws its replacement", () => {
    const plyNumber = 100;
    const state = buildState({
      sideToMove: "green",
      plyNumber,
      siteStates: {
        F2: ["charged", 92], // finishes this ply: 100 - 92 + 1 = 9
        J2: ["active", 0],
        B4: ["charged", 95],
        H4: ["active", 0],
        N4: ["charged", 99],
        E5: ["dormant", 0], // the only dormant candidate
        K5: ["depleted", 95],
        D8: ["depleted", 95],
        H8: ["depleted", 95],
        L8: ["depleted", 95],
        E11: ["depleted", 95],
        K11: ["depleted", 95],
        B12: ["depleted", 95],
        H12: ["depleted", 95],
        N12: ["depleted", 95],
        F14: ["depleted", 95],
        J14: ["depleted", 95],
      },
    });

    expect(countActiveOrCharged(state)).toBe(5);

    const result = runEndOfTurn(state);

    expect(countActiveOrCharged(result.state)).toBe(5);
    expect(result.state.siteStates.F2).toEqual({
      state: "depleted",
      enteredOnPly: plyNumber,
    });
    expect(result.state.siteStates.E5).toEqual({
      state: "active",
      enteredOnPly: plyNumber,
    });
  });
});
