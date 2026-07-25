## Issue #7 — feat: navigate the structure by pointer and touch (DONE, closed)
https://github.com/WrathZA/3dgol/issues/7

Closed: 2026-07-25
Commit: f44bfcf
Security: clean
Skill-judge: not applicable
PRD sections: Camera, Navigation, B9

- **Found a defect shipped in #8 that only became visible once the camera could move.** Zooming out made
  the structure nearly vanish — a few faint specks rather than a shrinking silhouette. The Cell edge uses
  `smoothstep(0.0, fwidth(border) * 1.2, border)` for a constant-pixel outline, which is correct while a
  cube covers many pixels; once a cube is one or two pixels wide, `fwidth` exceeds the whole face, `rim`
  collapses to zero, and every fragment takes the edge darkening. The Cell becomes its own outline and goes
  almost black. Fixed by retiring the edge as a Cell shrinks toward pixel size.

  The general point worth keeping: **a feature can be correct within the range its own issue could
  exercise and wrong outside it.** #8 had no way to move the camera, so no amount of care in #8 would have
  caught this. Each issue that widens the range of reachable states should expect to expose defects in
  what came before.

- Left the polar angle unclamped on purpose. The reflex is to stop a camera passing under the floor; here
  "from below" is an acceptance criterion and the underside of the Stack is worth seeing.

- Derived both distance limits from the structure's extent rather than tuning them by feel. Each bound can
  fail a criterion on its own — too far a near limit and Cells never become legible, too near a far limit
  and the silhouette never fits — so expressing them in terms of the thing being looked at keeps them
  correct when grid dimensions or the Depth Window change.

- Chose not to make the camera target follow the growing Stack. While it fills, the structure rises past
  the initial target and sits low in frame. Auto-following would fix that and would fight the Viewer the
  moment they drag; a camera that moves on its own while you are moving it is worse than one that starts
  slightly off-centre.

- Treated `touch-action: none` as load-bearing rather than tidiness. Without it the browser claims drags
  for scrolling and pinches for page zoom, and touch navigation does nothing regardless of what the
  controls support — the touch acceptance criterion would be unmeetable no matter how the controls were
  configured.

- **Proved AC 5 without adding a diagnostic hook to production code.** Exposing the generation counter on
  `window` would have made "generations continue advancing while the camera moves" trivial to check and
  would have put a test affordance into the shipped product. Comparing two still-camera frames before and
  after a navigation session establishes the same thing from outside. Worth preferring whenever a
  criterion tempts an internals hook.

- The Phase 2 renderer choice paid for itself here. `OrbitControls` was named in the stack interview as a
  specific reason to take three.js over raw WebGL2; this issue is a few lines of configuration as a
  result, where pointer capture, two-finger midpoint tracking, and pinch resolution would otherwise have
  been hand-written.

- All five acceptance criteria met; issue closed.
