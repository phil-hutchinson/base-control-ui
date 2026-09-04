// Integration cover for the rule that the only ways a ship recovers power
// are time in a bay and time on a depleted node (rules.md §4.1). This file
// pins the bay half end to end — a fight leaving both ships' power
// alone (§7), a bay restoring it a point at a time rather than at once
// (§3.1), and a ship leaving early keeping only what it recovered — driven
// entirely through the public rules API (`applyMove`, `applyAttack`) rather
// than by calling `runEndOfTurn` directly, so this proves the same thing a
// player's turn would. Depleted-node recovery and the charged-node drain it
// mirrors are already covered end to end by `camping.test.ts`; this file
// does not repeat them.

import { describe, expect, it } from "vitest";
import { isBay } from "./bays";
import { squareFromName, squareName } from "./board";
import type { ShipId } from "./fleet";
import { ACTIONS_PER_PLY, type GameState, type Ship } from "./gameState";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "./gameLength";
import { legalDestinations, reachFrom } from "./movement";
import {
  type AttackEffect,
  type FightResolvedEffect,
  type MoveEffect,
  type PlyEndedEffect,
  applyAttack,
  applyMove,
} from "./ply";
import type { PowerLevel } from "./power";

function ship(
  id: ShipId,
  side: "green" | "red",
  square: string,
  power: PowerLevel = 4,
): Ship {
  return { id, side, square: squareFromName(square), power };
}

function buildState(config: {
  ships: readonly Ship[];
  energy?: { green: number; red: number };
}): GameState {
  return {
    ships: config.ships,
    nodes: {},
    sideToMove: "green",
    actionsRemaining: ACTIONS_PER_PLY,
    actedThisPly: [],
    plyNumber: 1,
    randomSeed: 1,
    energy: config.energy ?? { green: 0, red: 0 },
    lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
    outOfTime: { green: false, red: false },
  };
}

/** Applies a move, throwing (with the refusal reason) if it was not legal — every move in this file is expected to succeed. */
function moveAppliedOrThrow(result: ReturnType<typeof applyMove>) {
  if (result.outcome !== "applied") {
    throw new Error(
      `expected the move to be applied, was refused as "${result.reason}"`,
    );
  }
  return result;
}

/** Applies an attack, throwing (with the refusal reason) if it was not legal — every attack in this file is expected to succeed. */
function attackAppliedOrThrow(result: ReturnType<typeof applyAttack>) {
  if (result.outcome !== "applied") {
    throw new Error(
      `expected the attack to be applied, was refused as "${result.reason}"`,
    );
  }
  return result;
}

/** The end-of-turn sequence's own effects, unwrapped from the `ply-ended` effect a ply's last action carries. */
function endOfTurnEffects(effects: readonly (MoveEffect | AttackEffect)[]) {
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

function shipOf(state: GameState, id: ShipId): Ship {
  const found = state.ships.find((candidate) => candidate.id === id);
  if (found === undefined) {
    throw new Error(`no ship with id "${id}" in this state`);
  }
  return found;
}

describe("recovery — a beaten ship recovers in its bay, a point at a time, only on its own turns, at no energy cost", () => {
  it("gains one point at the end of each of its owner's turns, never the other side's, and stops at 4", () => {
    // green-1 attacks at 0 power (still one square orthogonally, rules.md
    // §4.1) and red-1 defends at full power, so the fight itself (§7)
    // leaves them exactly as they were — pinned below via the
    // fight-resolved snapshot, which is taken before either ship's
    // end-of-turn recovery runs.
    const initial = buildState({
      ships: [
        ship("green-1", "green", "H8", 0),
        ship("red-1", "red", "H9", 4),
        ship("green-2", "green", "E5", 4),
        ship("red-2", "red", "K5", 4),
      ],
      energy: { green: 10, red: 7 },
    });

    const fight = attackAppliedOrThrow(
      applyAttack(initial, "green-1", squareFromName("H9")),
    );
    const fightResolved = fight.effects.find(
      (effect): effect is FightResolvedEffect =>
        effect.type === "fight-resolved",
    );
    if (fightResolved === undefined) {
      throw new Error("expected a fight-resolved effect");
    }
    expect(fightResolved.attacker.power).toBe(0);
    expect(fightResolved.defender.power).toBe(4);

    // Green initiated the fight, so this is the same call that closes out
    // green's own turn: green-1 arrives in a bay at the 0 power it fought
    // with and, because the fight was its side's own last action, gains its
    // first point of recovery in this very call (rules.md §3.1, §4.1).
    const fightEndEffects = endOfTurnEffects(fight.effects);
    let green1 = shipOf(fight.state, "green-1");
    const red1 = shipOf(fight.state, "red-1");
    expect(isBay(green1.square)).toBe(true);
    expect(isBay(red1.square)).toBe(true);
    expect(squareName(green1.square)).not.toBe(squareName(red1.square));
    expect(green1.power).toBe(1);
    expect(red1.power).toBe(4);
    expect(fightEndEffects).toContainEqual({
      type: "power-gained",
      shipId: "green-1",
      side: "green",
      square: green1.square,
      power: 1,
    });
    expect(
      fightEndEffects.some(
        (effect) =>
          (effect.type === "power-gained" || effect.type === "power-lost") &&
          effect.shipId === "red-1",
      ),
    ).toBe(false);
    expect(
      fightEndEffects.some(
        (effect) =>
          effect.type === "energy-collected" ||
          effect.type === "energy-penalty",
      ),
    ).toBe(false);
    expect(fight.state.energy).toEqual({ green: 10, red: 7 });

    const greenBaySquare = green1.square;
    let state = fight.state;

    // Red's turn: green-1 sits in its bay the whole time, but recovery is an
    // end-of-turn gain for the moving side only — never the other side's.
    const afterRedTurn1 = moveAppliedOrThrow(
      applyMove(state, "red-2", squareFromName("K6")),
    );
    expect(
      endOfTurnEffects(afterRedTurn1.effects).some(
        (effect) =>
          (effect.type === "power-gained" || effect.type === "power-lost") &&
          effect.shipId === "green-1",
      ),
    ).toBe(false);
    green1 = shipOf(afterRedTurn1.state, "green-1");
    expect(green1.power).toBe(1);
    expect(green1.square).toEqual(greenBaySquare);
    expect(afterRedTurn1.state.energy).toEqual({ green: 10, red: 7 });
    state = afterRedTurn1.state;

    // Green's turn: green-2 moves elsewhere, but green-1's own turn has come
    // round again, so it gains its second point.
    const afterGreenTurn2 = moveAppliedOrThrow(
      applyMove(state, "green-2", squareFromName("E6")),
    );
    expect(endOfTurnEffects(afterGreenTurn2.effects)).toContainEqual({
      type: "power-gained",
      shipId: "green-1",
      side: "green",
      square: greenBaySquare,
      power: 2,
    });
    green1 = shipOf(afterGreenTurn2.state, "green-1");
    expect(green1.power).toBe(2);
    state = afterGreenTurn2.state;

    // Red's turn again: still nothing for green-1.
    const afterRedTurn2 = moveAppliedOrThrow(
      applyMove(state, "red-2", squareFromName("K5")),
    );
    expect(shipOf(afterRedTurn2.state, "green-1").power).toBe(2);
    state = afterRedTurn2.state;

    // Green's turn: third point.
    const afterGreenTurn3 = moveAppliedOrThrow(
      applyMove(state, "green-2", squareFromName("E5")),
    );
    expect(endOfTurnEffects(afterGreenTurn3.effects)).toContainEqual({
      type: "power-gained",
      shipId: "green-1",
      side: "green",
      square: greenBaySquare,
      power: 3,
    });
    green1 = shipOf(afterGreenTurn3.state, "green-1");
    expect(green1.power).toBe(3);
    state = afterGreenTurn3.state;

    // Red's turn again: still nothing.
    const afterRedTurn3 = moveAppliedOrThrow(
      applyMove(state, "red-2", squareFromName("K6")),
    );
    expect(shipOf(afterRedTurn3.state, "green-1").power).toBe(3);
    state = afterRedTurn3.state;

    // Green's turn: fourth point reaches the maximum.
    const afterGreenTurn4 = moveAppliedOrThrow(
      applyMove(state, "green-2", squareFromName("E6")),
    );
    expect(endOfTurnEffects(afterGreenTurn4.effects)).toContainEqual({
      type: "power-gained",
      shipId: "green-1",
      side: "green",
      square: greenBaySquare,
      power: 4,
    });
    green1 = shipOf(afterGreenTurn4.state, "green-1");
    expect(green1.power).toBe(4);
    state = afterGreenTurn4.state;

    // Red's turn again: no change.
    const afterRedTurn4 = moveAppliedOrThrow(
      applyMove(state, "red-2", squareFromName("K5")),
    );
    state = afterRedTurn4.state;

    // Green's turn once more: green-1 is already at the maximum, so it gains
    // nothing further and no effect is raised for it — it never goes past 4.
    const afterGreenTurn5 = moveAppliedOrThrow(
      applyMove(state, "green-2", squareFromName("E5")),
    );
    expect(
      endOfTurnEffects(afterGreenTurn5.effects).some(
        (effect) =>
          (effect.type === "power-gained" || effect.type === "power-lost") &&
          effect.shipId === "green-1",
      ),
    ).toBe(false);
    green1 = shipOf(afterGreenTurn5.state, "green-1");
    expect(green1.power).toBe(4);
    expect(green1.square).toEqual(greenBaySquare);

    // Across the whole recovery, no energy was ever collected or paid for
    // the ship sitting in the bay.
    expect(afterGreenTurn5.state.energy).toEqual({ green: 10, red: 7 });
  });
});

describe("recovery — leaving a bay before it is full keeps what was recovered", () => {
  it("leaves at 2 power after two of its owner's turns, with the reach of a 2-power ship", () => {
    // green-1 starts one square from a bay at 0 power — its only reach — and
    // moves into it as its own first action, rather than being placed there
    // directly, so this also proves applyMove itself grants no instant
    // refill on arrival (rules.md §3.1): the first point comes from the
    // end-of-turn sequence the same move closes out, not from the move.
    const initial = buildState({
      ships: [
        ship("green-1", "green", "A1", 0),
        ship("green-2", "green", "E5", 4),
        ship("red-1", "red", "K5", 4),
      ],
    });

    const afterArrival = moveAppliedOrThrow(
      applyMove(initial, "green-1", squareFromName("A2")),
    );
    expect(
      endOfTurnEffects(afterArrival.effects).some(
        (effect) =>
          effect.type === "power-gained" && effect.shipId === "green-1",
      ),
    ).toBe(true);
    expect(shipOf(afterArrival.state, "green-1").power).toBe(1);

    // Red's turn: no change.
    const afterRedTurn1 = moveAppliedOrThrow(
      applyMove(afterArrival.state, "red-1", squareFromName("K6")),
    );

    // Green's turn: green-2 moves, green-1 gains its second point.
    const afterGreenTurn2 = moveAppliedOrThrow(
      applyMove(afterRedTurn1.state, "green-2", squareFromName("E6")),
    );
    const green1BeforeLeaving = shipOf(afterGreenTurn2.state, "green-1");
    expect(green1BeforeLeaving.power).toBe(2);

    // Red's turn: no change.
    const afterRedTurn2 = moveAppliedOrThrow(
      applyMove(afterGreenTurn2.state, "red-1", squareFromName("K5")),
    );

    // Green's turn: green-1 itself moves out of the bay instead of staying.
    // It is no longer standing in a bay when this same turn ends, so it does
    // not gain a further point in this call — it leaves with exactly the 2
    // power it had recovered.
    const destination = squareFromName("A4");
    const afterLeaving = moveAppliedOrThrow(
      applyMove(afterRedTurn2.state, "green-1", destination),
    );
    expect(
      endOfTurnEffects(afterLeaving.effects).some(
        (effect) =>
          (effect.type === "power-gained" || effect.type === "power-lost") &&
          effect.shipId === "green-1",
      ),
    ).toBe(false);
    const green1AfterLeaving = shipOf(afterLeaving.state, "green-1");
    expect(green1AfterLeaving.power).toBe(2);
    expect(green1AfterLeaving.square).toEqual(destination);

    // Its reach from where it landed is exactly a 2-power ship's reach
    // (rules.md §6) — not the full twenty-square range a refill would give
    // it.
    const twoPowerReach = reachFrom(destination, 2)
      .map((entry) => squareName(entry.destination))
      .sort();
    const fullPowerReach = reachFrom(destination, 4)
      .map((entry) => squareName(entry.destination))
      .sort();
    expect(twoPowerReach).not.toEqual(fullPowerReach);
    // legalDestinations also checks whose turn it is; the turn has already
    // passed to red by this point, so this asks the same question of a
    // state where it is green-1's own move to make, which is the only thing
    // this assertion is about.
    const stateForReachCheck: GameState = {
      ...afterLeaving.state,
      sideToMove: "green",
      actedThisPly: [],
    };
    const actualReach = legalDestinations(stateForReachCheck, "green-1")
      .map(squareName)
      .sort();
    expect(actualReach).toEqual(twoPowerReach);
  });
});

describe("recovery — a fight between ships at different powers changes neither (rules.md §7)", () => {
  it("returns a full-power attacker and a drained defender each carrying what they had, with both origin squares emptied", () => {
    const initial = buildState({
      ships: [ship("green-1", "green", "H8", 4), ship("red-1", "red", "H9", 0)],
    });

    const result = attackAppliedOrThrow(
      applyAttack(initial, "green-1", squareFromName("H9")),
    );

    const fightResolved = result.effects.find(
      (effect): effect is FightResolvedEffect =>
        effect.type === "fight-resolved",
    );
    if (fightResolved === undefined) {
      throw new Error("expected a fight-resolved effect");
    }
    expect(fightResolved.attacker.power).toBe(4);
    expect(fightResolved.defender.power).toBe(0);

    // The attacker is already at the maximum, so even though it is the
    // moving side's own ship ending this same turn in a bay, it has nothing
    // left to gain — its final power is exactly what the fight left it with.
    const green1 = shipOf(result.state, "green-1");
    const red1 = shipOf(result.state, "red-1");
    expect(green1.power).toBe(4);
    expect(red1.power).toBe(0);
    expect(isBay(green1.square)).toBe(true);
    expect(isBay(red1.square)).toBe(true);

    const occupiedSquareNames = result.state.ships.map((candidate) =>
      squareName(candidate.square),
    );
    expect(occupiedSquareNames).not.toContain("H8");
    expect(occupiedSquareNames).not.toContain("H9");
  });
});
