// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GUIDE_INTRO_PARAGRAPH,
  GUIDE_SECTIONS,
  GUIDE_TITLE,
} from "./guideCopy";
import { SpellingContext } from "../spelling/spellingContext";
import { GuideScreen } from "./GuideScreen";

afterEach(cleanup);

describe("GuideScreen", () => {
  it("shows the title and the eight headings in the story's order", () => {
    render(<GuideScreen onBack={vi.fn()} />);

    expect(
      screen.getByRole("heading", { level: 1, name: GUIDE_TITLE }),
    ).toBeInTheDocument();

    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings.map((heading) => heading.textContent)).toEqual(
      GUIDE_SECTIONS.map((section) => section.heading),
    );
  });

  it("renders all eight paragraphs from the copy module", () => {
    render(<GuideScreen onBack={vi.fn()} />);

    expect(screen.getByText(GUIDE_INTRO_PARAGRAPH)).toBeInTheDocument();
    for (const section of GUIDE_SECTIONS) {
      expect(screen.getByText(section.paragraph)).toBeInTheDocument();
    }
  });

  it("renders ten diagrams: the scoring diagram, one under each section, plus NEW CHARGED NODE SELECTION's second one", () => {
    const { container } = render(<GuideScreen onBack={vi.fn()} />);

    expect(container.querySelectorAll(".guide-diagram")).toHaveLength(10);
  });

  it("renders the node playstyle setting lines and the rotator square after them, in order", () => {
    const { container } = render(<GuideScreen onBack={vi.fn()} />);

    const nodeSelectionSection = GUIDE_SECTIONS.find(
      (section) => section.id === "nodeSelection",
    );
    const settingLines = nodeSelectionSection?.settingLines ?? [];
    expect(settingLines.length).toBeGreaterThan(0);

    let previousLabel: HTMLElement | null = null;
    for (const line of settingLines) {
      const label = screen.getByText(line.label, { selector: "em" });
      expect(label.parentElement?.textContent).toBe(
        `${line.label}: ${line.text}`,
      );
      if (previousLabel) {
        expect(
          previousLabel.compareDocumentPosition(label) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
      }
      previousLabel = label;
    }

    const rotatorMark = container.querySelector(".rotator-marker");
    expect(rotatorMark).toBeInTheDocument();
    expect(
      previousLabel &&
        rotatorMark &&
        previousLabel.compareDocumentPosition(rotatorMark) &
          Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("pairs STEALING NODES, after NEW CHARGED NODE SELECTION, with a diagram showing a red ship", () => {
    render(<GuideScreen onBack={vi.fn()} />);

    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent);
    const nodeSelectionIndex = headings.indexOf("NEW CHARGED NODE SELECTION");
    const stealingNodesIndex = headings.indexOf("STEALING NODES");
    const playerMatchingIndex = headings.indexOf("PLAYER-MATCHING NODES");
    const planetBonusIndex = headings.indexOf("PLANET BONUS");
    expect(stealingNodesIndex).toBe(nodeSelectionIndex + 1);
    expect(playerMatchingIndex).toBe(stealingNodesIndex + 1);
    expect(planetBonusIndex).toBe(playerMatchingIndex + 1);

    const heading = screen.getByRole("heading", {
      level: 2,
      name: "STEALING NODES",
    });
    const section = heading.closest("section");
    expect(section).not.toBeNull();
    expect(section?.querySelectorAll(".node-marker--prospective")).toHaveLength(
      1,
    );
    expect(section?.querySelectorAll(".node-marker--charged")).toHaveLength(2);
    expect(section?.querySelectorAll(".ship-model--red")).toHaveLength(2);
    expect(section?.querySelectorAll(".ship-model--green")).toHaveLength(2);
  });

  it("pairs PLAYER-MATCHING NODES, after STEALING NODES, with a diagram showing green's node in green and red's in red", () => {
    render(<GuideScreen onBack={vi.fn()} />);

    const heading = screen.getByRole("heading", {
      level: 2,
      name: "PLAYER-MATCHING NODES",
    });
    const section = heading.closest("section");
    expect(section).not.toBeNull();
    expect(section?.querySelectorAll(".node-marker--charged")).toHaveLength(1);
    expect(section?.querySelectorAll(".node-marker--prospective")).toHaveLength(
      1,
    );
    expect(section?.querySelectorAll(".ship-model--green")).toHaveLength(1);
    expect(section?.querySelectorAll(".ship-model--red")).toHaveLength(0);
  });

  it("pairs PLANET BONUS, after PLAYER-MATCHING NODES, with a diagram of three planets and one checkmark", () => {
    render(<GuideScreen onBack={vi.fn()} />);

    const heading = screen.getByRole("heading", {
      level: 2,
      name: "PLANET BONUS",
    });
    const section = heading.closest("section");
    expect(section).not.toBeNull();
    expect(section?.querySelectorAll(".planet")).toHaveLength(3);
    expect(
      section?.querySelectorAll(".planet-bonus-cell__checkmark"),
    ).toHaveLength(1);
    expect(
      section?.querySelectorAll(".planet-bonus-cell__badge--amount"),
    ).toHaveLength(0);
  });

  it("pairs PLANET EFFECTS, last in the story's order, with a diagram of two bonuses", () => {
    render(<GuideScreen onBack={vi.fn()} />);

    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent);
    const planetBonusIndex = headings.indexOf("PLANET BONUS");
    const planetActivityIndex = headings.indexOf("PLANET EFFECTS");
    expect(planetActivityIndex).toBe(planetBonusIndex + 1);
    expect(GUIDE_SECTIONS[GUIDE_SECTIONS.length - 1].heading).toBe(
      "PLANET EFFECTS",
    );

    const heading = screen.getByRole("heading", {
      level: 2,
      name: "PLANET EFFECTS",
    });
    const section = heading.closest("section");
    expect(section).not.toBeNull();
    expect(section?.querySelectorAll(".activity-bonus-cell")).toHaveLength(2);
    expect(section?.querySelectorAll(".points-symbol")).toHaveLength(1);
    expect(section?.querySelectorAll(".node-scramble-symbol")).toHaveLength(1);
  });

  it("renders two Back buttons, one before the title and one after the last diagram, each calling the callback once", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const { container } = render(<GuideScreen onBack={onBack} />);

    const backButtons = screen.getAllByRole("button", { name: "Back" });
    expect(backButtons).toHaveLength(2);

    const title = screen.getByRole("heading", { level: 1, name: GUIDE_TITLE });
    const diagrams = container.querySelectorAll(".guide-diagram");
    const lastDiagram = diagrams[diagrams.length - 1];

    expect(
      title.compareDocumentPosition(backButtons[0]) &
        Node.DOCUMENT_POSITION_PRECEDING,
    ).toBeTruthy();
    expect(
      lastDiagram.compareDocumentPosition(backButtons[1]) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    await user.click(backButtons[0]);
    expect(onBack).toHaveBeenCalledTimes(1);

    await user.click(backButtons[1]);
    expect(onBack).toHaveBeenCalledTimes(2);
  });

  it("uses international spelling when no spelling is provided", () => {
    const { container } = render(<GuideScreen onBack={vi.fn()} />);

    expect(
      screen.getByRole("heading", { level: 2, name: "REFUELLING" }),
    ).toBeInTheDocument();
    expect(container.textContent).toMatch(/\bcolour\b/);
    expect(container.textContent).not.toMatch(/\bcolor\b/);
  });

  it("uses American spelling inside an American spelling provider", () => {
    const { container } = render(
      <SpellingContext value="american">
        <GuideScreen onBack={vi.fn()} />
      </SpellingContext>,
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "REFUELING" }),
    ).toBeInTheDocument();
    expect(container.textContent).toMatch(/\bcolor\b/);
    expect(container.textContent).not.toMatch(/\bcolour\b/);
  });

  it("is not the board and not the start screen: no grid, gridcell or radio", () => {
    render(<GuideScreen onBack={vi.fn()} />);

    expect(screen.queryByRole("grid")).toBeNull();
    expect(screen.queryByRole("gridcell")).toBeNull();
    expect(screen.queryByRole("radio")).toBeNull();
  });
});
