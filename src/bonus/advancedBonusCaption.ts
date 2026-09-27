// The one-word caption an advanced planet bonus's cell draws beneath its
// symbol: UI chrome, not a rules word, so the mapping lives here beside the
// symbol dispatch (`AdvancedBonusSymbol.tsx`) rather than in
// `rules/advancedBonus.ts`. All three point kinds share one caption, BONUS,
// since the symbol above them (`+N`) already says which size.

import type { AdvancedBonusKind } from "../rules/advancedBonus";

export function advancedBonusCaption(kind: AdvancedBonusKind): string {
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
