import { describe, expect, it } from "vitest";
import { squareFromName, squareName } from "./board";
import {
  runEndOfTurn,
  type NodeReliefEffect,
  type NodeRetiredEffect,
  type QueueRefilledEffect,
  type ShipFreedEffect,
} from "./endOfTurn";
import { CHARGED_COUNTDOWN_PLIES, TRAP_COUNTDOWN_PLIES } from "./countdown";
import type { ShipId } from "./fleet";
import { legalDestinations } from "./movement";
import { PLANETS } from "./planets";
import {
  type GameState,
  type Ship,
  type NodeStatus,
  nodeSquares,
  nodeStateAt,
  startingGameState,
} from "./gameState";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "./gameLength";
import { applyPassGuard } from "./ply";
import type { PowerLevel } from "./power";
import {
  INACTIVE_NODE_COUNT,
  TOP_NODE_PRIORITY,
  rotatePriority,
} from "./nodeQueue";
import {
  DEFAULT_CHARGED_NODE_COUNT,
  type ChargedNodeCount,
  type NodeState,
} from "./nodes";

function ship(
  id: ShipId,
  side: "green" | "red",
  square: string,
  power: PowerLevel = 4,
): Ship {
  return { id, side, square: squareFromName(square), power };
}

function nodeStatuses(
  states: Readonly<Record<string, readonly [NodeState, number]>>,
): Record<string, NodeStatus> {
  return Object.fromEntries(
    Object.entries(states).map(([name, [state, level]]) => [
      name,
      { state, level },
    ]),
  );
}

function buildState(config: {
  ships?: readonly Ship[];
  nodes?: Readonly<Record<string, readonly [NodeState, number]>>;
  sideToMove?: "green" | "red";
  plyNumber?: number;
  randomSeed?: number;
  chargedNodeCount?: ChargedNodeCount;
}): GameState {
  return {
    ships: config.ships ?? [],
    nodes: nodeStatuses(config.nodes ?? {}),
    sideToMove: config.sideToMove ?? "green",
    plyNumber: config.plyNumber ?? 1,
    randomSeed: config.randomSeed ?? 1,
    openingSeed: config.randomSeed ?? 1,
    energy: { green: 0, red: 0 },
    lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
    chargedNodeCount: config.chargedNodeCount ?? DEFAULT_CHARGED_NODE_COUNT,
    outOfTime: { green: false, red: false },
  };
}

describe("runEndOfTurn — step 1, the planet gain (§3.1, §4.1)", () => {
  const PLANET_SQUARE_NAME = squareName(PLANETS[0]);
  const OTHER_PLANET_SQUARE_NAME = squareName(PLANETS[1]);

  it("gains 2 for a ship charging alone on a planet", () => {
    const state = buildState({
      sideToMove: "green",
      ships: [ship("green-1", "green", PLANET_SQUARE_NAME, 2)],
    });

    const result = runEndOfTurn(state);

    expect(result.state.ships.find((s) => s.id === "green-1")?.power).toBe(4);
    expect(result.effects).toContainEqual({
      type: "power-gained",
      shipId: "green-1",
      side: "green",
      square: squareFromName(PLANET_SQUARE_NAME),
      power: 4,
      amount: 2,
    });
  });

  it("gains 1 each for two ships charging at once", () => {
    const state = buildState({
      sideToMove: "green",
      ships: [
        ship("green-1", "green", PLANET_SQUARE_NAME, 2),
        ship("green-2", "green", OTHER_PLANET_SQUARE_NAME, 3),
      ],
    });

    const result = runEndOfTurn(state);

    expect(result.state.ships.find((s) => s.id === "green-1")?.power).toBe(3);
    expect(result.state.ships.find((s) => s.id === "green-2")?.power).toBe(4);
    expect(result.effects).toContainEqual({
      type: "power-gained",
      shipId: "green-1",
      side: "green",
      square: squareFromName(PLANET_SQUARE_NAME),
      power: 3,
      amount: 1,
    });
    expect(result.effects).toContainEqual({
      type: "power-gained",
      shipId: "green-2",
      side: "green",
      square: squareFromName(OTHER_PLANET_SQUARE_NAME),
      power: 4,
      amount: 1,
    });
  });

  it("excludes a ship already at the maximum from the count, so it neither gains nor denies a lone shipmate the double rate", () => {
    const state = buildState({
      sideToMove: "green",
      ships: [
        ship("green-1", "green", PLANET_SQUARE_NAME, 4),
        ship("green-2", "green", OTHER_PLANET_SQUARE_NAME, 6),
      ],
    });

    const result = runEndOfTurn(state);

    // green-2 is already full, so it does not count towards the charging
    // total: green-1 is the only ship actually charging, and takes the lone
    // rate of 2, with no cap to bite.
    expect(result.state.ships.find((s) => s.id === "green-1")?.power).toBe(6);
    expect(result.state.ships.find((s) => s.id === "green-2")?.power).toBe(6);
    expect(result.effects).toContainEqual({
      type: "power-gained",
      shipId: "green-1",
      side: "green",
      square: squareFromName(PLANET_SQUARE_NAME),
      power: 6,
      amount: 2,
    });
    expect(
      result.effects.filter((effect) => effect.type === "power-gained"),
    ).toHaveLength(1);
  });

  it("caps the double rate at the maximum, reporting only the amount that actually landed", () => {
    const state = buildState({
      sideToMove: "green",
      ships: [ship("green-1", "green", PLANET_SQUARE_NAME, 5)],
    });

    const result = runEndOfTurn(state);

    expect(result.state.ships.find((s) => s.id === "green-1")?.power).toBe(6);
    expect(result.effects).toContainEqual({
      type: "power-gained",
      shipId: "green-1",
      side: "green",
      square: squareFromName(PLANET_SQUARE_NAME),
      power: 6,
      amount: 1,
    });
  });

  it("takes the charging count once, at the start of the pass, so a ship reaching the maximum mid-pass does not raise the rate for the ship after it", () => {
    // Two ships charging at the pass's start means the rate is 1 for both,
    // fleet order first. green-1 reaches the maximum on its own point, which
    // would leave green-2 as the only ship still below it if the count were
    // taken again — the fixed-at-entry count means green-2 still only gains
    // 1, not 2.
    const state = buildState({
      sideToMove: "green",
      ships: [
        ship("green-1", "green", PLANET_SQUARE_NAME, 5),
        ship("green-2", "green", OTHER_PLANET_SQUARE_NAME, 4),
      ],
    });

    const result = runEndOfTurn(state);

    expect(result.state.ships.find((s) => s.id === "green-1")?.power).toBe(6);
    expect(result.state.ships.find((s) => s.id === "green-2")?.power).toBe(5);
    expect(result.effects).toContainEqual({
      type: "power-gained",
      shipId: "green-2",
      side: "green",
      square: squareFromName(OTHER_PLANET_SQUARE_NAME),
      power: 5,
      amount: 1,
    });
  });

  it("leaves a ship already at 6 power on a planet at 6 and raises no effect for it", () => {
    const state = buildState({
      sideToMove: "green",
      ships: [ship("green-1", "green", PLANET_SQUARE_NAME, 6)],
    });

    const result = runEndOfTurn(state);

    expect(result.state.ships.find((s) => s.id === "green-1")?.power).toBe(6);
    expect(
      result.effects.some((effect) => effect.type === "power-gained"),
    ).toBe(false);
  });

  it("collects no energy for a ship recovering on a planet", () => {
    const state = buildState({
      sideToMove: "green",
      ships: [ship("green-1", "green", PLANET_SQUARE_NAME, 2)],
    });

    const result = runEndOfTurn(state);

    expect(
      result.effects.some((effect) => effect.type === "energy-collected"),
    ).toBe(false);
    expect(result.state.energy).toEqual({ green: 0, red: 0 });
  });

  it("gains nothing for a ship of the other side sitting on a planet this turn", () => {
    const state = buildState({
      sideToMove: "green",
      ships: [ship("red-1", "red", PLANET_SQUARE_NAME, 2)],
    });

    const result = runEndOfTurn(state);

    expect(result.state.ships.find((s) => s.id === "red-1")?.power).toBe(2);
    expect(
      result.effects.some((effect) => effect.type === "power-gained"),
    ).toBe(false);
  });
});

describe("runEndOfTurn — step 1, nodes no longer touch power (§4.1)", () => {
  it("leaves a ship holding a charged node with the power it had, however long it holds it, while still collecting energy", () => {
    const state = buildState({
      sideToMove: "green",
      nodes: {
        H8: ["charged", 0],
        K5: ["inactive", 1],
        L8: ["charged", 0],
        E11: ["charged", 0],
      },
      ships: [
        ship("green-1", "green", "H8", 3),
        ship("green-2", "green", "K5", 3),
        ship("green-3", "green", "D2", 3),
        ship("green-4", "green", "L8", 0),
        ship("green-5", "green", "H12", 4),
        ship("red-1", "red", "E11", 3),
      ],
    });

    const result = runEndOfTurn(state);

    const shipPower = (id: ShipId): PowerLevel | undefined =>
      result.state.ships.find((s) => s.id === id)?.power;

    expect(shipPower("green-1")).toBe(3);
    expect(shipPower("green-2")).toBe(3);
    expect(shipPower("green-3")).toBe(3);
    expect(shipPower("green-4")).toBe(0);
    expect(shipPower("green-5")).toBe(4);
    expect(shipPower("red-1")).toBe(3);

    expect(
      result.effects.some((effect) => effect.type === "power-gained"),
    ).toBe(false);
    expect(result.effects[0]).toEqual({
      type: "energy-collected",
      side: "green",
      amount: 2,
      newTotal: 2,
      squares: [squareFromName("H8"), squareFromName("L8")],
    });
    // Step 4: the board is one node short of four, and K5 is the only
    // inactive node, so it is charged deterministically — the draw needs no
    // choice among a pool of one. None of the charged nodes carries a
    // countdown, so step 3 has nothing to spend and adds no effect of its
    // own.
    expect(result.effects).toContainEqual({
      type: "node-charged",
      square: squareFromName("K5"),
    });
  });

  it("leaves a ship on a depleted node with the power it had", () => {
    const state = buildState({
      sideToMove: "green",
      nodes: {
        H8: ["depleted", 1],
        K5: ["inactive", 1],
      },
      ships: [
        ship("green-1", "green", "H8", 2),
        ship("green-2", "green", "K5", 2),
        ship("green-3", "green", "D2", 2),
        ship("red-1", "red", "H8", 2),
      ],
    });

    const result = runEndOfTurn(state);

    const shipPower = (id: ShipId): PowerLevel | undefined =>
      result.state.ships.find((s) => s.id === id)?.power;

    expect(shipPower("green-1")).toBe(2);
    expect(shipPower("green-2")).toBe(2);
    expect(shipPower("green-3")).toBe(2);
    expect(shipPower("red-1")).toBe(2);

    expect(
      result.effects.some((effect) => effect.type === "power-gained"),
    ).toBe(false);
  });

  it("reports only the planet gain when one ship recovers on a planet while another holds a charged node", () => {
    const planetSquareName = squareName(PLANETS[0]);
    const state = buildState({
      sideToMove: "green",
      nodes: { H8: ["charged", 0] },
      ships: [
        ship("green-1", "green", planetSquareName, 2),
        ship("green-2", "green", "H8", 3),
      ],
    });

    const result = runEndOfTurn(state);

    expect(result.effects).toContainEqual({
      type: "power-gained",
      shipId: "green-1",
      side: "green",
      square: squareFromName(planetSquareName),
      power: 4,
      amount: 2,
    });
    expect(result.state.ships.find((s) => s.id === "green-2")?.power).toBe(3);
  });
});

describe("runEndOfTurn — step 3, the charged countdown (§8.3)", () => {
  it("spends exactly one ply off a running countdown, whoever is standing on it or not", () => {
    for (const ships of [
      [],
      [ship("green-1", "green", "H8", 4)],
      [ship("red-1", "red", "H8", 4)],
    ]) {
      const state = buildState({ nodes: { H8: ["charged", 5] }, ships });
      const result = runEndOfTurn(state);
      expect(result.state.nodes.H8).toEqual({ state: "charged", level: 4 });
    }
  });

  it("leaves a charged node with no countdown at 0, indefinitely", () => {
    const state = buildState({ nodes: { H8: ["charged", 0] } });

    const result = runEndOfTurn(state);

    expect(result.state.nodes.H8).toEqual({ state: "charged", level: 0 });
    expect(
      result.effects.some((effect) => effect.type === "node-ran-out"),
    ).toBe(false);
  });

  it("goes depleted, carrying TRAP_COUNTDOWN_PLIES, when the last ply is spent, trapping the ship on it (§8.5)", () => {
    // No inactive node is queued, so once H8 runs out charging has nothing
    // to charge with, whatever the shortfall, and this stays a pure test of
    // H8's own countdown and trap.
    const state = buildState({
      nodes: {
        H8: ["charged", 1],
        C3: ["charged", 0],
        E3: ["charged", 0],
        G3: ["charged", 0],
      },
      // A second green ship on a plain square, free of any node, so green
      // is not all-trapped and step 7's relief does not fire — a real
      // fleet has seven ships, and this one contributes no effect of its
      // own.
      ships: [
        ship("green-1", "green", "H8", 1),
        ship("green-2", "green", "F8"),
      ],
    });

    const result = runEndOfTurn(state);

    expect(result.state.nodes.H8).toEqual({
      state: "depleted",
      level: TRAP_COUNTDOWN_PLIES,
    });
    expect(result.effects).toEqual([
      {
        type: "energy-collected",
        side: "green",
        amount: 1,
        newTotal: 1,
        squares: [squareFromName("H8")],
      },
      { type: "node-ran-out", square: squareFromName("H8") },
      {
        type: "ship-trapped",
        shipId: "green-1",
        side: "green",
        square: squareFromName("H8"),
      },
    ]);
    // Holding a charged node no longer costs power (§4.1), so green's own
    // ship is untouched by step 1 even as step 3 spends the node out from
    // under it in the same sequence — it simply stays there, trapped, at
    // the power it started with.
    const untouchedShip = result.state.ships.find((s) => s.id === "green-1");
    expect(untouchedShip?.power).toBe(1);
    expect(untouchedShip?.square).toEqual(squareFromName("H8"));
  });

  it("goes depleted with nothing further to report when the node was empty", () => {
    // No inactive node is queued, so once H8 runs out charging has nothing
    // to charge with, whatever the shortfall, and the sequence has nothing
    // further to report.
    const state = buildState({
      nodes: {
        H8: ["charged", 1],
        C3: ["charged", 0],
        E3: ["charged", 0],
        G3: ["charged", 0],
      },
    });

    const result = runEndOfTurn(state);

    expect(result.state.nodes.H8.state).toBe("depleted");
    expect(result.effects).toEqual([
      { type: "node-ran-out", square: squareFromName("H8") },
    ]);
  });

  it("draws nothing from the seed, whatever it does", () => {
    const state = buildState({
      nodes: { H8: ["charged", 1], K5: ["charged", 5] },
      randomSeed: 20260907,
    });

    const result = runEndOfTurn(state);

    expect(result.state.randomSeed).toBe(state.randomSeed);
  });
});

describe("runEndOfTurn — lifetimes (§8.3)", () => {
  it("holds a node from the ply a countdown starts for exactly CHARGED_COUNTDOWN_PLIES plies, whoever holds it", () => {
    for (const ships of [
      // A second ship of the same side, on a plain square free of any node,
      // so that side is never all-trapped once H8 depletes — without it
      // step 7's relief would end H8 the instant it traps a lone ship, and
      // this test is about the trap's own length, not the relief.
      [ship("green-1", "green", "H8", 4), ship("green-2", "green", "F8")],
      [ship("red-1", "red", "H8", 4), ship("red-2", "red", "F8")],
    ]) {
      let state = buildState({
        nodes: { H8: ["charged", CHARGED_COUNTDOWN_PLIES] },
        ships,
      });
      let plies = 0;
      for (;;) {
        const result = runEndOfTurn(state);
        plies += 1;
        if (result.state.nodes.H8.state === "depleted") {
          break;
        }
        state = result.state;
      }
      expect(plies).toBe(CHARGED_COUNTDOWN_PLIES);
    }
  });

  it("leaves a node nobody visits running forever — no countdown, nothing to spend", () => {
    let state = buildState({ nodes: { H8: ["charged", 0] } });
    for (let ply = 0; ply < 100; ply++) {
      const result = runEndOfTurn(state);
      expect(result.state.nodes.H8).toEqual({ state: "charged", level: 0 });
      state = result.state;
    }
  });
});

describe("runEndOfTurn — step 6, retirement (§8.2)", () => {
  it("retires a depleted node once its level reaches zero or below, and nothing appears in its place", () => {
    // A level of 1 spends its last ply this very sequence, deterministically.
    // No inactive node is queued, so after H8 retires charging has nothing
    // to charge with, whatever the shortfall, and step 6's retirement stays
    // the only event.
    const state = buildState({
      nodes: {
        H8: ["depleted", 1],
        C3: ["charged", 0],
        E3: ["charged", 0],
        G3: ["charged", 0],
      },
    });

    const result = runEndOfTurn(state);

    expect(result.effects).toEqual([
      { type: "node-retired", square: squareFromName("H8") },
    ]);
    expect(result.state.nodes.H8).toBeUndefined();
    expect(Object.keys(result.state.nodes).sort()).toEqual(["C3", "E3", "G3"]);
  });

  it("reduces the node count by exactly one, with nothing to replace it", () => {
    const chargedNames = ["C3", "E3", "G3", "I3"];
    const depletedName = "M3";
    const state = buildState({
      chargedNodeCount: 4,
      nodes: {
        ...Object.fromEntries(
          chargedNames.map((name) => [name, ["charged", 0] as const]),
        ),
        // A level of 1 guarantees retirement in one ply.
        [depletedName]: ["depleted", 1],
        C5: ["inactive", 1],
        E5: ["inactive", 2],
        G5: ["inactive", 3],
      },
    });
    const startingCount = Object.keys(state.nodes).length;

    const result = runEndOfTurn(state);

    expect(result.state.nodes[depletedName]).toBeUndefined();
    expect(Object.keys(result.state.nodes)).toHaveLength(startingCount - 1);
  });

  it("handles two retirements in the same sequence, each reported independently, in board order", () => {
    const state = buildState({
      nodes: {
        H8: ["depleted", 1],
        K5: ["depleted", 1],
        F2: ["charged", 0],
        J2: ["charged", 0],
        B4: ["inactive", 1],
        D8: ["inactive", 2],
        N4: ["inactive", 3],
      },
    });

    const result = runEndOfTurn(state);

    const retirements = result.effects.filter(
      (effect): effect is NodeRetiredEffect => effect.type === "node-retired",
    );
    expect(retirements).toHaveLength(2);
    // Board order: K5 (row 5) is processed before H8 (row 8).
    expect(retirements.map((effect) => squareName(effect.square))).toEqual([
      "K5",
      "H8",
    ]);

    expect(result.state.nodes.H8).toBeUndefined();
    expect(result.state.nodes.K5).toBeUndefined();
  });

  it("does not retire a node that only went depleted during this very sequence", () => {
    // H8's level of 1 spends its last ply in step 3: it is genuinely
    // `charged`, not `depleted`, at the start of this state, so
    // `runEndOfTurn` derives an empty depleted-before-ply set on its own and
    // step 6 must not touch H8 even though it is depleted by the time step 6
    // runs.
    const state = buildState({
      nodes: { H8: ["charged", 1] },
    });

    const result = runEndOfTurn(state);

    expect(result.state.nodes.H8.state).toBe("depleted");
    expect(
      result.effects.some((effect) => effect.type === "node-retired"),
    ).toBe(false);
    // It first has a chance to retire at the end of the next ply, once it
    // truly was depleted when that one began — `result.state` genuinely has
    // H8 depleted, so this second call derives it into the set on its own.
    const nextResult = runEndOfTurn(result.state);
    expect(
      nextResult.state.nodes.H8 === undefined ||
        nextResult.state.nodes.H8.level < result.state.nodes.H8.level,
    ).toBe(true);
  });

  it("retires a depleted node in exactly as many plies as its starting level, whatever that level is", () => {
    function pliesToRetire(startLevel: number): number {
      let state = buildState({ nodes: { H8: ["depleted", startLevel] } });
      let plies = 0;
      for (;;) {
        const result = runEndOfTurn(state);
        plies += 1;
        if (result.state.nodes.H8 === undefined) {
          return plies;
        }
        state = result.state;
      }
    }

    expect(pliesToRetire(TRAP_COUNTDOWN_PLIES)).toBe(TRAP_COUNTDOWN_PLIES);
    expect(pliesToRetire(2)).toBe(2);
  });
});

describe("runEndOfTurn — the trap: ship-trapped and ship-freed (§7, §8.1, §8.5)", () => {
  it("reports node-retired then ship-freed, keeping the freed ship's square and power, when a retiring node had a ship on it", () => {
    // A level of 1 guarantees retirement this very ply. No inactive node is
    // queued, so after H8 retires charging has nothing to charge with,
    // whatever the shortfall.
    const state = buildState({
      nodes: {
        H8: ["depleted", 1],
        C3: ["charged", 0],
        E3: ["charged", 0],
        G3: ["charged", 0],
      },
      ships: [ship("green-1", "green", "H8", 3)],
    });

    const result = runEndOfTurn(state);

    expect(
      result.effects.findIndex((effect) => effect.type === "node-retired"),
    ).toBe(0);
    expect(result.effects[1]).toEqual({
      type: "ship-freed",
      shipId: "green-1",
      side: "green",
      square: squareFromName("H8"),
    });
    const freedShip = result.state.ships.find((s) => s.id === "green-1");
    expect(freedShip?.square).toEqual(squareFromName("H8"));
    expect(freedShip?.power).toBe(3);
  });

  it("reports no ship-freed when a retiring node had no ship on it", () => {
    const state = buildState({
      nodes: { H8: ["depleted", 1] },
    });

    const result = runEndOfTurn(state);

    expect(result.effects.some((effect) => effect.type === "ship-freed")).toBe(
      false,
    );
  });

  it("does not free the ship a node traps in step 3 of the same sequence — step 6 only touches nodes depleted before the ply began", () => {
    // A level of 1 spends its last ply in step 3, so H8 is guaranteed to go
    // depleted here, never having been depleted before this ply began.
    const state = buildState({
      nodes: { H8: ["charged", 1] },
      // A second green ship on a plain square, free of any node, so green
      // is not all-trapped and step 7's relief does not also end H8 this
      // very ply — that would be a true fact about the relief, not about
      // step 6, and would defeat what this test is checking.
      ships: [
        ship("green-1", "green", "H8", 1),
        ship("green-2", "green", "F8"),
      ],
    });

    const result = runEndOfTurn(state);

    expect(result.state.nodes.H8.state).toBe("depleted");
    expect(
      result.effects.some((effect) => effect.type === "ship-trapped"),
    ).toBe(true);
    expect(result.effects.some((effect) => effect.type === "ship-freed")).toBe(
      false,
    );
    expect(
      result.effects.some((effect) => effect.type === "node-retired"),
    ).toBe(false);
  });
});

describe("runEndOfTurn — step 7, the all-trapped relief (§8.6 step 7, §5)", () => {
  it("ends exactly the lowest-level qualifying node and frees its ship, emitting node-relief, node-retired and ship-freed in that order", () => {
    // Both H8 and D8 are given more life than a real countdown ever carries
    // (11 plies, at most), just so neither retires in step 6 — both are
    // still depleted, and both movable once freed, when step 7 runs. H8's
    // level (30) is lower than D8's (40), so H8 has the least remaining
    // life and is the one the relief ends; D8 stays trapping green-2.
    const state = buildState({
      nodes: { H8: ["depleted", 30], D8: ["depleted", 40] },
      ships: [ship("green-1", "green", "H8"), ship("green-2", "green", "D8")],
      sideToMove: "green",
    });

    const result = runEndOfTurn(state);

    const reliefs = result.effects.filter(
      (effect): effect is NodeReliefEffect => effect.type === "node-relief",
    );
    expect(reliefs).toEqual([
      { type: "node-relief", side: "green", square: squareFromName("H8") },
    ]);

    const reliefIndex = result.effects.indexOf(reliefs[0]);
    const retiredIndex = result.effects.findIndex(
      (effect) => effect.type === "node-retired",
    );
    const freed = result.effects.filter(
      (effect): effect is ShipFreedEffect => effect.type === "ship-freed",
    );
    expect(freed).toHaveLength(1);
    const freedIndex = result.effects.indexOf(freed[0]);
    expect(reliefIndex).toBeLessThan(retiredIndex);
    expect(retiredIndex).toBeLessThan(freedIndex);
    expect(freed[0].shipId).toBe("green-1");

    expect(result.state.nodes.H8).toBeUndefined();
    expect(result.state.nodes.D8.state).toBe("depleted");
    const freedShip = result.state.ships.find((s) => s.id === "green-1")!;
    expect(freedShip.square).toEqual(squareFromName("H8"));
    expect(legalDestinations(result.state, "green-1").length).toBeGreaterThan(
      0,
    );
  });

  it("ends nothing when one ship of the side is still free", () => {
    const state = buildState({
      nodes: { H8: ["depleted", 30] },
      ships: [ship("green-1", "green", "H8"), ship("green-2", "green", "F8")],
      sideToMove: "green",
    });

    const result = runEndOfTurn(state);

    expect(result.effects.some((effect) => effect.type === "node-relief")).toBe(
      false,
    );
    expect(result.effects.some((effect) => effect.type === "ship-freed")).toBe(
      false,
    );
    expect(result.state.nodes.H8.state).toBe("depleted");
  });

  it("ends nothing when every ship is trapped but none would have a legal move once freed, and draws no seed doing so", () => {
    // A1 is a corner: at power 0 the only affordable moves are the two
    // orthogonal steps to B1 and A2, and both are occupied by an enemy ship
    // — boxed in by ships and the edge of the board, not by the trap. H8 is
    // a lone charged node, unoccupied, leaving nothing in the queue to
    // charge from, so charging draws nothing.
    const state = buildState({
      nodes: { A1: ["depleted", 30], H8: ["charged", 0] },
      ships: [
        ship("green-1", "green", "A1", 0),
        ship("red-1", "red", "B1"),
        ship("red-2", "red", "A2"),
      ],
      sideToMove: "green",
    });

    const result = runEndOfTurn(state);

    expect(
      result.effects.some(
        (effect) =>
          effect.type === "node-relief" || effect.type === "ship-freed",
      ),
    ).toBe(false);
    expect(result.state.nodes.A1.state).toBe("depleted");
    // Nothing in the sequence draws from the seed: step 3 and step 6 are
    // both deterministic now, and step 7 finds no qualifying candidate.
    expect(result.state.randomSeed).toBe(state.randomSeed);
  });

  it("relieves the side that did not just move, as well as the side that did", () => {
    const state = buildState({
      nodes: { H8: ["depleted", 30] },
      ships: [ship("red-1", "red", "H8")],
      sideToMove: "green",
    });

    const result = runEndOfTurn(state);

    expect(result.effects).toContainEqual({
      type: "node-relief",
      side: "red",
      square: squareFromName("H8"),
    });
    expect(result.state.nodes.H8).toBeUndefined();
  });

  it("relieves both sides when both are all-trapped, the side that just moved first", () => {
    const state = buildState({
      nodes: { H8: ["depleted", 30], D8: ["depleted", 40] },
      ships: [ship("green-1", "green", "H8"), ship("red-1", "red", "D8")],
      sideToMove: "green",
    });

    const result = runEndOfTurn(state);

    const reliefs = result.effects.filter(
      (effect): effect is NodeReliefEffect => effect.type === "node-relief",
    );
    expect(reliefs.map((effect) => effect.side)).toEqual(["green", "red"]);
    expect(result.state.nodes.H8).toBeUndefined();
    expect(result.state.nodes.D8).toBeUndefined();
  });

  it("consumes no more seed when the relief cannot fire than the same state without any trapped side at all", () => {
    const withBoxedTrap = buildState({
      nodes: { A1: ["depleted", 30] },
      ships: [
        ship("green-1", "green", "A1", 0),
        ship("red-1", "red", "B1"),
        ship("red-2", "red", "A2"),
      ],
      sideToMove: "green",
    });
    const withoutAnyShips = buildState({
      nodes: { A1: ["depleted", 30] },
      ships: [],
      sideToMove: "green",
    });

    const resultWithBoxedTrap = runEndOfTurn(withBoxedTrap);
    const resultWithoutAnyShips = runEndOfTurn(withoutAnyShips);

    expect(resultWithBoxedTrap.state.randomSeed).toBe(
      resultWithoutAnyShips.state.randomSeed,
    );
  });

  it("breaks a tie on remaining life by board order and draws nothing from the seed", () => {
    // D8 and L8 are given exactly the same level. This tie cannot arise in
    // real play (rules.md §8.3: a side's trapped ships' nodes always have
    // distinct remaining lives), so this is a hand-built fixture pinning
    // `reliefSquare`'s deterministic tidy-up of the unreachable case —
    // `trappingNodesFor` (`trap.ts`) lists D8 before L8 (board order), so D8
    // wins, with no seed movement at all.
    const tiedLevel = 30;
    const seed = 1;

    const state = buildState({
      nodes: {
        C3: ["charged", 0],
        E3: ["charged", 0],
        G3: ["charged", 0],
        I3: ["charged", 0],
        D8: ["depleted", tiedLevel],
        L8: ["depleted", tiedLevel],
      },
      ships: [ship("green-1", "green", "D8"), ship("green-2", "green", "L8")],
      sideToMove: "green",
      randomSeed: seed,
    });

    const result = runEndOfTurn(state);

    const relief = result.effects.find(
      (effect): effect is NodeReliefEffect => effect.type === "node-relief",
    );
    expect(relief).toEqual({
      type: "node-relief",
      side: "green",
      square: squareFromName("D8"),
    });
    const retired = result.effects.find(
      (effect): effect is NodeRetiredEffect => effect.type === "node-retired",
    );
    expect(retired?.square).toEqual(squareFromName("D8"));
    // Nothing in the sequence draws from the seed any more.
    expect(result.state.randomSeed).toBe(seed);
    // Step 6 spends one ply off both tied nodes, ahead of step 7's choice —
    // they are still tied, just one ply lower, when the choice is made.
    expect(result.state.nodes.L8).toEqual({
      state: "depleted",
      level: tiedLevel - 1,
    });
  });
});

describe("runEndOfTurn — step 4, charging never charges a node that only appears in step 6 of the same sequence (§8.6 step ordering)", () => {
  it("leaves the board with nothing charged when the only inactive candidate is a node retiring this very ply", () => {
    // H8 is guaranteed to retire this ply (level 1); F2 is guaranteed to run
    // out this ply (level 1). H8 is genuinely depleted, and F2 genuinely
    // charged, before this ply begins, so `runEndOfTurn` derives the right
    // depleted-before-ply set on its own.
    const state = buildState({
      nodes: {
        H8: ["depleted", 1],
        F2: ["charged", 1],
      },
    });

    const result = runEndOfTurn(state);

    expect(result.state.nodes.H8).toBeUndefined();
    expect(result.state.nodes.F2.state).toBe("depleted");
    expect(result.effects).toContainEqual({
      type: "node-ran-out",
      square: squareFromName("F2"),
    });
    expect(
      result.effects.some((effect) => effect.type === "node-retired"),
    ).toBe(true);
    expect(
      result.effects.some((effect) => effect.type === "node-charged"),
    ).toBe(false);
  });
});

describe("runEndOfTurn — step 5, refill or rotate (§8.2, §8.6 step 5)", () => {
  it("rotates every surviving priority one step and emits no effect when nothing charges", () => {
    // Four charged nodes already hold the board at its target, so charging
    // has no shortfall to fill and the three inactive nodes simply rotate.
    const state = buildState({
      chargedNodeCount: 4,
      nodes: {
        D4: ["charged", 0],
        L4: ["charged", 0],
        D12: ["charged", 0],
        L12: ["charged", 0],
        F2: ["inactive", 1],
        N4: ["inactive", 2],
        H8: ["inactive", 3],
      },
    });

    const result = runEndOfTurn(state);

    expect(
      result.effects.some((effect) => effect.type === "queue-refilled"),
    ).toBe(false);
    expect(result.state.nodes.F2).toEqual({
      state: "inactive",
      level: rotatePriority(1),
    });
    expect(result.state.nodes.N4).toEqual({
      state: "inactive",
      level: rotatePriority(2),
    });
    expect(result.state.nodes.H8).toEqual({
      state: "inactive",
      level: rotatePriority(3),
    });
  });

  it("sweeps the whole queue, leaving three inactive nodes at priorities {1, 2, 3}, when something charges", () => {
    // Three charged nodes leave a shortfall of one, which the priority-3
    // node (H8) alone covers — the other two are discarded, not merely
    // left waiting their own turn.
    const state = buildState({
      chargedNodeCount: 4,
      nodes: {
        D4: ["charged", 0],
        L4: ["charged", 0],
        D12: ["charged", 0],
        F2: ["inactive", 1],
        N4: ["inactive", 2],
        H8: ["inactive", TOP_NODE_PRIORITY],
      },
      randomSeed: 20260906,
    });

    const result = runEndOfTurn(state);

    expect(result.effects).toContainEqual({
      type: "node-charged",
      square: squareFromName("H8"),
    });
    const refills = result.effects.filter(
      (effect): effect is QueueRefilledEffect =>
        effect.type === "queue-refilled",
    );
    expect(refills).toHaveLength(1);
    // Board order: F2 (row 2) before N4 (row 4) — neither charged, so both
    // are discarded, not just the one at the back of the queue.
    expect(refills[0].discardedSquares.map(squareName)).toEqual(["F2", "N4"]);
    expect(refills[0].newNodes).toHaveLength(INACTIVE_NODE_COUNT);

    const inactiveNow = nodeSquares(result.state).filter(
      (square) => nodeStateAt(result.state, square) === "inactive",
    );
    expect(inactiveNow).toHaveLength(INACTIVE_NODE_COUNT);
    const priorities = inactiveNow
      .map((square) => result.state.nodes[squareName(square)].level)
      .sort();
    expect(priorities).toEqual([1, 2, 3]);
  });

  it("keeps a ship on a swept inactive node exactly where it was, at the power it had, and never traps it", () => {
    const state = buildState({
      nodes: {
        D4: ["charged", 0],
        L4: ["charged", 0],
        D12: ["charged", 0],
        F2: ["inactive", 1],
        N4: ["inactive", 2],
        H8: ["inactive", 3],
      },
      ships: [ship("green-1", "green", "F2", 3)],
      randomSeed: 20260906,
    });

    const result = runEndOfTurn(state);

    const campingShip = result.state.ships.find((s) => s.id === "green-1");
    expect(campingShip?.square).toEqual(squareFromName("F2"));
    expect(campingShip?.power).toBe(3);
    // A ship's own square is never a candidate for the refill (§3.2
    // constraint 2), so a square it was camping on is left an ordinary,
    // node-free square once the sweep discards it.
    expect(nodeStateAt(result.state, squareFromName("F2"))).toBeUndefined();
    expect(
      result.effects.some(
        (effect) =>
          effect.type === "ship-trapped" || effect.type === "ship-freed",
      ),
    ).toBe(false);
  });

  it("fills a zero-charged board from the three queue nodes alone, never placing a fourth from anywhere, and refills the queue afterwards (§8.2, §8.6 steps 4 and 5)", () => {
    const state = buildState({
      chargedNodeCount: 4,
      nodes: {
        N4: ["inactive", 3],
        D8: ["inactive", 1],
        H8: ["inactive", 2],
      },
    });

    const result = runEndOfTurn(state);

    const chargedNow = nodeSquares(result.state).filter(
      (square) => nodeStateAt(result.state, square) === "charged",
    );
    const inactiveNow = nodeSquares(result.state).filter(
      (square) => nodeStateAt(result.state, square) === "inactive",
    );
    expect(chargedNow).toHaveLength(state.chargedNodeCount - 1);
    expect(inactiveNow).toHaveLength(INACTIVE_NODE_COUNT);

    const refills = result.effects.filter(
      (effect): effect is QueueRefilledEffect =>
        effect.type === "queue-refilled",
    );
    expect(refills).toHaveLength(1);
    expect(refills[0].newNodes).toHaveLength(INACTIVE_NODE_COUNT);
  });
});

describe("runEndOfTurn — step 2, the energy collection (§8.4)", () => {
  it("emits no effect and leaves both totals unchanged when nothing is held", () => {
    // Depleted rather than charged or inactive, so nothing here is a
    // candidate for step 2's energy collection. No inactive node is queued,
    // so step 4's charging has nothing to charge with either, whatever the
    // shortfall, and this stays a pure test of step 2 alone.
    const state = buildState({
      sideToMove: "green",
      nodes: {
        H8: ["depleted", 0],
        K5: ["depleted", 0],
        C3: ["charged", 0],
        E3: ["charged", 0],
        G3: ["charged", 0],
        I3: ["charged", 0],
      },
      ships: [ship("green-1", "green", "D2")],
    });

    const result = runEndOfTurn(state);

    expect(
      result.effects.filter((effect) => effect.type !== "node-retired"),
    ).toEqual([]);
    expect(result.state.energy).toEqual({ green: 0, red: 0 });
  });

  it("pays the side that just played and leaves the other side's total untouched", () => {
    const state = buildState({
      sideToMove: "green",
      nodes: { H8: ["charged", 5] },
      ships: [ship("green-1", "green", "H8", 0)],
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
      nodes: {
        H8: ["charged", 5],
        K5: ["charged", 5],
        L8: ["charged", 5],
      },
      ships: [
        ship("green-1", "green", "H8", 0),
        ship("green-2", "green", "K5", 0),
        ship("green-3", "green", "L8", 0),
      ],
    });

    const result = runEndOfTurn(state);

    expect(result.effects).toContainEqual({
      type: "energy-collected",
      side: "green",
      amount: 3,
      newTotal: 3,
      squares: [
        squareFromName("K5"),
        squareFromName("H8"),
        squareFromName("L8"),
      ],
    });
    expect(result.state.energy).toEqual({ green: 3, red: 0 });
  });

  it("pays for four held nodes, with no cap in the arithmetic", () => {
    const state = buildState({
      sideToMove: "green",
      nodes: {
        H8: ["charged", 5],
        K5: ["charged", 5],
        L8: ["charged", 5],
        C3: ["charged", 5],
      },
      ships: [
        ship("green-1", "green", "H8", 0),
        ship("green-2", "green", "K5", 0),
        ship("green-3", "green", "L8", 0),
        ship("green-4", "green", "C3", 0),
      ],
    });

    const result = runEndOfTurn(state);

    expect(result.effects).toContainEqual({
      type: "energy-collected",
      side: "green",
      amount: 4,
      newTotal: 4,
      squares: [
        squareFromName("C3"),
        squareFromName("K5"),
        squareFromName("H8"),
        squareFromName("L8"),
      ],
    });
    expect(result.state.energy).toEqual({ green: 4, red: 0 });
  });

  it("pays for every held node at the default five charged, with no cap in the arithmetic", () => {
    const state = buildState({
      sideToMove: "green",
      nodes: {
        H8: ["charged", 5],
        K5: ["charged", 5],
        L8: ["charged", 5],
        C3: ["charged", 5],
        F3: ["charged", 5],
      },
      ships: [
        ship("green-1", "green", "H8", 0),
        ship("green-2", "green", "K5", 0),
        ship("green-3", "green", "L8", 0),
        ship("green-4", "green", "C3", 0),
        ship("green-5", "green", "F3", 0),
      ],
    });

    const result = runEndOfTurn(state);

    expect(result.effects).toContainEqual({
      type: "energy-collected",
      side: "green",
      amount: 5,
      newTotal: 5,
      squares: [
        squareFromName("C3"),
        squareFromName("F3"),
        squareFromName("K5"),
        squareFromName("H8"),
        squareFromName("L8"),
      ],
    });
    expect(result.state.energy).toEqual({ green: 5, red: 0 });
  });

  it("pays for a node whose countdown runs out at the end of this very turn (before step 3 ticks)", () => {
    const state = buildState({
      sideToMove: "green",
      nodes: { H8: ["charged", 1] },
      // A second green ship on a plain square, free of any node, so green
      // is not all-trapped once H8 depletes and step 7's relief does not
      // fire — this test is about step 2's collection, not the relief.
      ships: [
        ship("green-1", "green", "H8", 0),
        ship("green-2", "green", "F8"),
      ],
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
    expect(result.state.nodes.H8.state).toBe("depleted");
  });

  it("collects energy for a node held regardless of the holding ship's own power (§4.1: holding a node no longer touches it)", () => {
    const state = buildState({
      sideToMove: "green",
      nodes: { H8: ["charged", 5] },
      ships: [ship("green-1", "green", "H8", 0)],
    });

    const result = runEndOfTurn(state);

    expect(result.effects).toContainEqual({
      type: "energy-collected",
      side: "green",
      amount: 1,
      newTotal: 1,
      squares: [squareFromName("H8")],
    });
    const ship1 = result.state.ships.find((s) => s.id === "green-1");
    expect(ship1?.power).toBe(0);
  });

  it("pays this side nothing for a node held by the opponent", () => {
    const state = buildState({
      sideToMove: "green",
      nodes: { H8: ["charged", 5] },
      ships: [ship("red-1", "red", "H8", 3)],
    });

    const result = runEndOfTurn(state);

    expect(
      result.effects.some((effect) => effect.type === "energy-collected"),
    ).toBe(false);
    expect(result.state.energy).toEqual({ green: 0, red: 0 });
  });

  it("never lowers a total: standing on several depleted nodes costs nothing", () => {
    const state = {
      ...buildState({
        sideToMove: "green",
        nodes: {
          H8: ["depleted", 0],
          K5: ["depleted", 0],
          L8: ["depleted", 0],
          D8: ["depleted", 0],
        },
        ships: [
          ship("green-1", "green", "H8", 0),
          ship("green-2", "green", "K5", 0),
          ship("green-3", "green", "L8", 0),
          ship("green-4", "green", "D8", 0),
        ],
      }),
      energy: { green: 3, red: 7 },
    };

    const result = runEndOfTurn(state);

    expect(result.state.energy.green).toBeGreaterThanOrEqual(3);
    expect(result.state.energy.red).toBeGreaterThanOrEqual(7);
    for (const effect of result.effects) {
      if (effect.type === "energy-collected") {
        expect(effect.newTotal).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe("runEndOfTurn — a passed ply still settles both directions in full (§8.6 runs in full for a pass)", () => {
  it("pays the side that passes while standing on a charged node, through applyPassGuard", () => {
    // green-1 holds K5, a charged node, so it has no attack at all (§7);
    // boxed in for movement by an enemy on each of its eight neighbours,
    // affordable at 1 power, it has no legal move either — so it passes,
    // but §8.6 still runs in full for that passed turn, and green is still
    // standing on the node.
    const state = buildState({
      sideToMove: "green",
      nodes: { K5: ["charged", 5] },
      ships: [
        ship("green-1", "green", "K5", 1),
        ship("red-1", "red", "J4"),
        ship("red-2", "red", "K4"),
        ship("red-3", "red", "L4"),
        ship("red-4", "red", "J5"),
        ship("red-5", "red", "L5"),
        ship("red-6", "red", "J6"),
        ship("red-7", "red", "K6"),
        ship("red-8", "red", "L6"),
      ],
    });

    const result = applyPassGuard(state);

    expect(result.effect?.type).toBe("ply-passed");
    // Holding a charged node no longer costs power (§4.1), so green-1's
    // power is untouched by the pass; only the energy collection fires.
    expect(result.effect?.endOfTurn).toEqual([
      {
        type: "energy-collected",
        side: "green",
        amount: 1,
        newTotal: 1,
        squares: [squareFromName("K5")],
      },
    ]);
    expect(result.state.energy).toEqual({ green: 1, red: 0 });
    const passedShip = result.state.ships.find((s) => s.id === "green-1");
    expect(passedShip?.power).toBe(1);
  });

  it("costs the side that passes nothing while standing on a depleted node, through applyPassGuard", () => {
    const state = {
      ...buildState({
        sideToMove: "green",
        nodes: { K5: ["depleted", 0] },
        ships: [ship("green-1", "green", "K5", 1)],
      }),
      energy: { green: 5, red: 0 },
    };

    const result = applyPassGuard(state);

    expect(result.effect?.type).toBe("ply-passed");
    expect(
      result.effect?.endOfTurn.some(
        (effect) =>
          effect.type === "energy-collected" || effect.type === "power-gained",
      ),
    ).toBe(false);
    expect(result.state.energy).toEqual({ green: 5, red: 0 });
  });
});

describe("runEndOfTurn — a quiet board does nothing at all (§8.1, §8.3)", () => {
  it("leaves the opening board's charged nodes at baseline, charges and depletes nothing, and never touches the seed, across many plies with nobody moving", () => {
    const SEEDS = [20260828, 20260829, 20260830, 20260831, 20260832];
    const PLIES_TO_RUN = 60;

    for (const seed of SEEDS) {
      const opening = startingGameState(seed, {
        lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
      });
      const chargedNames = Object.keys(opening.nodes).filter(
        (name) => opening.nodes[name]?.state === "charged",
      );
      let state = opening;

      for (let ply = 1; ply <= PLIES_TO_RUN; ply++) {
        const result = runEndOfTurn(state);
        // No ship stands on any of them, so none ever starts a countdown,
        // and with nothing depleted there is nothing to charge from the
        // queue either — the only thing left to happen is the queue's own
        // silent rotation (§8.2), which is not this story's concern and
        // raises no effect and moves no seed.
        expect(result.effects).toEqual([]);
        for (const name of chargedNames) {
          expect(result.state.nodes[name]).toEqual({
            state: "charged",
            level: 0,
          });
        }
        expect(result.state.randomSeed).toBe(opening.randomSeed);
        state = { ...result.state, plyNumber: result.state.plyNumber + 1 };
      }
    }
  });
});
