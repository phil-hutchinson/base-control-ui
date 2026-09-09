// The Quick Guide's page title and section copy, verbatim from story.md
// (doc/plan/00000050-how-to-play-instructions/story.md). `GuideScreen`
// renders these in order and pairs each with its diagram; this module knows
// nothing about React or layout.
//
// The copy deliberately says "points" and "fuel" rather than "energy" and
// "power", which is what the rest of the app calls the same things. That is
// a knowing exception, not a slip — see story.md, "Vocabulary: a knowing
// exception", for the reasoning. Nothing else in the app may adopt these
// words.

/** The guide's page title, and section 1's implicit heading. */
export const GUIDE_TITLE = "QUICK GUIDE";

/** Section 1's paragraph. Section 1 has no heading of its own. */
export const GUIDE_INTRO_PARAGRAPH =
  "The object of the game is to have the most points at the end of the " +
  "game. At the end of each turn, gain one point for each spaceship you " +
  "have in a charged node.";

/** One of the guide's four headed sections: a heading and its paragraph. */
export interface GuideSection {
  readonly heading: string;
  readonly paragraph: string;
}

/**
 * The four headed sections, in the order the guide reads: movement,
 * refuelling, the node lifecycle, and new charged node selection.
 */
export const GUIDE_SECTIONS: readonly GuideSection[] = [
  {
    heading: "MOVEMENT",
    paragraph:
      "One spaceship can move per turn. For longer moves, fuel is " +
      "required, as follows:",
  },
  {
    heading: "REFUELING",
    paragraph:
      "Spaceships can hold up to six fuel. At the end of a player's turn, " +
      "spaceships sitting on planets regain one fuel. If a player has " +
      "only one spaceship gaining fuel and it has room, it gains two fuel.",
  },
  {
    heading: "NODE LIFECYCLE",
    paragraph:
      "There are always four charged nodes. When a spaceship enters a " +
      "charged node, a countdown begins before it is depleted. The " +
      "spaceship gains 6 points if it stays on the node until it becomes " +
      "depleted. A charged node also becomes depleted if the spaceship " +
      "leaves it. When the node becomes depleted, a new charged node is " +
      "created. If a node depletes with a spaceship still inside it, the " +
      "spaceship is trapped for 5 turns.",
  },
  {
    heading: "NEW CHARGED NODE SELECTION",
    paragraph:
      "Three indicators appear on the board, with one, two, and three " +
      "rings, rotating at the end of each turn. When a new charged node " +
      "is needed, it appears at the three-ring indicator — and all three " +
      "indicators are then replaced by a fresh set elsewhere.",
  },
];
