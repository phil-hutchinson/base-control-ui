// Pure navigation math for a WAI-ARIA grid's arrow-key handling. Knows
// nothing about pieces, sides, or board orientation - it operates purely on
// zero-based `{ row, column }` positions in screen order (row 0 topmost,
// column 0 leftmost) in a rectangular grid of `rowCount` rows by
// `columnCount` columns. A consuming component maps its own row/column
// arrays onto these indices.

/** The four arrow keys the grid responds to (matches `KeyboardEvent.key`). */
export type ArrowKey = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight";

/** A zero-based cell position in screen order: row 0 is topmost, column 0 leftmost. */
export interface GridPosition {
  readonly row: number;
  readonly column: number;
}

/** Row/column step applied by each arrow key, in screen space. */
const ARROW_DELTA: Readonly<
  Record<ArrowKey, { readonly rowStep: number; readonly columnStep: number }>
> = {
  ArrowUp: { rowStep: -1, columnStep: 0 },
  ArrowDown: { rowStep: 1, columnStep: 0 },
  ArrowLeft: { rowStep: 0, columnStep: -1 },
  ArrowRight: { rowStep: 0, columnStep: 1 },
};

export interface NextFocusPositionArgs {
  readonly rowCount: number;
  readonly columnCount: number;
  readonly current: GridPosition;
  readonly key: ArrowKey;
  /** Whether a given position may receive keyboard focus. */
  readonly isFocusable: (position: GridPosition) => boolean;
}

/**
 * Computes the next focused position for an arrow-key press.
 *
 * Skip policy: stepping in the pressed direction, the nearest **focusable**
 * cell is chosen - a non-focusable cell is skipped over rather than stopping
 * navigation. If the edge of the grid is reached before any focusable cell is
 * found, focus does not move at all (the current position is returned
 * unchanged), which is what makes navigation clamp at edges with no
 * wraparound: a cell that is off-grid is never returned, and a press that
 * finds nothing focusable simply has no effect rather than leaving focus on a
 * non-focusable cell.
 */
export function nextFocusPosition({
  rowCount,
  columnCount,
  current,
  key,
  isFocusable,
}: NextFocusPositionArgs): GridPosition {
  const { rowStep, columnStep } = ARROW_DELTA[key];
  let row = current.row;
  let column = current.column;

  for (;;) {
    row += rowStep;
    column += columnStep;
    if (row < 0 || row >= rowCount || column < 0 || column >= columnCount) {
      // Ran off the grid without finding a focusable cell: clamp - stay put.
      return current;
    }
    const candidate: GridPosition = { row, column };
    if (isFocusable(candidate)) {
      return candidate;
    }
  }
}

/**
 * The first focusable position in row-major (top-to-bottom, left-to-right)
 * order, or `undefined` if no cell is focusable. Used to pick the grid's
 * initial roving-tabindex target, and as a fallback if the previously focused
 * cell stops being focusable (e.g. the consumer's descriptors change shape
 * between renders).
 */
export function firstFocusablePosition(
  rowCount: number,
  columnCount: number,
  isFocusable: (position: GridPosition) => boolean,
): GridPosition | undefined {
  for (let row = 0; row < rowCount; row++) {
    for (let column = 0; column < columnCount; column++) {
      const candidate: GridPosition = { row, column };
      if (isFocusable(candidate)) {
        return candidate;
      }
    }
  }
  return undefined;
}
