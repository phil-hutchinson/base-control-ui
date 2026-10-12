import { describe, expect, it } from "vitest";
import { PLANET_ART } from "../board/planetArt";
import { startingGameState } from "../rules/gameState";
import { recordedRandom, seededRandom } from "../rules/random";
import {
  parseSetup,
  PLANET_PICTURE_NUMBERS,
  startGame,
  type Setup,
} from "./setup";

/** A setup exercising every rule field. */
const EXAMPLE_SETUP: Record<string, unknown> = {
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

/** `source` with `field` left out, for building a setup missing one field. */
function omit(
  source: Record<string, unknown>,
  field: string,
): Record<string, unknown> {
  const copy = { ...source };
  delete copy[field];
  return copy;
}

describe("PLANET_PICTURE_NUMBERS", () => {
  it("matches the numbers PLANET_ART declares", () => {
    expect([...PLANET_PICTURE_NUMBERS].sort((a, b) => a - b)).toEqual(
      [...PLANET_ART.map((art) => art.number)].sort((a, b) => a - b),
    );
  });
});

describe("parseSetup", () => {
  it("parses the story's own example setup", () => {
    const result = parseSetup(EXAMPLE_SETUP);
    expect(result).toEqual({ ok: true, setup: EXAMPLE_SETUP });
  });

  it("reports a missing field as missing", () => {
    const result = parseSetup(omit(EXAMPLE_SETUP, "artwork"));
    expect(result).toEqual({
      ok: false,
      problems: [{ field: "artwork", problem: "missing" }],
    });
  });

  it("reports every field as missing for input that is not a plain object", () => {
    for (const input of [null, "steal", 5, true, [1, 2, 3]]) {
      const result = parseSetup(input);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.problems).toEqual([
          { field: "playstyle", problem: "missing" },
          { field: "rounds", problem: "missing" },
          { field: "fleetSize", problem: "missing" },
          { field: "chargedNodes", problem: "missing" },
          { field: "combat", problem: "missing" },
          { field: "scoring", problem: "missing" },
          { field: "planetBonus", problem: "missing" },
          { field: "planetActivity", problem: "missing" },
          { field: "playerMatching", problem: "missing" },
          { field: "artwork", problem: "missing" },
        ]);
      }
    }
  });

  it("reports an unrecognised field as unknown-field, in the input's key order", () => {
    const result = parseSetup({ ...EXAMPLE_SETUP, extra: 1, another: 2 });
    expect(result).toEqual({
      ok: false,
      problems: [
        { field: "extra", problem: "unknown-field" },
        { field: "another", problem: "unknown-field" },
      ],
    });
  });

  it("reports a value of the wrong type as not-offered", () => {
    const result = parseSetup({ ...EXAMPLE_SETUP, combat: "no" });
    expect(result).toEqual({
      ok: false,
      problems: [{ field: "combat", problem: "not-offered" }],
    });
  });

  it("reports a value the rules do not offer as not-offered", () => {
    const result = parseSetup({ ...EXAMPLE_SETUP, scoring: "complicated" });
    expect(result).toEqual({
      ok: false,
      problems: [{ field: "scoring", problem: "not-offered" }],
    });
  });

  it("reports a rounds value outside 30/45/60/90 as not-offered", () => {
    for (const rounds of [0, 1, 29, 31, 100, -30]) {
      const result = parseSetup({ ...EXAMPLE_SETUP, rounds });
      expect(result).toEqual({
        ok: false,
        problems: [{ field: "rounds", problem: "not-offered" }],
      });
    }
  });

  it("reports planet bonus other than off under steal as not-allowed-with-playstyle", () => {
    const result = parseSetup({
      ...EXAMPLE_SETUP,
      playstyle: "steal",
      planetBonus: "two",
    });
    expect(result).toEqual({
      ok: false,
      problems: [
        { field: "planetBonus", problem: "not-allowed-with-playstyle" },
      ],
    });
  });

  it("reports planet effects other than off outside steal as not-allowed-with-playstyle", () => {
    const result = parseSetup({
      ...EXAMPLE_SETUP,
      playstyle: "continuous",
      planetActivity: "race",
      playerMatching: "off",
    });
    expect(result).toEqual({
      ok: false,
      problems: [
        { field: "planetActivity", problem: "not-allowed-with-playstyle" },
      ],
    });
  });

  it("reports player matching other than off outside steal as not-allowed-with-playstyle", () => {
    const result = parseSetup({
      ...EXAMPLE_SETUP,
      playstyle: "dedicated",
      planetActivity: "off",
      playerMatching: "double",
    });
    expect(result).toEqual({
      ok: false,
      problems: [
        { field: "playerMatching", problem: "not-allowed-with-playstyle" },
      ],
    });
  });

  it("skips the playstyle cross-check when playstyle itself is missing", () => {
    const result = parseSetup(omit(EXAMPLE_SETUP, "playstyle"));
    expect(result).toEqual({
      ok: false,
      problems: [{ field: "playstyle", problem: "missing" }],
    });
  });

  it("skips the playstyle cross-check when playstyle is not offered", () => {
    const result = parseSetup({ ...EXAMPLE_SETUP, playstyle: "bogus" });
    expect(result).toEqual({
      ok: false,
      problems: [{ field: "playstyle", problem: "not-offered" }],
    });
  });

  it("reports chargedNodes 5 under immediate as not-allowed-with-player-matching", () => {
    const result = parseSetup({
      ...EXAMPLE_SETUP,
      chargedNodes: 5,
      playerMatching: "immediate",
    });
    expect(result).toEqual({
      ok: false,
      problems: [
        { field: "chargedNodes", problem: "not-allowed-with-player-matching" },
      ],
    });
  });

  it("parses chargedNodes 4 or 3 under immediate", () => {
    for (const chargedNodes of [4, 3]) {
      const result = parseSetup({
        ...EXAMPLE_SETUP,
        chargedNodes,
        playerMatching: "immediate",
      });
      expect(result).toEqual({
        ok: true,
        setup: { ...EXAMPLE_SETUP, chargedNodes, playerMatching: "immediate" },
      });
    }
  });

  it("skips the chargedNodes/player-matching cross-check when playerMatching is missing", () => {
    const result = parseSetup(
      omit({ ...EXAMPLE_SETUP, chargedNodes: 5 }, "playerMatching"),
    );
    expect(result).toEqual({
      ok: false,
      problems: [{ field: "playerMatching", problem: "missing" }],
    });
  });

  it("skips the chargedNodes/player-matching cross-check when playerMatching is not offered", () => {
    const result = parseSetup({
      ...EXAMPLE_SETUP,
      chargedNodes: 5,
      playerMatching: "bogus",
    });
    expect(result).toEqual({
      ok: false,
      problems: [{ field: "playerMatching", problem: "not-offered" }],
    });
  });

  it("skips the chargedNodes/player-matching cross-check when playstyle is an offered value other than steal", () => {
    const result = parseSetup({
      ...EXAMPLE_SETUP,
      playstyle: "planet",
      planetActivity: "off",
      playerMatching: "immediate",
      chargedNodes: 5,
    });
    expect(result).toEqual({
      ok: false,
      problems: [
        { field: "playerMatching", problem: "not-allowed-with-playstyle" },
      ],
    });
  });

  it("reports artwork that is too short, too long, repeated, non-picture or not an array as not-a-permutation", () => {
    const cases = [
      [3, 1, 14, 7, 2, 9, 5, 13, 4, 10, 6], // short
      [3, 1, 14, 7, 2, 9, 5, 13, 4, 10, 6, 8, 9], // long
      [1, 1, 14, 7, 2, 9, 5, 13, 4, 10, 6, 8], // repeated
      [3, 1, 14, 7, 2, 9, 5, 13, 4, 10, 6, 11], // 11 is not a picture number
      "not-an-array",
    ];
    for (const artwork of cases) {
      const result = parseSetup({ ...EXAMPLE_SETUP, artwork });
      expect(result).toEqual({
        ok: false,
        problems: [{ field: "artwork", problem: "not-a-permutation" }],
      });
    }
  });

  it("reports several problems at once, in the documented order", () => {
    const result = parseSetup({
      rounds: 31,
      fleetSize: 5,
      chargedNodes: 4,
      combat: false,
      scoring: "bonus",
      planetBonus: "off",
      planetActivity: "off",
      playerMatching: "off",
      artwork: "nope",
      extra: true,
    });
    expect(result).toEqual({
      ok: false,
      problems: [
        { field: "playstyle", problem: "missing" },
        { field: "rounds", problem: "not-offered" },
        { field: "artwork", problem: "not-a-permutation" },
        { field: "extra", problem: "unknown-field" },
      ],
    });
  });

  it("never throws on hostile input", () => {
    const hostileInputs: unknown[] = [
      null,
      undefined,
      42,
      "hello",
      [1, 2, 3],
      {},
      { playstyle: {}, rounds: {}, artwork: { nested: "junk" } },
      { artwork: new Array(10000).fill(1) },
    ];
    for (const input of hostileInputs) {
      expect(() => parseSetup(input)).not.toThrow();
    }
  });
});

describe("startGame", () => {
  const setup: Setup = EXAMPLE_SETUP as unknown as Setup;

  it("gives the same state startingGameState gives for the same settings and seed", () => {
    const fromCore = startGame(setup, seededRandom(12345));
    const fromRules = startingGameState(seededRandom(12345), {
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
    expect(fromCore.state).toEqual(fromRules);
  });

  it("reports the draws it made, replayable with recordedRandom to an equal state", () => {
    const { state, draws } = startGame(setup, seededRandom(999));
    const replayed = startGame(setup, recordedRandom(draws));
    expect(replayed.state).toEqual(state);
    expect(replayed.draws).toEqual(draws);
  });

  it("throws DesyncError when replayed with a draw removed", () => {
    const { draws } = startGame(setup, seededRandom(999));
    expect(() =>
      startGame(setup, recordedRandom(draws.slice(0, -1))),
    ).toThrow();
  });

  it("throws DesyncError when replayed with an extra draw appended", () => {
    const { draws } = startGame(setup, seededRandom(999));
    expect(() => startGame(setup, recordedRandom([...draws, 0]))).toThrow();
  });
});
