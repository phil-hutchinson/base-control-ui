import { describe, expect, it } from "vitest";
import { PLANETS, isPlanet } from "./planets";
import { squareFromName, squareName } from "./board";
import { legalTargets } from "./combat";
import type { ShipId } from "./fleet";
import {
  ACTIONS_PER_PLY,
  type GameState,
  type Ship,
  type NodeStatus,
  startingGameState,
} from "./gameState";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "./gameLength";
import {
  applyAttack,
  applyMove,
  applyOutOfTimePass,
  applyPassGuard,
  assertFightInvariants,
} from "./ply";
import { MAX_POWER, type PowerLevel } from "./power";
import { drawIndex } from "./random";
import { TOP_NODE_PRIORITY, rotatePriority } from "./nodeQueue";
import {
  DEFAULT_CHARGED_NODE_COUNT,
  type ChargedNodeCount,
  type NodeState,
} from "./nodes";
import { CHARGED_COUNTDOWN_PLIES, EXIT_COUNTDOWN_PLIES } from "./countdown";

function ship(
  id: ShipId,
  side: "green" | "red",
  square: string,
  power: PowerLevel = 4,
): Ship {
  return { id, side, square: squareFromName(square), power };
}

function nodeStatuses(
  states: Readonly<Record<string, NodeState | readonly [NodeState, number]>>,
): Record<string, NodeStatus> {
  return Object.fromEntries(
    Object.entries(states).map(([name, entry]) => {
      const [state, level] = Array.isArray(entry) ? entry : [entry, 0];
      return [name, { state, level }];
    }),
  );
}

function buildState(config: {
  ships: readonly Ship[];
  sideToMove?: "green" | "red";
  actionsRemaining?: number;
  actedThisPly?: readonly ShipId[];
  nodes?: Readonly<Record<string, NodeState | readonly [NodeState, number]>>;
  plyNumber?: number;
  lengthInRounds?: number;
  chargedNodeCount?: ChargedNodeCount;
  energy?: { green: number; red: number };
  outOfTime?: { green: boolean; red: boolean };
}): GameState {
  return {
    ships: config.ships,
    nodes: nodeStatuses(config.nodes ?? {}),
    sideToMove: config.sideToMove ?? "green",
    actionsRemaining: config.actionsRemaining ?? ACTIONS_PER_PLY,
    actedThisPly: config.actedThisPly ?? [],
    plyNumber: config.plyNumber ?? 1,
    randomSeed: 1,
    openingSeed: 1,
    energy: config.energy ?? { green: 0, red: 0 },
    lengthInRounds: config.lengthInRounds ?? DEFAULT_GAME_LENGTH_ROUNDS,
    chargedNodeCount: config.chargedNodeCount ?? DEFAULT_CHARGED_NODE_COUNT,
    outOfTime: config.outOfTime ?? { green: false, red: false },
  };
}

describe("applyMove", () => {
  it("moves the ship and touches nothing else", () => {
    // E6 is an ordinary depleted node with plies to spare, so the one
    // end-of-turn sequence this move triggers spends only one of them and
    // cannot retire it — this test is about the move itself, not about the
    // board's own countdown, which spends a ply regardless of what a ship
    // does. Four charged nodes elsewhere hold the board at its target, so
    // charging has no shortfall to fill and nothing charges or refills.
    const state = buildState({
      ships: [ship("green-1", "green", "H8"), ship("red-1", "red", "A1")],
      nodes: {
        E6: ["depleted", 40],
        C3: ["charged", 0],
        F3: ["charged", 0],
        C6: ["charged", 0],
        F9: ["charged", 0],
      },
    });
    const before = structuredClone(state);

    const result = applyMove(state, "green-1", squareFromName("H9"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    const movedShip = result.state.ships.find((s) => s.id === "green-1");
    expect(movedShip?.square).toEqual(squareFromName("H9"));

    const other = result.state.ships.find((s) => s.id === "red-1");
    expect(other).toEqual(ship("red-1", "red", "A1"));

    // Its own countdown still spends a ply — its level still falls — so
    // only its state, and the set of node squares, are asserted here.
    expect(Object.keys(result.state.nodes).sort()).toEqual([
      "C3",
      "C6",
      "E6",
      "F3",
      "F9",
    ]);
    expect(result.state.nodes.E6.state).toBe("depleted");

    // The input state itself is never mutated.
    expect(state).toEqual(before);
  });

  it("a move's only effect on power is its own cost — landing on or flying over a planet adds nothing on top (rules.md §3.1, §6)", () => {
    // Recovery is the end-of-turn step's doing (§8.6 step 1), which this
    // move triggers as the ply's last action, not the move itself. Proving
    // the planet case through that step's own power-gained effect rules out
    // an instant refill: a refill would leave the ship at 6 (it is the only
    // green ship, so it charges alone, at 2 a turn) and raise no gain
    // effect at all, where the move only ever carries the ship's power —
    // its cost already paid — onto the planet for the end-of-turn step to
    // then act on. This move is a free orthogonal step, so its cost is 0.
    // Four charged nodes elsewhere hold the board at its target, so
    // charging has no shortfall to fill and the end-of-turn effects stay
    // just the power gain.
    const endsOnPlanet = buildState({
      ships: [ship("green-1", "green", "C6", 2), ship("red-1", "red", "O15")],
      nodes: {
        C3: ["charged", 0],
        E3: ["charged", 0],
        G3: ["charged", 0],
        I3: ["charged", 0],
      },
    });
    const endResult = applyMove(endsOnPlanet, "green-1", squareFromName("D6"));
    expect(endResult.outcome).toBe("applied");
    if (endResult.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(endResult.cost).toBe(0);
    const landedShip = endResult.state.ships.find((s) => s.id === "green-1");
    expect(landedShip?.power).toBe(4);
    expect(endResult.effects).toEqual([
      {
        type: "ply-ended",
        side: "green",
        sideToMove: "red",
        endOfTurn: [
          {
            type: "power-gained",
            shipId: "green-1",
            side: "green",
            square: squareFromName("D6"),
            power: 4,
            amount: 2,
          },
        ],
      },
    ]);

    // Flying over the same planet, D6, on the way to E6 is a two-square
    // orthogonal move, which costs 2 (rules.md §6) — the planet itself adds
    // nothing beyond that: the ship lands on E6, not a planet, carrying
    // exactly what it started with less that cost, with no gain effect.
    // Four charged nodes elsewhere again hold the board at its target.
    const passesOverPlanet = buildState({
      ships: [ship("green-1", "green", "C6", 4), ship("red-1", "red", "O15")],
      nodes: {
        C3: ["charged", 0],
        E3: ["charged", 0],
        G3: ["charged", 0],
        I3: ["charged", 0],
      },
    });
    const passResult = applyMove(
      passesOverPlanet,
      "green-1",
      squareFromName("E6"),
    );
    expect(passResult.outcome).toBe("applied");
    if (passResult.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(passResult.cost).toBe(2);
    const flownShip = passResult.state.ships.find((s) => s.id === "green-1");
    expect(flownShip?.power).toBe(2);
    expect(passResult.effects).toEqual([
      { type: "ply-ended", side: "green", sideToMove: "red", endOfTurn: [] },
    ]);
  });

  it("landing on a charged node with no countdown starts one (rules.md §8.3)", () => {
    // A ship may only ever end a move on a charged node (rules.md §6) — an
    // inactive or depleted destination is refused before it can be reached.
    // red-1 gives red a legal move, so applyPassGuard does not immediately
    // run a second end-of-turn sequence for a passed red ply — this checks
    // exactly the state green's own move produces, nothing beyond it.
    const state = buildState({
      ships: [ship("green-1", "green", "H8"), ship("red-1", "red", "A1")],
      nodes: { J8: ["charged", 0] },
      plyNumber: 5,
    });

    const result = applyMove(state, "green-1", squareFromName("J8"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    // The countdown starts at CHARGED_COUNTDOWN_PLIES as the move resolves,
    // and this same call's own end-of-turn sequence spends its first ply.
    expect(result.state.nodes.J8).toEqual({
      state: "charged",
      level: CHARGED_COUNTDOWN_PLIES - 1,
    });
    const movedShip = result.state.ships.find((s) => s.id === "green-1");
    expect(movedShip?.square).toEqual(squareFromName("J8"));
  });

  it("flying over an inactive node without stopping leaves it inactive (rules.md §8.2)", () => {
    // Four charged nodes elsewhere hold the board at its target, so
    // charging has no shortfall to fill and never considers I8 — nothing
    // about the end-of-turn sequence this move triggers can charge it. The
    // L from H8 to J9 turns through I8 (its orthogonal corner) without
    // stopping there (rules.md §6). I8's priority still rotates as normal,
    // since nothing charged this turn — that is the ordinary end-of-turn
    // sequence's own doing, not something the move itself causes. A red
    // ship far away, with a legal move of its own, keeps red from
    // auto-passing and running a second end-of-turn sequence of its own.
    const state = buildState({
      chargedNodeCount: 4,
      ships: [ship("green-1", "green", "H8"), ship("red-1", "red", "O15")],
      nodes: {
        I8: ["inactive", TOP_NODE_PRIORITY],
        C3: ["charged", 0],
        F3: ["charged", 0],
        C6: ["charged", 0],
        F6: ["charged", 0],
      },
      plyNumber: 3,
    });

    const result = applyMove(state, "green-1", squareFromName("J9"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(result.state.nodes.I8).toEqual({
      state: "inactive",
      level: rotatePriority(TOP_NODE_PRIORITY),
    });
    const movedShip = result.state.ships.find((s) => s.id === "green-1");
    expect(movedShip?.square).toEqual(squareFromName("J9"));
  });

  it("leaves the node set and every node's state unchanged when a move touches no node", () => {
    // E6 is an ordinary depleted node with plies to spare, so the one
    // end-of-turn sequence this move triggers spends only one of them and
    // cannot retire it — the "unchanged" under test here is about the move
    // itself, not about the board's own countdown, which spends a ply
    // regardless of what a ship does (see endOfTurn.test.ts). Four charged
    // nodes elsewhere hold the board at its target, so charging has no
    // shortfall to fill and nothing charges or refills.
    const state = buildState({
      ships: [ship("green-1", "green", "H8")],
      nodes: {
        E6: ["depleted", 40],
        C3: ["charged", 0],
        F3: ["charged", 0],
        C6: ["charged", 0],
        F9: ["charged", 0],
      },
    });

    const result = applyMove(state, "green-1", squareFromName("H9"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    // Its own per-turn clock still runs, so only its state, and the set of
    // node squares, are asserted here rather than the whole record.
    expect(Object.keys(result.state.nodes).sort()).toEqual([
      "C3",
      "C6",
      "E6",
      "F3",
      "F9",
    ]);
    expect(result.state.nodes.E6.state).toBe("depleted");
  });

  it("refuses an illegal destination, leaving the state exactly as it went in", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8"), ship("green-2", "green", "H9")],
    });
    const before = structuredClone(state);

    const result = applyMove(state, "green-1", squareFromName("H9"));

    expect(result).toEqual({
      outcome: "refused",
      reason: "destination-occupied",
    });
    expect(state).toEqual(before);
  });

  it("gives green the first ply", () => {
    expect(startingGameState(1).sideToMove).toBe("green");
    expect(startingGameState(1).actionsRemaining).toBe(ACTIONS_PER_PLY);
  });

  it("spends the ply's one action before passing the turn, then clears the moved-this-ply marks", () => {
    // Four charged nodes elsewhere hold the board at its target, so
    // charging has no shortfall to fill and the end-of-turn effects stay
    // empty.
    const state = buildState({
      ships: [ship("green-1", "green", "H8"), ship("red-1", "red", "O15")],
      nodes: {
        C3: ["charged", 0],
        E3: ["charged", 0],
        G3: ["charged", 0],
        I3: ["charged", 0],
      },
    });

    const result = applyMove(state, "green-1", squareFromName("H9"));
    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(result.state.sideToMove).toBe("red");
    expect(result.state.actionsRemaining).toBe(ACTIONS_PER_PLY);
    expect(result.state.actedThisPly).toEqual([]);
    expect(result.state.plyNumber).toBe(2);
    expect(result.effects).toEqual([
      { type: "ply-ended", side: "green", sideToMove: "red", endOfTurn: [] },
    ]);
  });

  it("refuses a second move of a ship that has already acted this ply, but allows it again next ply", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8"), ship("green-2", "green", "A1")],
      actedThisPly: ["green-1"],
      actionsRemaining: 1,
    });

    const refused = applyMove(state, "green-1", squareFromName("H9"));
    expect(refused).toEqual({
      outcome: "refused",
      reason: "ship-already-acted",
    });

    // Green's next ply: its action is available again, nothing moved yet.
    const nextPly = buildState({
      ships: [ship("green-1", "green", "H8"), ship("green-2", "green", "A1")],
    });
    const allowedAgain = applyMove(nextPly, "green-1", squareFromName("H9"));
    expect(allowedAgain.outcome).toBe("applied");
  });

  it("refuses a move of a ship belonging to the side not to move", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8"), ship("red-1", "red", "A1")],
      sideToMove: "red",
    });

    const result = applyMove(state, "green-1", squareFromName("H9"));
    expect(result).toEqual({ outcome: "refused", reason: "not-your-ship" });
  });
});

describe("applyMove deducts the shape's cost (rules.md §6)", () => {
  it("deducts nothing for a one-square orthogonal step", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 2)],
    });

    const result = applyMove(state, "green-1", squareFromName("H9"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(result.cost).toBe(0);
    expect(result.powerAfter).toBe(2);
    expect(result.state.ships.find((s) => s.id === "green-1")?.power).toBe(2);
  });

  it("deducts 1 for a one-square diagonal step", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 2)],
    });

    const result = applyMove(state, "green-1", squareFromName("I9"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(result.cost).toBe(1);
    expect(result.powerAfter).toBe(1);
    expect(result.state.ships.find((s) => s.id === "green-1")?.power).toBe(1);
  });

  it("deducts 2 for a two-square orthogonal move", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 2)],
    });

    const result = applyMove(state, "green-1", squareFromName("H10"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(result.cost).toBe(2);
    expect(result.powerAfter).toBe(0);
  });

  it("deducts 2 for an L", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 2)],
    });

    const result = applyMove(state, "green-1", squareFromName("J9"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(result.cost).toBe(2);
    expect(result.powerAfter).toBe(0);
  });

  it("lets a full ship make three L moves and then refuses a fourth, while it can still step orthogonally forever", () => {
    let state = buildState({
      ships: [ship("green-1", "green", "H8", MAX_POWER)],
    });

    const lDestinations: readonly [string, string][] = [
      ["H8", "J9"],
      ["J9", "H10"],
      ["H10", "F9"],
    ];
    for (const [, to] of lDestinations) {
      const result = applyMove(state, "green-1", squareFromName(to));
      expect(result.outcome).toBe("applied");
      if (result.outcome !== "applied") {
        throw new Error("expected the L move to be applied");
      }
      expect(result.cost).toBe(2);
      state = {
        ...result.state,
        sideToMove: "green",
        actedThisPly: [],
        actionsRemaining: ACTIONS_PER_PLY,
      };
    }

    const ship1 = state.ships.find((s) => s.id === "green-1");
    expect(ship1?.power).toBe(0);

    const refusedL = applyMove(state, "green-1", squareFromName("D8"));
    expect(refusedL).toEqual({ outcome: "refused", reason: "cannot-afford" });

    const stillFreeStep = applyMove(state, "green-1", squareFromName("F10"));
    expect(stillFreeStep.outcome).toBe("applied");
    if (stillFreeStep.outcome !== "applied") {
      throw new Error("expected the free orthogonal step to be applied");
    }
    expect(stillFreeStep.cost).toBe(0);
  });
});

describe("applyAttack", () => {
  it.each([
    {
      label: "0 against 4",
      attackerPower: 0 as PowerLevel,
      defenderPower: 4 as PowerLevel,
    },
    {
      label: "2 against 2",
      attackerPower: 2 as PowerLevel,
      defenderPower: 2 as PowerLevel,
    },
    {
      label: "4 against 0",
      attackerPower: 4 as PowerLevel,
      defenderPower: 0 as PowerLevel,
    },
  ])(
    "an orthogonal jab costs the attacker nothing, and the attacker then gains its planet points as the same turn ends, leaving both squares empty ($label)",
    ({ attackerPower, defenderPower }) => {
      const state = buildState({
        ships: [
          ship("green-1", "green", "H8", attackerPower),
          ship("red-1", "red", "H9", defenderPower),
        ],
      });
      const before = structuredClone(state);

      const result = applyAttack(state, "green-1", squareFromName("H9"));

      expect(result.outcome).toBe("applied");
      if (result.outcome !== "applied") {
        throw new Error("expected the attack to be applied");
      }
      const attacker = result.state.ships.find((s) => s.id === "green-1");
      const defender = result.state.ships.find((s) => s.id === "red-1");
      // H8 to H9 is an orthogonal jab, which costs nothing (rules.md §6),
      // so the fight itself leaves the attacker's power exactly as it found
      // it (asserted below, from the fight-resolved snapshot's cost of 0)
      // and the defender's untouched, as always. The attack is this ply's
      // only action, though, so it also ends the ply — and the attacker
      // (the moving side) then gains on its planet under §8.6 step 1 if it
      // has anything left to gain, at the lone-charger rate of 2 since it
      // is the only green ship; the defender, not the moving side this ply,
      // does not.
      expect(attacker?.power).toBe(Math.min(attackerPower + 2, MAX_POWER));
      expect(defender?.power).toBe(defenderPower);
      expect(isPlanet(attacker!.square)).toBe(true);
      expect(isPlanet(defender!.square)).toBe(true);
      expect(squareName(attacker!.square)).not.toBe(
        squareName(defender!.square),
      );

      const occupiedSquareNames = result.state.ships.map((s) =>
        squareName(s.square),
      );
      expect(occupiedSquareNames).not.toContain("H8");
      expect(occupiedSquareNames).not.toContain("H9");

      expect(result.effects[0]).toEqual({
        type: "fight-resolved",
        attacker: {
          shipId: "green-1",
          side: "green",
          square: squareFromName("H8"),
          power: attackerPower,
        },
        defender: {
          shipId: "red-1",
          side: "red",
          square: squareFromName("H9"),
          power: defenderPower,
        },
        cost: 0,
        returns: [
          {
            shipId: "green-1",
            side: "green",
            from: squareFromName("H8"),
            to: attacker!.square,
          },
          {
            shipId: "red-1",
            side: "red",
            from: squareFromName("H9"),
            to: defender!.square,
          },
        ],
      });

      // The input state itself is never mutated.
      expect(state).toEqual(before);
    },
  );

  it("deducts the attacker's cost for a diagonal strike, leaving the defender's power exactly as it was", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 4), ship("red-1", "red", "I9", 3)],
    });

    const result = applyAttack(state, "green-1", squareFromName("I9"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    const attacker = result.state.ships.find((s) => s.id === "green-1");
    const defender = result.state.ships.find((s) => s.id === "red-1");
    // A diagonal jab costs 1 (rules.md §6). The attacker (the moving side)
    // then gains on its planet under §8.6 step 1 — it is the only green
    // ship, so it charges alone at 2 — leaving its power at 4 - 1 + 2 = 5;
    // the defender, never the moving side this ply, keeps exactly the 3 it
    // started with.
    expect(attacker?.power).toBe(5);
    expect(defender?.power).toBe(3);
    expect(result.effects[0]).toMatchObject({
      type: "fight-resolved",
      attacker: {
        shipId: "green-1",
        side: "green",
        square: squareFromName("H8"),
        power: 4,
      },
      defender: {
        shipId: "red-1",
        side: "red",
        square: squareFromName("I9"),
        power: 3,
      },
      cost: 1,
    });
  });

  it("draws the attacker's planet first, pinned to a stated seed", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 2), ship("red-1", "red", "H9", 2)],
    });

    // Both planets are empty before the fight, so the attacker's draw picks
    // from all twelve; the defender's draw is then made against the pool
    // with the attacker's planet removed.
    const [attackerIndex, seedAfterAttackerDraw] = drawIndex(
      state.randomSeed,
      PLANETS.length,
    );
    const attackerPlanetName = squareName(PLANETS[attackerIndex]);
    const defenderPool = PLANETS.filter(
      (square) => squareName(square) !== attackerPlanetName,
    );
    const [defenderIndex] = drawIndex(
      seedAfterAttackerDraw,
      defenderPool.length,
    );
    const defenderPlanetName = squareName(defenderPool[defenderIndex]);

    const result = applyAttack(state, "green-1", squareFromName("H9"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    expect(
      squareName(result.state.ships.find((s) => s.id === "green-1")!.square),
    ).toBe(attackerPlanetName);
    expect(
      squareName(result.state.ships.find((s) => s.id === "red-1")!.square),
    ).toBe(defenderPlanetName);
  });

  it("keeps the fleet the same size on each side, across a sequence of fights", () => {
    const state = buildState({
      ships: [
        ship("green-1", "green", "H8", 2),
        ship("green-2", "green", "A1", 3),
        ship("green-3", "green", "A3"),
        ship("green-4", "green", "A5"),
        ship("green-5", "green", "A7"),
        ship("green-6", "green", "A9"),
        ship("green-7", "green", "A11"),
        ship("red-1", "red", "H9", 3),
        ship("red-2", "red", "B1", 3),
        ship("red-3", "red", "B3"),
        ship("red-4", "red", "B5"),
        ship("red-5", "red", "B7"),
        ship("red-6", "red", "B9"),
        ship("red-7", "red", "B11"),
      ],
    });

    // Green's one action ends its ply, so the second fight is red's own
    // action on the following ply, not a second green action.
    const first = applyAttack(state, "green-1", squareFromName("H9"));
    expect(first.outcome).toBe("applied");
    if (first.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    expect(first.state.sideToMove).toBe("red");
    const countBySide = (s: GameState, side: "green" | "red") =>
      s.ships.filter((ship) => ship.side === side).length;
    expect(countBySide(first.state, "green")).toBe(7);
    expect(countBySide(first.state, "red")).toBe(7);

    const second = applyAttack(first.state, "red-2", squareFromName("A1"));
    expect(second.outcome).toBe("applied");
    if (second.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    expect(countBySide(second.state, "green")).toBe(7);
    expect(countBySide(second.state, "red")).toBe(7);
    expect(second.state.ships.length).toBe(14);
  });

  it("recomputes the return planet live: a planet an earlier ply's move vacated is one of the two a fight's ships land on", () => {
    // green-2 sits on the first planet, one of the two planets left empty
    // once green-2 moves off it (the second planet is the other); green-1
    // and red-1 are positioned for the fight the next ply brings.
    const [firstPlanetName, secondPlanetName] = PLANETS.map(squareName);
    const state = buildState({
      ships: [
        ship("green-2", "green", firstPlanetName, 0),
        ship("green-1", "green", "H9", 4),
        ship("red-1", "red", "H8", 1),
        ...PLANETS.filter(
          (square) =>
            ![firstPlanetName, secondPlanetName].includes(squareName(square)),
        ).map((square, index) =>
          ship(`planet-filler-${index}`, "red", squareName(square)),
        ),
      ],
    });

    const vacated = applyMove(state, "green-2", squareFromName("B2"));
    expect(vacated.outcome).toBe("applied");
    if (vacated.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(vacated.state.sideToMove).toBe("red");

    // The first and second planets are now the only empty planets, so the
    // fight's two returning ships must land there between them, whichever
    // seed drew them.
    const result = applyAttack(vacated.state, "red-1", squareFromName("H9"));
    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    const returnedSquareNames = new Set(
      ["green-1", "red-1"].map((id) =>
        squareName(result.state.ships.find((s) => s.id === id)!.square),
      ),
    );
    expect(returnedSquareNames).toEqual(
      new Set([firstPlanetName, secondPlanetName]),
    );
  });

  it("advances randomSeed exactly twice for the fight itself, and nothing further", () => {
    // Drawing the second return from the same seed the first draw used
    // would silently break replay: the pool is just one square shorter, so
    // the draw still looks legal. Four charged nodes elsewhere hold the
    // board at its target, so charging has no shortfall to fill, and none
    // of them carries a countdown, so nothing in the end-of-turn sequence
    // draws from the seed beyond the fight itself.
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 2), ship("red-1", "red", "H9", 2)],
      nodes: {
        C3: ["charged", 0],
        E3: ["charged", 0],
        G3: ["charged", 0],
        I3: ["charged", 0],
      },
    });
    const result = applyAttack(state, "green-1", squareFromName("H9"));
    if (result.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    // Both planets start empty, so the attacker's draw picks from all
    // twelve and the defender's draw — against the state that already
    // holds the attacker — picks from the remaining eleven.
    const [, seedAfterAttackerDraw] = drawIndex(
      state.randomSeed,
      PLANETS.length,
    );
    const [, seedAfterDefenderDraw] = drawIndex(
      seedAfterAttackerDraw,
      PLANETS.length - 1,
    );
    expect(result.state.randomSeed).toBe(seedAfterDefenderDraw);
  });

  it("places both ships on different planets, whatever the seed, when exactly two planets are empty", () => {
    const emptyPlanetNames = PLANETS.slice(0, 2).map(squareName);
    const planetOccupants = PLANETS.filter(
      (square) => !emptyPlanetNames.includes(squareName(square)),
    ).map((square, index) =>
      ship(`planet-filler-${index}`, "red", squareName(square)),
    );

    for (const seed of [1, 2, 3, 42, 999]) {
      const state: GameState = {
        ...buildState({
          ships: [
            ship("green-1", "green", "H8", 2),
            ship("red-1", "red", "H9", 2),
            ...planetOccupants,
          ],
        }),
        randomSeed: seed,
      };
      const result = applyAttack(state, "green-1", squareFromName("H9"));
      if (result.outcome !== "applied") {
        throw new Error("expected the attack to be applied");
      }
      const attackerSquareName = squareName(
        result.state.ships.find((s) => s.id === "green-1")!.square,
      );
      const defenderSquareName = squareName(
        result.state.ships.find((s) => s.id === "red-1")!.square,
      );
      expect(new Set([attackerSquareName, defenderSquareName])).toEqual(
        new Set(emptyPlanetNames),
      );
    }
  });

  it("never lands a fight's two ships on the same planet, swept over many chained seeds with several planets empty", () => {
    const emptyPlanetNames = PLANETS.slice(0, 5).map(squareName);
    const planetOccupants = PLANETS.filter(
      (square) => !emptyPlanetNames.includes(squareName(square)),
    ).map((square, index) =>
      ship(`planet-filler-${index}`, "red", squareName(square)),
    );

    let seed = 7;
    for (let round = 0; round < 200; round++) {
      const state: GameState = {
        ...buildState({
          ships: [
            ship("green-1", "green", "H8", 2),
            ship("red-1", "red", "H9", 2),
            ...planetOccupants,
          ],
        }),
        randomSeed: seed,
      };
      const result = applyAttack(state, "green-1", squareFromName("H9"));
      if (result.outcome !== "applied") {
        throw new Error("expected the attack to be applied");
      }
      const attacker = result.state.ships.find((s) => s.id === "green-1")!;
      const defender = result.state.ships.find((s) => s.id === "red-1")!;
      expect(squareName(attacker.square)).not.toBe(squareName(defender.square));
      seed = result.state.randomSeed;
    }
  });

  it("refuses a second attack attempt by a ship that has already acted this ply, even with a fresh target in range", () => {
    // Built directly rather than played into (rules.md §5): one action
    // per turn always ends the ply, so a ship that has already acted is
    // never seen again — by its own side — until the side's next turn.
    // This stands for the moment right after green-1's fight at H9.
    const state = buildState({
      ships: [ship("green-1", "green", "H9", 2), ship("red-2", "red", "G9", 4)],
      actedThisPly: ["green-1"],
    });

    const attempt = applyAttack(state, "green-1", squareFromName("G9"));

    expect(attempt).toEqual({
      outcome: "refused",
      reason: "ship-already-acted",
    });
  });

  it("refuses a move by a ship that has already acted this ply", () => {
    // Built directly rather than played into (rules.md §5).
    const state = buildState({
      ships: [ship("green-1", "green", "H9", 3)],
      actedThisPly: ["green-1"],
    });

    const attempt = applyMove(state, "green-1", squareFromName("H10"));

    expect(attempt).toEqual({
      outcome: "refused",
      reason: "ship-already-acted",
    });
  });

  it("refuses an attack by a ship that has already acted this ply", () => {
    // Built directly rather than played into (rules.md §5).
    const state = buildState({
      ships: [ship("green-1", "green", "H9", 4), ship("red-1", "red", "H10")],
      actedThisPly: ["green-1"],
    });

    const attempt = applyAttack(state, "green-1", squareFromName("H10"));

    expect(attempt).toEqual({
      outcome: "refused",
      reason: "ship-already-acted",
    });
  });

  it("lets a ship on each side attack in turn, one action per round", () => {
    const state = buildState({
      ships: [
        ship("green-1", "green", "H8", 1),
        ship("green-2", "green", "A1", 4),
        ship("red-1", "red", "H9", 3),
        ship("red-2", "red", "B1", 4),
      ],
    });

    const first = applyAttack(state, "green-1", squareFromName("H9"));
    expect(first.outcome).toBe("applied");
    if (first.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    expect(first.state.sideToMove).toBe("red");

    const second = applyAttack(first.state, "red-2", squareFromName("A1"));
    expect(second.outcome).toBe("applied");
  });

  it("lets one side move and the other attack, in either order, as a round's two actions", () => {
    const moveThenAttack = buildState({
      ships: [
        ship("green-1", "green", "H8", 1),
        ship("green-2", "green", "A1", 4),
        ship("red-1", "red", "B1", 4),
      ],
    });
    const firstMove = applyMove(
      moveThenAttack,
      "green-1",
      squareFromName("H9"),
    );
    expect(firstMove.outcome).toBe("applied");
    if (firstMove.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(firstMove.state.sideToMove).toBe("red");
    const secondAttack = applyAttack(
      firstMove.state,
      "red-1",
      squareFromName("A1"),
    );
    expect(secondAttack.outcome).toBe("applied");

    const attackThenMove = buildState({
      ships: [
        ship("green-1", "green", "H8", 1),
        ship("red-1", "red", "H9", 3),
        ship("red-2", "red", "B1", 4),
      ],
    });
    const firstAttack = applyAttack(
      attackThenMove,
      "green-1",
      squareFromName("H9"),
    );
    expect(firstAttack.outcome).toBe("applied");
    if (firstAttack.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    expect(firstAttack.state.sideToMove).toBe("red");
    const secondMove = applyMove(
      firstAttack.state,
      "red-2",
      squareFromName("B2"),
    );
    expect(secondMove.outcome).toBe("applied");
  });

  it("refuses both a move and an attack for a ship that has already acted this ply", () => {
    // Built directly rather than played into (rules.md §5).
    const state = buildState({
      ships: [
        ship("green-1", "green", "H9", 1),
        ship("red-1", "red", "H10", 3),
      ],
      actedThisPly: ["green-1"],
    });

    const move = applyMove(state, "green-1", squareFromName("G9"));
    expect(move).toEqual({
      outcome: "refused",
      reason: "ship-already-acted",
    });

    const attack = applyAttack(state, "green-1", squareFromName("H10"));
    expect(attack).toEqual({
      outcome: "refused",
      reason: "ship-already-acted",
    });
  });

  it("refuses an attack on a ship trapped on a depleted node, which stays exactly where it stands (§7)", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "K8", 4), ship("red-1", "red", "K9", 2)],
      nodes: { K8: "depleted" },
      sideToMove: "red",
      actionsRemaining: 1,
    });

    // red-1 reaches K8 and can afford the shot, but the trapped ship is
    // never offered as a target in the first place (rules.md §7), not only
    // refused when named directly.
    expect(legalTargets(state, "red-1")).toEqual([]);

    const result = applyAttack(state, "red-1", squareFromName("K8"));

    expect(result).toEqual({
      outcome: "refused",
      reason: "target-on-depleted-node",
    });
  });

  it("still blocks an enemy's path even though it is trapped and has no action of its own (rules.md §7)", () => {
    // green-1's own reach never matters here — it is red-1, sitting trapped
    // on the depleted node at D4, that has to still be an obstacle: a
    // trapped ship holds its square exactly as a charged-node holder does,
    // and blocks a path through it just the same.
    const state = buildState({
      ships: [ship("green-1", "green", "D3", 4), ship("red-1", "red", "D4")],
      nodes: { D4: "depleted" },
    });

    const result = applyMove(state, "green-1", squareFromName("D5"));

    expect(result).toEqual({
      outcome: "refused",
      reason: "path-blocked",
    });
  });

  it("marks the attacker as having acted, even though it ends the action on a planet itself", () => {
    // Four charged nodes elsewhere hold the board at its target, so
    // charging has no shortfall to fill and the end-of-turn effects stay
    // just the power gain.
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 2), ship("red-1", "red", "H9", 2)],
      nodes: {
        C3: ["charged", 0],
        E3: ["charged", 0],
        G3: ["charged", 0],
        I3: ["charged", 0],
      },
    });

    const result = applyAttack(state, "green-1", squareFromName("H9"));
    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    const returnedShip = result.state.ships.find((s) => s.id === "green-1");
    expect(isPlanet(returnedShip!.square)).toBe(true);
    // Its one action is spent even though it ends on a planet itself, so
    // the ply ends here rather than waiting for a further action — and
    // that end-of-turn step also gives the returned ship power on its
    // planet (§8.6 step 1, §3.1), at the lone-charger rate of 2 since it is
    // the only green ship and it is the moving side.
    expect(result.effects).toContainEqual({
      type: "ply-ended",
      side: "green",
      sideToMove: "red",
      endOfTurn: [
        {
          type: "power-gained",
          shipId: "green-1",
          side: "green",
          square: returnedShip!.square,
          power: 4,
          amount: 2,
        },
      ],
    });

    // Built directly rather than played into (rules.md §5): this stands
    // for the moment right after the fight above, before the tail clears
    // actedThisPly for the next ply — a further attempt by the same ship
    // is still refused.
    const alreadyActed = buildState({
      ships: [ship("green-1", "green", "H15", 4)],
      actedThisPly: ["green-1"],
    });
    const secondAttempt = applyMove(
      alreadyActed,
      "green-1",
      squareFromName("H12"),
    );
    expect(secondAttempt).toEqual({
      outcome: "refused",
      reason: "ship-already-acted",
    });
  });

  it("refuses an illegal attack, leaving the state exactly as it went in", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 1), ship("red-1", "red", "A1")],
    });
    const before = structuredClone(state);

    const result = applyAttack(state, "green-1", squareFromName("A1"));

    expect(result).toEqual({
      outcome: "refused",
      reason: "target-out-of-range",
    });
    expect(state).toEqual(before);
  });
});

describe("an action that never lands on or leaves a charged node touches no node's state (rules.md §8.3, §8.6)", () => {
  it("leaves every node's state as it was across a sequence of moves and a fight", () => {
    // K5 is a charged node with no ship on it, so it carries no countdown
    // and neither its state nor its level moves at all (§8.3). H8 and I8
    // are both depleted, and untouched by anything below — a ship on
    // either would be trapped and could neither attack nor be attacked
    // (rules.md §7), so the fight targets red-1 on the ordinary square F8
    // instead. Both depleted nodes started with plies to spare, so three
    // end-of-turn sequences cannot retire either, and only their *state* is
    // asserted, not their exact level. No node here is ever inactive, so
    // charging has no queue to charge from, and with K5 still charged the
    // shortfall never reaches four — nothing charges across any of the
    // three sequences.
    const state = buildState({
      ships: [
        ship("green-1", "green", "G8", 0),
        ship("green-2", "green", "A5", 4),
        ship("red-1", "red", "F8", 4),
        ship("red-2", "red", "O5", 4),
      ],
      nodes: {
        H8: ["depleted", 50],
        I8: ["depleted", 50],
        K5: ["charged", 0],
      },
    });

    function expectNodesUnaffected(afterState: GameState): void {
      expect(afterState.nodes.I8.state).toBe("depleted");
      expect(afterState.nodes.H8.state).toBe("depleted");
      expect(afterState.nodes.K5.state).toBe("charged");
    }

    // Green's whole ply: an ordinary move touching no node.
    const afterGreenMove = applyMove(state, "green-2", squareFromName("B5"));
    expect(afterGreenMove.outcome).toBe("applied");
    if (afterGreenMove.outcome !== "applied") {
      throw new Error("expected green's move to be applied");
    }
    expectNodesUnaffected(afterGreenMove.state);

    // Red's whole ply: another ordinary move, so play returns to green.
    const afterRedMove = applyMove(
      afterGreenMove.state,
      "red-2",
      squareFromName("N5"),
    );
    expect(afterRedMove.outcome).toBe("applied");
    if (afterRedMove.outcome !== "applied") {
      throw new Error("expected red's move to be applied");
    }
    expectNodesUnaffected(afterRedMove.state);

    // Green's next ply: a fight off the nodes entirely, sending both ships
    // home, touching neither depleted node nor the charged one.
    const afterAttack = applyAttack(
      afterRedMove.state,
      "green-1",
      squareFromName("F8"),
    );
    expect(afterAttack.outcome).toBe("applied");
    if (afterAttack.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    const attacker = afterAttack.state.ships.find((s) => s.id === "green-1");
    expect(isPlanet(attacker!.square)).toBe(true);
    expectNodesUnaffected(afterAttack.state);
  });
});

describe("assertFightInvariants (rules.md §7)", () => {
  it("throws when an uninvolved ship's square changed", () => {
    const before = buildState({
      ships: [
        ship("green-1", "green", "H8", 1),
        ship("green-2", "green", "A1", 2),
        ship("red-1", "red", "H9", 3),
      ],
    });
    const after: GameState = {
      ...before,
      ships: before.ships.map((s) =>
        s.id === "green-2" ? { ...s, square: squareFromName("B2") } : s,
      ),
    };

    expect(() =>
      assertFightInvariants(before, after, "green-1", 0, new Set(["red-1"])),
    ).toThrow(RangeError);
  });

  it("throws when a returned ship did not end on a planet square", () => {
    const before = buildState({
      ships: [ship("green-1", "green", "H8", 1), ship("red-1", "red", "H9", 3)],
    });
    const after: GameState = {
      ...before,
      ships: before.ships.map((s) =>
        s.id === "red-1" ? { ...s, square: squareFromName("H10") } : s,
      ),
    };

    expect(() =>
      assertFightInvariants(before, after, "green-1", 0, new Set(["red-1"])),
    ).toThrow(RangeError);
  });

  it("throws when two returned ships end on the same planet", () => {
    const before = buildState({
      ships: [ship("green-1", "green", "H8", 2), ship("red-1", "red", "H9", 2)],
    });
    const after: GameState = {
      ...before,
      ships: before.ships.map((s) =>
        s.id === "green-1" || s.id === "red-1"
          ? { ...s, square: squareFromName("H15") }
          : s,
      ),
    };

    expect(() =>
      assertFightInvariants(
        before,
        after,
        "green-1",
        0,
        new Set(["green-1", "red-1"]),
      ),
    ).toThrow(RangeError);
  });

  it("throws when a returned ship lands on a planet that held a ship before the fight", () => {
    const before = buildState({
      ships: [
        ship("green-1", "green", "H8", 1),
        ship("red-1", "red", "H9", 3),
        ship("red-2", "red", "H15", 4),
      ],
    });
    const after: GameState = {
      ...before,
      ships: before.ships.map((s) =>
        s.id === "red-1" ? { ...s, square: squareFromName("H15") } : s,
      ),
    };

    expect(() =>
      assertFightInvariants(before, after, "green-1", 0, new Set(["red-1"])),
    ).toThrow(RangeError);
  });

  it("throws when the defender's power moved at all", () => {
    const before = buildState({
      ships: [ship("green-1", "green", "H8", 1), ship("red-1", "red", "H9", 3)],
    });
    const after: GameState = {
      ...before,
      ships: before.ships.map((s) =>
        s.id === "red-1"
          ? { ...s, square: squareFromName("H15"), power: 4 }
          : s,
      ),
    };

    expect(() =>
      assertFightInvariants(before, after, "green-1", 0, new Set(["red-1"])),
    ).toThrow(RangeError);
  });

  it("throws when the attacker's power did not fall by exactly the cost of the shape it struck down", () => {
    const before = buildState({
      ships: [ship("green-1", "green", "H8", 4), ship("red-1", "red", "I9", 3)],
    });
    // A diagonal strike costs 1 (rules.md §6), so the attacker should land
    // on its planet at 3, not unchanged at 4. D6 and K6 are both planets
    // (rules.md §3.1), held by neither ship before the fight.
    const after: GameState = {
      ...before,
      ships: before.ships.map((s) => {
        if (s.id === "green-1") {
          return { ...s, square: squareFromName("D6") };
        }
        if (s.id === "red-1") {
          return { ...s, square: squareFromName("K6") };
        }
        return s;
      }),
    };

    expect(() =>
      assertFightInvariants(
        before,
        after,
        "green-1",
        1,
        new Set(["green-1", "red-1"]),
      ),
    ).toThrow(RangeError);
  });

  it("still throws when a node's state changes at all — an attack never changes one (rules.md §8.6)", () => {
    const before = buildState({
      ships: [ship("green-1", "green", "H8", 1), ship("red-1", "red", "H9", 3)],
      nodes: { H8: ["charged", 10] },
    });
    const after: GameState = {
      ...before,
      nodes: { ...before.nodes, H8: { state: "depleted", level: 10 } },
    };

    expect(() =>
      assertFightInvariants(before, after, "green-1", 0, new Set(["red-1"])),
    ).toThrow(RangeError);
  });
});

describe("applyPassGuard", () => {
  it("does not pass the ply when the side to move has no legal move but has a legal attack", () => {
    // green-1 on A1 (0 power, not a planet) is boxed in for movement — its
    // only two on-board orthogonal squares, A2 and B1, are both occupied —
    // but B1 is a legal attack target, so the side still has an action.
    const state = buildState({
      ships: [
        ship("green-1", "green", "A1", 0),
        ship("red-1", "red", "B1"),
        ship("red-2", "red", "A2"),
      ],
    });

    const result = applyPassGuard(state);

    expect(result.state).toEqual(state);
    expect(result.effect).toBeUndefined();
  });

  it("passes the ply when its one ship with a nearby target has already acted", () => {
    // green-1 is boxed in for movement exactly as above, and red-1 stands
    // right next to it — a legal attack target, if green-1 had not already
    // spent its one action this ply. If `sideToMoveHasLegalAction` did not
    // consult the already-acted check, it would still see this as a legal
    // attack and the guard would never pass.
    const state = buildState({
      ships: [
        ship("green-1", "green", "A1", 0),
        ship("red-1", "red", "B1"),
        ship("red-2", "red", "A2"),
      ],
      // Four charged nodes elsewhere hold the board at its target, so
      // charging has no shortfall to fill and the end-of-turn effects stay
      // empty.
      nodes: {
        H8: ["charged", 0],
        K8: ["charged", 0],
        H12: ["charged", 0],
        K12: ["charged", 0],
      },
      actedThisPly: ["green-1"],
      actionsRemaining: 1,
    });

    const result = applyPassGuard(state);

    expect(result.state.sideToMove).toBe("red");
    expect(result.effect).toEqual({
      type: "ply-passed",
      side: "green",
      sideToMove: "red",
      reason: "no-legal-action",
      endOfTurn: [],
    });
  });

  it("passes the ply when the side to move has no legal action at all", () => {
    // green-1 is on the D6 planet, so §3.1 forbids it to attack regardless
    // of what stands next to it, and every square it could otherwise reach —
    // C6, E6, D5 and D7, its four orthogonal neighbours, its only reach at
    // 0 power — is occupied. Four charged nodes elsewhere hold the board
    // at its target, so charging has no shortfall to fill and the
    // end-of-turn effects stay just the power gain.
    const state = buildState({
      ships: [
        ship("green-1", "green", "D6", 0),
        ship("red-1", "red", "C6"),
        ship("red-2", "red", "E6"),
        ship("red-3", "red", "D5"),
        ship("red-4", "red", "D7"),
      ],
      nodes: {
        H8: ["charged", 0],
        K8: ["charged", 0],
        H12: ["charged", 0],
        K12: ["charged", 0],
      },
    });

    const result = applyPassGuard(state);

    expect(result.state.sideToMove).toBe("red");
    expect(result.state.actionsRemaining).toBe(ACTIONS_PER_PLY);
    expect(result.state.actedThisPly).toEqual([]);
    expect(result.state.plyNumber).toBe(2);
    // The pass still runs the end-of-turn sequence in full, and green-1 is
    // sitting on its planet — it is the only green ship, so it charges
    // alone there, at the lone-charger rate of 2 (§8.6 step 1, §3.1).
    expect(result.effect).toEqual({
      type: "ply-passed",
      side: "green",
      sideToMove: "red",
      reason: "no-legal-action",
      endOfTurn: [
        {
          type: "power-gained",
          shipId: "green-1",
          side: "green",
          square: squareFromName("D6"),
          power: 2,
          amount: 2,
        },
      ],
    });
  });

  it("passes the ply, and runs the end-of-turn sequence in full, when the side's only ship holds a charged node and has no legal move (rules.md §5, §7)", () => {
    // Without the charged-node protection every one of green-1's eight
    // neighbours would be a legal attack (as in the plain "eight
    // neighbours" case in combat.test.ts); with it, the side has no legal
    // action, so it passes. Holding the node costs it no power any more
    // (§4.1) — only the energy still comes due — at the end of the turn
    // the pass still runs.
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
      nodes: { H8: "charged" },
    });

    const result = applyPassGuard(state);

    expect(result.state.sideToMove).toBe("red");
    const winner = result.state.ships.find((s) => s.id === "green-1");
    expect(winner?.power).toBe(1);
    expect(result.effect).toEqual({
      type: "ply-passed",
      side: "green",
      sideToMove: "red",
      reason: "no-legal-action",
      endOfTurn: [
        {
          type: "energy-collected",
          side: "green",
          amount: 1,
          newTotal: 1,
          squares: [squareFromName("H8")],
        },
      ],
    });
  });

  it("passes the ply when every one of the side's ships is trapped and §8.6 step 7 cannot relieve any of them (rules.md §5, §8.6)", () => {
    // green-1 is trapped on the depleted node at A1 and, even if freed,
    // would have nowhere to go: its only two on-board orthogonal
    // neighbours, A2 and B1, are occupied, and it cannot afford the one
    // diagonal square left (B2) at 0 power. Boxed in by ships and the
    // board's own corner, not by the trap — so §8.6 step 7's relief
    // (src/rules/relief.ts) finds no qualifying candidate, and the side
    // genuinely has no action at all, rather than looping the guard
    // forever waiting for one.
    const state = buildState({
      ships: [
        ship("green-1", "green", "A1", 0),
        ship("red-1", "red", "B1"),
        ship("red-2", "red", "A2"),
      ],
      nodes: {
        // Comfortably above one, so A1 stays depleted through this very
        // sequence rather than retiring in it — this test is about the
        // pass guard, not step 6.
        A1: ["depleted", 30],
        // A lone charged node, unoccupied and carrying no countdown, and
        // there is no inactive node for the shortfall to charge from either
        // way — not this test's subject.
        H8: ["charged", 0],
      },
    });

    const result = applyPassGuard(state);

    expect(result.state.sideToMove).toBe("red");
    expect(result.effect).toEqual({
      type: "ply-passed",
      side: "green",
      sideToMove: "red",
      reason: "no-legal-action",
      endOfTurn: [],
    });
    expect(result.state.nodes.A1.state).toBe("depleted");
    const trapped = result.state.ships.find((s) => s.id === "green-1");
    expect(trapped?.square).toEqual(squareFromName("A1"));
  });

  it("leaves a state with a legal move untouched", () => {
    const state = buildState({ ships: [ship("green-1", "green", "H8")] });

    const result = applyPassGuard(state);

    expect(result.state).toEqual(state);
    expect(result.effect).toBeUndefined();
  });

  it("passes once, unconditionally, when no ship at all has a legal move", () => {
    // Four charged nodes hold the board at its target, so charging has no
    // shortfall to fill and the end-of-turn effects stay empty.
    const state = buildState({
      ships: [],
      nodes: {
        H8: ["charged", 0],
        K8: ["charged", 0],
        H12: ["charged", 0],
        K12: ["charged", 0],
      },
    });

    const result = applyPassGuard(state);

    expect(result.state.sideToMove).toBe("red");
    expect(result.state.plyNumber).toBe(2);
    expect(result.effect).toEqual({
      type: "ply-passed",
      side: "green",
      sideToMove: "red",
      reason: "no-legal-action",
      endOfTurn: [],
    });
  });

  it("advances the ply number on every pass, keeping green on the odd plies and red on the even ones", () => {
    let state = buildState({ ships: [] });

    for (let expectedPly = 1; expectedPly <= 6; expectedPly++) {
      expect(state.plyNumber).toBe(expectedPly);
      expect(state.sideToMove).toBe(expectedPly % 2 === 1 ? "green" : "red");

      const result = applyPassGuard(state);
      expect(result.effect).toBeDefined();
      state = result.state;
    }
  });

  it("runs the end-of-turn sequence for the passing side, so a ship that has moved and has no attack left still pays the node's energy, untouched in its own power", () => {
    // green-1 sits on K5, a charged node, having already spent this ply's
    // first action on a move: it has no move left (already acted) and no
    // enemy stands anywhere near it to attack, so it passes with its second
    // action still nominally available. Holding the node costs it no power
    // any more (§4.1) — only the energy still comes due.
    const state = buildState({
      ships: [ship("green-1", "green", "K5", 1)],
      nodes: { K5: "charged" },
      actedThisPly: ["green-1"],
      actionsRemaining: 1,
    });

    const result = applyPassGuard(state);

    expect(result.effect).toEqual({
      type: "ply-passed",
      side: "green",
      sideToMove: "red",
      reason: "no-legal-action",
      endOfTurn: [
        {
          type: "energy-collected",
          side: "green",
          amount: 1,
          newTotal: 1,
          squares: [squareFromName("K5")],
        },
      ],
    });
    const passedShip = result.state.ships.find((s) => s.id === "green-1");
    expect(passedShip?.power).toBe(1);
  });

  it("the trap: returns the state untouched once the game is over, rather than passing an unbounded number of times", () => {
    // No ship at all has a legal action, which is exactly the condition the
    // guard would otherwise read as "pass". At ply 61 of a default-length
    // game the game is already over, so this must not run the end-of-turn
    // sequence, tick a clock, collect energy or advance the ply.
    const state = buildState({ ships: [], plyNumber: 61 });

    const result = applyPassGuard(state);

    expect(result.state).toEqual(state);
    expect(result.effect).toBeUndefined();
  });

  it("the trap, at a shorter length: returns the state untouched once that game's own length has run out", () => {
    const state = buildState({
      ships: [],
      plyNumber: 7,
      lengthInRounds: 3,
    });

    const result = applyPassGuard(state);

    expect(result.state).toEqual(state);
    expect(result.effect).toBeUndefined();
  });

  it("a state one action from the end, driven through that action, ends at ply 61 with the guard having fired nothing", () => {
    const state = buildState({
      ships: [ship("red-1", "red", "H8")],
      sideToMove: "red",
      actionsRemaining: 1,
      plyNumber: 60,
    });

    const result = applyMove(state, "red-1", squareFromName("H9"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(result.state.plyNumber).toBe(61);
    expect(result.effects.some((effect) => effect.type === "ply-passed")).toBe(
      false,
    );

    const guarded = applyPassGuard(result.state);
    expect(guarded.state).toEqual(result.state);
    expect(guarded.effect).toBeUndefined();
  });
});

describe("applyOutOfTimePass", () => {
  it("passes the side to move's ply, running the end-of-turn sequence in full, when it is out of time (rules.md §5, §10)", () => {
    // green-1 sits on K5, a charged node, with plenty of legal moves and no
    // ship having acted this ply, which proves the pass fires purely
    // because green is out of time, not because it had nothing else to do.
    const state = buildState({
      ships: [ship("green-1", "green", "K5", 1), ship("red-1", "red", "A1")],
      nodes: { K5: "charged" },
      outOfTime: { green: true, red: false },
    });

    const result = applyOutOfTimePass(state);

    expect(result.state.sideToMove).toBe("red");
    expect(result.state.actionsRemaining).toBe(ACTIONS_PER_PLY);
    expect(result.state.actedThisPly).toEqual([]);
    expect(result.state.plyNumber).toBe(2);
    // The pass still runs the end-of-turn sequence in full: holding the
    // node costs green-1 no power any more (§4.1), but its side still
    // collects the node's energy (§8.6 step 1, §8.2).
    expect(result.effects).toEqual([
      {
        type: "ply-passed",
        side: "green",
        sideToMove: "red",
        reason: "out-of-time",
        endOfTurn: [
          {
            type: "energy-collected",
            side: "green",
            amount: 1,
            newTotal: 1,
            squares: [squareFromName("K5")],
          },
        ],
      },
    ]);
    const passedShip = result.state.ships.find((s) => s.id === "green-1");
    expect(passedShip?.power).toBe(1);
  });

  it("is refused, returning the state and no effects, when the side to move still has time", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "A2", 1), ship("red-1", "red", "A1")],
      outOfTime: { green: false, red: false },
    });

    const result = applyOutOfTimePass(state);

    expect(result.state).toBe(state);
    expect(result.effects).toEqual([]);
  });

  it("is refused when the game is already over, even though the side to move is out of time", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "A2", 1), ship("red-1", "red", "A1")],
      plyNumber: 61,
      outOfTime: { green: true, red: false },
    });

    const result = applyOutOfTimePass(state);

    expect(result.state).toBe(state);
    expect(result.effects).toEqual([]);
  });

  it("reports both effects, in order, when the pass leaves the other side with no legal action", () => {
    // red-1 is boxed onto its D6 planet by green-1 (C6), green-2 (E6),
    // green-3 (D5) and green-4 (D7), exactly the "no legal action at all"
    // shape used above, but with the sides swapped and green to move and out
    // of time: green's out-of-time pass hands the ply to red, who then has
    // nothing to do at all and passes immediately behind it.
    const state = buildState({
      ships: [
        ship("green-1", "green", "C6"),
        ship("green-2", "green", "E6"),
        ship("green-3", "green", "D5"),
        ship("green-4", "green", "D7"),
        ship("red-1", "red", "D6", 0),
      ],
      outOfTime: { green: true, red: false },
    });

    const result = applyOutOfTimePass(state);

    expect(result.state.sideToMove).toBe("green");
    expect(result.state.plyNumber).toBe(3);
    expect(result.effects).toHaveLength(2);
    expect(result.effects[0]).toMatchObject({
      type: "ply-passed",
      side: "green",
      sideToMove: "red",
      reason: "out-of-time",
    });
    expect(result.effects[1]).toMatchObject({
      type: "ply-passed",
      side: "red",
      sideToMove: "green",
      reason: "no-legal-action",
    });
  });
});

describe("a ship leaving a charged node depletes it at once (rules.md §8.3)", () => {
  it("depletes the square the ship left, carrying EXIT_COUNTDOWN_PLIES, and raises node-spent as the move's own effect — not the end-of-turn sequence's", () => {
    // red-1 gives red a legal move, so applyPassGuard does not immediately
    // run a second end-of-turn sequence for a passed red ply — this checks
    // exactly the state green's own move produces, nothing beyond it.
    const state = buildState({
      ships: [ship("green-1", "green", "H8"), ship("red-1", "red", "A1")],
      nodes: { H8: ["charged", CHARGED_COUNTDOWN_PLIES] },
    });

    const result = applyMove(state, "green-1", squareFromName("H9"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(result.effects.some((effect) => effect.type === "ply-passed")).toBe(
      false,
    );
    expect(result.effects[0]).toEqual({
      type: "node-spent",
      square: squareFromName("H8"),
    });
    // The move's own effect fires before this same turn's end-of-turn
    // sequence spends the exit's first ply, so by the time this call
    // returns the two plies it started with are already down to one.
    expect(result.state.nodes.H8).toEqual({
      state: "depleted",
      level: EXIT_COUNTDOWN_PLIES - 1,
    });
  });

  it("does not deplete anything when a ship simply arrives on a charged node — arriving is not a departure", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H7")],
      nodes: { H8: ["charged", 0] },
    });

    const result = applyMove(state, "green-1", squareFromName("H8"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(result.effects).not.toContainEqual(
      expect.objectContaining({ type: "node-spent" }),
    );
  });

  it("starts a countdown on a charged node with none when a ship moves onto it", () => {
    // red-1 gives red a legal move, so applyPassGuard does not immediately
    // run a second end-of-turn sequence for a passed red ply.
    const state = buildState({
      ships: [ship("green-1", "green", "H7"), ship("red-1", "red", "A1")],
      nodes: { H8: ["charged", 0] },
    });

    const result = applyMove(state, "green-1", squareFromName("H8"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    // The end-of-turn sequence that same call runs spends the countdown's
    // first ply, so it is already one below where it started.
    expect(result.state.nodes.H8).toEqual({
      state: "charged",
      level: CHARGED_COUNTDOWN_PLIES - 1,
    });
  });

  it("starts a fresh countdown on the destination and depletes the origin in one move between two charged nodes", () => {
    // red-1 gives red a legal move, so applyPassGuard does not immediately
    // run a second end-of-turn sequence for a passed red ply.
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 4), ship("red-1", "red", "A1")],
      nodes: {
        H8: ["charged", CHARGED_COUNTDOWN_PLIES],
        H9: ["charged", 0],
      },
    });

    const result = applyMove(state, "green-1", squareFromName("H9"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(result.effects[0]).toEqual({
      type: "node-spent",
      square: squareFromName("H8"),
    });
    expect(result.state.nodes.H8).toEqual({
      state: "depleted",
      level: EXIT_COUNTDOWN_PLIES - 1,
    });
    expect(result.state.nodes.H9).toEqual({
      state: "charged",
      level: CHARGED_COUNTDOWN_PLIES - 1,
    });
  });

  it("collects no energy for a node the moving player stepped off this turn", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 3)],
      nodes: { H8: ["charged", CHARGED_COUNTDOWN_PLIES] },
    });

    const result = applyMove(state, "green-1", squareFromName("H9"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    const plyEnded = result.effects.find(
      (effect) => effect.type === "ply-ended",
    );
    expect(plyEnded).toBeDefined();
    if (plyEnded?.type !== "ply-ended") {
      throw new Error("expected a ply-ended effect");
    }
    expect(plyEnded.endOfTurn).not.toContainEqual(
      expect.objectContaining({ type: "energy-collected" }),
    );
  });
});
