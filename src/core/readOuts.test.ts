import { describe, expect, it } from "vitest";
import { squareFromName } from "../rules/board";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "../rules/gameLength";
import type { GameState, Ship } from "../rules/gameState";
import type { PowerLevel } from "../rules/power";
import type { Side } from "../rules/fleet";
import { result, toMove } from "./readOuts";

function ship(
  id: string,
  side: Side,
  square: string,
  power: PowerLevel = 4,
): Ship {
  return { id, side, square: squareFromName(square), power };
}

function buildState(config: {
  ships: readonly Ship[];
  sideToMove?: Side;
  plyNumber?: number;
  lengthInRounds?: number;
  energy?: { green: number; red: number };
  outOfTime?: { green: boolean; red: boolean };
}): GameState {
  return {
    ships: config.ships,
    nodes: {},
    sideToMove: config.sideToMove ?? "green",
    plyNumber: config.plyNumber ?? 1,
    nodePlaystyle: "continuous",
    rotators: [],
    planetBonus: "off",
    bonusPlanets: { green: [], red: [] },
    planetActivity: "off",
    activityBonuses: [],
    energy: config.energy ?? { green: 0, red: 0 },
    lengthInRounds: config.lengthInRounds ?? DEFAULT_GAME_LENGTH_ROUNDS,
    chargedNodeCount: 4,
    outOfTime: config.outOfTime ?? { green: false, red: false },
    combatEnabled: true,
    scoring: "simple",
    playerMatching: "off",
  };
}

describe("toMove", () => {
  it("reports the side to move and the ply number while the game is in progress", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "A1")],
      sideToMove: "red",
      plyNumber: 7,
    });

    expect(toMove(state)).toEqual({ side: "red", plyNumber: 7 });
  });

  it("is null once the game has ended by running past its length", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "A1")],
      plyNumber: 61,
      lengthInRounds: 30,
    });

    expect(toMove(state)).toBeNull();
  });

  it("is null once both sides are out of time", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "A1")],
      outOfTime: { green: true, red: true },
    });

    expect(toMove(state)).toBeNull();
  });
});

describe("result", () => {
  it("is null while the game is still in progress", () => {
    const state = buildState({ ships: [ship("green-1", "green", "A1")] });

    expect(result(state)).toBeNull();
  });

  it("reports green-won with both totals when green has more energy", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "A1")],
      plyNumber: 61,
      lengthInRounds: 30,
      energy: { green: 10, red: 4 },
    });

    expect(result(state)).toEqual({
      outcome: "green-won",
      energy: { green: 10, red: 4 },
    });
  });

  it("reports red-won with both totals when red has more energy", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "A1")],
      plyNumber: 61,
      lengthInRounds: 30,
      energy: { green: 4, red: 10 },
    });

    expect(result(state)).toEqual({
      outcome: "red-won",
      energy: { green: 4, red: 10 },
    });
  });

  it("reports a draw with both totals when energy is equal", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "A1")],
      plyNumber: 61,
      lengthInRounds: 30,
      energy: { green: 6, red: 6 },
    });

    expect(result(state)).toEqual({
      outcome: "draw",
      energy: { green: 6, red: 6 },
    });
  });
});
