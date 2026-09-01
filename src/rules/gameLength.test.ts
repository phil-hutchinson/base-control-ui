import { describe, expect, it } from "vitest";
import {
  DEFAULT_GAME_LENGTH_ROUNDS,
  GAME_LENGTH_OPTIONS_ROUNDS,
  currentRound,
  gameResult,
  isGameLengthRounds,
  isGameOver,
  pliesForGameLength,
  roundForPly,
} from "./gameLength";
import { startingGameState } from "./gameState";

const SEED = 12345;

describe("DEFAULT_GAME_LENGTH_ROUNDS", () => {
  it("is 30 (rules.md §9)", () => {
    expect(DEFAULT_GAME_LENGTH_ROUNDS).toBe(30);
  });
});

describe("GAME_LENGTH_OPTIONS_ROUNDS", () => {
  it("offers 30, 50, 75 and 100, shortest first, and includes the default", () => {
    expect(GAME_LENGTH_OPTIONS_ROUNDS).toEqual([30, 50, 75, 100]);
    expect(GAME_LENGTH_OPTIONS_ROUNDS).toContain(DEFAULT_GAME_LENGTH_ROUNDS);
  });

  it("does not restrict isGameLengthRounds to the offered values", () => {
    expect(isGameLengthRounds(1)).toBe(true);
    expect(isGameLengthRounds(3)).toBe(true);
  });
});

describe("pliesForGameLength", () => {
  it("runs a hundred-round game to 200 plies", () => {
    expect(pliesForGameLength(100)).toBe(200);
  });

  it("runs a three-round game to 6 plies", () => {
    expect(pliesForGameLength(3)).toBe(6);
  });
});

describe("roundForPly", () => {
  it.each([
    [1, 1],
    [2, 1],
    [3, 2],
    [4, 2],
    [199, 100],
    [200, 100],
    [201, 101],
  ])("ply %i is round %i", (plyNumber, round) => {
    expect(roundForPly(plyNumber)).toBe(round);
  });

  it("throws on ply 0", () => {
    expect(() => roundForPly(0)).toThrow(RangeError);
  });

  it("throws on a negative ply", () => {
    expect(() => roundForPly(-1)).toThrow(RangeError);
  });

  it("throws on a fractional ply", () => {
    expect(() => roundForPly(1.5)).toThrow(RangeError);
  });
});

describe("isGameLengthRounds", () => {
  it.each([1, 100])("accepts %i", (value) => {
    expect(isGameLengthRounds(value)).toBe(true);
  });

  it.each([0, -3, 2.5])("rejects %i", (value) => {
    expect(isGameLengthRounds(value)).toBe(false);
  });
});

describe("isGameOver", () => {
  it("is not over at ply 60 of a default-length game", () => {
    const state = { ...startingGameState(SEED), plyNumber: 60 };
    expect(isGameOver(state)).toBe(false);
  });

  it("is over at ply 61 of a default-length game", () => {
    const state = { ...startingGameState(SEED), plyNumber: 61 };
    expect(isGameOver(state)).toBe(true);
  });

  it("is not over at ply 6 of a three-round game", () => {
    const state = { ...startingGameState(SEED, 3), plyNumber: 6 };
    expect(isGameOver(state)).toBe(false);
  });

  it("is over at ply 7 of a three-round game", () => {
    const state = { ...startingGameState(SEED, 3), plyNumber: 7 };
    expect(isGameOver(state)).toBe(true);
  });
});

describe("currentRound", () => {
  it.each([
    [59, 30],
    [60, 30],
    [61, 30],
  ])("reads %i as round %i in a default-length game", (plyNumber, round) => {
    const state = { ...startingGameState(SEED), plyNumber };
    expect(currentRound(state)).toBe(round);
  });

  it.each([
    [6, 3],
    [7, 3],
  ])("reads %i as round %i in a three-round game", (plyNumber, round) => {
    const state = { ...startingGameState(SEED, 3), plyNumber };
    expect(currentRound(state)).toBe(round);
  });
});

describe("gameResult", () => {
  it("names green the winner when green's total is higher", () => {
    const state = {
      ...startingGameState(SEED),
      plyNumber: 61,
      energy: { green: 10, red: 4 },
    };
    expect(gameResult(state)).toEqual({
      outcome: "green-won",
      winner: "green",
      energy: { green: 10, red: 4 },
    });
  });

  it("names red the winner when red's total is higher", () => {
    const state = {
      ...startingGameState(SEED),
      plyNumber: 61,
      energy: { green: 4, red: 10 },
    };
    expect(gameResult(state)).toEqual({
      outcome: "red-won",
      winner: "red",
      energy: { green: 4, red: 10 },
    });
  });

  it("is a draw when both totals are equal", () => {
    const state = {
      ...startingGameState(SEED),
      plyNumber: 61,
      energy: { green: 7, red: 7 },
    };
    expect(gameResult(state)).toEqual({
      outcome: "draw",
      energy: { green: 7, red: 7 },
    });
  });

  it("throws when the game is not over", () => {
    const state = { ...startingGameState(SEED), plyNumber: 60 };
    expect(() => gameResult(state)).toThrow(RangeError);
  });
});
