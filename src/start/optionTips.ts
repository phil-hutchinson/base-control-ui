// The start screen's tips: a short explanation of each option group, shown
// when the player presses the question mark beside the group's title.
// Written in international spelling; `StartScreen` passes every string
// through `respell` before showing it. This module knows nothing about
// React or layout.

/** The start screen's option groups, by the code's names for the settings. */
export type OptionGroupId =
  | "nodePlaystyle"
  | "fleetSize"
  | "chargedNodeCount"
  | "playerMatching"
  | "scoring"
  | "planetActivity"
  | "planetBonus"
  | "lengthInRounds"
  | "clockSetting";

/** One choice explained: its name in capitals, as on its button, and its sentence. */
export interface OptionTipChoice {
  readonly choice: string;
  readonly text: string;
}

/** One group's tip: an introduction, a list of choices explained, or both. */
export interface OptionTip {
  readonly intro?: string;
  readonly choices?: readonly OptionTipChoice[];
}

/** Every option group's tip. */
export const OPTION_TIPS: Readonly<Record<OptionGroupId, OptionTip>> = {
  nodePlaystyle: {
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
        text:
          "Special squares on the board rotate the next node to charge, " +
          "when a ship lands on one.",
      },
      {
        choice: "STEAL",
        text:
          "Nodes never run out, but each one has a matching square where " +
          "a ship can land to steal it.",
      },
    ],
  },
  fleetSize: {
    intro: "The number of ships each player has.",
  },
  chargedNodeCount: {
    intro: "The number of charged nodes on the board at any time.",
  },
  playerMatching: {
    intro:
      "When on, each player has a node in their own colour, with a " +
      "special effect:",
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
  },
  scoring: {
    intro: "How nodes score at the end of each turn:",
    choices: [
      { choice: "SIMPLE", text: "One point for each node you hold." },
      {
        choice: "BONUS",
        text:
          "Each extra node you hold is worth one more than the last: 1, 3, " +
          "6, 10 or 15 points for one to five nodes.",
      },
    ],
  },
  planetActivity: {
    intro:
      "When on, two planets each carry a bonus for the first ship to land " +
      "there, of either player. Each time a bonus is claimed, a new one " +
      "appears on another planet.",
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
  },
  planetBonus: {
    intro:
      "When on, each player is given three planets that pay them the " +
      "chosen points the first time one of their ships lands there.",
  },
  lengthInRounds: {
    intro: "The number of turns each player has in the game.",
  },
  clockSetting: {
    intro:
      "Each player gets a total clock time based on this amount of time " +
      "per turn.",
  },
};
