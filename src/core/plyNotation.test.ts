import { describe, expect, it } from "vitest";
import { squareFromName } from "../rules/board";
import { formatPly, parsePly } from "./plyNotation";

describe("parsePly", () => {
  it("parses a move, exactly as story.md's first example", () => {
    const result = parsePly("57: H2H4");
    expect(result).toEqual({
      ok: true,
      plyNumber: 57,
      ply: {
        type: "move",
        from: squareFromName("H2"),
        to: squareFromName("H4"),
      },
    });
  });

  it("parses a move between two-digit rows, story.md's second example", () => {
    const result = parsePly("58: C12C9");
    expect(result).toEqual({
      ok: true,
      plyNumber: 58,
      ply: {
        type: "move",
        from: squareFromName("C12"),
        to: squareFromName("C9"),
      },
    });
  });

  it("parses an attack, story.md's third example", () => {
    const result = parsePly("59: H4xJ6");
    expect(result).toEqual({
      ok: true,
      plyNumber: 59,
      ply: {
        type: "attack",
        from: squareFromName("H4"),
        target: squareFromName("J6"),
      },
    });
  });

  it("round-trips every example through formatPly", () => {
    for (const text of ["57: H2H4", "58: C12C9", "59: H4xJ6"]) {
      const parsed = parsePly(text);
      if (!parsed.ok) {
        throw new Error(`expected "${text}" to parse`);
      }
      expect(formatPly(parsed.plyNumber, parsed.ply)).toBe(text);
    }
  });

  it("is malformed for lower-case squares", () => {
    expect(parsePly("57: h2h4")).toEqual({ ok: false, reason: "malformed" });
  });

  it("is malformed for an extra space", () => {
    expect(parsePly("57:  H2H4")).toEqual({ ok: false, reason: "malformed" });
  });

  it("is malformed for a missing space", () => {
    expect(parsePly("57:H2H4")).toEqual({ ok: false, reason: "malformed" });
  });

  it("is malformed for a missing separator entirely", () => {
    expect(parsePly("57 H2H4")).toEqual({ ok: false, reason: "malformed" });
  });

  it("is malformed for a leading zero in the ply number", () => {
    expect(parsePly("057: H2H4")).toEqual({ ok: false, reason: "malformed" });
  });

  it("is malformed for ply number 0", () => {
    expect(parsePly("0: H2H4")).toEqual({ ok: false, reason: "malformed" });
  });

  it("is malformed for a leading zero in a row", () => {
    expect(parsePly("57: H02H4")).toEqual({ ok: false, reason: "malformed" });
  });

  it("is malformed for column P, off the board", () => {
    expect(parsePly("57: P2H4")).toEqual({ ok: false, reason: "malformed" });
  });

  it("is malformed for row 16, off the board", () => {
    expect(parsePly("57: H16H4")).toEqual({ ok: false, reason: "malformed" });
  });

  it("is malformed for row 0", () => {
    expect(parsePly("57: H0H4")).toEqual({ ok: false, reason: "malformed" });
  });

  it("is malformed for trailing text", () => {
    expect(parsePly("57: H2H4 ")).toEqual({ ok: false, reason: "malformed" });
    expect(parsePly("57: H2H4x")).toEqual({ ok: false, reason: "malformed" });
  });

  it("is malformed for text over 16 characters", () => {
    // Structurally valid otherwise — only its length is the problem.
    expect(parsePly("99999999999: A1A2")).toEqual({
      ok: false,
      reason: "malformed",
    });
  });

  it("parses a move to its own square (the rules refuse it, not the notation)", () => {
    expect(parsePly("1: H2H2")).toEqual({
      ok: true,
      plyNumber: 1,
      ply: {
        type: "move",
        from: squareFromName("H2"),
        to: squareFromName("H2"),
      },
    });
  });

  it("is malformed for non-string input, never throwing", () => {
    for (const input of [57, null, undefined, {}, ["57: H2H4"]]) {
      expect(() => parsePly(input as unknown as string)).not.toThrow();
      expect(parsePly(input as unknown as string)).toEqual({
        ok: false,
        reason: "malformed",
      });
    }
  });
});

describe("formatPly", () => {
  it("writes a move as square, square", () => {
    expect(
      formatPly(57, {
        type: "move",
        from: squareFromName("H2"),
        to: squareFromName("H4"),
      }),
    ).toBe("57: H2H4");
  });

  it("writes an attack as square, x, square", () => {
    expect(
      formatPly(59, {
        type: "attack",
        from: squareFromName("H4"),
        target: squareFromName("J6"),
      }),
    ).toBe("59: H4xJ6");
  });
});
