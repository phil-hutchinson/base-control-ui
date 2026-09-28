// The one-word caption a planet activity bonus's cell draws beneath its
// symbol: UI chrome, not a rules word, so the mapping lives here beside the
// symbol dispatch (`ActivityBonusSymbol.tsx`) rather than in
// `rules/activityBonus.ts`. All three point kinds share one caption, BONUS,
// since the symbol above them (`+N`) already says which size.

import type { ActivityBonusKind } from "../rules/activityBonus";

export function activityBonusCaption(kind: ActivityBonusKind): string {
  switch (kind) {
    case "small-points":
    case "medium-points":
    case "large-points":
      return "BONUS";
    case "fuel":
      return "FUEL";
    case "additional-nodes":
      return "ADD NODES";
    case "node-scramble":
      return "SCRAMBLE";
  }
}
