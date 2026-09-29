// The guide screen: a first read for someone who has never played, not a
// reference (story.md). Assembles the guide's copy with its diagrams into
// one scrollable page, with a Back button at the top and a second one after
// the last diagram. Purely presentational — no session, no state, and
// nothing dispatched. Reachable from the start screen or from its own
// address, and both Back buttons move the browser back (`src/nav`).

import type { ComponentType } from "react";
import type { GuideSectionId } from "./guideCopy";
import {
  GUIDE_INTRO_PARAGRAPH,
  GUIDE_SECTIONS,
  GUIDE_TITLE,
} from "./guideCopy";
import {
  MovementDiagram,
  NodeLifecycleDiagram,
  NodeSelectionDiagram,
  PlanetActivityDiagram,
  PlanetBonusDiagram,
  PlayerMatchingNodesDiagram,
  RefuellingDiagram,
  RotatorSquareDiagram,
  ScoringDiagram,
  StealingNodesDiagram,
} from "./guideDiagrams";
import { respell } from "../spelling/spelling";
import { useSpelling } from "../spelling/spellingContext";
import "./GuideScreen.css";

/**
 * The remaining eight sections' diagrams, keyed by section id rather than
 * array position, so a section added to `GUIDE_SECTIONS` without a matching
 * entry here fails to compile instead of rendering `undefined`.
 */
const SECTION_DIAGRAMS: Record<GuideSectionId, ComponentType> = {
  movement: MovementDiagram,
  refuelling: RefuellingDiagram,
  nodeLifecycle: NodeLifecycleDiagram,
  nodeSelection: NodeSelectionDiagram,
  stealingNodes: StealingNodesDiagram,
  playerMatchingNodes: PlayerMatchingNodesDiagram,
  planetBonus: PlanetBonusDiagram,
  planetActivity: PlanetActivityDiagram,
};

/**
 * A trailing second diagram for a section, keyed by section id and
 * deliberately partial: only NEW CHARGED NODE SELECTION has one, and a
 * section with none is the normal case rather than an omission to catch.
 * Rendered after that section's setting lines.
 */
const TRAILING_DIAGRAMS: Partial<Record<GuideSectionId, ComponentType>> = {
  nodeSelection: RotatorSquareDiagram,
};

interface GuideScreenProps {
  readonly onBack: () => void;
}

/**
 * The Quick Guide: the intro paragraph and scoring diagram, then the eight
 * headed sections, each a heading, its paragraph and its diagram — NEW
 * CHARGED NODE SELECTION also carries the three rotation setting lines and a
 * second, trailing diagram. All copy is shown in the spelling in force.
 * `onBack` is called by either Back button and otherwise means nothing to
 * this component — it holds no state of its own.
 */
export function GuideScreen({ onBack }: GuideScreenProps) {
  const spelling = useSpelling();
  const spelt = (text: string) => respell(text, spelling);
  return (
    <div className="guide-screen">
      <button type="button" className="guide-screen__back" onClick={onBack}>
        Back
      </button>
      <h1 className="guide-screen__title">{spelt(GUIDE_TITLE)}</h1>
      <p className="guide-screen__paragraph">{spelt(GUIDE_INTRO_PARAGRAPH)}</p>
      <ScoringDiagram />
      {GUIDE_SECTIONS.map((section) => {
        const Diagram = SECTION_DIAGRAMS[section.id];
        const TrailingDiagram = TRAILING_DIAGRAMS[section.id];
        return (
          <section key={section.heading} className="guide-screen__section">
            <h2 className="guide-screen__heading">{spelt(section.heading)}</h2>
            <p className="guide-screen__paragraph">
              {spelt(section.paragraph)}
            </p>
            <Diagram />
            {section.settingLines?.map((line) => (
              <p key={line.label} className="guide-screen__paragraph">
                <em>{spelt(line.label)}</em>: {spelt(line.text)}
              </p>
            ))}
            {TrailingDiagram && <TrailingDiagram />}
          </section>
        );
      })}
      <button type="button" className="guide-screen__back" onClick={onBack}>
        Back
      </button>
    </div>
  );
}
