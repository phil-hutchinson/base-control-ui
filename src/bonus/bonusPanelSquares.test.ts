import { describe, expect, it } from "vitest";
import { squareName } from "../rules/board";
import { startingGameState } from "../rules/gameState";
import { bonusPanelSquareNames } from "./bonusPanelSquares";

const SEED = 12345;

describe("bonusPanelSquareNames", () => {
  it("is empty when the setting is off", () => {
    const state = startingGameState(SEED);

    expect(bonusPanelSquareNames(state).size).toBe(0);
  });

  it("names both sides' planets, deduplicated, under two or three points", () => {
    const state = startingGameState(SEED, { planetBonus: "three" });

    const names = bonusPanelSquareNames(state);

    const expected = new Set(
      [...state.bonusPlanets.green, ...state.bonusPlanets.red].map((entry) =>
        squareName(entry.square),
      ),
    );
    expect(names).toEqual(expected);
  });

  it("names exactly the two current bonus squares under advanced", () => {
    const state = startingGameState(SEED, {
      nodePlaystyle: "steal",
      planetBonus: "advanced",
    });

    const names = bonusPanelSquareNames(state);

    expect(names).toEqual(
      new Set(state.advancedBonuses.map((entry) => squareName(entry.square))),
    );
    expect(names.size).toBe(2);
  });
});
