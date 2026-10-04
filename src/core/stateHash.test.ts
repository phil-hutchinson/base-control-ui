// Tests for canonicalState and stateHash (story.md "State hash"): the
// fixed-shape string, its order-independence and sensitivity, the FNV-1a
// implementation against published reference values, a pinned hash for one
// fixed game, and a draws round-trip through seededRandom and
// recordedRandom, including the four ways a tampered draw must be caught.

import { describe, expect, it } from "vitest";
import { squareFromName } from "../rules/board";
import type { GameState } from "../rules/gameState";
import { legalDestinations } from "../rules/movement";
import { DesyncError, recordedRandom, seededRandom } from "../rules/random";
import { applyPly } from "./applyPly";
import { formatPly, parsePly, type Ply } from "./plyNotation";
import { startGame, type Setup } from "./setup";
import { canonicalState, fnv1a64, stateHash } from "./stateHash";

/** A small hand-built state covering every field canonicalState reports. */
function smallState(nodesInsertedAs: "D3-then-G7" | "G7-then-D3"): GameState {
  const nodes =
    nodesInsertedAs === "D3-then-G7"
      ? {
          D3: { state: "prospective" as const, level: 0, signal: 1 as const },
          G7: { state: "charged" as const, level: 0 },
        }
      : {
          G7: { state: "charged" as const, level: 0 },
          D3: { state: "prospective" as const, level: 0, signal: 1 as const },
        };
  return {
    ships: [
      {
        id: "green-1",
        side: "green",
        square: squareFromName("A1"),
        power: 4,
      },
      { id: "red-1", side: "red", square: squareFromName("O15"), power: 6 },
    ],
    nodes,
    sideToMove: "red",
    plyNumber: 12,
    energy: { green: 3, red: 7 },
    lengthInRounds: 45,
    chargedNodeCount: 4,
    outOfTime: { green: false, red: false },
    combatEnabled: true,
    scoring: "bonus",
    nodePlaystyle: "steal",
    rotators: [squareFromName("C3"), squareFromName("E5")],
    planetBonus: "off",
    bonusPlanets: {
      green: [{ square: squareFromName("B2"), claimedOnPly: 5 }],
      red: [{ square: squareFromName("D4") }],
    },
    planetActivity: "race",
    activityBonuses: [
      { square: squareFromName("F6"), kind: "fuel" },
      { square: squareFromName("G7"), kind: "large-points" },
    ],
    playerMatching: "double",
  };
}

const SMALL_STATE_CANONICAL =
  '{"playstyle":"steal","rounds":45,"fleetSize":1,"chargedNodes":4,"combat":true,"scoring":"bonus","planetBonus":"off","planetActivity":"race","playerMatching":"double","sideToMove":"red","plyNumber":12,"energy":{"green":3,"red":7},"ships":[{"side":"green","square":"A1","power":4},{"side":"red","square":"O15","power":6}],"nodes":[{"square":"D3","state":"prospective","level":0,"signal":1},{"square":"G7","state":"charged","level":0,"signal":null}],"bonusPlanets":{"green":[{"square":"B2","claimedOnPly":5}],"red":[{"square":"D4","claimedOnPly":null}]},"activityBonuses":[{"square":"F6","kind":"fuel"},{"square":"G7","kind":"large-points"}],"rotators":["C3","E5"]}';

describe("canonicalState", () => {
  it("matches a hand-written expected string: key order, nulls, node sort order, rotators", () => {
    expect(canonicalState(smallState("D3-then-G7"))).toBe(
      SMALL_STATE_CANONICAL,
    );
  });

  it("hashes the same regardless of the order nodes were inserted into state.nodes", () => {
    const first = canonicalState(smallState("D3-then-G7"));
    const second = canonicalState(smallState("G7-then-D3"));
    expect(second).toBe(first);
  });

  it("changes when any one included field changes", () => {
    const base = smallState("D3-then-G7");
    const baseline = canonicalState(base);

    const changes: Partial<GameState>[] = [
      { sideToMove: "green" },
      { plyNumber: 13 },
      { energy: { green: 4, red: 7 } },
      { combatEnabled: false },
      { scoring: "simple" },
      { planetActivity: "stable" },
      { playerMatching: "off" },
      { rotators: [squareFromName("E5"), squareFromName("C3")] },
    ];
    for (const change of changes) {
      expect(canonicalState({ ...base, ...change })).not.toBe(baseline);
    }
  });
});

describe("fnv1a64", () => {
  it("matches the published reference values", () => {
    expect(fnv1a64("")).toBe("cbf29ce484222325");
    expect(fnv1a64("a")).toBe("af63dc4c8601ec8c");
    expect(fnv1a64("foobar")).toBe("85944171f73967e8");
  });

  it("refuses non-ASCII text", () => {
    expect(() => fnv1a64("é")).toThrow(RangeError);
  });
});

describe("stateHash", () => {
  it("is the FNV-1a hash of canonicalState", () => {
    expect(stateHash(smallState("D3-then-G7"))).toBe(
      fnv1a64(SMALL_STATE_CANONICAL),
    );
  });
});

const PINNED_SETUP: Setup = {
  playstyle: "steal",
  rounds: 30,
  fleetSize: 5,
  chargedNodes: 4,
  combat: false,
  scoring: "bonus",
  planetBonus: "off",
  planetActivity: "race",
  playerMatching: "required",
  artwork: [3, 1, 14, 7, 2, 9, 5, 13, 4, 10, 6, 8],
};
const PINNED_SEED = 20240614;

/**
 * Eight plies found once, by running `legalDestinations` under
 * `PINNED_SETUP` and `PINNED_SEED` and writing out the moves it offered -
 * see the smoke test (`scripts/smoke-core.mjs`, Step 7), which plays this
 * same game and must keep this pinned hash in step with this test.
 */
const PINNED_PLIES: readonly string[] = [
  "1: H15J13",
  "2: L15N13",
  "3: J13L15",
  "4: N13L11",
  "5: O10M12",
  "6: O6M8",
  "7: M12O14",
  "8: M8O10",
];

/** A change to this value is a deliberate edit, mirrored in the smoke script. */
const PINNED_HASH = "92eca44a0af5bd46";

describe("the pinned game", () => {
  it("reaches the pinned hash", () => {
    const random = seededRandom(PINNED_SEED);
    let { state } = startGame(PINNED_SETUP, random);
    for (const plyText of PINNED_PLIES) {
      const parsed = parsePly(plyText);
      if (!parsed.ok) {
        throw new Error(`expected ${plyText} to parse`);
      }
      const result = applyPly(state, parsed.plyNumber, parsed.ply, random);
      if (result.outcome !== "applied") {
        throw new Error(`expected ${plyText} to apply, got ${result.reason}`);
      }
      state = result.state;
    }

    expect(stateHash(state)).toBe(PINNED_HASH);
  });
});

/** Heads each ship as far as it legally can on the side to move's turn. */
function policyPly(state: GameState): Ply | null {
  let chosenShip: GameState["ships"][number] | null = null;
  let chosenDestination: ReturnType<typeof legalDestinations>[number] | null =
    null;
  let bestScore = -1;

  for (const ship of state.ships.filter(
    (candidate) => candidate.side === state.sideToMove,
  )) {
    for (const destination of legalDestinations(state, ship.id)) {
      const score =
        Math.abs(
          destination.column.charCodeAt(0) - ship.square.column.charCodeAt(0),
        ) + Math.abs(destination.row - ship.square.row);
      if (score > bestScore) {
        bestScore = score;
        chosenShip = ship;
        chosenDestination = destination;
      }
    }
  }

  if (chosenShip === null || chosenDestination === null) {
    return null;
  }
  return { type: "move", from: chosenShip.square, to: chosenDestination };
}

interface PolicyGame {
  readonly setup: Setup;
  readonly startDraws: readonly number[];
  readonly steps: readonly {
    readonly before: GameState;
    readonly plyNumber: number;
    readonly ply: Ply;
    readonly draws: readonly number[];
    readonly afterHash: string;
  }[];
}

/** Plays `maxPlies` plies of `setup` from `seed` with the policy above, recording every call's draws and the hash after it. */
function playPolicyGame(
  setup: Setup,
  seed: number,
  maxPlies: number,
): PolicyGame {
  const random = seededRandom(seed);
  const { state: started } = startGame(setup, random);
  const startDraws = random.draws().slice();

  let state = started;
  const steps: PolicyGame["steps"][number][] = [];
  for (let i = 0; i < maxPlies; i++) {
    const ply = policyPly(state);
    if (ply === null) {
      break;
    }
    const before = state;
    const plyNumber = state.plyNumber;
    const beforeDrawCount = random.draws().length;
    const result = applyPly(state, plyNumber, ply, random);
    if (result.outcome !== "applied") {
      throw new Error(`expected ${formatPly(plyNumber, ply)} to apply`);
    }
    steps.push({
      before,
      plyNumber,
      ply,
      draws: random.draws().slice(beforeDrawCount),
      afterHash: stateHash(result.state),
    });
    state = result.state;
  }

  return { setup, startDraws, steps };
}

const STEAL_WITH_PLANET_EFFECTS: Setup = {
  playstyle: "steal",
  rounds: 30,
  fleetSize: 5,
  chargedNodes: 4,
  combat: false,
  scoring: "bonus",
  planetBonus: "off",
  planetActivity: "race",
  playerMatching: "required",
  artwork: [3, 1, 14, 7, 2, 9, 5, 13, 4, 10, 6, 8],
};

const DEDICATED_WITH_PLANET_BONUS: Setup = {
  playstyle: "dedicated",
  rounds: 30,
  fleetSize: 4,
  chargedNodes: 3,
  combat: true,
  scoring: "simple",
  planetBonus: "three",
  planetActivity: "off",
  playerMatching: "off",
  artwork: [3, 1, 14, 7, 2, 9, 5, 13, 4, 10, 6, 8],
};

describe("draws round-trip", () => {
  it.each([
    ["steal with planet effects", STEAL_WITH_PLANET_EFFECTS, 555],
    ["dedicated with planet bonus", DEDICATED_WITH_PLANET_BONUS, 777],
  ])("matches the hash after every ply (%s)", (_label, setup, seed) => {
    const game = playPolicyGame(setup, seed, 40);
    expect(game.steps.length).toBeGreaterThan(10);

    const replayed = startGame(setup, recordedRandom(game.startDraws));
    let state = replayed.state;

    for (const step of game.steps) {
      const replay = applyPly(
        state,
        step.plyNumber,
        step.ply,
        recordedRandom(step.draws),
      );
      if (replay.outcome !== "applied") {
        throw new Error(
          `expected ${formatPly(step.plyNumber, step.ply)} to apply on replay`,
        );
      }
      expect(stateHash(replay.state)).toBe(step.afterHash);
      state = replay.state;
    }
  });

  it("throws DesyncError when a draw is dropped from a call's recorded list", () => {
    const game = playPolicyGame(STEAL_WITH_PLANET_EFFECTS, 555, 40);
    const step = game.steps.find((candidate) => candidate.draws.length > 0);
    if (step === undefined) {
      throw new Error("expected at least one ply to have drawn something");
    }

    expect(() =>
      applyPly(
        step.before,
        step.plyNumber,
        step.ply,
        recordedRandom(step.draws.slice(0, -1)),
      ),
    ).toThrow(DesyncError);
  });

  it("throws DesyncError when an extra draw is appended to a call's recorded list", () => {
    const game = playPolicyGame(STEAL_WITH_PLANET_EFFECTS, 555, 40);
    const step = game.steps.find((candidate) => candidate.draws.length > 0);
    if (step === undefined) {
      throw new Error("expected at least one ply to have drawn something");
    }

    expect(() =>
      applyPly(
        step.before,
        step.plyNumber,
        step.ply,
        recordedRandom([...step.draws, 0]),
      ),
    ).toThrow(DesyncError);
  });

  it("throws DesyncError when a recorded draw is out of range", () => {
    const game = playPolicyGame(STEAL_WITH_PLANET_EFFECTS, 555, 40);
    const step = game.steps.find((candidate) => candidate.draws.length > 0);
    if (step === undefined) {
      throw new Error("expected at least one ply to have drawn something");
    }

    const tampered = [...step.draws];
    tampered[0] = tampered[0] + 1_000_000;

    expect(() =>
      applyPly(step.before, step.plyNumber, step.ply, recordedRandom(tampered)),
    ).toThrow(DesyncError);
  });

  it("cannot catch a changed but still in-range draw as a DesyncError - the hash differs instead", () => {
    // Step 19's first draw (the new prospective square a claim leaves
    // behind) is 21, chosen among dozens of free squares; 20 is still a
    // valid index for the same draw, so recordedRandom accepts it without
    // complaint, and only the resulting state - and so its hash - differs.
    const game = playPolicyGame(STEAL_WITH_PLANET_EFFECTS, 555, 40);
    const step = game.steps[19];
    expect(step.draws[0]).toBe(21);

    const tampered = [step.draws[0] - 1, ...step.draws.slice(1)];

    const replay = applyPly(
      step.before,
      step.plyNumber,
      step.ply,
      recordedRandom(tampered),
    );
    if (replay.outcome !== "applied") {
      throw new Error("expected the tampered replay to still apply");
    }
    expect(stateHash(replay.state)).not.toBe(step.afterHash);
  });
});
