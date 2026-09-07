// Integration cover for camping: staying put has stopped being free once a
// node runs out from under you (rules.md §8.5). A ship on an inactive node
// still owes and is owed nothing, and charging does not look at occupancy
// (§8.2). A ship holding a **charged** node is protected while it holds it
// (§7) and pays nothing for holding it, and leaving one no longer ends it
// (§8.3) — but staying on it to the very end costs the ship its freedom:
// the instant the node runs out it is **trapped** there (§8.1, §8.5), with
// no legal destination and no legal target of its own, and nothing an enemy
// does can dislodge or attack it either. That lasts until the node retires,
// at which point its square is an ordinary square again and the ship can
// leave it like any other — nothing appears in the retired node's place.
// A move may not land on a depleted node at all (§6), whether or not a ship
// is trapped there. Driven entirely through the public rules API —
// `applyMove`, `applyAttack`, `moveRefusalReason`, `attackRefusalReason`,
// `legalDestinations`, `legalTargets` and the `EndOfTurnEffect`s an action
// carries — rather than by calling `runEndOfTurn` or `runCharging` directly,
// so this proves the same thing a player's turn would.

import { describe, expect, it } from "vitest";
import { squareFromName } from "./board";
import { attackRefusalReason, legalTargets } from "./combat";
import type { NodeRetiredEffect } from "./endOfTurn";
import type { ShipId } from "./fleet";
import {
  ACTIONS_PER_PLY,
  type GameState,
  type Ship,
  type NodeStatus,
} from "./gameState";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "./gameLength";
import { legalDestinations, moveRefusalReason } from "./movement";
import {
  type MoveEffect,
  type PlyEndedEffect,
  applyAttack,
  applyMove,
} from "./ply";
import { MAX_POWER, type PowerLevel } from "./power";
import { NODE_CAPACITY, type NodeState } from "./nodes";

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
  ships: readonly Ship[];
  nodes?: Readonly<Record<string, readonly [NodeState, number]>>;
}): GameState {
  return {
    ships: config.ships,
    nodes: nodeStatuses(config.nodes ?? {}),
    sideToMove: "green",
    actionsRemaining: ACTIONS_PER_PLY,
    actedThisPly: [],
    plyNumber: 1,
    randomSeed: 1,
    openingSeed: 1,
    energy: { green: 0, red: 0 },
    lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
    outOfTime: { green: false, red: false },
  };
}

/** Applies a move, throwing (with the refusal reason) if it was not legal — every move in this file is expected to succeed. */
function appliedOrThrow(result: ReturnType<typeof applyMove>) {
  if (result.outcome !== "applied") {
    throw new Error(
      `expected the move to be applied, was refused as "${result.reason}"`,
    );
  }
  return result;
}

/** The end-of-turn sequence's own effects, unwrapped from the `ply-ended` effect a ply's last action carries. */
function endOfTurnEffects(effects: readonly MoveEffect[]) {
  const plyEnded = effects.find(
    (effect): effect is PlyEndedEffect => effect.type === "ply-ended",
  );
  if (plyEnded === undefined) {
    throw new Error(
      "expected a ply-ended effect carrying the end-of-turn sequence",
    );
  }
  return plyEnded.endOfTurn;
}

describe("camping — a node charges under a parked ship (§8.1, §8.2, §8.5)", () => {
  it("charges with no move of the camping ship's own, and pays energy at the end of its owner's next turn, without touching its power", () => {
    const initial = buildState({
      ships: [
        ship("green-camper", "green", "H8"),
        ship("green-mover", "green", "A1"),
        ship("red-mover", "red", "O4"),
      ],
      nodes: {
        H8: ["inactive", 5],
        F2: ["charged", 0],
        J2: ["charged", 0],
        B4: ["charged", 0],
      },
    });

    // Green's turn: green-camper never acts. H8 is the only inactive node,
    // so the board's one-node shortfall charges it deterministically —
    // under a ship that has not moved at all.
    const afterGreenTurn = appliedOrThrow(
      applyMove(initial, "green-mover", squareFromName("A3")),
    );
    const greenTurnEffects = endOfTurnEffects(afterGreenTurn.effects);
    expect(greenTurnEffects).toContainEqual({
      type: "node-charged",
      square: squareFromName("H8"),
    });
    expect(
      greenTurnEffects.some((effect) => effect.type === "energy-collected"),
    ).toBe(false);
    const camperAfterGreenTurn = afterGreenTurn.state.ships.find(
      (candidate) => candidate.id === "green-camper",
    );
    expect(camperAfterGreenTurn?.square).toEqual(squareFromName("H8"));
    expect(camperAfterGreenTurn?.power).toBe(4);

    // Red's turn: an ordinary move elsewhere. H8 is charged now and green
    // stands on it, but step 2 pays only the side that just played — red —
    // so the camper's side still collects nothing.
    const afterRedTurn = appliedOrThrow(
      applyMove(afterGreenTurn.state, "red-mover", squareFromName("O6")),
    );
    const redTurnEffects = endOfTurnEffects(afterRedTurn.effects);
    expect(
      redTurnEffects.some((effect) => effect.type === "energy-collected"),
    ).toBe(false);
    const camperAfterRedTurn = afterRedTurn.state.ships.find(
      (candidate) => candidate.id === "green-camper",
    );
    expect(camperAfterRedTurn?.square).toEqual(squareFromName("H8"));
    expect(camperAfterRedTurn?.power).toBe(4);

    // Green's own next turn: green-camper still has not moved. Now it is
    // green's own turn again, and step 2 pays it for the node it has been
    // sitting on all along — but holding a charged node no longer costs it
    // any power (§4.1), so the camper is exactly as full as it started.
    const afterGreenNextTurn = appliedOrThrow(
      applyMove(afterRedTurn.state, "green-mover", squareFromName("A1")),
    );
    const greenNextTurnEffects = endOfTurnEffects(afterGreenNextTurn.effects);
    expect(greenNextTurnEffects).toContainEqual({
      type: "energy-collected",
      side: "green",
      amount: 1,
      newTotal: 1,
      squares: [squareFromName("H8")],
    });
    expect(
      greenNextTurnEffects.some((effect) => effect.type === "power-gained"),
    ).toBe(false);
    const camperAfterGreenNextTurn = afterGreenNextTurn.state.ships.find(
      (candidate) => candidate.id === "green-camper",
    );
    expect(camperAfterGreenNextTurn?.square).toEqual(squareFromName("H8"));
    expect(camperAfterGreenNextTurn?.power).toBe(4);
  });
});

describe("camping — a ship on a depleted node outlasts it, until the node retires and simply leaves (§8.2, §8.5, §8.6)", () => {
  it("keeps its square and power through retirement, costing it nothing before or after", () => {
    const initial = {
      ...buildState({
        ships: [
          // At full power, so a depleted node's own gain has nothing left
          // to give it — this test is about retirement, not recovery.
          ship("green-camper", "green", "H8", MAX_POWER),
          ship("green-mover", "green", "A1"),
          ship("red-mover", "red", "O4"),
        ],
        nodes: {
          // The recovery table's smallest single draw is 4, so this retires
          // in one.
          H8: ["depleted", 4],
          F2: ["charged", 0],
          J2: ["charged", 0],
          B4: ["charged", 0],
          L8: ["charged", 0],
        },
      }),
      energy: { green: 10, red: 0 },
    };

    // Green's turn: green-camper still occupies H8, genuinely depleted, when
    // step 6 retires it later in this very sequence — nothing is taken for
    // standing there, before or after. Step 6 removes H8 from `state.nodes`
    // and puts nothing in its place; the camper is untouched by any of it,
    // because retirement (§8.6 step 6) does not look at occupancy any more
    // than charging does.
    const afterGreenTurn = appliedOrThrow(
      applyMove(initial, "green-mover", squareFromName("A3")),
    );
    const greenTurnEffects = endOfTurnEffects(afterGreenTurn.effects);
    expect(afterGreenTurn.state.energy.green).toBe(10);
    const retired = greenTurnEffects.find(
      (effect): effect is NodeRetiredEffect => effect.type === "node-retired",
    );
    expect(retired?.square).toEqual(squareFromName("H8"));
    expect(afterGreenTurn.state.nodes.H8).toBeUndefined();
    expect(Object.keys(afterGreenTurn.state.nodes)).toHaveLength(4);
    const camperAfterRetirement = afterGreenTurn.state.ships.find(
      (candidate) => candidate.id === "green-camper",
    );
    expect(camperAfterRetirement?.square).toEqual(squareFromName("H8"));
    expect(camperAfterRetirement?.power).toBe(MAX_POWER);

    // Red's turn: H8 is now an ordinary square — it holds no node — so
    // nothing about standing on it changes, even though the camper still
    // has not moved an inch. It is also no longer trapped: it has a legal
    // move of its own again, and is free to leave whenever it likes, exactly
    // like any other ship (rules.md §8.5).
    const afterRedTurn = appliedOrThrow(
      applyMove(afterGreenTurn.state, "red-mover", squareFromName("O6")),
    );
    expect(
      legalDestinations(afterRedTurn.state, "green-camper").length,
    ).toBeGreaterThan(0);
    expect(
      moveRefusalReason(
        afterRedTurn.state,
        "green-camper",
        squareFromName("H9"),
      ),
    ).toBeUndefined();

    // Green's own next turn: it chooses to leave the camper exactly where it
    // is and act with a different ship instead — freedom means it may stay,
    // not that it must go.
    const afterGreenNextTurn = appliedOrThrow(
      applyMove(afterRedTurn.state, "green-mover", squareFromName("A1")),
    );
    expect(afterGreenNextTurn.state.energy.green).toBe(10);
    expect(afterGreenNextTurn.state.nodes.H8).toBeUndefined();
    const camperStillThere = afterGreenNextTurn.state.ships.find(
      (candidate) => candidate.id === "green-camper",
    );
    expect(camperStillThere?.square).toEqual(squareFromName("H8"));
    expect(camperStillThere?.power).toBe(MAX_POWER);

    // A further round proves the freedom is real: the camper itself now
    // moves off H8 and the move succeeds.
    const afterRedNextTurn = appliedOrThrow(
      applyMove(afterGreenNextTurn.state, "red-mover", squareFromName("O4")),
    );
    const afterCamperLeaves = appliedOrThrow(
      applyMove(afterRedNextTurn.state, "green-camper", squareFromName("H9")),
    );
    const camperAfterLeaving = afterCamperLeaves.state.ships.find(
      (candidate) => candidate.id === "green-camper",
    );
    expect(camperAfterLeaving?.square).toEqual(squareFromName("H9"));
  });
});

describe("camping — an inactive node grants and takes nothing, and a depleted node never grants power any more (§4.1, §8.5)", () => {
  it("grants no power and collects no energy for a ship on an inactive node, and grants no power for one on a depleted node whether or not it has room left to gain", () => {
    // green-depleted-camper starts with room to gain (2), unlike the old
    // rule's ceiling corner case — the point here is that a depleted node
    // grants nothing at all now (§4.1), not that this particular ship
    // happened to have nowhere left to put a gain. A depleted node no
    // longer costs anything either, so green's energy stays at the default
    // of 0 throughout.
    const initial = buildState({
      ships: [
        ship("green-inactive-camper", "green", "H4"),
        ship("green-depleted-camper", "green", "C10", 2),
        ship("green-mover", "green", "A1"),
        ship("red-mover", "red", "O4"),
      ],
      nodes: {
        H4: ["inactive", 5],
        // The recovery table's largest single draw is 8, so two turns of
        // recovery cannot bring this anywhere near zero.
        C10: ["depleted", 55],
        F2: ["charged", 0],
        J2: ["charged", 0],
        B4: ["charged", 0],
        L8: ["charged", 0],
      },
    });

    function assertUntouched(state: GameState) {
      const inactive = state.ships.find(
        (candidate) => candidate.id === "green-inactive-camper",
      );
      const depleted = state.ships.find(
        (candidate) => candidate.id === "green-depleted-camper",
      );
      expect(inactive?.square).toEqual(squareFromName("H4"));
      expect(inactive?.power).toBe(4);
      expect(depleted?.square).toEqual(squareFromName("C10"));
      expect(depleted?.power).toBe(2);
      expect(state.energy.green).toBe(0);
    }

    // The board is already at its target of four charged nodes, so H4
    // never gets drawn during this test — it is a clean, indefinite control.
    const afterGreenTurn = appliedOrThrow(
      applyMove(initial, "green-mover", squareFromName("A3")),
    );
    const greenTurnEffects = endOfTurnEffects(afterGreenTurn.effects);
    expect(
      greenTurnEffects.some(
        (effect) =>
          effect.type === "power-gained" || effect.type === "energy-collected",
      ),
    ).toBe(false);
    assertUntouched(afterGreenTurn.state);

    const afterRedTurn = appliedOrThrow(
      applyMove(afterGreenTurn.state, "red-mover", squareFromName("O6")),
    );
    const redTurnEffects = endOfTurnEffects(afterRedTurn.effects);
    expect(
      redTurnEffects.some(
        (effect) =>
          effect.type === "power-gained" || effect.type === "energy-collected",
      ),
    ).toBe(false);
    assertUntouched(afterRedTurn.state);
  });
});

describe("camping — a node running out under a ship traps it (§8.3, §8.5)", () => {
  it("raises node-ran-out, leaves the ship exactly where it is, and traps it from its owner's next turn", () => {
    const initial = buildState({
      ships: [
        ship("green-camper", "green", "H8"),
        ship("green-mover", "green", "A1"),
        ship("red-mover", "red", "O4"),
      ],
      nodes: {
        H8: ["charged", NODE_CAPACITY - 1],
        F2: ["charged", 0],
        J2: ["charged", 0],
        B4: ["charged", 0],
        L8: ["charged", 0],
      },
    });

    const afterGreenTurn = appliedOrThrow(
      applyMove(initial, "green-mover", squareFromName("A3")),
    );
    const greenTurnEffects = endOfTurnEffects(afterGreenTurn.effects);
    // Holding H8 while it was charged never touched green-camper's power
    // (§4.1); step 2 still pays for holding it, before step 3 spends the
    // node later in the same sequence — this is the last thing
    // green-camper's side is ever paid for it.
    expect(greenTurnEffects).toContainEqual({
      type: "energy-collected",
      side: "green",
      amount: 1,
      newTotal: 1,
      squares: [squareFromName("H8")],
    });
    expect(greenTurnEffects).toContainEqual({
      type: "node-ran-out",
      square: squareFromName("H8"),
    });
    expect(afterGreenTurn.state.nodes.H8.state).toBe("depleted");
    const camperAfterRunout = afterGreenTurn.state.ships.find(
      (candidate) => candidate.id === "green-camper",
    );
    expect(camperAfterRunout?.square).toEqual(squareFromName("H8"));
    expect(camperAfterRunout?.power).toBe(4);

    const afterRedTurn = appliedOrThrow(
      applyMove(afterGreenTurn.state, "red-mover", squareFromName("O6")),
    );

    // Moving a different ship is accepted without refusal, but green-camper
    // itself is now trapped on the depleted node (rules.md §8.5): it has no
    // move of its own at all, named as the trap rather than range or
    // blocking, and no attack of its own either.
    expect(
      moveRefusalReason(
        afterRedTurn.state,
        "green-camper",
        squareFromName("H9"),
      ),
    ).toBe("ship-trapped");
    expect(legalDestinations(afterRedTurn.state, "green-camper")).toEqual([]);
    expect(legalTargets(afterRedTurn.state, "green-camper")).toEqual([]);

    const afterGreenNextTurn = appliedOrThrow(
      applyMove(afterRedTurn.state, "green-mover", squareFromName("A1")),
    );
    const greenNextTurnEffects = endOfTurnEffects(afterGreenNextTurn.effects);
    // H8 is depleted now, so it costs and gives green nothing from here — a
    // depleted node no longer gives power back (§4.1) or takes energy away.
    expect(
      greenNextTurnEffects.some(
        (effect) =>
          effect.type === "power-gained" || effect.type === "energy-collected",
      ),
    ).toBe(false);
    expect(afterGreenNextTurn.state.energy.green).toBe(1);
    const camperAfterNextTurn = afterGreenNextTurn.state.ships.find(
      (candidate) => candidate.id === "green-camper",
    );
    expect(camperAfterNextTurn?.square).toEqual(squareFromName("H8"));
    expect(camperAfterNextTurn?.power).toBe(4);
  });
});

describe("camping — a depleted node cannot be entered (§6)", () => {
  it("refuses a move landing on a depleted node, leaving the mover exactly where it started", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "F2", 4), ship("red-1", "red", "O1")],
      nodes: {
        F2: ["charged", 15],
        G3: ["depleted", 60],
      },
    });

    const result = applyMove(state, "green-1", squareFromName("G3"));

    // A ship can only ever come to be trapped on a depleted node by a node
    // burning out underneath it, never by walking into one (rules.md §6).
    expect(result.outcome).toBe("refused");
    if (result.outcome !== "refused") {
      throw new Error("expected the move to be refused");
    }
    expect(result.reason).toBe("destination-depleted-node");
  });
});

describe("camping — a depleted node costs and grants nothing, every one of its owner's turns (§4.1, §8.4)", () => {
  it("takes no energy and gives no power at the end of any of the camper's owner's turns", () => {
    const initial: GameState = {
      ...buildState({
        ships: [
          ship("green-camper", "green", "H8", 2),
          ship("green-mover", "green", "A1"),
          ship("red-mover", "red", "O4"),
        ],
        nodes: {
          // Comfortably above the recovery table's largest single draw (8),
          // so it stays depleted through every recovery tick in this test.
          H8: ["depleted", 60],
        },
      }),
      energy: { green: 10, red: 0 },
    };

    // Green's turn: green-camper never acts — its owner spends the turn
    // moving a different ship — but nothing is taken for standing on H8,
    // exactly as nothing would be if it had moved. A depleted node no
    // longer gives anything back for it either (§4.1), so its power is
    // untouched.
    const afterGreenTurn = appliedOrThrow(
      applyMove(initial, "green-mover", squareFromName("A3")),
    );
    const greenTurnEffects = endOfTurnEffects(afterGreenTurn.effects);
    expect(
      greenTurnEffects.some(
        (effect) =>
          effect.type === "power-gained" || effect.type === "energy-collected",
      ),
    ).toBe(false);
    const camperAfterGreenTurn = afterGreenTurn.state.ships.find(
      (candidate) => candidate.id === "green-camper",
    );
    expect(camperAfterGreenTurn?.square).toEqual(squareFromName("H8"));
    expect(camperAfterGreenTurn?.power).toBe(2);
    expect(afterGreenTurn.state.energy.green).toBe(10);

    // Red's turn: nothing changes for green's camper on a depleted node at
    // the end of red's turn either.
    const afterRedTurn = appliedOrThrow(
      applyMove(afterGreenTurn.state, "red-mover", squareFromName("O6")),
    );
    const redTurnEffects = endOfTurnEffects(afterRedTurn.effects);
    expect(
      redTurnEffects.some(
        (effect) =>
          effect.type === "power-gained" || effect.type === "energy-collected",
      ),
    ).toBe(false);
    expect(afterRedTurn.state.energy.green).toBe(10);

    // Green's next turn: still nothing, across as many turns as it stays.
    const afterGreenNextTurn = appliedOrThrow(
      applyMove(afterRedTurn.state, "green-mover", squareFromName("A1")),
    );
    const greenNextTurnEffects = endOfTurnEffects(afterGreenNextTurn.effects);
    expect(
      greenNextTurnEffects.some(
        (effect) =>
          effect.type === "power-gained" || effect.type === "energy-collected",
      ),
    ).toBe(false);
    const camperAfterGreenNextTurn = afterGreenNextTurn.state.ships.find(
      (candidate) => candidate.id === "green-camper",
    );
    expect(camperAfterGreenNextTurn?.power).toBe(2);
    expect(afterGreenNextTurn.state.energy.green).toBe(10);
  });
});

describe("camping — an inactive node still pays nothing, for as many turns as a ship stays on it (§8.5)", () => {
  it("grants no power and costs no power or energy, across several turns, with non-zero power and energy at stake", () => {
    const initial: GameState = {
      ...buildState({
        ships: [
          ship("green-camper", "green", "H4", 2),
          ship("green-mover", "green", "A1"),
          ship("red-mover", "red", "O4"),
        ],
        nodes: {
          H4: ["inactive", 5],
          F2: ["charged", 0],
          J2: ["charged", 0],
          B4: ["charged", 0],
          L8: ["charged", 0],
        },
      }),
      energy: { green: 10, red: 0 },
    };

    function assertUntouched(state: GameState) {
      const camper = state.ships.find(
        (candidate) => candidate.id === "green-camper",
      );
      expect(camper?.square).toEqual(squareFromName("H4"));
      expect(camper?.power).toBe(2);
      expect(state.energy.green).toBe(10);
    }

    function assertNoSettlement(effects: readonly MoveEffect[]) {
      const plyEffects = endOfTurnEffects(effects);
      expect(
        plyEffects.some(
          (effect) =>
            effect.type === "power-gained" ||
            effect.type === "energy-collected",
        ),
      ).toBe(false);
    }

    // The board is already at its target of four charged nodes, so H4
    // never gets drawn during this test — it is a clean, indefinite control,
    // proven across two full rounds rather than one.
    const afterGreenTurn = appliedOrThrow(
      applyMove(initial, "green-mover", squareFromName("A3")),
    );
    assertNoSettlement(afterGreenTurn.effects);
    assertUntouched(afterGreenTurn.state);

    const afterRedTurn = appliedOrThrow(
      applyMove(afterGreenTurn.state, "red-mover", squareFromName("O6")),
    );
    assertUntouched(afterRedTurn.state);

    const afterGreenNextTurn = appliedOrThrow(
      applyMove(afterRedTurn.state, "green-mover", squareFromName("A1")),
    );
    assertNoSettlement(afterGreenNextTurn.effects);
    assertUntouched(afterGreenNextTurn.state);

    const afterRedNextTurn = appliedOrThrow(
      applyMove(afterGreenNextTurn.state, "red-mover", squareFromName("O4")),
    );
    assertUntouched(afterRedNextTurn.state);
  });
});

describe("camping — a ship trapped on a depleted node has no move to make (§8.5)", () => {
  it("refuses the trapped ship's own move, though the depleted node it stands on never granted it power to begin with (§4.1)", () => {
    const initial: GameState = {
      ...buildState({
        ships: [
          ship("green-camper", "green", "H8", 2),
          ship("red-mover", "red", "O4"),
        ],
        nodes: {
          H8: ["depleted", 60],
        },
      }),
      energy: { green: 10, red: 0 },
    };

    const result = applyMove(initial, "green-camper", squareFromName("H9"));

    expect(result.outcome).toBe("refused");
    if (result.outcome !== "refused") {
      throw new Error("expected the move to be refused");
    }
    expect(result.reason).toBe("ship-trapped");
  });
});

describe("camping — flying across a depleted node costs nothing (§8.4)", () => {
  it("raises no power gain for a move that passes over, but does not stop on, a depleted node", () => {
    const initial: GameState = {
      ...buildState({
        ships: [
          ship("green-flyer", "green", "G7", 4),
          ship("red-mover", "red", "O4"),
        ],
        nodes: {
          H8: ["depleted", 60],
        },
      }),
      energy: { green: 10, red: 0 },
    };

    // The L from G7 to I8 turns through H7 (orthogonal corner) and H8
    // (diagonal corner) without stopping on either (rules.md §6). The L
    // itself costs 2 (rules.md §6) — passing over the depleted node adds
    // nothing on top of that.
    const result = appliedOrThrow(
      applyMove(initial, "green-flyer", squareFromName("I8")),
    );
    const effects = endOfTurnEffects(result.effects);
    expect(effects.some((effect) => effect.type === "power-gained")).toBe(
      false,
    );
    expect(result.state.energy.green).toBe(10);
    const flyer = result.state.ships.find(
      (candidate) => candidate.id === "green-flyer",
    );
    expect(flyer?.square).toEqual(squareFromName("I8"));
    expect(flyer?.power).toBe(2);
  });
});

describe("camping — the node refuge: a ship holding a charged node cannot be attacked, and stays protected once trapped by it running out (rules.md §7)", () => {
  it("refuses the attack and denies the camper an attack of its own, before and after the node runs out and traps it", () => {
    const targetSquare = squareFromName("H8");
    const enemySquare = squareFromName("H10");

    const initial = buildState({
      ships: [
        // Both at full power: the camper so the depleted node it eventually
        // sits under (once it runs out) has nothing left to give it, and the
        // attacker so its own planet return afterwards has nothing to give
        // it either.
        ship("red-camper", "red", "H8", MAX_POWER),
        ship("green-enemy", "green", "H10", MAX_POWER),
        ship("green-mover", "green", "A1"),
        ship("red-mover", "red", "O2"),
      ],
      nodes: {
        // The held table's smallest draw is 3, so one turn spent occupied
        // is certain to tip this to capacity, whatever is drawn.
        H8: ["charged", NODE_CAPACITY - 3],
      },
    });

    // While H8 is charged, green-enemy cannot attack the ship holding it —
    // refused as protected, and never offered as a target at all.
    expect(attackRefusalReason(initial, "green-enemy", targetSquare)).toBe(
      "target-on-charged-node",
    );
    expect(legalTargets(initial, "green-enemy")).toEqual([]);

    // The refusal is about the attacker's own square, not whose turn it
    // happens to be, so the same state with red to move shows red-camper has
    // no attack of its own while it holds the node either.
    const withRedToMove: GameState = { ...initial, sideToMove: "red" };
    expect(attackRefusalReason(withRedToMove, "red-camper", enemySquare)).toBe(
      "attacker-on-charged-node",
    );
    expect(legalTargets(withRedToMove, "red-camper")).toEqual([]);

    // Green spends its turn elsewhere. H8 is occupied by red-camper, so its
    // drain is drawn from the held table (rules.md §8.3) and, at the level
    // chosen above, is certain to reach capacity in this one turn.
    const afterGreenTurn = appliedOrThrow(
      applyMove(initial, "green-mover", squareFromName("A3")),
    );
    const greenTurnEffects = endOfTurnEffects(afterGreenTurn.effects);
    expect(greenTurnEffects).toContainEqual({
      type: "node-ran-out",
      square: targetSquare,
    });
    expect(afterGreenTurn.state.nodes.H8.state).toBe("depleted");
    const camperAfterRunout = afterGreenTurn.state.ships.find(
      (candidate) => candidate.id === "red-camper",
    );
    expect(camperAfterRunout?.square).toEqual(targetSquare);

    // A spare red move, changing nothing about H8, just to bring the turn
    // back to green so the attack below is genuinely green-enemy's to make.
    const afterRedTurn = appliedOrThrow(
      applyMove(afterGreenTurn.state, "red-mover", squareFromName("O4")),
    );
    expect(afterRedTurn.state.nodes.H8.state).toBe("depleted");

    // The node stops paying, but the ship it caught is trapped, so it stays
    // exactly as protected as it was while the node was charged (rules.md
    // §7) — refused as a target for the depleted-node reason now, rather
    // than the charged-node one, and never offered as one.
    expect(
      attackRefusalReason(afterRedTurn.state, "green-enemy", targetSquare),
    ).toBe("target-on-depleted-node");
    expect(legalTargets(afterRedTurn.state, "green-enemy")).toEqual([]);

    const attackResult = applyAttack(
      afterRedTurn.state,
      "green-enemy",
      targetSquare,
    );
    expect(attackResult.outcome).toBe("refused");
    if (attackResult.outcome !== "refused") {
      throw new Error("expected the attack to be refused");
    }
    expect(attackResult.reason).toBe("target-on-depleted-node");
    const camperUnchanged = afterRedTurn.state.ships.find(
      (candidate) => candidate.id === "red-camper",
    );
    expect(camperUnchanged?.square).toEqual(targetSquare);
  });
});

describe("camping — a node left lit still burns down, and either side may retake it (rules.md §7, §8.3)", () => {
  it("keeps draining at the empty rate if nobody retakes it, and goes depleted only when its drain reaches capacity", () => {
    const initial = buildState({
      ships: [ship("green-1", "green", "F2", 4), ship("red-1", "red", "A1")],
      nodes: { F2: ["charged", 0] },
    });

    const afterDeparture = appliedOrThrow(
      applyMove(initial, "green-1", squareFromName("F4")),
    );
    // F2 stays charged the moment it is left — leaving it no longer ends it.
    expect(afterDeparture.state.nodes.F2.state).toBe("charged");
    expect(afterDeparture.effects).not.toContainEqual(
      expect.objectContaining({ type: "node-vacated" }),
    );

    // Both sides shuffle back and forth with a free one-square orthogonal
    // step (rules.md §6), so forty rounds of it never runs either ship out
    // of power to pay with.
    const greenSquares = ["F5", "F4"] as const;
    const redSquares = ["A2", "A1"] as const;
    const moves: Array<[ShipId, string]> = [];
    for (let round = 0; round < 40; round++) {
      // Green's own move (F2 -> F4, above) already spent green's turn, so
      // red moves first in every round from here on.
      moves.push(["red-1", redSquares[round % 2]]);
      moves.push(["green-1", greenSquares[round % 2]]);
    }

    let state = afterDeparture.state;
    let previousLevel = afterDeparture.state.nodes.F2.level;
    let ranOut = false;
    for (const [shipId, square] of moves) {
      const result = appliedOrThrow(
        applyMove(state, shipId, squareFromName(square)),
      );
      state = result.state;
      ranOut = endOfTurnEffects(result.effects).some(
        (effect) => effect.type === "node-ran-out",
      );
      if (ranOut) {
        break;
      }
      // Neither ship ever stands on F2 in this scenario, so every one of
      // these turns draws from the empty table — never the held table's
      // higher amounts — while the node stays charged.
      const level = state.nodes.F2.level;
      expect(level - previousLevel).toBeGreaterThanOrEqual(1);
      expect(level - previousLevel).toBeLessThanOrEqual(3);
      expect(state.nodes.F2.state).toBe("charged");
      previousLevel = level;
    }

    expect(ranOut).toBe(true);
    expect(state.nodes.F2.state).toBe("depleted");
  });

  it("lets the opponent's ship move onto the still-charged node and start collecting there", () => {
    const initial = buildState({
      ships: [ship("green-1", "green", "F2", 4), ship("red-1", "red", "D2")],
      nodes: { F2: ["charged", 5] },
    });

    const afterDeparture = appliedOrThrow(
      applyMove(initial, "green-1", squareFromName("F4")),
    );
    expect(afterDeparture.state.nodes.F2.state).toBe("charged");

    // red-1 is the opponent of the ship that held F2 — the case the story is
    // about: either side may take a node its holder chose to leave.
    const afterOpponentArrives = appliedOrThrow(
      applyMove(afterDeparture.state, "red-1", squareFromName("F2")),
    );
    const redAfterArrival = afterOpponentArrives.state.ships.find(
      (candidate) => candidate.id === "red-1",
    );
    expect(redAfterArrival?.square).toEqual(squareFromName("F2"));
    expect(afterOpponentArrives.state.nodes.F2.state).toBe("charged");

    // D2 to F2 is a two-square orthogonal move, which costs 2 (rules.md
    // §6), leaving red-1 at 2 on arrival; holding the charged node takes
    // nothing further on top of that (§4.1) — only the energy still comes
    // due, exactly as it always has (§8.4).
    const opponentTurnEffects = endOfTurnEffects(afterOpponentArrives.effects);
    const redAfterOpponentTurn = afterOpponentArrives.state.ships.find(
      (candidate) => candidate.id === "red-1",
    );
    expect(redAfterOpponentTurn?.power).toBe(2);
    expect(
      opponentTurnEffects.some((effect) => effect.type === "power-gained"),
    ).toBe(false);
    expect(
      opponentTurnEffects.some(
        (effect) => effect.type === "energy-collected" && effect.side === "red",
      ),
    ).toBe(true);
  });
});
