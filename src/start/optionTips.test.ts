import { describe, expect, it } from "vitest";
import { OPTION_TIPS } from "./optionTips";

describe("OPTION_TIPS", () => {
  it("explains the four node playstyles, with no introduction", () => {
    expect(OPTION_TIPS.nodePlaystyle).toEqual({
      choices: [
        {
          choice: "CONTINUOUS",
          text: "The next node to charge rotates at the end of every turn.",
        },
        {
          choice: "PLANET",
          text: "The next node to charge rotates each time a ship lands on a planet.",
        },
        {
          choice: "DEDICATED",
          text: "Special squares on the board rotate the next node to charge, when a ship lands on one.",
        },
        {
          choice: "STEAL",
          text: "Nodes never run out, but each one has a matching square where a ship can land to steal it.",
        },
      ],
    });
  });

  it("explains ships in one sentence", () => {
    expect(OPTION_TIPS.fleetSize).toEqual({
      intro: "The number of ships each player has.",
    });
  });

  it("explains charged nodes in one sentence", () => {
    expect(OPTION_TIPS.chargedNodeCount).toEqual({
      intro: "The number of charged nodes on the board at any time.",
    });
  });

  it("explains player-matching nodes, then DOUBLE and REQUIRED", () => {
    expect(OPTION_TIPS.playerMatching).toEqual({
      intro:
        "When on, each player has a node in their own colour, with a special effect:",
      choices: [
        {
          choice: "DOUBLE",
          text: "Your own node counts as two nodes while you hold it.",
        },
        {
          choice: "REQUIRED",
          text: "You score no points for any node unless you hold your own.",
        },
      ],
    });
  });

  it("explains node scoring, then SIMPLE and BONUS", () => {
    expect(OPTION_TIPS.scoring).toEqual({
      intro: "How nodes score at the end of each turn:",
      choices: [
        { choice: "SIMPLE", text: "One point for each node you hold." },
        {
          choice: "BONUS",
          text: "Each extra node you hold is worth one more than the last: 1, 3, 6, 10 or 15 points for one to five nodes.",
        },
      ],
    });
  });

  it("explains planet effects, then STABLE and RACE", () => {
    expect(OPTION_TIPS.planetActivity).toEqual({
      intro:
        "When on, two planets each carry a bonus for the first ship to land there, of either player. Each time a bonus is claimed, a new one appears on another planet.",
      choices: [
        {
          choice: "STABLE",
          text: "When a bonus is claimed, the other one stays as it is.",
        },
        {
          choice: "RACE",
          text: "When a bonus is claimed, the other one changes to a different bonus.",
        },
      ],
    });
  });

  it("explains the planet bonus in one sentence", () => {
    expect(OPTION_TIPS.planetBonus).toEqual({
      intro:
        "When on, each player is given three planets that pay them the chosen points the first time one of their ships lands there.",
    });
  });

  it("explains rounds in one sentence", () => {
    expect(OPTION_TIPS.lengthInRounds).toEqual({
      intro: "The number of turns each player has in the game.",
    });
  });

  it("explains the clock in one sentence", () => {
    expect(OPTION_TIPS.clockSetting).toEqual({
      intro:
        "Each player has a total time for the whole game: the chosen time per turn, multiplied by the number of rounds. UNLIMITED means no clock.",
    });
  });
});
