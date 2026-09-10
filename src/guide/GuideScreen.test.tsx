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
import { GuideScreen } from "./GuideScreen";

afterEach(cleanup);

describe("GuideScreen", () => {
  it("shows the title and the four headings in the story's order", () => {
    render(<GuideScreen onBack={vi.fn()} />);

    expect(
      screen.getByRole("heading", { level: 1, name: GUIDE_TITLE }),
    ).toBeInTheDocument();

    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings.map((heading) => heading.textContent)).toEqual(
      GUIDE_SECTIONS.map((section) => section.heading),
    );
  });

  it("renders all five paragraphs from the copy module", () => {
    render(<GuideScreen onBack={vi.fn()} />);

    expect(screen.getByText(GUIDE_INTRO_PARAGRAPH)).toBeInTheDocument();
    for (const section of GUIDE_SECTIONS) {
      expect(screen.getByText(section.paragraph)).toBeInTheDocument();
    }
  });

  it("renders five diagrams, one under each section", () => {
    const { container } = render(<GuideScreen onBack={vi.fn()} />);

    expect(container.querySelectorAll(".guide-diagram")).toHaveLength(5);
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

  it("is not the board and not the start screen: no grid, gridcell or radio", () => {
    render(<GuideScreen onBack={vi.fn()} />);

    expect(screen.queryByRole("grid")).toBeNull();
    expect(screen.queryByRole("gridcell")).toBeNull();
    expect(screen.queryByRole("radio")).toBeNull();
  });
});
