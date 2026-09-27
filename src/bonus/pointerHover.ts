// Shared by every hover reporter in the panel-board glow link (steal.md
// §10, rules.md §3.4): a touch tap fires a pointer-enter event too, which
// would otherwise leave a glow stuck on the board or the panel until the
// player taps elsewhere. `pointerType` is absent in jsdom's synthetic
// events, so a missing value is treated as a mouse (or, on real touch
// hardware, a pen — which does report "pen" and stays a hover affordance).

import type { PointerEvent } from "react";

export function isTouchPointer(event: PointerEvent): boolean {
  return event.pointerType === "touch";
}
