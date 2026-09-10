# Story 00000073 — Update moon colours on planet two

## Summary

Planet 2's four moons stop sharing the planet's own peru-and-purple
gradient and each get a colour of their own: violet, gold, grey and orange.
The planet body itself is unchanged, and so is every moon's size and
position.

Purely a visual story. No rule changes, no gameplay changes, no change to
`doc/ruleset/rules.md` or `RULES_VERSION`.

## Background & references

Planet 2 was ported verbatim from the prototype gallery
(`doc/plan/00000013-spaceship-bay-visual/eg_planets.html`), where all four
moons were filled with the same `url(#p2)` gradient as the planet. Against
the darker board the four read as offcuts of the planet rather than as
moons.

The replacement artwork was authored outside the app and handed over
finished; its colours are settled and are not to be redesigned while
porting them:

```svg
<circle cx="50" cy="50" r="25" fill="#151c31" />
<circle cx="50" cy="50" r="25" fill="url(#p2)" />
<circle cx="37" cy="51" r="8" fill="#151c31" />
<circle cx="37" cy="51" r="8" fill="url(#p2d)" />   <!-- #ac81c6 violet -->
<circle cx="28" cy="84" r="6" fill="url(#p2a)" />   <!-- #b59410 gold   -->
<circle cx="87" cy="63" r="8" fill="url(#p2b)" />   <!-- #c6c6c6 grey   -->
<circle cx="11" cy="57" r="7" fill="url(#p2c)" />   <!-- #ffaa4a orange -->
```

Each moon gradient has the same shape as the planet's — a radial gradient
at `cx="40%" cy="40%" r="70%"` — but runs from its own colour at full
opacity to the same colour at 0.3, rather than from one colour to another.

## In scope

1. Planet 2's four moons are drawn with four new per-moon gradients, in the
   colours above. The body gradient, and all five circles' geometry, are
   untouched.
2. `planetArt.ts` declares the four new gradient ids for planet 2, and its
   human-facing `name` stops calling the moons identical.
3. `PlanetDefs.tsx`'s header comment records that planet 2's moon colours
   are now a deliberate divergence from the gallery, alongside the other
   noted departures.

## Out of scope

- Any other planet.
- Planet 2's body, or any moon's size or position.
- Anything about how planets are placed on the board.

## Acceptance

- Planet 2 draws with four differently coloured moons.
- The existing structural tests (`planetArt.test.ts`,
  `PlanetDefs.test.tsx`) still pass: every declared id is defined exactly
  once, and every `url(#...)` reference resolves.
