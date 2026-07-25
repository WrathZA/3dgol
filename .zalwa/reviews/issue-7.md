# Persona Review — Issue #7

**Issue:** feat: navigate the structure by pointer and touch
**Branch:** `issue-7-navigate`
**Change type:** New feature / behaviour — all six personas apply
**Date:** 2026-07-25

## Product

All five acceptance criteria met, and verified by driving the camera rather than by reading the code:

1. Orbit to above, below, and side-on — all three captured
2. Near enough for individual Cells to be legible, far enough for the whole silhouette
3. Pan shifts the point being looked at
4. Every movement available by touch (`OrbitControls` uses pointer events throughout, and the canvas hands
   gestures to it rather than the page)
5. Generations keep advancing throughout — proven by comparing still-camera frames before and after a
   navigation session

This is the issue that turns the structure from a picture into an object. A glider's diagonal only reads as
a streak when you are not looking down it, which was the argument for drawing history in three dimensions
in the first place.

**Grade: A**

## Technical

The Phase 2 stack decision pays off here. `OrbitControls` was an explicit reason for choosing three.js over
raw WebGL2 — orbit, pan, zoom, damping, and full touch support arrive for a few lines of configuration,
where hand-rolling pointer capture and pinch resolution would have been a week of fiddly work.

Distance limits derive from the structure's own extent rather than being tuned by feel, so they stay
correct if grid dimensions or the Depth Window change. Both were chosen against a criterion: too far a near
limit and Cells never become legible, too near a far limit and the silhouette never fits.

The polar angle is deliberately left unclamped. Many projects stop the camera passing under the floor;
here "from below" is an acceptance criterion.

`controls.update()` sits outside the generation accumulator, so navigation and simulation cannot interfere
with each other in either direction.

**Grade: A**

## QA

The vantage driver treats each criterion as a distinct camera state and captures it, which is the only way
these criteria can be checked at all.

AC 5 was proven without adding a diagnostic hook to production code. Exposing the generation counter on
`window` would have made the check trivial and would have put a test affordance into the shipped product;
comparing two still-camera frames before and after navigating establishes the same thing from outside.

It earned its place immediately by finding a real defect — see UX.

**Grade: A**

## Security

No new attack surface. `OrbitControls` consumes pointer and wheel events and writes camera transforms;
there is no path from an event to storage, network, markup, or evaluation. The shader change is arithmetic
between compile-time constants. `OrbitControls` ships inside the already-pinned `three` package, so no new
dependency entered the lockfile.

**Grade: A**

## Hacker

Nothing to abuse. Gestures move a camera. There is no state to corrupt and nothing to exfiltrate.

**Grade: A**

## UX

Damping gives movement weight rather than snapping. `touch-action: none` means a phone drag orbits the
structure instead of scrolling the page — without it, touch navigation does nothing regardless of what the
controls support. `overscroll-behavior: none` stops iOS rubber-banding the page at the edge of a drag.

**A real defect was found here and fixed before merge.** Zooming out made the structure nearly disappear —
a few faint specks against black. The cause was the Cell edge shipped in #8: `smoothstep(0, fwidth * 1.2,
border)` produces a constant-pixel outline, which is correct while a cube covers many pixels. Once a cube
is a pixel or two wide, `fwidth` exceeds the whole face, `rim` collapses to zero, and every fragment
receives the edge darkening — the Cell becomes its own outline and goes almost black, compounded by the
depth fade.

It could not have been caught in #8, because #8 had no way to move the camera. It would have been the
first thing any Viewer hit on scrolling out.

**Grade: A**

## Gate result

All grades C or above — **gate passes**.
