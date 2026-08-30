// Integration cover for camping: a ship that stays on a site that is not
// charged owes nothing (rules.md §8.5), and the consequences that follow
// once a move may end anywhere (§6) and the charge draw does not look at
// occupancy (§8.2). Driven entirely through the public rules API —
// `applyMove`, `moveRefusalReason` and the `EndOfTurnEffect`s `applyMove`
// carries — rather than by calling `runEndOfTurn` or `runChargeDraw`
// directly, so this proves the same thing a player's turn would.

import { describe, expect, it } from "vitest";
import { squareFromName } from "./board";
import type { ShipId } from "./fleet";
import {
  ACTIONS_PER_PLY,
  type GameState,
  type Ship,
  type SiteStatus,
} from "./gameState";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "./gameLength";
import { moveRefusalReason } from "./movement";
import { type MoveEffect, type PlyEndedEffect, applyMove } from "./ply";
import type { ShieldCount } from "./shields";
import { NODE_CAPACITY, type SiteState } from "./sites";

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
  ships: readonly Ship[];
  siteStates?: Readonly<Record<string, readonly [SiteState, number]>>;
}): GameState {
  return {
    ships: config.ships,
    siteStates: siteStatuses(config.siteStates ?? {}),
    sideToMove: "green",
    actionsRemaining: ACTIONS_PER_PLY,
    actedThisPly: [],
    plyNumber: 1,
    randomSeed: 1,
    energy: { green: 0, red: 0 },
    lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
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

describe("camping — a site charges under a parked ship (§8.1, §8.2, §8.5)", () => {
  it("charges with no move of the camping ship's own, and pays it at the end of its owner's next turn", () => {
    const initial = buildState({
      ships: [
        ship("green-camper", "green", "H8"),
        ship("green-mover", "green", "A1"),
        ship("red-mover", "red", "O4"),
      ],
      siteStates: {
        H8: ["active", 5],
        F2: ["charged", 0],
        J2: ["charged", 0],
        B4: ["charged", 0],
        L8: ["charged", 0],
      },
    });

    // Green's turn: green-camper never acts. H8 is the only active site,
    // so the board's one-node shortfall charges it deterministically —
    // under a ship that has not moved at all.
    const afterGreenTurn = appliedOrThrow(
      applyMove(initial, "green-mover", squareFromName("A4")),
    );
    const greenTurnEffects = endOfTurnEffects(afterGreenTurn.effects);
    expect(greenTurnEffects).toContainEqual({
      type: "site-charged",
      square: squareFromName("H8"),
    });
    expect(
      greenTurnEffects.some(
        (effect) =>
          effect.type === "shield-gained" || effect.type === "energy-collected",
      ),
    ).toBe(false);
    const camperAfterGreenTurn = afterGreenTurn.state.ships.find(
      (candidate) => candidate.id === "green-camper",
    );
    expect(camperAfterGreenTurn?.square).toEqual(squareFromName("H8"));
    expect(camperAfterGreenTurn?.shields).toBe(0);

    // Red's turn: an ordinary move elsewhere. H8 is charged now and green
    // stands on it, but steps 1 and 2 pay only the side that just played —
    // red — so the camper still gains nothing.
    const afterRedTurn = appliedOrThrow(
      applyMove(afterGreenTurn.state, "red-mover", squareFromName("O7")),
    );
    const redTurnEffects = endOfTurnEffects(afterRedTurn.effects);
    expect(
      redTurnEffects.some(
        (effect) =>
          effect.type === "shield-gained" || effect.type === "energy-collected",
      ),
    ).toBe(false);
    const camperAfterRedTurn = afterRedTurn.state.ships.find(
      (candidate) => candidate.id === "green-camper",
    );
    expect(camperAfterRedTurn?.square).toEqual(squareFromName("H8"));
    expect(camperAfterRedTurn?.shields).toBe(0);

    // Green's own next turn: green-camper still has not moved. Now it is
    // green's own turn again, and steps 1 and 2 pay it for the node it has
    // been sitting on all along.
    const afterGreenNextTurn = appliedOrThrow(
      applyMove(afterRedTurn.state, "green-mover", squareFromName("A1")),
    );
    const greenNextTurnEffects = endOfTurnEffects(afterGreenNextTurn.effects);
    expect(greenNextTurnEffects).toContainEqual({
      type: "shield-gained",
      shipId: "green-camper",
      side: "green",
      square: squareFromName("H8"),
      shields: 1,
    });
    expect(greenNextTurnEffects).toContainEqual({
      type: "energy-collected",
      side: "green",
      amount: 1,
      newTotal: 1,
      squares: [squareFromName("H8")],
    });
    const camperAfterGreenNextTurn = afterGreenNextTurn.state.ships.find(
      (candidate) => candidate.id === "green-camper",
    );
    expect(camperAfterGreenNextTurn?.square).toEqual(squareFromName("H8"));
    expect(camperAfterGreenNextTurn?.shields).toBe(1);
  });
});

describe("camping — a ship on a dormant site outlasts recovery, then a charge (§8.2, §8.5)", () => {
  it("stays put while the site recovers to active, and stays put again once the draw charges it", () => {
    const initial = buildState({
      ships: [
        ship("green-camper", "green", "H8"),
        ship("green-mover", "green", "A1"),
        ship("red-mover", "red", "O4"),
      ],
      siteStates: {
        // The recovery table's smallest single draw is 4, so this clears in one.
        H8: ["dormant", 4],
        F2: ["charged", 0],
        J2: ["charged", 0],
        B4: ["charged", 0],
        L8: ["charged", 0],
      },
    });

    // Green's turn: H8 recovers to active while green-camper stands on it,
    // untouched — recovery (§8.6 step 6) does not look at occupancy any
    // more than the charge draw does.
    const afterGreenTurn = appliedOrThrow(
      applyMove(initial, "green-mover", squareFromName("A4")),
    );
    const greenTurnEffects = endOfTurnEffects(afterGreenTurn.effects);
    expect(greenTurnEffects).toContainEqual({
      type: "site-went-active",
      square: squareFromName("H8"),
    });
    expect(afterGreenTurn.state.siteStates.H8.state).toBe("active");
    const camperAfterRecovery = afterGreenTurn.state.ships.find(
      (candidate) => candidate.id === "green-camper",
    );
    expect(camperAfterRecovery?.square).toEqual(squareFromName("H8"));
    expect(camperAfterRecovery?.shields).toBe(0);

    // Red's turn: H8 is now the board's only active site, so the one-node
    // shortfall charges it deterministically — the ship still has not moved.
    const afterRedTurn = appliedOrThrow(
      applyMove(afterGreenTurn.state, "red-mover", squareFromName("O7")),
    );
    const redTurnEffects = endOfTurnEffects(afterRedTurn.effects);
    expect(redTurnEffects).toContainEqual({
      type: "site-charged",
      square: squareFromName("H8"),
    });
    expect(afterRedTurn.state.siteStates.H8.state).toBe("charged");
    const camperAfterCharge = afterRedTurn.state.ships.find(
      (candidate) => candidate.id === "green-camper",
    );
    expect(camperAfterCharge?.square).toEqual(squareFromName("H8"));
    expect(camperAfterCharge?.shields).toBe(0);
  });
});

describe("camping — a site that grants or takes nothing has nothing left to give or take (§8.5)", () => {
  it("grants no shield and collects no energy for a ship on an active site, and a ship already at 0 shields on a dormant site loses nothing further", () => {
    // green-dormant-camper starts at 0 shields and green starts this test
    // at 0 energy (buildState's default), so this is not a claim that
    // dormant sites are free under 0.14 — it is the floor corner case: a
    // ship with no shield left to lose and a side with no energy left to
    // take raise neither a shield-lost nor an energy-penalty effect. See
    // the dedicated "a dormant site costs" tests below for the general
    // case, where both are non-zero and both effects fire.
    const initial = buildState({
      ships: [
        ship("green-active-camper", "green", "H4"),
        ship("green-dormant-camper", "green", "N4"),
        ship("green-mover", "green", "A1"),
        ship("red-mover", "red", "O4"),
      ],
      siteStates: {
        H4: ["active", 5],
        // The recovery table's largest single draw is 8, so two turns of
        // recovery cannot bring this anywhere near zero.
        N4: ["dormant", 55],
        F2: ["charged", 0],
        J2: ["charged", 0],
        B4: ["charged", 0],
        L8: ["charged", 0],
        D8: ["charged", 0],
      },
    });

    function assertUntouched(state: GameState) {
      const active = state.ships.find(
        (candidate) => candidate.id === "green-active-camper",
      );
      const dormant = state.ships.find(
        (candidate) => candidate.id === "green-dormant-camper",
      );
      expect(active?.square).toEqual(squareFromName("H4"));
      expect(active?.shields).toBe(0);
      expect(dormant?.square).toEqual(squareFromName("N4"));
      expect(dormant?.shields).toBe(0);
      expect(state.energy.green).toBe(0);
    }

    // The board is already at its target of five charged sites, so H4
    // never gets drawn during this test — it is a clean, indefinite control.
    const afterGreenTurn = appliedOrThrow(
      applyMove(initial, "green-mover", squareFromName("A4")),
    );
    const greenTurnEffects = endOfTurnEffects(afterGreenTurn.effects);
    expect(
      greenTurnEffects.some(
        (effect) =>
          effect.type === "shield-gained" ||
          effect.type === "shield-lost" ||
          effect.type === "energy-collected" ||
          effect.type === "energy-penalty",
      ),
    ).toBe(false);
    assertUntouched(afterGreenTurn.state);

    const afterRedTurn = appliedOrThrow(
      applyMove(afterGreenTurn.state, "red-mover", squareFromName("O7")),
    );
    const redTurnEffects = endOfTurnEffects(afterRedTurn.effects);
    expect(
      redTurnEffects.some(
        (effect) =>
          effect.type === "shield-gained" ||
          effect.type === "shield-lost" ||
          effect.type === "energy-collected" ||
          effect.type === "energy-penalty",
      ),
    ).toBe(false);
    assertUntouched(afterRedTurn.state);
  });
});

describe("camping — a node running out under a ship is quiet (§8.3, §8.5)", () => {
  it("raises only node-ran-out, leaves the ship exactly where it is, and refuses nothing next turn", () => {
    const initial = buildState({
      ships: [
        ship("green-camper", "green", "H8"),
        ship("green-mover", "green", "A1"),
        ship("red-mover", "red", "O4"),
      ],
      siteStates: {
        H8: ["charged", NODE_CAPACITY - 1],
        F2: ["charged", 0],
        J2: ["charged", 0],
        B4: ["charged", 0],
        L8: ["charged", 0],
      },
    });

    const afterGreenTurn = appliedOrThrow(
      applyMove(initial, "green-mover", squareFromName("A4")),
    );
    const greenTurnEffects = endOfTurnEffects(afterGreenTurn.effects);
    // Step 1 still grants the shield due while H8 was charged, and step 2
    // still pays for it, before step 3 spends the node later in the same
    // sequence — this is the last thing green-camper is ever paid for it.
    expect(greenTurnEffects).toContainEqual({
      type: "shield-gained",
      shipId: "green-camper",
      side: "green",
      square: squareFromName("H8"),
      shields: 1,
    });
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
    expect(afterGreenTurn.state.siteStates.H8.state).toBe("dormant");
    const camperAfterRunout = afterGreenTurn.state.ships.find(
      (candidate) => candidate.id === "green-camper",
    );
    expect(camperAfterRunout?.square).toEqual(squareFromName("H8"));
    expect(camperAfterRunout?.shields).toBe(1);

    const afterRedTurn = appliedOrThrow(
      applyMove(afterGreenTurn.state, "red-mover", squareFromName("O7")),
    );

    // Nothing about green-camper binds its owner's next turn: moving a
    // different ship is accepted without refusal, and the camper itself
    // would be free to move too, though this does not take it.
    const afterGreenNextTurn = appliedOrThrow(
      applyMove(afterRedTurn.state, "green-mover", squareFromName("A1")),
    );
    expect(
      moveRefusalReason(
        afterRedTurn.state,
        "green-camper",
        squareFromName("H9"),
      ),
    ).toBeUndefined();
    const greenNextTurnEffects = endOfTurnEffects(afterGreenNextTurn.effects);
    // H8 ran out during green's own previous turn, so this is the first
    // end-of-turn sequence to find green-camper standing on it while it is
    // dormant — it first loses its shield and first pays for it here (§4.1,
    // §8.4, §8.6 step 1), not on the turn the node ran out.
    expect(greenNextTurnEffects).toContainEqual({
      type: "shield-lost",
      shipId: "green-camper",
      side: "green",
      square: squareFromName("H8"),
      shields: 0,
    });
    expect(greenNextTurnEffects).toContainEqual({
      type: "energy-penalty",
      side: "green",
      amount: 1,
      newTotal: 0,
      squares: [squareFromName("H8")],
    });
    const camperAfterNextTurn = afterGreenNextTurn.state.ships.find(
      (candidate) => candidate.id === "green-camper",
    );
    expect(camperAfterNextTurn?.square).toEqual(squareFromName("H8"));
    expect(camperAfterNextTurn?.shields).toBe(0);
  });
});

describe("camping — leaving a node for a dormant site (§8.5)", () => {
  it("leaves the node it left charged and stands on the dormant site it arrives at", () => {
    const state = buildState({
      // red-1 gives red a legal move, so applyPassGuard does not
      // immediately run a second end-of-turn sequence for a passed red
      // ply — this checks exactly the state green's own move produces.
      ships: [ship("green-1", "green", "F2", 0), ship("red-1", "red", "O1")],
      siteStates: {
        F2: ["charged", 15],
        // Comfortably above the recovery table's largest single draw (8),
        // so it stays dormant through this one ply's own recovery tick.
        H4: ["dormant", 60],
      },
    });

    const result = appliedOrThrow(
      applyMove(state, "green-1", squareFromName("H4")),
    );

    // F2 stays charged — leaving it no longer ends it (rules.md §8.3). Its
    // drain only rises by this turn's ordinary empty-rate draw.
    expect(result.state.siteStates.F2.state).toBe("charged");
    expect(result.state.siteStates.F2.level).toBeGreaterThan(15);
    expect(result.effects).not.toContainEqual(
      expect.objectContaining({ type: "node-vacated" }),
    );
    // H4 was already dormant when this ply began, so it also ticks a
    // little further towards recovery in the very same sequence — that is
    // the site's own cycle, not something arriving on it changes.
    expect(result.state.siteStates.H4.state).toBe("dormant");
    expect(result.state.siteStates.H4.level).toBeLessThan(60);
    const movedShip = result.state.ships.find(
      (candidate) => candidate.id === "green-1",
    );
    expect(movedShip?.square).toEqual(squareFromName("H4"));
  });
});

describe("camping — a dormant site costs a shield and energy, every one of its owner's turns (§4.1, §8.4)", () => {
  it("takes a shield and pays energy at the end of each of the camper's owner's own turns, and does so again the next", () => {
    const initial: GameState = {
      ...buildState({
        ships: [
          ship("green-camper", "green", "H8", 2),
          ship("green-mover", "green", "A1"),
          ship("red-mover", "red", "O4"),
        ],
        siteStates: {
          // Comfortably above the recovery table's largest single draw (8),
          // so it stays dormant through every recovery tick in this test.
          H8: ["dormant", 60],
        },
      }),
      energy: { green: 10, red: 0 },
    };

    // Green's turn: green-camper never acts — its owner spends the turn
    // moving a different ship — but the camper still pays for standing on
    // H8, exactly as it would if it had moved.
    const afterGreenTurn = appliedOrThrow(
      applyMove(initial, "green-mover", squareFromName("A4")),
    );
    const greenTurnEffects = endOfTurnEffects(afterGreenTurn.effects);
    expect(greenTurnEffects).toContainEqual({
      type: "shield-lost",
      shipId: "green-camper",
      side: "green",
      square: squareFromName("H8"),
      shields: 1,
    });
    expect(greenTurnEffects).toContainEqual({
      type: "energy-penalty",
      side: "green",
      amount: 1,
      newTotal: 9,
      squares: [squareFromName("H8")],
    });
    const camperAfterGreenTurn = afterGreenTurn.state.ships.find(
      (candidate) => candidate.id === "green-camper",
    );
    expect(camperAfterGreenTurn?.square).toEqual(squareFromName("H8"));
    expect(camperAfterGreenTurn?.shields).toBe(1);
    expect(afterGreenTurn.state.energy.green).toBe(9);

    // Red's turn: each side pays on its own turn only, so green's camper on
    // a dormant site costs green nothing at the end of red's turn.
    const afterRedTurn = appliedOrThrow(
      applyMove(afterGreenTurn.state, "red-mover", squareFromName("O7")),
    );
    const redTurnEffects = endOfTurnEffects(afterRedTurn.effects);
    expect(
      redTurnEffects.some(
        (effect) =>
          effect.type === "shield-lost" || effect.type === "energy-penalty",
      ),
    ).toBe(false);
    expect(afterRedTurn.state.energy.green).toBe(9);

    // Green's next turn: the cost recurs rather than firing once.
    const afterGreenNextTurn = appliedOrThrow(
      applyMove(afterRedTurn.state, "green-mover", squareFromName("A1")),
    );
    const greenNextTurnEffects = endOfTurnEffects(afterGreenNextTurn.effects);
    expect(greenNextTurnEffects).toContainEqual({
      type: "shield-lost",
      shipId: "green-camper",
      side: "green",
      square: squareFromName("H8"),
      shields: 0,
    });
    expect(greenNextTurnEffects).toContainEqual({
      type: "energy-penalty",
      side: "green",
      amount: 1,
      newTotal: 8,
      squares: [squareFromName("H8")],
    });
    const camperAfterGreenNextTurn = afterGreenNextTurn.state.ships.find(
      (candidate) => candidate.id === "green-camper",
    );
    expect(camperAfterGreenNextTurn?.shields).toBe(0);
    expect(afterGreenNextTurn.state.energy.green).toBe(8);
  });
});

describe("camping — an active site still pays nothing, for as many turns as a ship stays on it (§8.5)", () => {
  it("grants no shield and costs no shield or energy, across several turns, with non-zero shields and energy to lose", () => {
    const initial: GameState = {
      ...buildState({
        ships: [
          ship("green-camper", "green", "H4", 2),
          ship("green-mover", "green", "A1"),
          ship("red-mover", "red", "O4"),
        ],
        siteStates: {
          H4: ["active", 5],
          F2: ["charged", 0],
          J2: ["charged", 0],
          B4: ["charged", 0],
          L8: ["charged", 0],
          D8: ["charged", 0],
        },
      }),
      energy: { green: 10, red: 0 },
    };

    function assertUntouched(state: GameState) {
      const camper = state.ships.find(
        (candidate) => candidate.id === "green-camper",
      );
      expect(camper?.square).toEqual(squareFromName("H4"));
      expect(camper?.shields).toBe(2);
      expect(state.energy.green).toBe(10);
    }

    function assertNoSettlement(effects: readonly MoveEffect[]) {
      const plyEffects = endOfTurnEffects(effects);
      expect(
        plyEffects.some(
          (effect) =>
            effect.type === "shield-gained" ||
            effect.type === "shield-lost" ||
            effect.type === "energy-collected" ||
            effect.type === "energy-penalty",
        ),
      ).toBe(false);
    }

    // The board is already at its target of five charged sites, so H4
    // never gets drawn during this test — it is a clean, indefinite control,
    // proven across two full rounds rather than one.
    const afterGreenTurn = appliedOrThrow(
      applyMove(initial, "green-mover", squareFromName("A4")),
    );
    assertNoSettlement(afterGreenTurn.effects);
    assertUntouched(afterGreenTurn.state);

    const afterRedTurn = appliedOrThrow(
      applyMove(afterGreenTurn.state, "red-mover", squareFromName("O7")),
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

describe("camping — leaving a dormant site stops the cost immediately (§8.4, §8.5)", () => {
  it("pays nothing at the end of the turn a ship moves off a dormant site it was standing on", () => {
    const initial: GameState = {
      ...buildState({
        ships: [
          ship("green-camper", "green", "H8", 2),
          ship("red-mover", "red", "O4"),
        ],
        siteStates: {
          H8: ["dormant", 60],
        },
      }),
      energy: { green: 10, red: 0 },
    };

    // green-camper is not standing on H8 when the end-of-turn count is
    // taken, because it moved off it during this very ply — the "standing
    // on at that moment" rule (§8.4) governs the penalty exactly as it
    // governs the collection.
    const result = appliedOrThrow(
      applyMove(initial, "green-camper", squareFromName("H9")),
    );
    const effects = endOfTurnEffects(result.effects);
    expect(
      effects.some(
        (effect) =>
          effect.type === "shield-lost" || effect.type === "energy-penalty",
      ),
    ).toBe(false);
    expect(result.state.energy.green).toBe(10);
    const camper = result.state.ships.find(
      (candidate) => candidate.id === "green-camper",
    );
    expect(camper?.square).toEqual(squareFromName("H9"));
    expect(camper?.shields).toBe(2);
  });
});

describe("camping — flying across a dormant site costs nothing (§8.4)", () => {
  it("raises no shield loss or energy penalty for a move that passes over, but does not stop on, a dormant site", () => {
    const initial: GameState = {
      ...buildState({
        ships: [
          ship("green-flyer", "green", "H6", 0),
          ship("red-mover", "red", "O4"),
        ],
        siteStates: {
          H8: ["dormant", 60],
        },
      }),
      energy: { green: 10, red: 0 },
    };

    // At 0 shields green-flyer's reach includes an orthogonal move of 3,
    // so H6 -> H9 passes over H7 and H8 without stopping on either.
    const result = appliedOrThrow(
      applyMove(initial, "green-flyer", squareFromName("H9")),
    );
    const effects = endOfTurnEffects(result.effects);
    expect(
      effects.some(
        (effect) =>
          effect.type === "shield-lost" || effect.type === "energy-penalty",
      ),
    ).toBe(false);
    expect(result.state.energy.green).toBe(10);
    const flyer = result.state.ships.find(
      (candidate) => candidate.id === "green-flyer",
    );
    expect(flyer?.square).toEqual(squareFromName("H9"));
    expect(flyer?.shields).toBe(0);
  });
});
