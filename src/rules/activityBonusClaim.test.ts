// Claiming a planet activity bonus through play (steal.md §10): the
// `claimActivityBonus` helper in `ply.ts` that `applyMove` and `applyAttack`
// both call, and the reordered fight this claim order requires. Kept apart
// from `ply.test.ts` and `planetBonusClaim.test.ts`, in the same style,
// since claiming under planet activity has its own state shape (`activityBonuses`
// rather than `bonusPlanets`). `resolveActivityBonusClaim` itself — the pure
// function this all wraps — is tested directly in `activityBonus.test.ts`;
// this file is about what `ply.ts` does with it: when a claim fires, where
// its effect sits, and how a fight's two landings interact with it.

import { describe, expect, it } from "vitest";
import type { ActivityBonusEntry, ActivityBonusKind } from "./activityBonus";
import {
  activityBonusPoints,
  drawActivityBonusKind,
  drawActivityBonusPlanet,
  resolveActivityBonusClaim,
} from "./activityBonus";
import { type Square, squareAt, squareFromName, squareName } from "./board";
import type { ShipId } from "./fleet";
import { type GameState, type NodeStatus, type Ship } from "./gameState";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "./gameLength";
import {
  type ActivityBonusClaimedEffect,
  applyAttack,
  applyMove,
  assertFightInvariants,
} from "./ply";
import { MAX_POWER, type PowerLevel } from "./power";
import { drawIndex, mulberry32 } from "./random";
import type { ChargedNodeCount } from "./nodes";
import type { PlanetActivitySetting } from "./planetActivity";
import type { PlayerMatchingSetting } from "./playerMatching";
import type { ScoringSetting } from "./scoring";
import { addExtraProspectiveSquares, everyNodeHasExtra } from "./steal";
import { PLANETS } from "./planets";

function ship(
  id: ShipId,
  side: "green" | "red",
  square: Square | string,
  power: PowerLevel = 4,
): Ship {
  return {
    id,
    side,
    square: typeof square === "string" ? squareFromName(square) : square,
    power,
  };
}

function bonuses(
  first: readonly [Square, ActivityBonusKind],
  second: readonly [Square, ActivityBonusKind],
): readonly [ActivityBonusEntry, ActivityBonusEntry] {
  return [
    { square: first[0], kind: first[1] },
    { square: second[0], kind: second[1] },
  ];
}

/** The square directly below `square`, one row down — safe for any of the twelve planets, whose rows all sit well clear of row 1. */
function belowSquare(square: Square): Square {
  return squareAt(square.column, square.row - 1);
}

function buildState(config: {
  ships: readonly Ship[];
  sideToMove?: "green" | "red";
  nodes?: Readonly<Record<string, NodeStatus>>;
  plyNumber?: number;
  chargedNodeCount?: ChargedNodeCount;
  energy?: { green: number; red: number };
  activityBonuses?: readonly [ActivityBonusEntry, ActivityBonusEntry];
  playerMatching?: PlayerMatchingSetting;
  scoring?: ScoringSetting;
  randomSeed?: number;
  combatEnabled?: boolean;
  planetActivity?: Exclude<PlanetActivitySetting, "off">;
}): GameState {
  return {
    ships: config.ships,
    nodes: config.nodes ?? {},
    sideToMove: config.sideToMove ?? "green",
    plyNumber: config.plyNumber ?? 1,
    randomSeed: config.randomSeed ?? 1,
    openingSeed: config.randomSeed ?? 1,
    nodePlaystyle: "steal",
    rotators: [],
    planetBonus: "off",
    bonusPlanets: { green: [], red: [] },
    planetActivity: config.planetActivity ?? "race",
    activityBonuses:
      config.activityBonuses ??
      bonuses([PLANETS[0], "small-points"], [PLANETS[1], "fuel"]),
    energy: config.energy ?? { green: 0, red: 0 },
    lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
    chargedNodeCount: config.chargedNodeCount ?? 3,
    outOfTime: { green: false, red: false },
    combatEnabled: config.combatEnabled ?? true,
    scoring: config.scoring ?? "simple",
    playerMatching: config.playerMatching ?? "off",
  };
}

describe("a move that lands on a planet activity bonus planet (steal.md §10)", () => {
  it("pays the moving side a points bonus's table amount, immediately, before the ply-ended effect", () => {
    const [planet, other] = PLANETS;
    const state = buildState({
      ships: [
        ship("green-1", "green", belowSquare(planet)),
        ship("red-1", "red", "A1"),
      ],
      activityBonuses: bonuses([planet, "large-points"], [other, "fuel"]),
    });

    const result = applyMove(state, "green-1", planet);

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(result.state.energy.green).toBe(
      activityBonusPoints(3, "off", "simple", "large"),
    );
    expect(result.state.energy.red).toBe(0);
    const claimIndex = result.effects.findIndex(
      (effect) => effect.type === "activity-bonus-claimed",
    );
    const plyEndedIndex = result.effects.findIndex(
      (effect) => effect.type === "ply-ended",
    );
    expect(claimIndex).toBeGreaterThanOrEqual(0);
    expect(plyEndedIndex).toBeGreaterThan(claimIndex);
  });

  it("pays under REQUIRED player-matching nodes even though the claiming side does not hold its own node (steal.md §9, §10)", () => {
    const [planet, other] = PLANETS;
    const state = buildState({
      ships: [
        ship("green-1", "green", belowSquare(planet)),
        // Green holds a charged node, but not its own (signal 4 of 5) —
        // REQUIRED withholds green's node energy this turn, but that must
        // not touch the bonus claim below.
        ship("green-2", "green", "F10"),
        ship("red-1", "red", "A1"),
      ],
      chargedNodeCount: 5,
      playerMatching: "required",
      nodes: { F10: { state: "charged", level: 0, signal: 0 } },
      activityBonuses: bonuses([planet, "small-points"], [other, "fuel"]),
    });

    const result = applyMove(state, "green-1", planet);

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(result.state.energy.green).toBe(
      activityBonusPoints(5, "required", "simple", "small"),
    );
    expect(result.effects).not.toContainEqual(
      expect.objectContaining({ type: "energy-collected" }),
    );
  });

  it("raises every one of the claiming side's ships below the maximum by one power, and leaves the opponent untouched", () => {
    const [planet, other] = PLANETS;
    const state = buildState({
      ships: [
        ship("green-1", "green", belowSquare(planet), 3),
        ship("green-2", "green", "A5", 2),
        ship("green-3", "green", "B6", MAX_POWER),
        ship("red-1", "red", "C7", 3),
      ],
      activityBonuses: bonuses([planet, "fuel"], [other, "large-points"]),
    });

    const result = applyMove(state, "green-1", planet);

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    // green-2 stands off any planet, so its power reflects Fuel alone, with
    // no end-of-turn recovery to confound the check.
    const fuelledMate = result.state.ships.find((s) => s.id === "green-2");
    expect(fuelledMate?.power).toBe(3);
    const fullShip = result.state.ships.find((s) => s.id === "green-3");
    expect(fullShip?.power).toBe(MAX_POWER);
    const opponent = result.state.ships.find((s) => s.id === "red-1");
    expect(opponent?.power).toBe(3);
    expect(result.effects).toContainEqual(
      expect.objectContaining({
        type: "activity-bonus-claimed",
        kind: "fuel",
        poweredShipIds: expect.arrayContaining(["green-1", "green-2"]),
      }),
    );
  });

  it("gives every node an extra prospective square, unavailable again only once every node already has one", () => {
    const [planet, other] = PLANETS;
    const nodes: Record<string, NodeStatus> = {
      G8: { state: "prospective", level: 0, signal: 0 },
      H8: { state: "prospective", level: 0, signal: 0 },
      C3: { state: "prospective", level: 0, signal: 1 },
      D4: { state: "prospective", level: 0, signal: 1 },
      F9: { state: "prospective", level: 0, signal: 2 },
      F5: { state: "prospective", level: 0, signal: 2 },
    };
    const state = buildState({
      ships: [
        ship("green-1", "green", belowSquare(planet)),
        ship("red-1", "red", "A1"),
      ],
      nodes,
      activityBonuses: bonuses(
        [planet, "additional-nodes"],
        [other, "large-points"],
      ),
    });

    const result = applyMove(state, "green-1", planet);

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(everyNodeHasExtra(result.state.nodes, 3)).toBe(true);
    expect(result.effects).toContainEqual(
      expect.objectContaining({
        type: "activity-bonus-claimed",
        kind: "additional-nodes",
      }),
    );
  });

  it("redraws every node's ordinary prospective squares, leaving charged squares and extras where they were", () => {
    const [planet, other] = PLANETS;
    const nodes: Record<string, NodeStatus> = {
      G8: { state: "charged", level: 0, signal: 0 },
      H8: { state: "prospective", level: 0, signal: 0 },
      L8: { state: "prospective", level: 0, signal: 0, extra: true },
      C3: { state: "prospective", level: 0, signal: 1 },
      D4: { state: "prospective", level: 0, signal: 1 },
      F5: { state: "prospective", level: 0, signal: 2 },
      N2: { state: "prospective", level: 0, signal: 2, extra: true },
    };
    const state = buildState({
      ships: [
        ship("green-1", "green", belowSquare(planet)),
        ship("red-1", "red", "A1"),
      ],
      nodes,
      activityBonuses: bonuses(
        [planet, "node-scramble"],
        [other, "large-points"],
      ),
    });

    const result = applyMove(state, "green-1", planet);

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(result.state.nodes.G8).toEqual(nodes.G8);
    expect(result.state.nodes.L8).toEqual(nodes.L8);
    expect(result.state.nodes.N2).toEqual(nodes.N2);
    expect(result.effects).toContainEqual(
      expect.objectContaining({
        type: "activity-bonus-claimed",
        kind: "node-scramble",
      }),
    );
  });

  it("leaves exactly two bonuses, on two different empty planets, of two different kinds, after any claim", () => {
    const [planet, other] = PLANETS;
    const state = buildState({
      ships: [
        ship("green-1", "green", belowSquare(planet)),
        ship("red-1", "red", "A1"),
      ],
      activityBonuses: bonuses([planet, "small-points"], [other, "fuel"]),
    });

    const result = applyMove(state, "green-1", planet);

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    const [first, second] = result.state.activityBonuses;
    expect(squareName(first.square)).not.toBe(squareName(second.square));
    expect(first.kind).not.toBe(second.kind);
    const shipSquareNames = new Set(
      result.state.ships.map((s) => squareName(s.square)),
    );
    expect(shipSquareNames.has(squareName(first.square))).toBe(false);
    expect(shipSquareNames.has(squareName(second.square))).toBe(false);
  });

  it("keeps the survivor in its own slot and puts the new bonus in the claimed slot", () => {
    const [planet, other] = PLANETS;
    const claimedFirst = buildState({
      ships: [
        ship("green-1", "green", belowSquare(planet)),
        ship("red-1", "red", "A1"),
      ],
      activityBonuses: bonuses([planet, "small-points"], [other, "fuel"]),
    });
    const resultFirst = applyMove(claimedFirst, "green-1", planet);
    expect(resultFirst.outcome).toBe("applied");
    if (resultFirst.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(squareName(resultFirst.state.activityBonuses[1].square)).toBe(
      squareName(other),
    );
    expect(squareName(resultFirst.state.activityBonuses[0].square)).not.toBe(
      squareName(planet),
    );

    const claimedSecond = buildState({
      ships: [
        ship("green-1", "green", belowSquare(other)),
        ship("red-1", "red", "A1"),
      ],
      activityBonuses: bonuses([planet, "small-points"], [other, "fuel"]),
    });
    const resultSecond = applyMove(claimedSecond, "green-1", other);
    expect(resultSecond.outcome).toBe("applied");
    if (resultSecond.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(squareName(resultSecond.state.activityBonuses[0].square)).toBe(
      squareName(planet),
    );
    expect(squareName(resultSecond.state.activityBonuses[1].square)).not.toBe(
      squareName(other),
    );
  });

  it("claims nothing when a move merely flies over a bonus planet on its way elsewhere", () => {
    const bonusPlanet = squareFromName("D6");
    const otherPlanet = PLANETS.find((square) => squareName(square) !== "D6")!;
    const state = buildState({
      ships: [ship("green-1", "green", "D4", 3), ship("red-1", "red", "A1")],
      activityBonuses: bonuses(
        [bonusPlanet, "small-points"],
        [otherPlanet, "fuel"],
      ),
    });

    // D4 to D7 is a three-square orthogonal move, passing over D5 and D6 —
    // the bonus planet — without ending there.
    const result = applyMove(state, "green-1", squareFromName("D7"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(result.effects).not.toContainEqual(
      expect.objectContaining({ type: "activity-bonus-claimed" }),
    );
    expect(result.state.activityBonuses).toEqual(state.activityBonuses);
    expect(result.state.energy.green).toBe(0);
  });

  it("a move that leaves a charged node and lands on a Node scramble planet scrambles the already-Open node (steal.md §10)", () => {
    // The planet sits directly above its node's charged square, so leaving
    // that square and landing on the planet is one orthogonal step.
    const planet = PLANETS[1];
    const other = PLANETS[0];
    const chargedSquare = belowSquare(planet);
    const remainingProspective = squareAt(planet.column, planet.row - 3);
    const nodes: Record<string, NodeStatus> = {
      // signal 0: Held, its ship about to leave — no extra.
      [squareName(chargedSquare)]: { state: "charged", level: 0, signal: 0 },
      [squareName(remainingProspective)]: {
        state: "prospective",
        level: 0,
        signal: 0,
      },
      // signal 1: an unrelated Open node, untouched by the move.
      C3: { state: "prospective", level: 0, signal: 1 },
      D4: { state: "prospective", level: 0, signal: 1 },
      // signal 2: another unrelated Open node, untouched by the move.
      F9: { state: "prospective", level: 0, signal: 2 },
      F5: { state: "prospective", level: 0, signal: 2 },
    };
    const state = buildState({
      ships: [
        ship("green-1", "green", chargedSquare),
        ship("red-1", "red", "A1"),
      ],
      nodes,
      chargedNodeCount: 3,
      activityBonuses: bonuses(
        [planet, "node-scramble"],
        [other, "large-points"],
      ),
    });

    const result = applyMove(state, "green-1", planet);

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(result.effects).toContainEqual(
      expect.objectContaining({ type: "node-abandoned", signal: 0 }),
    );
    // The old charged square is gone — the leave already cleared it before
    // the scramble ran.
    expect(result.state.nodes[squareName(chargedSquare)]).toBeUndefined();
    const signalZeroSquares = Object.entries(result.state.nodes).filter(
      ([, status]) => status.signal === 0,
    );
    expect(signalZeroSquares).toHaveLength(2);
    for (const [, status] of signalZeroSquares) {
      expect(status.state).toBe("prospective");
      expect(status.extra).toBeUndefined();
    }
  });

  it("leaves three prospective squares on a node whose extra survives both the leave and the scramble", () => {
    // signal 0: Held with an extra, its ship about to leave. Leaving turns
    // it Open with three squares (two ordinary plus the surviving extra),
    // and the same move's Node scramble claim must then redraw both
    // ordinary squares while leaving the extra where it stands.
    const planet = PLANETS[1];
    const other = PLANETS[0];
    const chargedSquare = belowSquare(planet);
    const remainingProspective = squareAt(planet.column, planet.row - 3);
    const extraSquare = squareAt("M", 2);
    const nodes: Record<string, NodeStatus> = {
      [squareName(chargedSquare)]: { state: "charged", level: 0, signal: 0 },
      [squareName(remainingProspective)]: {
        state: "prospective",
        level: 0,
        signal: 0,
      },
      [squareName(extraSquare)]: {
        state: "prospective",
        level: 0,
        signal: 0,
        extra: true,
      },
      // signal 1: an unrelated Open node, untouched by the move.
      C3: { state: "prospective", level: 0, signal: 1 },
      D4: { state: "prospective", level: 0, signal: 1 },
      // signal 2: another unrelated Open node, untouched by the move.
      F9: { state: "prospective", level: 0, signal: 2 },
      F5: { state: "prospective", level: 0, signal: 2 },
    };
    const state = buildState({
      ships: [
        ship("green-1", "green", chargedSquare),
        ship("red-1", "red", "A1"),
      ],
      nodes,
      chargedNodeCount: 3,
      activityBonuses: bonuses(
        [planet, "node-scramble"],
        [other, "large-points"],
      ),
    });

    const result = applyMove(state, "green-1", planet);

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    const signalZeroSquares = Object.entries(result.state.nodes).filter(
      ([, status]) => status.signal === 0,
    );
    expect(signalZeroSquares).toHaveLength(3);
    const extras = signalZeroSquares.filter(([, status]) => status.extra);
    expect(extras).toHaveLength(1);
    expect(extras[0][0]).toBe(squareName(extraSquare));
    for (const [, status] of signalZeroSquares) {
      expect(status.state).toBe("prospective");
    }
  });
});

/** How many seed steps separate `from` and `to`, counting up to a generous bound. */
function seedStepsBetween(from: number, to: number): number {
  let seed = from;
  for (let steps = 0; steps <= 64; steps++) {
    if (seed === to) {
      return steps;
    }
    [, seed] = mulberry32(seed);
  }
  throw new Error("the two seeds are not within 64 steps of each other");
}

describe("a claim under stable planet activity (steal.md §10)", () => {
  const [claimedPlanet, survivorPlanet] = PLANETS;

  const cases: readonly {
    readonly kind: ActivityBonusKind;
    readonly nodes: Readonly<Record<string, NodeStatus>>;
    readonly chargedNodeCount: ChargedNodeCount;
  }[] = [
    { kind: "large-points", nodes: {}, chargedNodeCount: 3 },
    { kind: "fuel", nodes: {}, chargedNodeCount: 3 },
    {
      kind: "additional-nodes",
      nodes: {
        G8: { state: "prospective", level: 0, signal: 0 },
        H8: { state: "prospective", level: 0, signal: 0 },
        C3: { state: "prospective", level: 0, signal: 1 },
        D4: { state: "prospective", level: 0, signal: 1 },
        F9: { state: "prospective", level: 0, signal: 2 },
        F5: { state: "prospective", level: 0, signal: 2 },
      },
      chargedNodeCount: 3,
    },
    {
      kind: "node-scramble",
      nodes: {
        G8: { state: "charged", level: 0, signal: 0 },
        H8: { state: "prospective", level: 0, signal: 0 },
        C3: { state: "prospective", level: 0, signal: 1 },
        D4: { state: "prospective", level: 0, signal: 1 },
        F9: { state: "prospective", level: 0, signal: 2 },
        F5: { state: "prospective", level: 0, signal: 2 },
      },
      chargedNodeCount: 3,
    },
  ];

  function stateUnder(
    planetActivity: "stable" | "race",
    kind: ActivityBonusKind,
    nodes: Readonly<Record<string, NodeStatus>>,
    chargedNodeCount: ChargedNodeCount,
    randomSeed: number,
  ): GameState {
    return buildState({
      planetActivity,
      ships: [
        ship("green-1", "green", claimedPlanet),
        ship("red-1", "red", PLANETS[2]),
      ],
      nodes,
      chargedNodeCount,
      activityBonuses: bonuses(
        [claimedPlanet, kind],
        [survivorPlanet, kind === "medium-points" ? "fuel" : "medium-points"],
      ),
      randomSeed,
    });
  }

  for (const { kind, nodes, chargedNodeCount } of cases) {
    it(`keeps the survivor's square and kind when ${kind} is claimed, and deals a new bonus of a different kind on another empty planet in the claimed slot`, () => {
      for (let seed = 1; seed <= 60; seed++) {
        const state = stateUnder("stable", kind, nodes, chargedNodeCount, seed);
        const survivor = state.activityBonuses[1];
        const result = resolveActivityBonusClaim(state, "green", claimedPlanet);

        expect(result.outcome.kind).toBe(kind);
        expect(result.outcome.survivor.oldKind).toBe(survivor.kind);
        expect(result.outcome.survivor.newKind).toBe(survivor.kind);
        expect(result.activityBonuses[1]).toEqual(survivor);

        const [newBonus] = result.activityBonuses;
        expect(newBonus).toEqual(result.outcome.newBonus);
        expect(newBonus.kind).not.toBe(survivor.kind);
        const shipSquareNames = new Set(
          result.ships.map((s) => squareName(s.square)),
        );
        expect(shipSquareNames.has(squareName(newBonus.square))).toBe(false);
        expect(squareName(newBonus.square)).not.toBe(
          squareName(survivor.square),
        );
      }
    });

    it(`consumes exactly one seed step fewer than race when ${kind} is claimed from the same state`, () => {
      for (let seed = 1; seed <= 60; seed++) {
        const stable = resolveActivityBonusClaim(
          stateUnder("stable", kind, nodes, chargedNodeCount, seed),
          "green",
          claimedPlanet,
        );
        const race = resolveActivityBonusClaim(
          stateUnder("race", kind, nodes, chargedNodeCount, seed),
          "green",
          claimedPlanet,
        );

        expect(seedStepsBetween(seed, stable.nextSeed)).toBe(
          seedStepsBetween(seed, race.nextSeed) - 1,
        );
        // The claimed kind's own effect is identical under both.
        expect(stable.nodes).toEqual(race.nodes);
        expect(stable.ships).toEqual(race.ships);
        expect(stable.outcome.pointsAwarded).toBe(race.outcome.pointsAwarded);
      }
    });
  }

  it("draws the new bonus's planet and then its kind straight after a points claim, with no draw for the survivor", () => {
    for (let seed = 1; seed <= 60; seed++) {
      const state = stateUnder("stable", "large-points", {}, 3, seed);
      const survivor = state.activityBonuses[1];
      const result = resolveActivityBonusClaim(state, "green", claimedPlanet);

      const eligible = PLANETS.filter(
        (square) =>
          squareName(square) !== squareName(claimedPlanet) &&
          squareName(square) !== squareName(PLANETS[2]) &&
          squareName(square) !== squareName(survivor.square),
      );
      const [expectedSquare, seedAfterPlanet] = drawActivityBonusPlanet(
        seed,
        eligible,
      );
      const [expectedKind, expectedNextSeed] = drawActivityBonusKind(
        seedAfterPlanet,
        state.nodes,
        3,
        new Set([survivor.kind]),
      );

      expect(result.outcome.newBonus).toEqual({
        square: expectedSquare,
        kind: expectedKind,
      });
      expect(result.nextSeed).toBe(expectedNextSeed);
    }
  });

  it("keeps the survivor's kind through a move that claims, under applyMove", () => {
    const [planet, other] = PLANETS;
    const state = buildState({
      planetActivity: "stable",
      ships: [
        ship("green-1", "green", belowSquare(planet)),
        ship("red-1", "red", "A1"),
      ],
      activityBonuses: bonuses([planet, "small-points"], [other, "fuel"]),
    });

    const result = applyMove(state, "green-1", planet);

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(result.state.activityBonuses[1]).toEqual({
      square: other,
      kind: "fuel",
    });
    expect(result.state.activityBonuses[0].kind).not.toBe("fuel");
    expect(result.state.energy.green).toBe(
      activityBonusPoints(3, "off", "simple", "small"),
    );
  });
});

describe.each(["race", "stable"] as const)(
  "planet activity bonus claims in a fight, under %s (steal.md §10)",
  (planetActivity) => {
    it("the attacker's claim resolves for the attacker's side, before the defender's own claim", () => {
      const state = buildState({
        planetActivity,
        ships: [
          ship("green-1", "green", "H8", 2),
          ship("red-1", "red", "H9", 2),
        ],
      });

      const [attackerIndex, seedAfterAttacker] = drawIndex(
        state.randomSeed,
        PLANETS.length,
      );
      const attackerPlanet = PLANETS[attackerIndex];
      const defenderPool = PLANETS.filter(
        (square) => squareName(square) !== squareName(attackerPlanet),
      );
      drawIndex(seedAfterAttacker, defenderPool.length);

      const survivorPlanet = defenderPool[0];
      const withBonus: GameState = {
        ...state,
        activityBonuses: bonuses(
          [attackerPlanet, "large-points"],
          [survivorPlanet, "fuel"],
        ),
      };

      const result = applyAttack(withBonus, "green-1", squareFromName("H9"));

      expect(result.outcome).toBe("applied");
      if (result.outcome !== "applied") {
        throw new Error("expected the attack to be applied");
      }
      expect(result.state.energy.green).toBe(
        activityBonusPoints(3, "off", "simple", "large"),
      );
      const claims = result.effects.filter(
        (effect) => effect.type === "activity-bonus-claimed",
      );
      expect(claims).toHaveLength(1);
      expect(claims[0]).toMatchObject({ side: "green" });
      const fightIndex = result.effects.findIndex(
        (effect) => effect.type === "fight-resolved",
      );
      const claimIndex = result.effects.findIndex(
        (effect) => effect.type === "activity-bonus-claimed",
      );
      expect(claimIndex).toBeGreaterThan(fightIndex);
    });

    it("draws the defender's return planet only once the attacker's claim, own draws included, has fully resolved (steal.md §10)", () => {
      // Five signals, none carrying an extra yet, so the attacker's Additional
      // nodes claim draws five fresh squares before the defender's own return
      // planet is even drawn — enough to move the seed the naive, un-reordered
      // computation below would have used.
      const nodes: Record<string, NodeStatus> = {
        A5: { state: "prospective", level: 0, signal: 0 },
        A6: { state: "prospective", level: 0, signal: 0 },
        A9: { state: "prospective", level: 0, signal: 1 },
        A10: { state: "prospective", level: 0, signal: 1 },
        B5: { state: "prospective", level: 0, signal: 2 },
        B6: { state: "prospective", level: 0, signal: 2 },
        C9: { state: "prospective", level: 0, signal: 3 },
        C10: { state: "prospective", level: 0, signal: 3 },
        F3: { state: "prospective", level: 0, signal: 4 },
        F4: { state: "prospective", level: 0, signal: 4 },
      };

      let sawADivergence = false;
      for (let seed = 1; seed <= 40; seed++) {
        const [attackerIndex, seedAfterAttacker] = drawIndex(
          seed,
          PLANETS.length,
        );
        const attackerPlanet = PLANETS[attackerIndex];
        const naivePool = PLANETS.filter(
          (square) => squareName(square) !== squareName(attackerPlanet),
        );
        const [naiveDefenderIndex] = drawIndex(
          seedAfterAttacker,
          naivePool.length,
        );
        const naiveDefenderPlanet = naivePool[naiveDefenderIndex];
        const survivorPlanet = naivePool.find(
          (square) => squareName(square) !== squareName(naiveDefenderPlanet),
        )!;

        const state = buildState({
          planetActivity,
          ships: [
            ship("green-1", "green", "H8", 2),
            ship("red-1", "red", "H9", 2),
          ],
          nodes,
          chargedNodeCount: 5,
          activityBonuses: bonuses(
            [attackerPlanet, "additional-nodes"],
            [survivorPlanet, "large-points"],
          ),
          randomSeed: seed,
        });

        const result = applyAttack(state, "green-1", squareFromName("H9"));
        expect(result.outcome).toBe("applied");
        if (result.outcome !== "applied") {
          throw new Error("expected the attack to be applied");
        }
        const defenderShip = result.state.ships.find((s) => s.id === "red-1");
        if (
          squareName(defenderShip!.square) !== squareName(naiveDefenderPlanet)
        ) {
          sawADivergence = true;
          break;
        }
      }

      expect(sawADivergence).toBe(true);
    });

    it("treats the defender's pre-fight square as occupied while the attacker's Additional nodes claim draws its new squares (steal.md §10)", () => {
      // Five signals, none carrying an extra yet, so the attacker's claim
      // draws one fresh square per signal — enough chances that, for some
      // seed, a square would land on the defender's own pre-fight square (H9)
      // if that square were not counted as occupied.
      const nodes: Record<string, NodeStatus> = {
        A5: { state: "prospective", level: 0, signal: 0 },
        A6: { state: "prospective", level: 0, signal: 0 },
        A9: { state: "prospective", level: 0, signal: 1 },
        A10: { state: "prospective", level: 0, signal: 1 },
        B5: { state: "prospective", level: 0, signal: 2 },
        B6: { state: "prospective", level: 0, signal: 2 },
        C9: { state: "prospective", level: 0, signal: 3 },
        C10: { state: "prospective", level: 0, signal: 3 },
        F3: { state: "prospective", level: 0, signal: 4 },
        F4: { state: "prospective", level: 0, signal: 4 },
      };
      const defenderSquare = squareFromName("H9");

      let sawANaiveCollision = false;
      for (let seed = 1; seed <= 60; seed++) {
        const [attackerIndex, seedAfterAttacker] = drawIndex(
          seed,
          PLANETS.length,
        );
        const attackerPlanet = PLANETS[attackerIndex];
        const survivorPlanet = PLANETS.find(
          (square) => squareName(square) !== squareName(attackerPlanet),
        )!;

        // What Additional nodes would draw if the defender's pre-fight square
        // were not counted as occupied — the attacker's own new square only.
        const naive = addExtraProspectiveSquares(
          nodes,
          5,
          [attackerPlanet],
          seedAfterAttacker,
        );
        const naiveCollides = naive.addedSquares.some(
          (square) => squareName(square) === squareName(defenderSquare),
        );
        if (!naiveCollides) {
          continue;
        }
        sawANaiveCollision = true;

        const state = buildState({
          planetActivity,
          ships: [
            ship("green-1", "green", "H8", 2),
            ship("red-1", "red", "H9", 2),
          ],
          nodes,
          chargedNodeCount: 5,
          activityBonuses: bonuses(
            [attackerPlanet, "additional-nodes"],
            [survivorPlanet, "large-points"],
          ),
          randomSeed: seed,
        });

        const result = applyAttack(state, "green-1", squareFromName("H9"));
        expect(result.outcome).toBe("applied");
        if (result.outcome !== "applied") {
          throw new Error("expected the attack to be applied");
        }
        const claim = result.effects.find(
          (effect): effect is ActivityBonusClaimedEffect =>
            effect.type === "activity-bonus-claimed" &&
            effect.kind === "additional-nodes",
        );
        expect(claim).toBeDefined();
        for (const square of claim!.addedSquares) {
          expect(squareName(square)).not.toBe(squareName(defenderSquare));
        }
        break;
      }

      expect(sawANaiveCollision).toBe(true);
    });

    it("the defender may land on, and if so claims, either the survivor or the bonus that has only just appeared", () => {
      // Eight of the twelve planets are ship-occupied, leaving the tightest
      // realistic four free: the two current bonuses' planets, forcing the
      // attacker onto one of them, plus two ordinary spares — mirroring "why
      // five is the limit"'s ten-ships-on-twelve-planets argument.
      const freePlanets = PLANETS.slice(0, 4);
      const fillerPlanets = PLANETS.slice(4);
      const fillers = fillerPlanets.map((square, index) =>
        ship(`filler-${index}`, index % 2 === 0 ? "green" : "red", square),
      );

      const seed = 1;
      const [attackerIndex] = drawIndex(seed, freePlanets.length);
      const attackerPlanet = freePlanets[attackerIndex];
      const survivorPlanet = freePlanets.find(
        (square) => squareName(square) !== squareName(attackerPlanet),
      )!;

      const state = buildState({
        planetActivity,
        ships: [
          ship("green-1", "green", "H8", 2),
          ship("red-1", "red", "H9", 2),
          ...fillers,
        ],
        activityBonuses: bonuses(
          [attackerPlanet, "small-points"],
          [survivorPlanet, "medium-points"],
        ),
        randomSeed: seed,
      });

      const result = applyAttack(state, "green-1", squareFromName("H9"));

      expect(result.outcome).toBe("applied");
      if (result.outcome !== "applied") {
        throw new Error("expected the attack to be applied");
      }
      const claims = result.effects.filter(
        (effect): effect is ActivityBonusClaimedEffect =>
          effect.type === "activity-bonus-claimed",
      );
      expect(claims.length).toBeGreaterThanOrEqual(1);
      const attackerClaim = claims[0];
      expect(attackerClaim.side).toBe("green");
      expect(squareName(attackerClaim.square)).toBe(squareName(attackerPlanet));

      const defenderShip = result.state.ships.find((s) => s.id === "red-1")!;
      const defenderSquareName = squareName(defenderShip.square);
      const newBonusSquareName = squareName(attackerClaim.newBonus.square);
      const defenderLandedOnABonus =
        defenderSquareName === squareName(survivorPlanet) ||
        defenderSquareName === newBonusSquareName;

      if (defenderLandedOnABonus) {
        expect(claims).toHaveLength(2);
        expect(claims[1].side).toBe("red");
        expect(squareName(claims[1].square)).toBe(defenderSquareName);
      } else {
        expect(claims).toHaveLength(1);
      }
    });
  },
);

describe("assertFightInvariants under planet activity (steal.md §10)", () => {
  const baseState = buildState({
    ships: [ship("green-1", "green", "H8", 1), ship("red-1", "red", "H9", 3)],
  });

  it("does not throw when a claim has legitimately raised a fighter's power", () => {
    const after: GameState = {
      ...baseState,
      ships: baseState.ships.map((s) =>
        s.id === "red-1" ? { ...s, square: squareFromName("D6"), power: 4 } : s,
      ),
    };

    expect(() =>
      assertFightInvariants(baseState, after, "green-1", 0, new Set(["red-1"])),
    ).not.toThrow();
  });

  it("does not throw when a claim has legitimately added or removed a node's squares", () => {
    const after: GameState = {
      ...baseState,
      ships: baseState.ships.map((s) =>
        s.id === "red-1" ? { ...s, square: squareFromName("D6") } : s,
      ),
      nodes: { A2: { state: "prospective", level: 0, signal: 0 } },
    };

    expect(() =>
      assertFightInvariants(baseState, after, "green-1", 0, new Set(["red-1"])),
    ).not.toThrow();
  });

  it("still throws when a fighter's power rose by more than a Fuel claim's one point could", () => {
    const after: GameState = {
      ...baseState,
      ships: baseState.ships.map((s) =>
        s.id === "red-1" ? { ...s, square: squareFromName("D6"), power: 5 } : s,
      ),
    };

    expect(() =>
      assertFightInvariants(baseState, after, "green-1", 0, new Set(["red-1"])),
    ).toThrow(RangeError);
  });

  it("still throws when a returned ship did not end on a planet square", () => {
    const after: GameState = {
      ...baseState,
      ships: baseState.ships.map((s) =>
        s.id === "red-1" ? { ...s, square: squareFromName("H10") } : s,
      ),
    };

    expect(() =>
      assertFightInvariants(baseState, after, "green-1", 0, new Set(["red-1"])),
    ).toThrow(RangeError);
  });
});
