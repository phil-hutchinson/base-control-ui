// Integration cover for the rule that a planet is now the only way a ship
// recovers power (rules.md §4.1, §3.1) — a charged node no longer drains the
// ship holding it and a depleted node no longer refills one, so recovery
// only ever happens on a planet, at the rate §3.1 sets by how many of the
// owner's ships are charging there at once. This file pins that end to end —
// a fight leaving both ships' power alone but for the attacker's own cost
// (§7), a planet restoring power a turn at a time rather than all at once
// (§3.1), and a ship leaving early keeping only what it recovered — driven
// entirely through the public rules API (`applyMove`, `applyAttack`) rather
// than by calling `runEndOfTurn` directly, so this proves the same thing a
// player's turn would. The rate itself — lone ship 2, several ships 1 each,
// a full ship excluded from the count — is covered directly by
// `endOfTurn.test.ts`; this file only needs one ship recovering alone to
// prove the planet-only, turn-at-a-time claim.

import { describe, expect, it } from "vitest";
import { isPlanet } from "./planets";
import { squareFromName, squareName } from "./board";
import type { ShipId } from "./fleet";
import type { GameState, Ship } from "./gameState";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "./gameLength";
import { DEFAULT_CHARGED_NODE_COUNT } from "./nodes";
import { legalDestinations, reachFrom } from "./movement";
import {
  type AttackEffect,
  type FightResolvedEffect,
  type MoveEffect,
  type PlyEndedEffect,
  applyAttack,
  applyMove,
} from "./ply";
import { MAX_POWER, type PowerLevel } from "./power";

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
    plyNumber: 1,
    randomSeed: 1,
    openingSeed: 1,
    energy: config.energy ?? { green: 0, red: 0 },
    lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
    chargedNodeCount: DEFAULT_CHARGED_NODE_COUNT,
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

/** The end-of-turn sequence's own effects, unwrapped from the `ply-ended` effect a move or an attack carries. */
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

describe("recovery — a beaten ship recovers on its planet, at the lone-charger rate of 2 a turn, only on its own turns, at no energy cost", () => {
  it("gains 2 at the end of each of its owner's turns, never the other side's, and stops at the maximum", () => {
    // green-1 attacks at 0 power (still one square orthogonally, rules.md
    // §4.1) and red-1 defends at full power, so the fight itself (§7)
    // leaves them exactly as they were — pinned below via the
    // fight-resolved snapshot, which is taken before either ship's
    // end-of-turn recovery runs.
    const initial = buildState({
      ships: [
        ship("green-1", "green", "H8", 0),
        ship("red-1", "red", "H9", MAX_POWER),
        ship("green-2", "green", "E5", MAX_POWER),
        ship("red-2", "red", "K5", MAX_POWER),
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
    expect(fightResolved.defender.power).toBe(MAX_POWER);

    // Green initiated the fight, so this is the same call that closes out
    // green's own turn: green-1 arrives on a planet at the 0 power it
    // fought with (an orthogonal jab costs nothing) and, because the fight
    // was its side's own last turn, gains its first two points of
    // recovery in this very call (rules.md §3.1, §4.1) — it is the only
    // green ship on a planet, so it charges alone.
    const fightEndEffects = endOfTurnEffects(fight.effects);
    let green1 = shipOf(fight.state, "green-1");
    const red1 = shipOf(fight.state, "red-1");
    expect(isPlanet(green1.square)).toBe(true);
    expect(isPlanet(red1.square)).toBe(true);
    expect(squareName(green1.square)).not.toBe(squareName(red1.square));
    expect(green1.power).toBe(2);
    expect(red1.power).toBe(MAX_POWER);
    expect(fightEndEffects).toContainEqual({
      type: "power-gained",
      shipId: "green-1",
      side: "green",
      square: green1.square,
      power: 2,
      amount: 2,
    });
    expect(
      fightEndEffects.some(
        (effect) => effect.type === "power-gained" && effect.shipId === "red-1",
      ),
    ).toBe(false);
    expect(
      fightEndEffects.some((effect) => effect.type === "energy-collected"),
    ).toBe(false);
    expect(fight.state.energy).toEqual({ green: 10, red: 7 });

    const greenPlanetSquare = green1.square;
    let state = fight.state;

    // Red's turn: green-1 sits on its planet the whole time, but recovery is
    // an end-of-turn gain for the moving side only — never the other side's.
    const afterRedTurn1 = moveAppliedOrThrow(
      applyMove(state, "red-2", squareFromName("K6")),
    );
    expect(
      endOfTurnEffects(afterRedTurn1.effects).some(
        (effect) =>
          effect.type === "power-gained" && effect.shipId === "green-1",
      ),
    ).toBe(false);
    green1 = shipOf(afterRedTurn1.state, "green-1");
    expect(green1.power).toBe(2);
    expect(green1.square).toEqual(greenPlanetSquare);
    expect(afterRedTurn1.state.energy).toEqual({ green: 10, red: 7 });
    state = afterRedTurn1.state;

    // Green's turn: green-2 moves elsewhere, but green-1's own turn has come
    // round again, so it gains its second helping of 2, still charging
    // alone.
    const afterGreenTurn2 = moveAppliedOrThrow(
      applyMove(state, "green-2", squareFromName("E6")),
    );
    expect(endOfTurnEffects(afterGreenTurn2.effects)).toContainEqual({
      type: "power-gained",
      shipId: "green-1",
      side: "green",
      square: greenPlanetSquare,
      power: 4,
      amount: 2,
    });
    green1 = shipOf(afterGreenTurn2.state, "green-1");
    expect(green1.power).toBe(4);
    state = afterGreenTurn2.state;

    // Red's turn again: still nothing for green-1.
    const afterRedTurn2 = moveAppliedOrThrow(
      applyMove(state, "red-2", squareFromName("K5")),
    );
    expect(shipOf(afterRedTurn2.state, "green-1").power).toBe(4);
    state = afterRedTurn2.state;

    // Green's turn: the third helping of 2 reaches the maximum exactly, with
    // nothing lost to the cap.
    const afterGreenTurn3 = moveAppliedOrThrow(
      applyMove(state, "green-2", squareFromName("E5")),
    );
    expect(endOfTurnEffects(afterGreenTurn3.effects)).toContainEqual({
      type: "power-gained",
      shipId: "green-1",
      side: "green",
      square: greenPlanetSquare,
      power: MAX_POWER,
      amount: 2,
    });
    green1 = shipOf(afterGreenTurn3.state, "green-1");
    expect(green1.power).toBe(MAX_POWER);
    state = afterGreenTurn3.state;

    // Red's turn again: no change.
    const afterRedTurn3 = moveAppliedOrThrow(
      applyMove(state, "red-2", squareFromName("K6")),
    );
    state = afterRedTurn3.state;

    // Green's turn once more: green-1 is already at the maximum, so it is no
    // longer charging at all — it gains nothing further and no effect is
    // raised for it, and it never goes past the maximum.
    const afterGreenTurn4 = moveAppliedOrThrow(
      applyMove(state, "green-2", squareFromName("E6")),
    );
    expect(
      endOfTurnEffects(afterGreenTurn4.effects).some(
        (effect) =>
          effect.type === "power-gained" && effect.shipId === "green-1",
      ),
    ).toBe(false);
    green1 = shipOf(afterGreenTurn4.state, "green-1");
    expect(green1.power).toBe(MAX_POWER);
    expect(green1.square).toEqual(greenPlanetSquare);

    // Across the whole recovery, no energy was ever collected or paid for
    // the ship sitting on the planet.
    expect(afterGreenTurn4.state.energy).toEqual({ green: 10, red: 7 });
  });
});

describe("recovery — leaving a planet before it is full keeps what was recovered", () => {
  it("leaves at 2 power after just one of its owner's turns, with the reach of a 2-power ship", () => {
    // green-1 starts one square from a planet at 0 power — its only reach —
    // and moves onto it as its own first move, rather than being placed
    // there directly, so this also proves applyMove itself grants no instant
    // refill on arrival (rules.md §3.1): the point comes from the
    // end-of-turn sequence the same move closes out, not from the move. It
    // is the only green ship on a planet, so it charges alone and gains 2
    // in that one turn.
    const initial = buildState({
      ships: [
        ship("green-1", "green", "C6", 0),
        ship("green-2", "green", "H8", 4),
        ship("red-1", "red", "K8", 4),
      ],
    });

    const afterArrival = moveAppliedOrThrow(
      applyMove(initial, "green-1", squareFromName("D6")),
    );
    expect(endOfTurnEffects(afterArrival.effects)).toContainEqual(
      expect.objectContaining({
        type: "power-gained",
        shipId: "green-1",
        amount: 2,
      }),
    );
    expect(shipOf(afterArrival.state, "green-1").power).toBe(2);

    // Red's turn: no change.
    const afterRedTurn1 = moveAppliedOrThrow(
      applyMove(afterArrival.state, "red-1", squareFromName("K9")),
    );

    // Green's turn: green-1 itself moves off the planet instead of staying,
    // with a free one-square orthogonal step (rules.md §6) so the move
    // itself spends nothing. It is no longer standing on a planet when this
    // same turn ends, so it does not gain a further point in this call
    // either — it leaves with exactly the 2 power it recovered in its one
    // turn there.
    const destination = squareFromName("E6");
    const afterLeaving = moveAppliedOrThrow(
      applyMove(afterRedTurn1.state, "green-1", destination),
    );
    expect(
      endOfTurnEffects(afterLeaving.effects).some(
        (effect) =>
          effect.type === "power-gained" && effect.shipId === "green-1",
      ),
    ).toBe(false);
    const green1AfterLeaving = shipOf(afterLeaving.state, "green-1");
    expect(green1AfterLeaving.power).toBe(2);
    expect(green1AfterLeaving.square).toEqual(destination);

    // Its reach from where it landed is exactly a 2-power ship's reach
    // (rules.md §6) — twenty of the thirty-six squares a ship can ever
    // reach, since 3 power buys three more shapes and unlocks the rest; a
    // further refill would buy it a longer reach, not just a deeper budget
    // to spend the same shapes from. A 1-power ship's reach is smaller
    // still, for contrast.
    const twoPowerReach = reachFrom(destination, 2)
      .map((entry) => squareName(entry.destination))
      .sort();
    const onePowerReach = reachFrom(destination, 1)
      .map((entry) => squareName(entry.destination))
      .sort();
    const threePowerReach = reachFrom(destination, 3)
      .map((entry) => squareName(entry.destination))
      .sort();
    expect(twoPowerReach).toHaveLength(20);
    expect(onePowerReach).not.toEqual(twoPowerReach);
    expect(threePowerReach).toHaveLength(36);
    expect(threePowerReach).not.toEqual(twoPowerReach);
    // legalDestinations also checks whose turn it is; the turn has already
    // passed to red by this point, so this asks the same question of a
    // state where it is green-1's own move to make, which is the only thing
    // this assertion is about.
    const stateForReachCheck: GameState = {
      ...afterLeaving.state,
      sideToMove: "green",
    };
    const actualReach = legalDestinations(stateForReachCheck, "green-1")
      .map(squareName)
      .sort();
    expect(actualReach).toEqual(twoPowerReach);
  });
});

describe("recovery — a free orthogonal attack leaves both ships' power where it was, and empties both origin squares", () => {
  it("returns a full-power attacker and a drained defender each carrying what they had, with both origin squares emptied", () => {
    const initial = buildState({
      ships: [
        ship("green-1", "green", "H8", MAX_POWER),
        ship("red-1", "red", "H9", 0),
      ],
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
    expect(fightResolved.attacker.power).toBe(MAX_POWER);
    expect(fightResolved.defender.power).toBe(0);

    // The attacker is already at the maximum, so it does not count as
    // charging at all (§3.1) even though it is the moving side's own ship
    // ending this same turn on a planet — it has nothing left to gain, so
    // its final power is exactly what the fight left it with.
    const green1 = shipOf(result.state, "green-1");
    const red1 = shipOf(result.state, "red-1");
    expect(green1.power).toBe(MAX_POWER);
    expect(red1.power).toBe(0);
    expect(isPlanet(green1.square)).toBe(true);
    expect(isPlanet(red1.square)).toBe(true);

    const occupiedSquareNames = result.state.ships.map((candidate) =>
      squareName(candidate.square),
    );
    expect(occupiedSquareNames).not.toContain("H8");
    expect(occupiedSquareNames).not.toContain("H9");
  });
});
