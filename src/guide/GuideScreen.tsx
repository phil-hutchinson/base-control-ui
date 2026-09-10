// The guide screen: a first read for someone who has never played, not a
// reference (story.md). Assembles the guide's copy with its diagrams into
// one scrollable page, with a Back button at the top and a second one after
// the last diagram. Purely presentational — no session, no state, and
// nothing dispatched — reachable only from, and returning only to, the start
// screen (`App.tsx`, `useAppScreen`).

import type { ComponentType } from "react";
import { PlanetDefs } from "../board/PlanetDefs";
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
  RefuellingDiagram,
  ScoringDiagram,
} from "./guideDiagrams";
import "./GuideScreen.css";

/**
 * The remaining four sections' diagrams, keyed by section id rather than
 * array position, so a section added to `GUIDE_SECTIONS` without a matching
 * entry here fails to compile instead of rendering `undefined`.
 */
const SECTION_DIAGRAMS: Record<GuideSectionId, ComponentType> = {
  movement: MovementDiagram,
  refuelling: RefuellingDiagram,
  nodeLifecycle: NodeLifecycleDiagram,
  nodeSelection: NodeSelectionDiagram,
};

interface GuideScreenProps {
  readonly onBack: () => void;
}

/**
 * The Quick Guide: the intro paragraph and scoring diagram, then the four
 * headed sections, each a heading, its paragraph and its diagram. `onBack`
 * is called by either Back button and otherwise means nothing to this
 * component — it holds no state of its own.
 */
export function GuideScreen({ onBack }: GuideScreenProps) {
  return (
    <div className="guide-screen">
      <button type="button" className="guide-screen__back" onClick={onBack}>
        Back
      </button>
      <h1 className="guide-screen__title">{GUIDE_TITLE}</h1>
      <p className="guide-screen__paragraph">{GUIDE_INTRO_PARAGRAPH}</p>
      <ScoringDiagram />
      {GUIDE_SECTIONS.map((section) => {
        const Diagram = SECTION_DIAGRAMS[section.id];
        return (
          <section key={section.heading} className="guide-screen__section">
            <h2 className="guide-screen__heading">{section.heading}</h2>
            <p className="guide-screen__paragraph">{section.paragraph}</p>
            <Diagram />
          </section>
        );
      })}
      <button type="button" className="guide-screen__back" onClick={onBack}>
        Back
      </button>
      <PlanetDefs />
    </div>
  );
}
