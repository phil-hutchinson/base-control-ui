// Colours shared between a node's own artwork (NodeMarker.tsx) and any other
// square-level drawing that needs one of them — currently the rotator mark
// (D12, RotatorMarker.tsx), which has its own colour rather than the rings'
// because a board full of rotators in the rings' gold read as too busy: the
// mark is board furniture, not a node, and silver says so at a glance.

/** The colour an inactive node's priority rings are drawn in (rules.md §8.2). */
export const INACTIVE_RING_COLOR = "#DAA520";

/** The colour a rotator's mark is drawn in (rules.md §3.3). */
export const ROTATOR_COLOR = "#C0C0C0";
