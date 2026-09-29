// Carries the chosen spelling to the components that show player-facing
// text. Its default is international, so anything rendered without a
// provider uses the app's international spelling.

import { createContext, useContext } from "react";
import type { Spelling } from "./spelling";

/** The spelling in force; render `<SpellingContext value={…}>` to set it. */
export const SpellingContext = createContext<Spelling>("international");

/** The spelling in force for the calling component. */
export function useSpelling(): Spelling {
  return useContext(SpellingContext);
}
