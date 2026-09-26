// The Quick Guide's page title and section copy, verbatim from story.md
// (doc/plan/00000050-how-to-play-instructions/story.md). The node selection
// section's paragraph and its three setting lines were rewritten verbatim by
// the owner for the inactive node rotation options
// (doc/plan/00000090-add-prospective-node-rotation-options/implementation-plan.md).
// The STEALING NODES section's paragraph was drafted for the steal
// playstyle and settled with the owner
// (doc/plan/00000101-add-node-steal-play-variant/implementation-plan.md,
// step 10).
// `GuideScreen` renders these in order and pairs each with its diagram; this
// module knows nothing about React or layout.
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
  "game. At the end of each turn, gain points for the charged nodes your " +
  "spaceships are on — one each under simple scoring, or more for each " +
  "extra node under bonus scoring.";

/**
 * Identifies one of the guide's six headed sections, so a caller can pair
 * a section with its diagram without relying on array position.
 */
export type GuideSectionId =
  | "movement"
  | "refuelling"
  | "nodeLifecycle"
  | "nodeSelection"
  | "stealingNodes"
  | "planetBonus";

/**
 * One emphasised label and its sentence, under NEW CHARGED NODE SELECTION —
 * one per node playstyle (rules.md §8.2).
 */
export interface GuideSettingLine {
  readonly label: string;
  readonly text: string;
}

/**
 * One of the guide's five headed sections: a heading and its paragraph.
 * `settingLines` is optional and, at present, carried by nodeSelection
 * alone: an ordered list of setting lines rendered between the section's
 * diagram and its second one.
 */
export interface GuideSection {
  readonly id: GuideSectionId;
  readonly heading: string;
  readonly paragraph: string;
  readonly settingLines?: readonly GuideSettingLine[];
}

/**
 * The six headed sections, in the order the guide reads: movement,
 * refuelling, the node lifecycle, new charged node selection, stealing
 * nodes, and the planet bonus.
 */
export const GUIDE_SECTIONS: readonly GuideSection[] = [
  {
    id: "movement",
    heading: "MOVEMENT",
    paragraph:
      "One spaceship can move per turn. For longer moves, fuel is " +
      "required, as follows:",
  },
  {
    id: "refuelling",
    heading: "REFUELING",
    paragraph:
      "Spaceships can hold up to six fuel. At the end of a player's turn, " +
      "spaceships sitting on planets regain one fuel. If a player has " +
      "only one spaceship gaining fuel and it has room, it gains two fuel.",
  },
  {
    id: "nodeLifecycle",
    heading: "NODE LIFECYCLE",
    paragraph:
      "Under the Continuous, Planet and Dedicated playstyles, the board " +
      "always has the number of charged nodes chosen at the start: five, " +
      "four or three. When a spaceship enters a charged node, a countdown " +
      "begins before it is depleted. The spaceship gains points every " +
      "turn it stays on the node, until it becomes depleted. A charged " +
      "node also becomes depleted if the spaceship leaves it. When the " +
      "node becomes depleted, a new charged node is created. If a node " +
      "depletes with a spaceship still inside it, the spaceship is " +
      "trapped for 5 turns.",
  },
  {
    id: "nodeSelection",
    heading: "NEW CHARGED NODE SELECTION",
    paragraph:
      "Under the Continuous, Planet and Dedicated playstyles, three " +
      "indicators appear on the board, with one, two, and three rings. " +
      "When a new charged node is needed, it appears at the three-ring " +
      "indicator — and all three indicators are then replaced by a fresh " +
      "set elsewhere. The rings rotate, depending on the Node playstyle " +
      "selected.",
    settingLines: [
      {
        label: "Continuous",
        text: "The rings rotate at the end of each player's turn.",
      },
      {
        label: "Planet",
        text:
          "The rings rotate each time a ship arrives at a planet " +
          "(including post-combat, if combat is enabled).",
      },
      {
        label: "Dedicated",
        text:
          "There are dedicated rotators that appear on squares. Landing " +
          "on one of these triggers the rotation.",
      },
    ],
  },
  {
    id: "stealingNodes",
    heading: "STEALING NODES",
    paragraph:
      "Under the Steal playstyle, every node always shows two squares, " +
      "and a node's two squares are the same colour. A node nobody holds " +
      "shows two sets of rings. Land a spaceship on either set to charge " +
      "the node there: the other set disappears, and a new set appears " +
      "elsewhere on the board. You gain points every turn you stay, and " +
      "the node never runs out. But your opponent can take it by landing " +
      "on its rings — your spaceship is left on an ordinary square. If " +
      "you leave the node yourself, it goes back to two sets of rings, " +
      "for whoever reaches one first.",
  },
  {
    id: "planetBonus",
    heading: "PLANET BONUS",
    paragraph:
      "When the planet bonus option is on, each player is given three " +
      "planets that also pay them points — two or three, whichever was " +
      "chosen — the first time one of their spaceships lands there. Each " +
      "planet only pays a player once, however often their spaceships " +
      "return to it.",
  },
];
