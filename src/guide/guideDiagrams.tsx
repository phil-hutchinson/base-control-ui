// The guide's diagrams: each a thin component handing `GuideDiagram` a
// fixed list of cells built from real `BoardSquare`s, so a future restyle of
// ship or node art redraws these for free. Every ship is green, except
// STEALING NODES's diagram — the one exception — which shows a red ship
// too, since a steal needs both sides to make sense. No square carries a
// selection mark or a condition bar. Countdown numbers and cycle positions
// are derived from `../rules/countdown`, exactly as `Board` derives them,
// rather than typed in by hand. NEW CHARGED NODE SELECTION carries two of
// these — the rotation diagram every setting shares, and a second, a bare
// square holding a rotator, for the dedicated setting alone. PLANET BONUS
// and ADVANCED PLANET BONUSES are the exceptions to "built from
// `BoardSquare`s": their cells are `PlanetBonusCell` and `ActivityBonusCell`,
// the same cells `PlanetBonusPanel` draws, so the guide's checkmark and
// symbols can never drift from the panel's own. ADVANCED PLANET BONUSES'
// `+N` amount is read from the point lookup at the app's own default
// settings, never typed in by hand.

import { countdownNumber, nodeCyclePosition } from "../rules/countdown";
import { energyForNodesHeld } from "../rules/energy";
import type { NodePriority } from "../rules/nodeQueue";
import type { PowerLevel } from "../rules/power";
import { MAX_POWER } from "../rules/power";
import type { ScoringSetting } from "../rules/scoring";
import { DEFAULT_SCORING } from "../rules/scoring";
import type { NodeSignal } from "../rules/steal";
import { PLANET_ART } from "../board/planetArt";
import type { GuideDiagramCell } from "./GuideDiagram";
import { GuideDiagram } from "./GuideDiagram";
import type { MovementCostOffset } from "./movementCosts";
import { movementCostOffsets } from "./movementCosts";
import { DEFAULT_CHARGED_NODE_COUNT } from "../rules/nodes";
import { DEFAULT_PLAYER_MATCHING } from "../rules/playerMatching";

/** One through five: the largest charged-node count the board offers, and so the widest the scoring diagram's table needs to run. */
const SCORING_TABLE_COUNTS = [1, 2, 3, 4, 5] as const;

/** A scoring table row: its label, then what a turn pays for each count in `SCORING_TABLE_COUNTS`, from `energyForNodesHeld` (§8.4) rather than a hard-coded figure. */
function scoringTableRow(
  label: string,
  scoring: ScoringSetting,
): readonly GuideDiagramCell[] {
  return [
    { kind: "label", text: label },
    ...SCORING_TABLE_COUNTS.map((count): GuideDiagramCell => ({
      kind: "label",
      text: String(energyForNodesHeld(count, scoring)),
    })),
  ];
}

/**
 * A charged node holding a ship, showing the given plies-remaining as its
 * countdown and gauge. `power` excludes zero: a ship at zero fuel draws no
 * gauge marks, so it would be indistinguishable from one with no level at
 * all — never a state this guide shows.
 */
function chargedNodeCell(
  squareName: string,
  pliesRemaining: number,
  power: Exclude<PowerLevel, 0>,
): GuideDiagramCell {
  return {
    kind: "square",
    square: {
      isPlanet: false,
      squareName,
      nodeState: "charged",
      cyclePosition: nodeCyclePosition("charged", pliesRemaining, true),
      countdownNumber: countdownNumber("charged", pliesRemaining, true),
      occupant: { side: "green", power },
    },
  };
}

/** Diagram 1: the full scoring breakdown — one through five nodes held, under both simple and bonus scoring, as a six-column table under a legend line. */
export function ScoringDiagram() {
  const cells: readonly GuideDiagramCell[] = [
    { kind: "label", text: "NODES" },
    ...SCORING_TABLE_COUNTS.map((count): GuideDiagramCell => ({
      kind: "label",
      text: String(count),
    })),
    { kind: "rule" },
    ...scoringTableRow("SIMPLE", "simple"),
    ...scoringTableRow("BONUS", "bonus"),
  ];
  return <GuideDiagram columns={6} cells={cells} labelColumn />;
}

/**
 * The run of offsets the movement diagram's grid spans in each direction:
 * the largest absolute row or column offset among the reachable squares,
 * mirrored either side of the ship. This follows §6's reach rather than
 * naming a fixed grid size, so a wider table grows the diagram for free.
 */
function movementGridOffsets(
  offsets: readonly MovementCostOffset[],
): readonly number[] {
  const extent = offsets.reduce(
    (max, offset) =>
      Math.max(max, Math.abs(offset.deltaColumn), Math.abs(offset.deltaRow)),
    0,
  );
  const run: number[] = [];
  for (let value = -extent; value <= extent; value++) {
    run.push(value);
  }
  return run;
}

/** Diagram 2: a grid sized to §6's reach, a fully-fuelled ship at centre, and each reachable square's move cost. */
export function MovementDiagram() {
  const offsets = movementCostOffsets();
  const gridOffsets = movementGridOffsets(offsets);
  const cells: GuideDiagramCell[] = [];

  for (const deltaRow of gridOffsets) {
    for (const deltaColumn of gridOffsets) {
      const squareName = `guide-movement-${deltaColumn}-${deltaRow}`;
      if (deltaColumn === 0 && deltaRow === 0) {
        cells.push({
          kind: "square",
          square: {
            isPlanet: false,
            squareName,
            occupant: { side: "green", power: MAX_POWER },
          },
        });
        continue;
      }

      const offset = offsets.find(
        (candidate) =>
          candidate.deltaColumn === deltaColumn &&
          candidate.deltaRow === deltaRow,
      );
      if (offset === undefined) {
        cells.push({ kind: "empty" });
        continue;
      }

      cells.push({
        kind: "number",
        square: { isPlanet: false, squareName },
        value: offset.cost,
      });
    }
  }

  return <GuideDiagram columns={gridOffsets.length} cells={cells} />;
}

const REFUELLING_PLANET = PLANET_ART[0];

/** Diagram 3: a ship on a planet at four fuel, an arrow, then the same ship on the same planet at six. */
export function RefuellingDiagram() {
  const cells: readonly GuideDiagramCell[] = [
    {
      kind: "square",
      square: {
        isPlanet: true,
        planet: REFUELLING_PLANET,
        squareName: "guide-refuelling-1",
        occupant: { side: "green", power: 4 },
      },
    },
    { kind: "arrow" },
    {
      kind: "square",
      square: {
        isPlanet: true,
        planet: REFUELLING_PLANET,
        squareName: "guide-refuelling-2",
        occupant: { side: "green", power: 6 },
      },
    },
  ];
  return <GuideDiagram columns={3} cells={cells} />;
}

/** Diagram 4: a charged node at 1 becoming a depleted node at 5, the same ship trapped inside throughout. */
export function NodeLifecycleDiagram() {
  const power = 4;
  const cells: readonly GuideDiagramCell[] = [
    chargedNodeCell("guide-lifecycle-1", 2, power),
    { kind: "arrow" },
    {
      kind: "square",
      square: {
        isPlanet: false,
        squareName: "guide-lifecycle-2",
        nodeState: "depleted",
        cyclePosition: nodeCyclePosition("depleted", 11, true),
        countdownNumber: countdownNumber("depleted", 11, true),
        occupant: { side: "green", power },
      },
    },
  ];
  return <GuideDiagram columns={3} cells={cells} />;
}

/** One inactive node cell, drawing as many rings as its priority. */
function inactiveNodeCell(
  squareName: string,
  priority: NodePriority,
): GuideDiagramCell {
  return {
    kind: "square",
    square: {
      isPlanet: false,
      squareName,
      nodeState: "inactive",
      priority,
    },
  };
}

/** Diagram 5: one indicator through a full rotation, three rings to one to two to three. */
export function NodeSelectionDiagram() {
  const cells: readonly GuideDiagramCell[] = [
    inactiveNodeCell("guide-selection-1", 3),
    { kind: "arrow" },
    inactiveNodeCell("guide-selection-2", 1),
    { kind: "arrow" },
    inactiveNodeCell("guide-selection-3", 2),
    { kind: "arrow" },
    inactiveNodeCell("guide-selection-4", 3),
  ];
  return <GuideDiagram columns={7} cells={cells} />;
}

/**
 * Diagram 6: a single square holding a rotator, with nothing else on it —
 * no ship, no node, no rings — so the player sees the mark the dedicated
 * setting scatters across the board (rules.md §3.3) in isolation.
 */
export function RotatorSquareDiagram() {
  const cells: readonly GuideDiagramCell[] = [
    {
      kind: "square",
      square: {
        isPlanet: false,
        squareName: "guide-rotator",
        hasRotator: true,
      },
    },
  ];
  return <GuideDiagram columns={1} cells={cells} />;
}

// The signal STEALING NODES's diagram draws with — the palette's first, so
// the diagram shows in the same colour every steal game's first node does.
const STEALING_DIAGRAM_SIGNAL: NodeSignal = 0;
const STEALING_DIAGRAM_POWER = 4;

/**
 * Diagram 7: a steal (steal.md §§3-4) at a glance. Before: green holds a
 * node (its charged square), the node's prospective square sits beside it,
 * and red's ship waits next to that. After: red has landed on the
 * prospective square, taking the node — it is now the charged square, in
 * the same signal's colour, with red's ship on it — and green's ship is
 * left standing on the square that just became ordinary board. The one
 * diagram with a red ship (see this module's header).
 */
export function StealingNodesDiagram() {
  const cells: readonly GuideDiagramCell[] = [
    {
      kind: "square",
      square: {
        isPlanet: false,
        squareName: "guide-steal-1",
        nodeState: "charged",
        signal: STEALING_DIAGRAM_SIGNAL,
        occupant: { side: "green", power: STEALING_DIAGRAM_POWER },
      },
    },
    {
      kind: "square",
      square: {
        isPlanet: false,
        squareName: "guide-steal-2",
        nodeState: "prospective",
        signal: STEALING_DIAGRAM_SIGNAL,
      },
    },
    {
      kind: "square",
      square: {
        isPlanet: false,
        squareName: "guide-steal-3",
        occupant: { side: "red", power: STEALING_DIAGRAM_POWER },
      },
    },
    { kind: "arrow" },
    {
      kind: "square",
      square: {
        isPlanet: false,
        squareName: "guide-steal-4",
        occupant: { side: "green", power: STEALING_DIAGRAM_POWER },
      },
    },
    {
      kind: "square",
      square: {
        isPlanet: false,
        squareName: "guide-steal-5",
        nodeState: "charged",
        signal: STEALING_DIAGRAM_SIGNAL,
        occupant: { side: "red", power: STEALING_DIAGRAM_POWER },
      },
    },
  ];
  return <GuideDiagram columns={6} cells={cells} />;
}

// The signals PLAYER-MATCHING NODES's diagram draws with — the last two a
// five-node game uses, red then green, matching steal.md §9's own
// assignment (`matchedSignalForSide`) — so the diagram shows the same
// signals a five-node game would match.
const PLAYER_MATCHING_DIAGRAM_GREEN_SIGNAL: NodeSignal = 4;
const PLAYER_MATCHING_DIAGRAM_RED_SIGNAL: NodeSignal = 3;
const PLAYER_MATCHING_DIAGRAM_POWER = 4;

/**
 * Diagram 8: player-matching nodes (steal.md §9) at a glance — green's own
 * node, charged, with a green ship on it, beside red's own node, still
 * open, its prospective rings drawn in red rather than a signal's own
 * colour.
 */
export function PlayerMatchingNodesDiagram() {
  const cells: readonly GuideDiagramCell[] = [
    {
      kind: "square",
      square: {
        isPlanet: false,
        squareName: "guide-player-matching-1",
        nodeState: "charged",
        signal: PLAYER_MATCHING_DIAGRAM_GREEN_SIGNAL,
        matchedSide: "green",
        occupant: { side: "green", power: PLAYER_MATCHING_DIAGRAM_POWER },
      },
    },
    {
      kind: "square",
      square: {
        isPlanet: false,
        squareName: "guide-player-matching-2",
        nodeState: "prospective",
        signal: PLAYER_MATCHING_DIAGRAM_RED_SIGNAL,
        matchedSide: "red",
      },
    },
  ];
  return <GuideDiagram columns={2} cells={cells} />;
}

/**
 * Diagram 9: green's bonus row alone — three planets, one already carrying
 * the settled checkmark, the other two unclaimed. Red's row and the `+N`
 * badge are both left out; one row and one claim is what the section's
 * paragraph needs shown.
 */
export function PlanetBonusDiagram() {
  const cells: readonly GuideDiagramCell[] = [
    {
      kind: "bonusPlanet",
      side: "green",
      art: PLANET_ART[0],
      badge: "claimed",
    },
    { kind: "bonusPlanet", side: "green", art: PLANET_ART[1], badge: "none" },
    { kind: "bonusPlanet", side: "green", art: PLANET_ART[2], badge: "none" },
  ];
  return <GuideDiagram columns={3} cells={cells} />;
}

/**
 * Diagram 10: the ADVANCED PLANET BONUSES panel (steal.md §10) at a glance —
 * a Large points bonus beside a Node scramble bonus, drawn with the same
 * `ActivityBonusCell` the panel itself draws, at the app's own default
 * settings (its `+N` comes from the point lookup, never typed in) and so in
 * gold/silver/blue, since player-matching is off by default.
 */
export function AdvancedPlanetBonusDiagram() {
  const cells: readonly GuideDiagramCell[] = [
    {
      kind: "activityBonus",
      art: PLANET_ART[0],
      bonusKind: "large-points",
      nodeCount: DEFAULT_CHARGED_NODE_COUNT,
      playerMatching: DEFAULT_PLAYER_MATCHING,
      scoring: DEFAULT_SCORING,
    },
    {
      kind: "activityBonus",
      art: PLANET_ART[1],
      bonusKind: "node-scramble",
      nodeCount: DEFAULT_CHARGED_NODE_COUNT,
      playerMatching: DEFAULT_PLAYER_MATCHING,
      scoring: DEFAULT_SCORING,
    },
  ];
  return <GuideDiagram columns={2} cells={cells} />;
}
