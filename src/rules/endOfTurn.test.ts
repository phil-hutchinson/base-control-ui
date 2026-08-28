import { describe, expect, it } from "vitest";
import { squareFromName, squareName } from "./board";
import { runEndOfTurn } from "./endOfTurn";
import type { ShipId } from "./fleet";
import {
  type GameState,
  type Ship,
  type SiteStatus,
  startingGameState,
} from "./gameState";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "./gameLength";
import { applyPassGuard } from "./ply";
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
}): GameState {
  return {
    ships: config.ships ?? [],
    siteStates: siteStatuses(config.siteStates ?? {}),
    sideToMove: config.sideToMove ?? "green",
    actionsRemaining: 1,
    actedThisPly: [],
    plyNumber: config.plyNumber ?? 1,
    randomSeed: config.randomSeed ?? 1,
    energy: { green: 0, red: 0 },
    lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
  };
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
      {
        type: "energy-collected",
        side: "green",
        amount: 6,
        newTotal: 6,
        squares: [
          squareFromName("H8"),
          squareFromName("L8"),
          squareFromName("H12"),
        ],
      },
      // Step 4: the board is one node short of five, and K5 is the only
      // active site, so it is charged deterministically — the draw needs
      // no choice among a pool of one.
      { type: "site-charged", square: squareFromName("K5") },
    ]);
  });

  it("grants a shield and collects energy on exactly five of the holder's own plies over the node's nine-turn life (§8.3)", () => {
    // A site charged at the end of ply 0 is charged for plies 1 through 9
    // (rules.md §8.3). Green holds it throughout and moves on the odd
    // plies, so it is green's turn on five of those nine — the ship is
    // reset to a shield count below the cap on every ply so the cap never
    // masks an opportunity, and the site is left charged throughout since
    // it does not finish until the end of ply 9.
    let grantedOnGreenPlies = 0;
    let totalGreenPlies = 0;

    for (let ply = 1; ply <= 9; ply++) {
      const sideToMove = ply % 2 === 1 ? "green" : "red";
      const state = buildState({
        sideToMove,
        plyNumber: ply,
        siteStates: { H8: ["charged", 0] },
        ships: [ship("green-1", "green", "H8", 0)],
      });

      const result = runEndOfTurn(state);
      const gained = result.effects.some(
        (effect) =>
          effect.type === "shield-gained" && effect.shipId === "green-1",
      );
      const collected = result.effects.some(
        (effect) =>
          effect.type === "energy-collected" && effect.side === "green",
      );

      if (sideToMove === "green") {
        totalGreenPlies += 1;
        expect(collected).toBe(true);
        if (gained) {
          grantedOnGreenPlies += 1;
        }
      } else {
        expect(gained).toBe(false);
        expect(collected).toBe(false);
      }
    }

    expect(totalGreenPlies).toBe(5);
    expect(grantedOnGreenPlies).toBe(5);
  });
});

describe("runEndOfTurn — step 3, a charged node running out (§8.3, §8.5)", () => {
  it("gains the shield and collects energy at steps 1 and 2, before the ship is stranded by the node running out at step 3", () => {
    // Charged at the end of ply 1, so it finishes at the end of ply 10
    // (rules.md §8.3: plyNumber - enteredOnPly >= 9).
    const state = buildState({
      sideToMove: "green",
      plyNumber: 10,
      siteStates: { H8: ["charged", 1] },
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
      {
        type: "energy-collected",
        side: "green",
        amount: 1,
        newTotal: 1,
        squares: [squareFromName("H8")],
      },
      { type: "node-ran-out", square: squareFromName("H8") },
      {
        type: "ship-stranded",
        shipId: "green-1",
        side: "green",
        square: squareFromName("H8"),
      },
    ]);

    const strandedShip = result.state.ships.find((s) => s.id === "green-1");
    expect(strandedShip?.shields).toBe(4);
    expect(result.state.siteStates.H8).toEqual({
      state: "dormant",
      enteredOnPly: 10,
    });
  });

  it("does not run out a ply early", () => {
    const state = buildState({
      sideToMove: "green",
      plyNumber: 9,
      siteStates: { H8: ["charged", 1] },
      ships: [ship("green-1", "green", "H8", 3)],
    });

    const result = runEndOfTurn(state);

    expect(
      result.effects.some((effect) => effect.type === "node-ran-out"),
    ).toBe(false);
    expect(result.state.siteStates.H8).toEqual({
      state: "charged",
      enteredOnPly: 1,
    });
  });

  it("replaces the site in the same end-of-turn sequence, ahead of step 4's charge draw (§8.2, §8.6)", () => {
    const state = buildState({
      sideToMove: "green",
      plyNumber: 10,
      siteStates: {
        H8: ["charged", 1],
        F2: ["active", 0],
      },
    });

    const result = runEndOfTurn(state);

    expect(result.state.siteStates.H8).toEqual({
      state: "dormant",
      enteredOnPly: 10,
    });
    expect(result.state.siteStates.F2).toEqual({
      state: "charged",
      enteredOnPly: 10,
    });
    expect(result.effects).toContainEqual({
      type: "node-ran-out",
      square: squareFromName("H8"),
    });
    expect(result.effects).toContainEqual({
      type: "site-charged",
      square: squareFromName("F2"),
    });
    expect(
      result.effects.some((effect) => effect.type === "site-went-active"),
    ).toBe(false);
  });
});

describe("runEndOfTurn — step 5, a dormant site cooling to active (§8.2)", () => {
  it("goes active nine turns after it went dormant, not before, and reports no clause (§8.2, §8.6)", () => {
    // Went dormant at the end of ply 10, so it finishes cooling at the end
    // of ply 19 (rules.md §8.2: plyNumber - enteredOnPly >= 9).
    const stillCooling = buildState({
      sideToMove: "green",
      plyNumber: 18,
      siteStates: { H8: ["dormant", 10] },
    });
    const stillCoolingResult = runEndOfTurn(stillCooling);
    expect(stillCoolingResult.state.siteStates.H8).toEqual({
      state: "dormant",
      enteredOnPly: 10,
    });
    expect(
      stillCoolingResult.effects.some(
        (effect) => effect.type === "site-went-active",
      ),
    ).toBe(false);

    const finishedCooling = buildState({
      sideToMove: "green",
      plyNumber: 19,
      siteStates: { H8: ["dormant", 10] },
    });
    const finishedResult = runEndOfTurn(finishedCooling);
    expect(finishedResult.state.siteStates.H8).toEqual({
      state: "active",
      enteredOnPly: 19,
    });
    expect(finishedResult.effects).toEqual([
      { type: "site-went-active", square: squareFromName("H8") },
    ]);
  });

  it("the charge draw never charges a site that went active in the same end-of-turn sequence (§8.6 step ordering)", () => {
    // H8 finishes cooling this same ply that another node, F2, runs out —
    // leaving the board with nothing charged at all and, until step 5 runs,
    // no active site anywhere else either. If cooling ran ahead of the
    // draw, H8 would be the draw's only candidate and a maximal shortfall
    // (five) would charge it in the same sequence it went active; run in
    // the document's order, the draw sees an empty pool and H8 is left
    // merely active, first eligible for the draw only on the next ply.
    const state = buildState({
      sideToMove: "green",
      plyNumber: 19,
      siteStates: {
        H8: ["dormant", 10],
        F2: ["charged", 10],
      },
    });

    const result = runEndOfTurn(state);

    expect(result.effects).toEqual([
      { type: "node-ran-out", square: squareFromName("F2") },
      { type: "site-went-active", square: squareFromName("H8") },
    ]);
    expect(result.state.siteStates.H8).toEqual({
      state: "active",
      enteredOnPly: 19,
    });
    expect(result.state.siteStates.F2).toEqual({
      state: "dormant",
      enteredOnPly: 19,
    });
    expect(
      result.effects.some((effect) => effect.type === "site-charged"),
    ).toBe(false);
  });
});

describe("runEndOfTurn — step 2, the energy collection (§8.4)", () => {
  it("emits no effect and leaves both totals unchanged when nothing is held", () => {
    // Dormant rather than active, so step 4's charge draw has no pool to
    // draw these two from and this stays a pure test of step 2 alone.
    const state = buildState({
      sideToMove: "green",
      plyNumber: 3,
      siteStates: { H8: ["dormant", 0], K5: ["dormant", 0] },
      ships: [ship("green-1", "green", "D2")],
    });

    const result = runEndOfTurn(state);

    expect(result.effects).toEqual([]);
    expect(result.state).toEqual(state);
  });

  it("pays the side that just played and leaves the other side's total untouched", () => {
    const state = buildState({
      sideToMove: "green",
      plyNumber: 3,
      siteStates: { H8: ["charged", 1] },
      ships: [ship("green-1", "green", "H8", 4)],
    });

    const result = runEndOfTurn(state);

    expect(result.effects).toContainEqual({
      type: "energy-collected",
      side: "green",
      amount: 1,
      newTotal: 1,
      squares: [squareFromName("H8")],
    });
    expect(result.state.energy).toEqual({ green: 1, red: 0 });
  });

  it("pays for three held nodes, carrying the count, the amount, the new total and the squares", () => {
    const state = buildState({
      sideToMove: "green",
      plyNumber: 3,
      siteStates: {
        H8: ["charged", 1],
        K5: ["charged", 1],
        L8: ["charged", 1],
      },
      ships: [
        ship("green-1", "green", "H8", 4),
        ship("green-2", "green", "K5", 4),
        ship("green-3", "green", "L8", 4),
      ],
    });

    const result = runEndOfTurn(state);

    expect(result.effects).toContainEqual({
      type: "energy-collected",
      side: "green",
      amount: 6,
      newTotal: 6,
      squares: [
        squareFromName("K5"),
        squareFromName("H8"),
        squareFromName("L8"),
      ],
    });
    expect(result.state.energy).toEqual({ green: 6, red: 0 });
  });

  it("pays for a node whose clock runs out at the end of this very turn (before step 3 ticks)", () => {
    // Charged at the end of ply 1, so it finishes at the end of ply 10.
    const state = buildState({
      sideToMove: "green",
      plyNumber: 10,
      siteStates: { H8: ["charged", 1] },
      ships: [ship("green-1", "green", "H8", 4)],
    });

    const result = runEndOfTurn(state);

    expect(result.effects).toContainEqual({
      type: "energy-collected",
      side: "green",
      amount: 1,
      newTotal: 1,
      squares: [squareFromName("H8")],
    });
    expect(result.state.energy).toEqual({ green: 1, red: 0 });
    expect(result.state.siteStates.H8).toEqual({
      state: "dormant",
      enteredOnPly: 10,
    });
  });

  it("is unaffected by a ship gaining its fourth shield in step 1", () => {
    const state = buildState({
      sideToMove: "green",
      plyNumber: 5,
      siteStates: { H8: ["charged", 1] },
      ships: [ship("green-1", "green", "H8", 3)],
    });

    const result = runEndOfTurn(state);

    const shieldEffectIndex = result.effects.findIndex(
      (effect) => effect.type === "shield-gained",
    );
    const energyEffectIndex = result.effects.findIndex(
      (effect) => effect.type === "energy-collected",
    );
    expect(shieldEffectIndex).toBeGreaterThanOrEqual(0);
    expect(shieldEffectIndex).toBeLessThan(energyEffectIndex);

    expect(result.effects).toContainEqual({
      type: "energy-collected",
      side: "green",
      amount: 1,
      newTotal: 1,
      squares: [squareFromName("H8")],
    });
    const ship1 = result.state.ships.find((s) => s.id === "green-1");
    expect(ship1?.shields).toBe(4);
  });

  it("pays this side nothing for a node held by the opponent", () => {
    const state = buildState({
      sideToMove: "green",
      plyNumber: 3,
      siteStates: { H8: ["charged", 1] },
      ships: [ship("red-1", "red", "H8", 1)],
    });

    const result = runEndOfTurn(state);

    expect(
      result.effects.some((effect) => effect.type === "energy-collected"),
    ).toBe(false);
    expect(result.state.energy).toEqual({ green: 0, red: 0 });
  });
});

describe("runEndOfTurn — a passed ply still collects (§8.6 runs in full for a pass)", () => {
  it("pays the side that passes while standing on a charged node, through applyPassGuard", () => {
    // green-1 sits on K5, a charged site, having already acted this ply: it
    // has no move left (already acted) and no enemy stands anywhere near it
    // to attack, so it passes — but §8.6 still runs in full for that passed
    // turn, and green is still standing on the node.
    const state = {
      ...buildState({
        sideToMove: "green",
        plyNumber: 3,
        siteStates: { K5: ["charged", 1] },
        ships: [ship("green-1", "green", "K5", 3)],
      }),
      actedThisPly: ["green-1" as ShipId],
      actionsRemaining: 1,
    };

    const result = applyPassGuard(state);

    expect(result.effect).toEqual({
      type: "ply-passed",
      side: "green",
      sideToMove: "red",
      endOfTurn: [
        {
          type: "shield-gained",
          shipId: "green-1",
          side: "green",
          square: squareFromName("K5"),
          shields: 4,
        },
        {
          type: "energy-collected",
          side: "green",
          amount: 1,
          newTotal: 1,
          squares: [squareFromName("K5")],
        },
      ],
    });
    expect(result.state.energy).toEqual({ green: 1, red: 0 });
  });
});

describe("runEndOfTurn — the staggered opening (§8.1)", () => {
  it("runs out K5, E11, K11, E5 and H8 in turn, one per ply, at the ends of plies 2, 4, 5, 7 and 9", () => {
    const expectedRunOuts = new Map([
      [2, "K5"],
      [4, "E11"],
      [5, "K11"],
      [7, "E5"],
      [9, "H8"],
    ]);

    let state = startingGameState(1, DEFAULT_GAME_LENGTH_ROUNDS);

    for (let ply = 1; ply <= 9; ply++) {
      const result = runEndOfTurn(state);
      const ranOut = result.effects.filter(
        (effect) => effect.type === "node-ran-out",
      );

      const expectedSquare = expectedRunOuts.get(ply);
      if (expectedSquare === undefined) {
        expect(ranOut).toEqual([]);
      } else {
        expect(ranOut).toHaveLength(1);
        expect(squareName(ranOut[0].square)).toBe(expectedSquare);
      }

      state = { ...result.state, plyNumber: result.state.plyNumber + 1 };
    }
  });
});
