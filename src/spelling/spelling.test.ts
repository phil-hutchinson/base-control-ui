import { describe, expect, it } from "vitest";
import * as guideCopy from "../guide/guideCopy";
import * as optionTips from "../start/optionTips";
import {
  respell,
  SPELLING_TABLE,
  spellingForLanguages,
  type Spelling,
} from "./spelling";

/** Every string reachable from `value`, through arrays and objects. */
function stringsIn(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap(stringsIn);
  }
  if (typeof value === "object" && value !== null) {
    return Object.values(value).flatMap(stringsIn);
  }
  return [];
}

describe("spellingForLanguages", () => {
  it.each<[readonly string[], Spelling]>([
    [["en-US"], "american"],
    [["en-GB"], "international"],
    [["fr-FR", "en-US"], "american"],
    [["en-GB", "en-US"], "international"],
    [["en", "en-US"], "international"],
    [["fr", "de"], "international"],
    [[], "international"],
    [["EN-us"], "american"],
    [["en-Latn-US"], "american"],
    [["not a tag", "en-US"], "american"],
  ])("%j gives %s", (languages, expected) => {
    expect(spellingForLanguages(languages)).toBe(expected);
  });
});

describe("respell", () => {
  it.each(SPELLING_TABLE)(
    "turns %s into %s in lower, Capitalised and ALL CAPS form",
    (international, american) => {
      const capitalise = (word: string) =>
        word[0].toUpperCase() + word.slice(1);
      expect(respell(international, "american")).toBe(american);
      expect(respell(capitalise(international), "american")).toBe(
        capitalise(american),
      );
      expect(respell(international.toUpperCase(), "american")).toBe(
        american.toUpperCase(),
      );
    },
  );

  it("replaces table words inside a sentence, keeping the rest", () => {
    expect(respell("A grey ship, REFUELLING, in its colour.", "american")).toBe(
      "A gray ship, REFUELING, in its color.",
    );
  });

  it("replaces whole words only", () => {
    expect(respell("colourful greyhound", "american")).toBe(
      "colourful greyhound",
    );
  });

  it("leaves text with no table word unchanged", () => {
    const text = "One spaceship can move per turn.";
    expect(respell(text, "american")).toBe(text);
  });

  it("returns its input unchanged under international spelling", () => {
    const text = "A grey ship in its colour, refuelling.";
    expect(respell(text, "international")).toBe(text);
  });
});

describe("source copy spelling", () => {
  it.each([
    ["the Quick Guide's copy", guideCopy],
    ["the start screen's tips", optionTips],
  ])("has no American form from the table in %s", (_, copy) => {
    const strings = stringsIn(Object.values(copy));
    expect(strings.length).toBeGreaterThan(0);
    for (const [, american] of SPELLING_TABLE) {
      const pattern = new RegExp(`\\b${american}\\b`, "i");
      for (const text of strings) {
        expect(text).not.toMatch(pattern);
      }
    }
  });
});
