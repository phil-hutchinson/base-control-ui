// The app's two spellings, and how player-facing text is put into the one
// the player's browser asks for. Copy is written once, in international
// spelling; `respell` turns it into American spelling word by word, from
// the table below. Contract: any player-facing text that can contain a word
// in the table must pass through `respell` before it reaches the player.
// This module knows nothing about React; `spellingContext` carries the
// chosen spelling to components.

/** Which of the app's two spellings its player-facing text uses. */
export type Spelling = "american" | "international";

/**
 * Each word with a second spelling, as its international form and its
 * American form, both in lower case.
 */
export const SPELLING_TABLE: readonly (readonly [
  international: string,
  american: string,
])[] = [
  ["colour", "color"],
  ["colours", "colors"],
  ["coloured", "colored"],
  ["grey", "gray"],
  ["refuelling", "refueling"],
  ["refuelled", "refueled"],
];

/**
 * The spelling for a browser's preferred-language list: the first entry
 * whose language is English decides — American if its region is the US,
 * international otherwise (a bare `en` included). Entries that are not
 * valid language tags are skipped. No English entry gives international.
 */
export function spellingForLanguages(languages: readonly string[]): Spelling {
  for (const tag of languages) {
    let locale: Intl.Locale;
    try {
      locale = new Intl.Locale(tag);
    } catch {
      continue;
    }
    if (locale.language === "en") {
      return locale.region === "US" ? "american" : "international";
    }
  }
  return "international";
}

const AMERICAN_BY_INTERNATIONAL = new Map(SPELLING_TABLE);

const INTERNATIONAL_WORDS = new RegExp(
  `\\b(?:${SPELLING_TABLE.map(([international]) => international).join("|")})\\b`,
  "gi",
);

/** `replacement` given the case pattern of `source`: lower, Capitalised or ALL CAPS. */
function matchCase(source: string, replacement: string): string {
  if (source === source.toUpperCase()) {
    return replacement.toUpperCase();
  }
  if (source[0] === source[0].toUpperCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

/**
 * `text` in the given spelling. Under international spelling it is
 * returned unchanged; under American, every whole word in the table is
 * replaced by its American form, keeping the original word's case.
 */
export function respell(text: string, spelling: Spelling): string {
  if (spelling === "international") {
    return text;
  }
  return text.replace(INTERNATIONAL_WORDS, (word) =>
    matchCase(word, AMERICAN_BY_INTERNATIONAL.get(word.toLowerCase()) ?? word),
  );
}
