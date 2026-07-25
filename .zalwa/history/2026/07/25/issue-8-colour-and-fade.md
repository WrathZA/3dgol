## Issue #8 — feat: encode cell age as colour and history depth as fade (DONE, closed)
https://github.com/WrathZA/3dgol/issues/8

Closed: 2026-07-25
Commit: 560170d
Security: clean
Skill-judge: not applicable
PRD sections: Cell (Colour Gradient), Layer (opacity from depth), Depth window (fade on retirement)

- **Curved the Age-to-gradient mapping after the linear version failed an acceptance criterion in
  practice while satisfying it on paper.** AC 2 requires that no part of the palette goes unused. A linear
  map does span birth to the Age cap — but Life's Age distribution is heavily skewed young, most Cells die
  within a few Generations, and the result painted nearly the whole structure the birth colour. The fix
  (`pow(lifetime, 0.45)`) changes pacing without moving either endpoint. The general lesson: a criterion
  about a *distribution* is not satisfied by a mapping that is merely correct at its endpoints.

- Chose to fade toward a shared background colour rather than use real transparency. Alpha across 138,000
  unsorted instances produces depth-sorting artifacts — Cells punching holes through each other. Opaque
  Cells mixing toward the clear colour sort correctly and look identical against a flat background. The
  constraint this buys is recorded rather than hidden: it only holds while the background stays flat, so a
  gradient or image behind the structure would force a rethink.

- Added a shrink alongside the fade so Layers dissolve rather than dim in place. AC 4 asks that retirement
  is never a pop; by the time a ring slot is recycled its Cells have already shrunk to nothing, so the
  recycling is invisible regardless of what overwrites it.

- **Operator added scope at invocation** — "make sure the cells are square with defined edges" — which the
  acceptance criteria do not mention. Recorded as an extension rather than folded in silently. It was not
  a cosmetic change: Cells were flat slabs, and making them cubic forced `LAYER_SPACING` from 0.7 to 1.0,
  because a 0.55 cube at the old spacing leaves a 0.1 gap and reproduces the fused-mass bug from #6. The
  lattice is now isotropic and the Stack taller than it is wide.

- Drew Cell edges from the box UVs, widened by `fwidth` so the rim holds roughly constant pixel width at
  any distance. A fixed UV width would turn distant Cells into solid outline and near ones into a
  hairline. The edge does a different job from face shading: shading separates the faces of one cube,
  the rim separates *adjacent* cubes that share a colour.

- Raised the shading floor and brightened the mid-gradient stops after the second render came out muddy.
  Face shading, the edge rim, and the depth fade all darken the same pixel; each was defensible alone and
  compounded they turned the middle of the structure to mud. Worth remembering when adding any further
  darkening term.

- Made a gradient stop-count mismatch throw at construction. GLSL uniform arrays need a compile-time size,
  so the count exists in both TypeScript and the shader; adding a sixth stop would otherwise have silently
  dropped it.

- Two constants must now be kept in sync by hand across two places — `FADE_START` in both shaders, and the
  stop count. Both are flagged in comments and one throws; neither is enforceable by the language.

- All five acceptance criteria met, plus the operator addition; issue closed.
