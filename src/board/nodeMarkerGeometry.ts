// The inactive/prospective ring geometry `NodeMarker.tsx` draws with, pulled
// into its own module because a component file may only export components
// (`react-refresh/only-export-components`). Also used by the planet resources
// planet bonus panel's Additional nodes symbol (steal.md §10,
// `src/bonus/AdditionalNodesSymbol.tsx`), which draws the same three rings
// in three different colours rather than one node's own single colour.

/**
 * An inactive or prospective node's rings, innermost first, in the marker's
 * 100-unit viewBox. Priority p draws the innermost p rings, so a priority-1
 * node is one small ring and a priority-3 node is three rings growing
 * outward: the node visibly fills up as its turn approaches. Starting
 * values for the owner's eye, not a measured result.
 */
export const INACTIVE_RING_RADII: readonly number[] = [18, 28, 38];
export const INACTIVE_RING_STROKE_WIDTH = 5;
