// The core's setup contract (story.md "Setup"): the plain-JSON shape an
// online game starts from, with every field required so an app default
// never silently reaches an online game, `parseSetup`'s validation of
// untrusted input into that shape, and `startGame`, which deals a
// `GameState` from a validated `Setup` the same way the app's session does
// — the opening deal, then the pass guard once.

import { isChargedNodeCount, type ChargedNodeCount } from "../rules/nodes";
import { isFleetSize, type FleetSize } from "../rules/fleet";
import { GAME_LENGTH_OPTIONS_ROUNDS } from "../rules/gameLength";
import { isNodePlaystyle, type NodePlaystyle } from "../rules/nodePlaystyle";
import {
  isPlanetActivitySetting,
  type PlanetActivitySetting,
} from "../rules/planetActivity";
import {
  isPlanetBonusSetting,
  type PlanetBonusSetting,
} from "../rules/planetBonus";
import {
  isPlayerMatchingSetting,
  type PlayerMatchingSetting,
} from "../rules/playerMatching";
import { isScoringSetting, type ScoringSetting } from "../rules/scoring";
import { startingGameState, type GameState } from "../rules/gameState";
import { applyPassGuard } from "../rules/ply";
import type { RandomSource } from "../rules/random";

/**
 * The twelve planet picture numbers (gallery numbers 1-10, 13, 14), the
 * only values `artwork` may hold. Duplicated here, rather than imported,
 * because the core must not import `src/board/`; `setup.test.ts` asserts
 * this matches `src/board/planetArt.ts`'s `PLANET_ART` numbers, so the two
 * cannot drift apart unnoticed.
 */
export const PLANET_PICTURE_NUMBERS: readonly number[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 13, 14,
];

/**
 * An online game's setup (story.md "Setup"): every field required, so a
 * change to the app's own defaults never silently changes an online game.
 * Produced only by `parseSetup`.
 */
export interface Setup {
  readonly playstyle: NodePlaystyle;
  readonly rounds: number;
  readonly fleetSize: FleetSize;
  readonly chargedNodes: ChargedNodeCount;
  readonly combat: boolean;
  readonly scoring: ScoringSetting;
  readonly planetBonus: PlanetBonusSetting;
  readonly planetActivity: PlanetActivitySetting;
  readonly playerMatching: PlayerMatchingSetting;
  /**
   * The twelve planet picture numbers, in the order of the planet squares.
   * Not a rule: left out of the state hash, but checked here to be a
   * permutation of `PLANET_PICTURE_NUMBERS`, so the server needs no list of
   * pictures of its own.
   */
  readonly artwork: readonly number[];
}

/** One problem `parseSetup` found with a field of its input. */
export type SetupProblemKind =
  | "missing"
  | "unknown-field"
  | "not-offered"
  | "not-allowed-with-playstyle"
  | "not-a-permutation";

/** A single reported problem: which field, and what was wrong with it. */
export interface SetupProblem {
  readonly field: string;
  readonly problem: SetupProblemKind;
}

const KNOWN_FIELDS = [
  "playstyle",
  "rounds",
  "fleetSize",
  "chargedNodes",
  "combat",
  "scoring",
  "planetBonus",
  "planetActivity",
  "playerMatching",
  "artwork",
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isArtworkPermutation(value: unknown): value is readonly number[] {
  if (!Array.isArray(value) || value.length !== PLANET_PICTURE_NUMBERS.length) {
    return false;
  }
  const seen = new Set<number>();
  for (const entry of value) {
    if (typeof entry !== "number" || !PLANET_PICTURE_NUMBERS.includes(entry)) {
      return false;
    }
    if (seen.has(entry)) {
      return false;
    }
    seen.add(entry);
  }
  return true;
}

/**
 * Parses untrusted input into a `Setup`, never throwing. Checks the known
 * fields in the order `Setup` declares them, each reporting `missing` if
 * absent, `not-offered` if present but of the wrong type or not one of the
 * rules' own offered values, and — for `planetBonus`, `planetActivity` and
 * `playerMatching` once a valid `playstyle` is known — `not-allowed-with-playstyle`
 * if the value is an offered one the playstyle does not allow (anything but
 * `"off"` for planet bonus under steal, or for planet effects and player
 * matching outside steal). That cross-check is skipped when `playstyle`
 * itself is missing or not offered, since there is then nothing to check
 * against. `artwork` is checked against `PLANET_PICTURE_NUMBERS` instead,
 * reporting `not-a-permutation`. Every problem found is collected, never
 * just the first; unknown fields are reported last, in the input's own key
 * order. An input that is not a plain object reports every known field as
 * `missing`.
 */
export function parseSetup(
  input: unknown,
):
  | { readonly ok: true; readonly setup: Setup }
  | { readonly ok: false; readonly problems: readonly SetupProblem[] } {
  const problems: SetupProblem[] = [];

  if (!isPlainObject(input)) {
    for (const field of KNOWN_FIELDS) {
      problems.push({ field, problem: "missing" });
    }
    return { ok: false, problems };
  }

  const record = input;

  let playstyle: NodePlaystyle | undefined;
  if (!("playstyle" in record)) {
    problems.push({ field: "playstyle", problem: "missing" });
  } else if (!isNodePlaystyle(record.playstyle)) {
    problems.push({ field: "playstyle", problem: "not-offered" });
  } else {
    playstyle = record.playstyle;
  }

  let rounds: number | undefined;
  if (!("rounds" in record)) {
    problems.push({ field: "rounds", problem: "missing" });
  } else if (
    typeof record.rounds !== "number" ||
    !GAME_LENGTH_OPTIONS_ROUNDS.includes(record.rounds)
  ) {
    problems.push({ field: "rounds", problem: "not-offered" });
  } else {
    rounds = record.rounds;
  }

  let fleetSize: FleetSize | undefined;
  if (!("fleetSize" in record)) {
    problems.push({ field: "fleetSize", problem: "missing" });
  } else if (
    typeof record.fleetSize !== "number" ||
    !isFleetSize(record.fleetSize)
  ) {
    problems.push({ field: "fleetSize", problem: "not-offered" });
  } else {
    fleetSize = record.fleetSize;
  }

  let chargedNodes: ChargedNodeCount | undefined;
  if (!("chargedNodes" in record)) {
    problems.push({ field: "chargedNodes", problem: "missing" });
  } else if (
    typeof record.chargedNodes !== "number" ||
    !isChargedNodeCount(record.chargedNodes)
  ) {
    problems.push({ field: "chargedNodes", problem: "not-offered" });
  } else {
    chargedNodes = record.chargedNodes;
  }

  let combat: boolean | undefined;
  if (!("combat" in record)) {
    problems.push({ field: "combat", problem: "missing" });
  } else if (typeof record.combat !== "boolean") {
    problems.push({ field: "combat", problem: "not-offered" });
  } else {
    combat = record.combat;
  }

  let scoring: ScoringSetting | undefined;
  if (!("scoring" in record)) {
    problems.push({ field: "scoring", problem: "missing" });
  } else if (!isScoringSetting(record.scoring)) {
    problems.push({ field: "scoring", problem: "not-offered" });
  } else {
    scoring = record.scoring;
  }

  let planetBonus: PlanetBonusSetting | undefined;
  if (!("planetBonus" in record)) {
    problems.push({ field: "planetBonus", problem: "missing" });
  } else if (!isPlanetBonusSetting(record.planetBonus)) {
    problems.push({ field: "planetBonus", problem: "not-offered" });
  } else {
    planetBonus = record.planetBonus;
    if (playstyle === "steal" && planetBonus !== "off") {
      problems.push({
        field: "planetBonus",
        problem: "not-allowed-with-playstyle",
      });
    }
  }

  let planetActivity: PlanetActivitySetting | undefined;
  if (!("planetActivity" in record)) {
    problems.push({ field: "planetActivity", problem: "missing" });
  } else if (!isPlanetActivitySetting(record.planetActivity)) {
    problems.push({ field: "planetActivity", problem: "not-offered" });
  } else {
    planetActivity = record.planetActivity;
    if (
      playstyle !== undefined &&
      playstyle !== "steal" &&
      planetActivity !== "off"
    ) {
      problems.push({
        field: "planetActivity",
        problem: "not-allowed-with-playstyle",
      });
    }
  }

  let playerMatching: PlayerMatchingSetting | undefined;
  if (!("playerMatching" in record)) {
    problems.push({ field: "playerMatching", problem: "missing" });
  } else if (!isPlayerMatchingSetting(record.playerMatching)) {
    problems.push({ field: "playerMatching", problem: "not-offered" });
  } else {
    playerMatching = record.playerMatching;
    if (
      playstyle !== undefined &&
      playstyle !== "steal" &&
      playerMatching !== "off"
    ) {
      problems.push({
        field: "playerMatching",
        problem: "not-allowed-with-playstyle",
      });
    }
  }

  let artwork: readonly number[] | undefined;
  if (!("artwork" in record)) {
    problems.push({ field: "artwork", problem: "missing" });
  } else if (!isArtworkPermutation(record.artwork)) {
    problems.push({ field: "artwork", problem: "not-a-permutation" });
  } else {
    artwork = record.artwork;
  }

  for (const key of Object.keys(record)) {
    if (!(KNOWN_FIELDS as readonly string[]).includes(key)) {
      problems.push({ field: key, problem: "unknown-field" });
    }
  }

  if (problems.length > 0) {
    return { ok: false, problems };
  }

  return {
    ok: true,
    setup: {
      playstyle: playstyle!,
      rounds: rounds!,
      fleetSize: fleetSize!,
      chargedNodes: chargedNodes!,
      combat: combat!,
      scoring: scoring!,
      planetBonus: planetBonus!,
      planetActivity: planetActivity!,
      playerMatching: playerMatching!,
      artwork: artwork!,
    },
  };
}

/**
 * Deals a game from a validated `Setup`: the opening deal
 * (`startingGameState`, every field passed explicitly so none falls back to
 * an app default) followed by the pass guard once, exactly as the app's own
 * session starts one. The starting fleet can always move, so the guard
 * never actually fires here; `startGame` still runs it, so the core and the
 * app always start from the same position. Returns the draws this call
 * made, sliced from `random`'s running list so a source already carrying
 * earlier draws (there are none, for the first call of a game) is handled
 * the same way `applyPly` handles its own calls later in the game, and runs
 * `random`'s completion check once done.
 */
export function startGame(
  setup: Setup,
  random: RandomSource,
): { readonly state: GameState; readonly draws: number[] } {
  const before = random.draws().length;

  const dealt = startingGameState(random, {
    lengthInRounds: setup.rounds,
    fleetSize: setup.fleetSize,
    chargedNodeCount: setup.chargedNodes,
    combatEnabled: setup.combat,
    scoring: setup.scoring,
    nodePlaystyle: setup.playstyle,
    planetBonus: setup.planetBonus,
    planetActivity: setup.planetActivity,
    playerMatching: setup.playerMatching,
  });
  const { state } = applyPassGuard(dealt, random);

  random.checkComplete();
  return { state, draws: random.draws().slice(before) };
}
