import { describe, expect, it } from "vitest";
import {
  DEFAULT_GAME_LENGTH_ROUNDS,
  isGameLengthRounds,
  pliesForGameLength,
  roundForPly,
} from "./gameLength";

describe("DEFAULT_GAME_LENGTH_ROUNDS", () => {
  it("is 100 (rules.md §9)", () => {
    expect(DEFAULT_GAME_LENGTH_ROUNDS).toBe(100);
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
