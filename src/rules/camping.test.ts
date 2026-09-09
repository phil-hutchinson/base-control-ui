// Integration cover for standing on a node (rules.md §8.3, §8.5). A ship
// holding a **charged** node is protected while it holds it (§7) and pays
// nothing for holding it (§4.1), but staying on it to the very end costs the
// ship its freedom: the instant the node runs out it is **trapped** there
// (§8.1, §8.5), with no legal destination and no legal target of its own,
// and nothing an enemy does can dislodge or attack it either. That lasts
// until the node retires, at which point its square is an ordinary square
// again and the ship can leave it like any other — nothing appears in the
// retired node's place. Leaving a charged node ends it at once (§8.3): the
// square becomes a depleted node on the spot, forfeiting that turn's energy
// from it and denying it to the opponent. A move may not land on an
// uncharged node at all (§6), whether inactive or depleted, and a ship can
// no longer stand on an inactive node — only a charged node is a square a
// ship may occupy (rules.md §8.1). Driven entirely through the public rules
// API — `applyMove`, `applyAttack`, `moveRefusalReason`, `attackRefusalReason`,
// `legalDestinations`, `legalTargets` and the `EndOfTurnEffect`s and
// `MoveEffect`s an action carries — rather than by calling `runEndOfTurn` or
// `runCharging` directly, so this proves the same thing a player's turn
// would.

import { describe, expect, it } from "vitest";
import { squareFromName } from "./board";
import { CHARGED_COUNTDOWN_PLIES, TRAP_COUNTDOWN_PLIES } from "./countdown";
import { attackRefusalReason, legalTargets } from "./combat";
import type { EndOfTurnEffect, NodeRetiredEffect } from "./endOfTurn";
import type { ShipId } from "./fleet";
import {
  ACTIONS_PER_PLY,
  type GameState,
  type Ship,
  type NodeStatus,
} from "./gameState";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "./gameLength";
import { legalDestinations, moveRefusalReason } from "./movement";
import { TOP_NODE_PRIORITY } from "./nodeQueue";
import {
  type MoveEffect,
  type NodeSpentEffect,
  type PlyEndedEffect,
  applyAttack,
  applyMove,
} from "./ply";
import { MAX_POWER, type PowerLevel } from "./power";
import type { NodeState } from "./nodes";
import { DEFAULT_CHARGED_NODE_COUNT } from "./nodes";

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
    chargedNodeCount: DEFAULT_CHARGED_NODE_COUNT,
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

describe("camping — a ship holding a charged node pays nothing for holding it, and is trapped the instant it runs out (§8.1, §8.5)", () => {
  it("keeps its square and power through retirement, costing it nothing before or after", () => {
    const initial = {
      ...buildState({
        ships: [
          // At full power, so nothing here is about recovery.
          ship("green-camper", "green", "H8", MAX_POWER),
          ship("green-mover", "green", "A1"),
          ship("red-mover", "red", "O4"),
        ],
        nodes: {
          // One ply from retiring, so it goes in this test's first turn.
          H8: ["depleted", 1],
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
    // and puts nothing in its place; the camper is untouched by any of it.
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

describe("camping — a node running out under a ship traps it (§8.3, §8.5)", () => {
  it("raises node-ran-out, leaves the ship exactly where it is, and traps it from its owner's next turn", () => {
    const initial = buildState({
      ships: [
        ship("green-camper", "green", "H8"),
        ship("green-mover", "green", "A1"),
        ship("red-mover", "red", "O4"),
      ],
      nodes: {
        H8: ["charged", 1],
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
    expect(afterGreenTurn.state.nodes.H8).toEqual({
      state: "depleted",
      level: TRAP_COUNTDOWN_PLIES,
    });
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

describe("camping — a move may not land on an uncharged node (§6)", () => {
  it("refuses a move landing on a depleted node, leaving the mover exactly where it started", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "F2", 4), ship("red-1", "red", "O1")],
      nodes: {
        F2: ["charged", 0],
        G3: ["depleted", 2],
      },
    });

    const result = applyMove(state, "green-1", squareFromName("G3"));

    // A ship can only ever come to be trapped on a depleted node by a node
    // burning out underneath it, never by walking into one (rules.md §6).
    expect(result.outcome).toBe("refused");
    if (result.outcome !== "refused") {
      throw new Error("expected the move to be refused");
    }
    expect(result.reason).toBe("destination-uncharged-node");
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
          // Comfortably above the number of turns this test runs, so it
          // stays depleted (a trap: green-camper stands on it) throughout.
          H8: ["depleted", TRAP_COUNTDOWN_PLIES],
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

describe("camping — a ship trapped on a depleted node has no move to make (§8.5)", () => {
  it("refuses the trapped ship's own move, though the depleted node it stands on never granted it power to begin with (§4.1)", () => {
    const initial: GameState = {
      ...buildState({
        ships: [
          ship("green-camper", "green", "H8", 2),
          ship("red-mover", "red", "O4"),
        ],
        nodes: {
          H8: ["depleted", TRAP_COUNTDOWN_PLIES],
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
          H8: ["depleted", 2],
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
        // One ply from running out, so it is certain to tip this turn.
        H8: ["charged", 1],
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

    // Green spends its turn elsewhere. H8's countdown is down to its last
    // ply, so it runs out at the end of this very turn (rules.md §8.3).
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

describe("camping — leaving a charged node ends it at once (rules.md §8.3)", () => {
  it("depletes the node the instant its holder leaves, raises node-spent, forfeits that turn's energy, charges the queue's front node at the same turn's end, and starts an exit node lasting exactly two plies", () => {
    // Three other charged nodes, at baseline, keep the board at four charged
    // until F2 becomes an exit node; M5 is the queue's front node, so it is
    // what charges to fill the shortfall that departure opens.
    const initial = buildState({
      ships: [ship("green-1", "green", "F2", 4), ship("red-1", "red", "D2")],
      nodes: {
        F2: ["charged", CHARGED_COUNTDOWN_PLIES],
        E11: ["charged", 0],
        H11: ["charged", 0],
        K11: ["charged", 0],
        M5: ["inactive", TOP_NODE_PRIORITY],
      },
    });

    const afterDeparture = appliedOrThrow(
      applyMove(initial, "green-1", squareFromName("F4")),
    );

    // The square is depleted on the spot, as the move resolves — not at the
    // end of the turn — and the move's own effects, not the end-of-turn
    // sequence's, carry the news of it. By the time this call returns, the
    // same turn's own end-of-turn sequence has already spent the exit's
    // first ply (rules.md §8.3), so its two plies are already down to one.
    expect(afterDeparture.state.nodes.F2).toEqual({
      state: "depleted",
      level: 1,
    });
    expect(afterDeparture.effects).toContainEqual({
      type: "node-spent",
      square: squareFromName("F2"),
    });
    const nodeSpent = afterDeparture.effects.find(
      (effect): effect is NodeSpentEffect => effect.type === "node-spent",
    );
    expect(afterDeparture.effects.indexOf(nodeSpent!)).toBe(0);

    // Leaving forfeits that turn's energy from the node — green held it
    // right up to the move, but a ply that ends on nothing collects nothing.
    expect(afterDeparture.state.energy.green).toBe(0);

    // The shortfall F2's departure opened is filled at the end of the very
    // same turn (rules.md §8.3), not the opponent's — M5 charges at once,
    // at baseline, with no draw involved.
    const departureTurnEffects = endOfTurnEffects(afterDeparture.effects);
    expect(departureTurnEffects).toContainEqual({
      type: "node-charged",
      square: squareFromName("M5"),
    });
    expect(afterDeparture.state.nodes.M5).toEqual({
      state: "charged",
      level: 0,
    });

    // Nothing may land on F2 for the rest of the turn or the whole of red's.
    expect(
      moveRefusalReason(afterDeparture.state, "red-1", squareFromName("F2")),
    ).toBe("destination-uncharged-node");

    // Red's turn passes; the exit's second and last ply is spent at the end
    // of it, and it retires without a trace.
    const afterRedTurn = appliedOrThrow(
      applyMove(afterDeparture.state, "red-1", squareFromName("D3")),
    );
    const redTurnEffects = endOfTurnEffects(afterRedTurn.effects);
    expect(redTurnEffects).toContainEqual({
      type: "node-retired",
      square: squareFromName("F2"),
    });
    expect(afterRedTurn.state.nodes.F2).toBeUndefined();
  });

  it("does not hand the node back or let the opponent inherit it — the departed square stays uncharged for both plies", () => {
    // Three other charged nodes, at baseline, keep the shortfall at one once
    // F2 becomes an exit node, so nothing else on the board stirs.
    const initial = buildState({
      ships: [ship("green-1", "green", "F2", 4), ship("red-1", "red", "D2")],
      nodes: {
        F2: ["charged", CHARGED_COUNTDOWN_PLIES],
        E11: ["charged", 0],
        H11: ["charged", 0],
        K11: ["charged", 0],
      },
    });

    const afterDeparture = appliedOrThrow(
      applyMove(initial, "green-1", squareFromName("F4")),
    );
    expect(afterDeparture.state.nodes.F2.state).toBe("depleted");

    // red-1 cannot take the node green-1 just left — landing on it is
    // refused like any other uncharged square.
    expect(
      moveRefusalReason(afterDeparture.state, "red-1", squareFromName("F2")),
    ).toBe("destination-uncharged-node");

    const afterRedTurn = appliedOrThrow(
      applyMove(afterDeparture.state, "red-1", squareFromName("D4")),
    );
    expect(afterRedTurn.state.nodes.F2).toBeUndefined();

    // And once it is gone, green-1 cannot step back onto it either — there
    // is no node left there at all to inherit.
    expect(
      moveRefusalReason(
        { ...afterRedTurn.state, sideToMove: "green", actedThisPly: [] },
        "green-1",
        squareFromName("F2"),
      ),
    ).toBeUndefined();
  });
});

describe("camping — a node held to the very end collects energy six times, trapped on the sixth (rules.md §8.1, §8.3)", () => {
  it("credits green once at the end of each of its own six turns holding H8, then traps it the instant the node runs out on the sixth", () => {
    let state: GameState = buildState({
      ships: [
        ship("green-camper", "green", "H8"),
        ship("green-mover", "green", "A1"),
        ship("red-mover", "red", "O4"),
      ],
      nodes: {
        H8: ["charged", CHARGED_COUNTDOWN_PLIES],
        F2: ["charged", 0],
        J2: ["charged", 0],
        B4: ["charged", 0],
      },
    });

    let greenMoverAt = "A1";
    let redMoverAt = "O4";
    let collections = 0;
    let lastGreenTurnEffects: readonly EndOfTurnEffect[] = [];

    // Eleven plies, alternating green and red starting with green, matches
    // the charged row of rules.md §8.3's worked table exactly.
    for (let ply = 1; ply <= 11; ply += 1) {
      if (ply % 2 === 1) {
        const to = greenMoverAt === "A1" ? "A2" : "A1";
        const result = appliedOrThrow(
          applyMove(state, "green-mover", squareFromName(to)),
        );
        state = result.state;
        greenMoverAt = to;
        lastGreenTurnEffects = endOfTurnEffects(result.effects);
        if (
          lastGreenTurnEffects.some(
            (effect) => effect.type === "energy-collected",
          )
        ) {
          collections += 1;
        }
      } else {
        const to = redMoverAt === "O4" ? "O5" : "O4";
        const result = appliedOrThrow(
          applyMove(state, "red-mover", squareFromName(to)),
        );
        state = result.state;
        redMoverAt = to;
      }
    }

    expect(collections).toBe(6);
    expect(state.energy.green).toBe(6);
    expect(state.nodes.H8).toEqual({
      state: "depleted",
      level: TRAP_COUNTDOWN_PLIES,
    });
    const camper = state.ships.find(
      (candidate) => candidate.id === "green-camper",
    );
    expect(camper?.square).toEqual(squareFromName("H8"));

    // The sixth collection is the last thing paid before the trap closes —
    // energy is step 2 of the end-of-turn order, depletion is step 3.
    const collectedIndex = lastGreenTurnEffects.findIndex(
      (effect) => effect.type === "energy-collected",
    );
    const ranOutIndex = lastGreenTurnEffects.findIndex(
      (effect) => effect.type === "node-ran-out",
    );
    expect(collectedIndex).toBeGreaterThanOrEqual(0);
    expect(ranOutIndex).toBeGreaterThan(collectedIndex);
  });
});

describe("camping — a trap lasts eleven plies: exactly five of the trapped player's own turns, released at the opponent's turn end (rules.md §8.3)", () => {
  it("keeps green-camper trapped for five of green's own turns and frees it only once, at the end of red's turn", () => {
    // The trap begins at the end of green's own turn (rules.md §8.3), so
    // this state picks up with red to move next.
    let state: GameState = {
      ...buildState({
        ships: [
          ship("green-camper", "green", "H8"),
          ship("green-mover", "green", "A1"),
          ship("red-mover", "red", "O4"),
        ],
        nodes: {
          H8: ["depleted", TRAP_COUNTDOWN_PLIES],
          F2: ["charged", 0],
          J2: ["charged", 0],
          B4: ["charged", 0],
          L8: ["charged", 0],
        },
      }),
      sideToMove: "red",
    };

    expect(legalDestinations(state, "green-camper")).toEqual([]);

    let greenMoverAt = "A1";
    let redMoverAt = "O4";
    let greenTrappedTurns = 0;
    let lastEffects: readonly EndOfTurnEffect[] = [];

    // Eleven plies, alternating red and green starting with red — the trap
    // was created at the end of green's own turn, so red moves first.
    for (let ply = 1; ply <= 11; ply += 1) {
      if (ply % 2 === 1) {
        const to = redMoverAt === "O4" ? "O5" : "O4";
        const result = appliedOrThrow(
          applyMove(state, "red-mover", squareFromName(to)),
        );
        state = result.state;
        redMoverAt = to;
        lastEffects = endOfTurnEffects(result.effects);
      } else {
        expect(
          moveRefusalReason(state, "green-camper", squareFromName("H9")),
        ).toBe("ship-trapped");
        greenTrappedTurns += 1;
        const to = greenMoverAt === "A1" ? "A2" : "A1";
        const result = appliedOrThrow(
          applyMove(state, "green-mover", squareFromName(to)),
        );
        state = result.state;
        greenMoverAt = to;
      }
    }

    expect(greenTrappedTurns).toBe(5);
    expect(lastEffects).toContainEqual({
      type: "node-retired",
      square: squareFromName("H8"),
    });
    expect(lastEffects).toContainEqual({
      type: "ship-freed",
      shipId: "green-camper",
      side: "green",
      square: squareFromName("H8"),
    });
    expect(state.nodes.H8).toBeUndefined();

    // Freed at the end of red's turn, so green-camper can move on its own
    // very next turn without delay.
    expect(
      moveRefusalReason(state, "green-camper", squareFromName("H9")),
    ).toBeUndefined();
  });
});
