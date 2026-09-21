import { describe, expect, it } from "vitest";
import {
  GUIDE_INTRO_PARAGRAPH,
  GUIDE_SECTIONS,
  GUIDE_TITLE,
} from "./guideCopy";

describe("guideCopy", () => {
  it("has the page title", () => {
    expect(GUIDE_TITLE).toBe("QUICK GUIDE");
  });

  it("has the intro paragraph, stating scoring as a choice", () => {
    expect(GUIDE_INTRO_PARAGRAPH).toBe(
      "The object of the game is to have the most points at the end of the " +
        "game. At the end of each turn, gain points for the charged nodes " +
        "your spaceships are on — one each under simple scoring, or more " +
        "for each extra node under bonus scoring.",
    );
  });

  it("has the four headed sections in the story's order", () => {
    expect(GUIDE_SECTIONS.map((section) => section.heading)).toEqual([
      "MOVEMENT",
      "REFUELING",
      "NODE LIFECYCLE",
      "NEW CHARGED NODE SELECTION",
    ]);
  });

  it("has the movement paragraph, corrected to 'as follows:'", () => {
    expect(GUIDE_SECTIONS[0].paragraph).toBe(
      "One spaceship can move per turn. For longer moves, fuel is " +
        "required, as follows:",
    );
  });

  it("has the refuelling paragraph, corrected to 'If a player has'", () => {
    expect(GUIDE_SECTIONS[1].paragraph).toBe(
      "Spaceships can hold up to six fuel. At the end of a player's turn, " +
        "spaceships sitting on planets regain one fuel. If a player has " +
        "only one spaceship gaining fuel and it has room, it gains two " +
        "fuel. When the planet bonus option is on, each player is given " +
        "three planets that also pay them points — two or three, " +
        "whichever was chosen — the first time one of their spaceships " +
        "lands there.",
    );
  });

  it("has the node lifecycle paragraph, without a points figure", () => {
    expect(GUIDE_SECTIONS[2].paragraph).toBe(
      "The board always has the number of charged nodes chosen at the " +
        "start: five, four or three. When a spaceship enters a " +
        "charged node, a countdown begins before it is depleted. The " +
        "spaceship gains points every turn it stays on the node, until it " +
        "becomes depleted. A charged node also becomes depleted if the " +
        "spaceship leaves it. When the node becomes depleted, a new " +
        "charged node is created. If a node depletes with a spaceship " +
        "still inside it, the spaceship is trapped for 5 turns.",
    );
  });

  it("has the new charged node selection paragraph, stating rotation as a choice", () => {
    expect(GUIDE_SECTIONS[3].paragraph).toBe(
      "Three indicators appear on the board, with one, two, and three " +
        "rings. When a new charged node is needed, it appears at the " +
        "three-ring indicator — and all three indicators are then " +
        "replaced by a fresh set elsewhere. The rings rotate, depending " +
        "on the Inactive node rotation selected.",
    );
  });

  it("has the three inactive node rotation setting lines, verbatim", () => {
    expect(GUIDE_SECTIONS[3].settingLines).toEqual([
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
    ]);
  });

  it("keeps the guide's vocabulary exception: points and fuel, never energy or power", () => {
    const wholeCopy = [
      GUIDE_TITLE,
      GUIDE_INTRO_PARAGRAPH,
      ...GUIDE_SECTIONS.flatMap((section) => [
        section.heading,
        section.paragraph,
        ...(section.settingLines ?? []).flatMap((line) => [
          line.label,
          line.text,
        ]),
      ]),
    ]
      .join(" ")
      .toLowerCase();

    expect(wholeCopy).toContain("points");
    expect(wholeCopy).toContain("fuel");
    expect(wholeCopy).not.toContain("energy");
    expect(wholeCopy).not.toContain("power");
  });
});
