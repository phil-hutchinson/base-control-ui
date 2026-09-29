// Closes the start screen's open tip when the player turns to anything
// else: a pointer press anywhere but a tip's question mark (including the
// open tip itself), focus moving to anything but the open tip's own
// question mark, or Escape. The listeners exist only while a tip is open.
// A press that closes a tip is not swallowed: it still does whatever it
// would otherwise have done.

import { useEffect } from "react";

/** The attribute every tip's question mark carries, valued with its group. */
const TIP_TOGGLE_ATTRIBUTE = "data-tip-toggle";

/** The question mark `target` is, or sits inside, if any. */
function tipToggleOf(target: EventTarget | null): Element | null {
  return target instanceof Element
    ? target.closest(`[${TIP_TOGGLE_ATTRIBUTE}]`)
    : null;
}

/**
 * While `openGroup` is set, listens on the document and calls `close` when
 * the player presses, focuses or escapes away from that group's tip.
 * Presses on any question mark are left to its own click handler, which
 * decides between closing its tip and switching to it.
 */
export function useTipDismissal(
  openGroup: string | null,
  close: () => void,
): void {
  useEffect(() => {
    if (openGroup === null) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (tipToggleOf(event.target) === null) {
        close();
      }
    }

    function handleFocusIn(event: FocusEvent) {
      const toggle = tipToggleOf(event.target);
      if (toggle?.getAttribute(TIP_TOGGLE_ATTRIBUTE) !== openGroup) {
        close();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openGroup, close]);
}
