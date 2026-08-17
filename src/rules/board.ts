// The 15 x 15 board and its square names (rules.md §3). Columns are lettered
// A-O left to right; rows are numbered 1-15 bottom to top; a square's name is
// its column letter followed by its row number (H8, A1). Says nothing about
// bays, ships or screen orientation - those belong to other modules.

/** The board is BOARD_SIZE x BOARD_SIZE squares. */
export const BOARD_SIZE = 15;

/** Column letters, left to right. */
export const COLUMN_LETTERS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
] as const;

export type ColumnLetter = (typeof COLUMN_LETTERS)[number];

/** Row numbers, bottom to top. */
export const ROW_NUMBERS: readonly number[] = Array.from(
  { length: BOARD_SIZE },
  (_, index) => index + 1,
);

/** A square on the board, identified by column letter and row number. */
export interface Square {
  readonly column: ColumnLetter;
  readonly row: number;
}

/** Whether a column/row pair falls within the board. */
export function isOnBoard(column: string, row: number): boolean {
  return (
    (COLUMN_LETTERS as readonly string[]).includes(column) &&
    Number.isInteger(row) &&
    row >= 1 &&
    row <= BOARD_SIZE
  );
}

/** Builds a square from a column letter and row number, rejecting anything off the board. */
export function squareAt(column: ColumnLetter, row: number): Square {
  if (!isOnBoard(column, row)) {
    throw new RangeError(`${column}${row} is not a square on the board`);
  }
  return { column, row };
}

/** A square's name, derived from its column and row (never stored separately). */
export function squareName(square: Square): string {
  return `${square.column}${square.row}`;
}

const SQUARE_NAME_PATTERN = /^([A-O])(\d{1,2})$/;

/** Parses a square name such as "H8", rejecting anything not on the board. */
export function squareFromName(name: string): Square {
  const match = SQUARE_NAME_PATTERN.exec(name);
  if (!match) {
    throw new RangeError(`"${name}" is not a valid square name`);
  }
  const [, column, rowText] = match;
  return squareAt(column as ColumnLetter, Number(rowText));
}

/** Every square on the board, in row-major order (row 1 first, column A first within each row). */
export const ALL_SQUARES: readonly Square[] = ROW_NUMBERS.flatMap((row) =>
  COLUMN_LETTERS.map((column) => squareAt(column, row)),
);
