# Node artwork reference

The six SVG samples this story's node visuals come from, transcribed here so
the story is self-contained and does not reference a file outside the
repository.

They are reproduced as supplied, with two changes:

- The named HTML colours are written as their RGB hex equivalents:
  `gray` is `#808080` and `white` is `#FFFFFF`. The other colours were
  already hex — `#DAA520`, `#F1DBA5`, `#F5DEB3`.
- The `id` attributes are given meaningful names. In the samples they were
  single letters (`i`, `h`, `f`, `e`, `d`, `d2`). Ids are document-global in
  SVG, so seventeen sites drawn at once would collide; the name below
  therefore carries the site's square, shown here as `H8`.
- The clip path wrapping the charged and depleted circles is **dropped**, for
  the reason given at the end of this document. It had no visible effect.

Everything else — geometry, gradient stops, opacities — is unchanged from the
samples.

The samples were viewed against `#151C31`, close to the board's own
`--color-space-raised`.

## Dormant

A small solid circle, pale in the centre and gold at its edge.

```svg
<svg viewBox="0 0 100 100" aria-hidden="true">
  <defs>
    <radialGradient id="site-H8-fill" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="#F1DBA5" stop-opacity="1" />
      <stop offset="100%" stop-color="#DAA520" stop-opacity="0.75" />
    </radialGradient>
  </defs>
  <circle cx="50" cy="50" r="12" fill="url(#site-H8-fill)" />
</svg>
```

## Active

The same idea at twice the radius, gold throughout and fading outward.

```svg
<svg viewBox="0 0 100 100" aria-hidden="true">
  <defs>
    <radialGradient id="site-H8-fill" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="#DAA520" stop-opacity="1" />
      <stop offset="100%" stop-color="#DAA520" stop-opacity="0.5" />
    </radialGradient>
  </defs>
  <circle cx="50" cy="50" r="24" fill="url(#site-H8-fill)" />
</svg>
```

## Charged — start of cycle

Fills the square: a circle wider than the viewBox, gold at the centre going
to pale wheat at the edge. The middle stop sits at **25%**.

```svg
<svg viewBox="0 0 100 100" aria-hidden="true">
  <defs>
    <radialGradient id="site-H8-fill" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="#DAA520" stop-opacity="1" />
      <stop offset="25%" stop-color="#DAA520" stop-opacity="0.7" />
      <stop offset="100%" stop-color="#F5DEB3" stop-opacity="1" />
    </radialGradient>
  </defs>
  <circle cx="50" cy="50" r="70" fill="url(#site-H8-fill)" />
</svg>
```

## Charged — end of cycle

Identical but for the middle stop, which has moved out to **50%**.

```svg
<svg viewBox="0 0 100 100" aria-hidden="true">
  <defs>
    <radialGradient id="site-H8-fill" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="#DAA520" stop-opacity="1" />
      <stop offset="50%" stop-color="#DAA520" stop-opacity="0.7" />
      <stop offset="100%" stop-color="#F5DEB3" stop-opacity="1" />
    </radialGradient>
  </defs>
  <circle cx="50" cy="50" r="70" fill="url(#site-H8-fill)" />
</svg>
```

## Depleted — start of cycle

The charged artwork in grey and white, and starting from the far end of the
travel: the middle stop sits at **50%**.

```svg
<svg viewBox="0 0 100 100" aria-hidden="true">
  <defs>
    <radialGradient id="site-H8-fill" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="#808080" stop-opacity="1" />
      <stop offset="50%" stop-color="#808080" stop-opacity="0.7" />
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="1" />
    </radialGradient>
  </defs>
  <circle cx="50" cy="50" r="70" fill="url(#site-H8-fill)" />
</svg>
```

## Depleted — end of cycle

The middle stop has moved back in to **25%**.

```svg
<svg viewBox="0 0 100 100" aria-hidden="true">
  <defs>
    <radialGradient id="site-H8-fill" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="#808080" stop-opacity="1" />
      <stop offset="25%" stop-color="#808080" stop-opacity="0.7" />
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="1" />
    </radialGradient>
  </defs>
  <circle cx="50" cy="50" r="70" fill="url(#site-H8-fill)" />
</svg>
```

## What actually varies

Reading the six together, the four states are two shapes and one moving
number.

| State    | Shape                   | Inner colour | Outer colour | Middle stop |
| -------- | ----------------------- | ------------ | ------------ | ----------- |
| Dormant  | `circle r="12"`         | `#F1DBA5`    | `#DAA520`    | none        |
| Active   | `circle r="24"`         | `#DAA520`    | `#DAA520`    | none        |
| Charged  | clipped `circle r="70"` | `#DAA520`    | `#F5DEB3`    | 25% → 50%   |
| Depleted | clipped `circle r="70"` | `#808080`    | `#FFFFFF`    | 50% → 25%   |

Only the middle stop's offset changes across a cycle, and only for the two
states that have a cycle. Charged travels outward over its life; depleted
travels back inward over its cooldown — the same journey in reverse, which is
what makes the two read as opposites.

## Note: the dropped clip path

The charged and depleted samples wrapped their circle in a `clipPath`. It has
been removed, because it could never have had any effect: the clip circle is
`r="100"` centred at `(50, 50)`, while the farthest corner of a 0–100 viewBox
is only `sqrt(50^2 + 50^2)` — about 70.7 — from that centre. The clip region
therefore contains the entire drawing area.

What actually crops the artwork to the square is the viewBox itself. The
`r="70"` circle reaches past every edge but stops just short of the four
corners, which is the intended look.

Dropping it also saves an id per site, on top of the gradient's.
