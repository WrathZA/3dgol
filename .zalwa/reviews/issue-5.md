# Persona Review — Issue #5

**Issue:** feat: retain a bounded window of history
**Branch:** `issue-5-history-window`
**Change type:** New feature / behaviour — all six personas apply
**Date:** 2026-07-25

## Product

All five acceptance criteria are met and tested:

1. One Layer per Generation, immutable while held — verified, including that the Grid is copied rather
   than referenced
2. At most Depth Window Layers; a push at capacity retires exactly one, the oldest
3. Lowering trims from the oldest end; raising preserves everything held — both directions tested, plus
   continued correct retirement and growth afterwards
4. Restart empties the Stack and returns the Generation count to zero
5. Held history does not grow with Run length — verified at 10,000 pushes and 500 Generations with
   `byteLength` unchanged

**One interpretation to state plainly.** After a Restart the Stack holds **one** Layer, not zero, because
Generation 0 is frozen as the Seed Layer. AC 4 says Restart "empties the stack"; AC 1 says every
Generation produces exactly one Layer. Those pull against each other.

Resolved in favour of AC 1: all prior history is discarded, then the new Seed is pushed like any other
Generation. The alternative — skipping Generation 0 — would leave the bottom of a fresh structure missing
the state everything above it grew from, and would make AC 1 false for exactly one Generation per Run.
The behaviour is commented at the call site and covered by a named test.

**Grade: B** — held below A because a reader of AC 4 alone would expect a depth of zero.

## Technical

The ring buffer is allocated once. The only allocation is `set maxDepth`, and it happens on a Viewer
action rather than per Generation, so the per-Generation path stays allocation-free — consistent with the
"allocate once" convention and with the same reasoning that drove double buffering in #4.

Layer Generation is derived as `newestGeneration − depth` rather than stored in a parallel array. Exactly
one Layer is pushed per Generation, so the derivation is exact by construction, and there is no second
source of truth to drift.

`src/sim/` still imports nothing outside itself.

`DEFAULT_DEPTH_WINDOW` is 120, and its docstring says explicitly that the binding ceiling is not that
value but the drawing budget from #12 — grid dimensions multiplied by depth.

**Grade: A**

## QA

24 new tests, 53 total. Two carry real weight rather than restating the implementation:

- **Copy-not-reference.** `Simulation` reuses its Grid buffers between Generations, so a Stack holding
  references would silently turn every Layer into the current Generation — a bug that would look like
  "the structure is a solid extrusion of the present" and be maddening to diagnose from the render.
- **Post-resize behaviour.** Reallocating rebuilds the ring's rotation, which is exactly where index
  arithmetic breaks. The tests push past capacity again after both a raise and a lower, so a wrong
  `writeSlot` after resize fails immediately rather than at some later depth.

**Grade: A**

## Security

No new attack surface. `layerAt` and `generationAt` both guard depth before computing a slot;
`slotAtDepth` normalises negative offsets; `push` validates dimensions and Generation. The resize path
reads from the old buffer and writes into a freshly allocated one, so no read-after-overwrite aliasing is
possible.

The constructor allocation scales with `width × height × maxDepth`. That is resource consumption rather
than a vulnerability, and it is the real risk in this code — tracked as the drawing budget in #12.

**Grade: A**

## Hacker

Nothing to abuse. Unreachable at runtime today, and driven by local interface state once wired.

**Grade: A**

## UX

No user-facing surface. Errors name both the offending value and the constraint — `No Layer at depth 5;
stack holds 4` — rather than failing silently or returning undefined.

**Grade: A**

## Gate result

All grades C or above — **gate passes**.
