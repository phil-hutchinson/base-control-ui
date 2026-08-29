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

describe("camping — a site that is not charged pays nothing (§8.5)", () => {
  it("grants no shield and collects no energy for a ship on an active or a dormant site", () => {
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
          effect.type === "shield-gained" || effect.type === "energy-collected",
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
          effect.type === "shield-gained" || effect.type === "energy-collected",
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
    const camperAfterNextTurn = afterGreenNextTurn.state.ships.find(
      (candidate) => candidate.id === "green-camper",
    );
    expect(camperAfterNextTurn?.square).toEqual(squareFromName("H8"));
    // H8 ran out during green's own previous turn, so this is the first
    // end-of-turn sequence to find green-camper standing on it while it is
    // dormant — it pays the shield loss here (§4.1, §8.6 step 1).
    expect(camperAfterNextTurn?.shields).toBe(0);
  });
});

describe("camping — leaving a node for a dormant site (§8.5, §8.7)", () => {
  it("ends the node it left and stands on the dormant site it arrives at", () => {
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

    expect(result.state.siteStates.F2).toEqual({
      state: "dormant",
      level: 15,
    });
    expect(result.effects).toContainEqual({
      type: "node-vacated",
      square: squareFromName("F2"),
      shipId: "green-1",
      side: "green",
    });
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
