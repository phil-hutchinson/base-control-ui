// The core's ply notation: the plain-text spelling of a move or an attack,
// `parsePly`'s parsing of untrusted text into a `Ply`, and `formatPly`, the
// exact inverse `parsePly` round-trips through.

import {
  type ColumnLetter,
  type Square,
  squareAt,
  squareName,
} from "../rules/board";

/**
 * A ply the core applies: a move from one square to another, or an attack
 * from one square on another. Uses the rules' own `Square`, so a ply and the
 * effects it raises speak the same type.
 */
export type Ply =
  | { readonly type: "move"; readonly from: Square; readonly to: Square }
  | { readonly type: "attack"; readonly from: Square; readonly target: Square };

/**
 * `number: action`, where `action` is two squares for a move or a square, an
 * "x" and a square for an attack: a ply number with no leading zero, a
 * literal ": ", an upper-case column A-O and a row 1-15 with no leading
 * zero, twice, with "x" between them for an attack and nothing for a move.
 */
const PLY_PATTERN =
  /^([1-9][0-9]*): ([A-O](?:[1-9]|1[0-5]))(x)?([A-O](?:[1-9]|1[0-5]))$/;

/** Builds a `Square` from a column letter and row text already matched by `PLY_PATTERN`. */
function squareFromMatch(text: string): Square {
  return squareAt(text[0] as ColumnLetter, Number(text.slice(1)));
}

/**
 * Parses `text` into a ply number and a `Ply`, or reports it malformed.
 * Looks only at the text itself — never at any game state — so "malformed"
 * and "refused" stay distinct (`applyPly` answers the latter). Text that is
 * not a string, or longer than 16 characters, is malformed without further
 * parsing; otherwise `text` is matched against `PLY_PATTERN` in full, so
 * lower case, extra or missing spaces, leading zeros, an out-of-range column
 * or row, a missing or doubled "x" and trailing text are all malformed.
 * Never throws.
 */
export function parsePly(
  text: string,
):
  | { readonly ok: true; readonly plyNumber: number; readonly ply: Ply }
  | { readonly ok: false; readonly reason: "malformed" } {
  if (typeof text !== "string" || text.length > 16) {
    return { ok: false, reason: "malformed" };
  }

  const match = PLY_PATTERN.exec(text);
  if (match === null) {
    return { ok: false, reason: "malformed" };
  }

  const [, numberText, fromText, attackMark, toText] = match;
  const plyNumber = Number(numberText);
  const from = squareFromMatch(fromText);
  const to = squareFromMatch(toText);

  const ply: Ply =
    attackMark === "x"
      ? { type: "attack", from, target: to }
      : { type: "move", from, to };

  return { ok: true, plyNumber, ply };
}

/**
 * The exact text `parsePly` reads back into `plyNumber` and `ply`:
 * `formatPly` composed with `parsePly` is the identity on every valid ply
 * text.
 */
export function formatPly(plyNumber: number, ply: Ply): string {
  const from = squareName(ply.from);
  const second = ply.type === "attack" ? ply.target : ply.to;
  const mark = ply.type === "attack" ? "x" : "";
  return `${plyNumber}: ${from}${mark}${squareName(second)}`;
}
