// Generic, piece-agnostic accessible grid. Implements the WAI-ARIA grid
// composite-widget pattern: a `role="grid"` container of `role="row"` rows of
// `role="gridcell"` cells, roving tabindex (exactly one cell tabbable at a
// time, the rest -1), and arrow-key navigation driven by the pure
// `nextFocusPosition` (./gridNavigation.ts).
//
// This component knows nothing about pieces, sides, bays, or board
// orientation - only about a 2-D array of `GridCellDescriptor`s (rendered
// content, accessible label, and a focusable flag). Consumers map their own
// domain coordinates onto this generic row/column index space.

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  firstFocusablePosition,
  nextFocusPosition,
  type ArrowKey,
  type GridPosition,
} from "./gridNavigation.ts";
import "./AccessibleGrid.css";

/** One cell's rendered content and accessibility/focus flags. */
export interface GridCellDescriptor {
  /** Rendered inside the cell (an icon, empty, etc). */
  readonly content?: ReactNode;
  /** Accessible name for the cell, read by assistive technology. */
  readonly label: string;
  /** Whether this cell takes part in roving-tabindex keyboard focus. */
  readonly focusable: boolean;
}

export interface AccessibleGridProps {
  /** Accessible name for the grid as a whole (`aria-label`). */
  readonly label: string;
  /** Cell descriptors in screen order: `rows[row][column]`. Must be rectangular. */
  readonly rows: readonly (readonly GridCellDescriptor[])[];
  readonly className?: string;
}

const ARROW_KEYS: ReadonlySet<string> = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
]);

function isArrowKey(key: string): key is ArrowKey {
  return ARROW_KEYS.has(key);
}

function positionKey(position: GridPosition): string {
  return `${position.row},${position.column}`;
}

/**
 * Generic accessible grid: ARIA roles, roving tabindex, and arrow-key
 * navigation - see the module comment above for the full contract.
 */
export function AccessibleGrid({
  label,
  rows,
  className,
}: AccessibleGridProps) {
  const rowCount = rows.length;
  const columnCount = rowCount > 0 ? rows[0].length : 0;

  const isFocusable = useCallback(
    (position: GridPosition): boolean =>
      rows[position.row]?.[position.column]?.focusable ?? false,
    [rows],
  );

  const [focused, setFocused] = useState<GridPosition | undefined>(() =>
    firstFocusablePosition(rowCount, columnCount, isFocusable),
  );

  const containerRef = useRef<HTMLDivElement | null>(null);
  const cellRefs = useRef(new Map<string, HTMLDivElement>());

  // Keep the roving-tabindex target valid if the descriptors change shape
  // between renders and the previously focused cell has stopped being
  // focusable.
  useEffect(() => {
    if (focused !== undefined && isFocusable(focused)) {
      return;
    }
    setFocused(firstFocusablePosition(rowCount, columnCount, isFocusable));
    // `isFocusable` is a fresh closure each render (it reads `rows`), so this
    // effect re-checks on every render; harmless, since it only calls
    // `setFocused` when the currently focused cell has actually stopped being
    // focusable.
  }, [rows, rowCount, columnCount, focused, isFocusable]);

  // Move real DOM focus to follow the roving-tabindex target, but only when
  // focus is already inside this grid - never steal focus on mount or when
  // the descriptors change while focus is elsewhere on the page.
  useEffect(() => {
    if (focused === undefined) {
      return;
    }
    const container = containerRef.current;
    if (!container || !container.contains(document.activeElement)) {
      return;
    }
    cellRefs.current.get(positionKey(focused))?.focus();
  }, [focused]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (focused === undefined || !isArrowKey(event.key)) {
      return;
    }
    event.preventDefault();
    const next = nextFocusPosition({
      rowCount,
      columnCount,
      current: focused,
      key: event.key,
      isFocusable,
    });
    if (next.row !== focused.row || next.column !== focused.column) {
      setFocused(next);
    }
  }

  const classNames = ["accessible-grid"];
  if (className) {
    classNames.push(className);
  }

  return (
    // `role="grid"` is a composite widget: per the WAI-ARIA authoring
    // practices, the container itself is never a tab stop - only its cells
    // are, via roving tabindex (see the `tabIndex` on each `role="gridcell"`
    // below). eslint-plugin-jsx-a11y does not recognize that pattern and
    // otherwise asks for a `tabIndex` on the container itself.
    // eslint-disable-next-line jsx-a11y/interactive-supports-focus
    <div
      ref={containerRef}
      className={classNames.join(" ")}
      role="grid"
      aria-label={label}
      onKeyDown={handleKeyDown}
    >
      {rows.map((rowCells, rowIndex) => (
        <div className="accessible-grid__row" role="row" key={rowIndex}>
          {rowCells.map((cell, columnIndex) => {
            const position: GridPosition = {
              row: rowIndex,
              column: columnIndex,
            };
            const isFocused =
              focused !== undefined &&
              focused.row === rowIndex &&
              focused.column === columnIndex;
            return (
              <div
                key={columnIndex}
                ref={(element) => {
                  const key = positionKey(position);
                  if (element) {
                    cellRefs.current.set(key, element);
                  } else {
                    cellRefs.current.delete(key);
                  }
                }}
                className="accessible-grid__cell"
                role="gridcell"
                aria-label={cell.label}
                tabIndex={cell.focusable ? (isFocused ? 0 : -1) : undefined}
                onFocus={() => {
                  // Real DOM focus can land on a cell other than the roving
                  // target - a mouse click, for instance - so bring the
                  // target back into sync whenever that happens; otherwise
                  // the next arrow key would compute from a stale position.
                  if (!isFocused) {
                    setFocused(position);
                  }
                }}
              >
                {cell.content}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
