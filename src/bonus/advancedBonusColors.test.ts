import { describe, expect, it } from "vitest";
import { PLAYER_NODE_COLORS, SIGNAL_COLORS } from "../board/squareArt";
import { advancedBonusSymbolColors } from "./advancedBonusColors";

describe("advancedBonusSymbolColors (steal.md §10)", () => {
  it("is gold, silver, blue when player-matching is off", () => {
    expect(advancedBonusSymbolColors("off")).toEqual([
      SIGNAL_COLORS[0].core,
      SIGNAL_COLORS[1].core,
      SIGNAL_COLORS[2].core,
    ]);
  });

  it("is gold, red, green when player-matching is double", () => {
    expect(advancedBonusSymbolColors("double")).toEqual([
      SIGNAL_COLORS[0].core,
      PLAYER_NODE_COLORS.red.core,
      PLAYER_NODE_COLORS.green.core,
    ]);
  });

  it("is gold, red, green when player-matching is required", () => {
    expect(advancedBonusSymbolColors("required")).toEqual([
      SIGNAL_COLORS[0].core,
      PLAYER_NODE_COLORS.red.core,
      PLAYER_NODE_COLORS.green.core,
    ]);
  });
});
