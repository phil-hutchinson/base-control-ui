// The one grid every guide diagram is drawn on (see story.md, "The
// diagrams"): a caller-given number of columns holding a fixed list of
// cells, each a real `BoardSquare`, a numeral drawn over one, a standalone
// note, an arrow, or nothing. Purely presentational — no session, no state,
// no event handlers — and hidden from the accessibility tree, since the
// paragraph above each diagram already carries its meaning in words.

import type { CSSProperties, ReactNode } from "react";
import type { BoardSquareProps } from "../board/BoardSquare";
import { BoardSquare } from "../board/BoardSquare";
import "./GuideDiagram.css";

export type GuideDiagramCell =
  | { readonly kind: "square"; readonly square: BoardSquareProps }
  | {
      readonly kind: "number";
      readonly square: BoardSquareProps;
      readonly value: number;
    }
  | { readonly kind: "note"; readonly text: string }
  | { readonly kind: "arrow" }
  | { readonly kind: "empty" };

export interface GuideDiagramProps {
  readonly columns: number;
  readonly cells: readonly GuideDiagramCell[];
}

/** A large numeral over a square: the movement diagram's cost, in the guide's own bright text colour rather than a node's countdown colour. */
function GuideDiagramNumber({ value }: { readonly value: number }) {
  return <span className="guide-diagram__number">{value}</span>;
}

/** A standalone note with no square under it: diagram 1's "+3", drawn in the same settlement look as the board's own collection overlay. */
function GuideDiagramNote({ text }: { readonly text: string }) {
  return <span className="guide-diagram__note">{text}</span>;
}

/** A right-pointing arrow carrying a diagram's before-and-after, since nothing here animates. */
function GuideDiagramArrow() {
  return (
    <svg
      className="guide-diagram__arrow"
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <path
        d="M 15 30 L 60 30 L 60 12 L 92 50 L 60 88 L 60 70 L 15 70 Z"
        fill="currentColor"
      />
    </svg>
  );
}

function renderCell(cell: GuideDiagramCell): ReactNode {
  switch (cell.kind) {
    case "square":
      return <BoardSquare {...cell.square} />;
    case "number":
      return (
        <div className="guide-diagram__overlay">
          <BoardSquare {...cell.square} />
          <GuideDiagramNumber value={cell.value} />
        </div>
      );
    case "note":
      return <GuideDiagramNote text={cell.text} />;
    case "arrow":
      return <GuideDiagramArrow />;
    case "empty":
      return null;
  }
}

/** A small fixed grid of squares, numbers, notes and arrows: the shared frame all five guide diagrams are built from. */
export function GuideDiagram({ columns, cells }: GuideDiagramProps) {
  const style = { "--guide-diagram-columns": columns } as CSSProperties;
  return (
    <div className="guide-diagram" style={style} aria-hidden="true">
      {cells.map((cell, index) => (
        <div className="guide-diagram__cell" key={index}>
          {renderCell(cell)}
        </div>
      ))}
    </div>
  );
}
