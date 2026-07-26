## Issue #42 — feat: choose a starting pattern instead of a random seed (DONE, closed)
https://github.com/WrathZA/3dgol/issues/42

Closed: 2026-07-26
Commit: c0d402a
Security: clean
Skill-judge: not applicable
PRD sections: Actors (Viewer), Configurable by the Viewer, Seed, Pattern (new), B8, Out of Scope #3,
Defaults tuned during implementation

- **A wrong assumption of mine was caught by the test written to confirm it, and the issue shares the
  assumption.** Both the issue and my first draft describe Gosper's gun as containing "two stationary
  reflector blocks whose cells never change state". Asserting that failed: only the *outer* column of each
  block is continuously alive. A reflector block is a **catalyst, not a still life** — the queen-bee shuttle
  disturbs its inner face every cycle and the block reforms. Four Cells age without interruption, not eight.
  The #30 dependency therefore holds exactly as claimed but by a narrower mechanism, and both the test and
  `src/sim/patterns.ts` now record the real behaviour. The reusable point: "these cells never change" is a
  claim about a *pattern's dynamics*, not about its initial arrangement, and only simulation can settle it.

- **The gun is verified as a working gun rather than as data, and the arithmetic is what makes that
  possible.** Population 86 on an effectively unbounded Grid at Generation 300 is exactly 36 (the gun) plus
  10 gliders × 5 Cells — period 30 confirmed by counting rather than by eye. On the bounded 50 × 50 Grid the
  population sits at 56 at both Generation 300 and 600, which is the steady state of gliders leaving as fast
  as the Bounded Edge destroys them. A transcription error in the ASCII would fail all three figures. This
  is the strongest correctness check available for a visual feature without a human looking at it, and it
  cost one throwaway probe.

- **Raising the Grid floor to 50 was chosen over a refusing control, and it removes a case rather than
  handling one.** The issue left the too-small-Grid question open. Floor = default = 50 means no Pattern can
  exceed any selectable Grid, so there is no refusal path, no disabled dropdown entry, and no partial-Pattern
  guard anywhere in the code. The cost is stated rather than buried: Grids down to 16 are gone, and because
  the floor equals the default, both Grid sliders start pinned at minimum and only move up. A Viewer wanting
  a small Grid cannot have one and the interface does not explain why. `largestPatternExtent()` ties the
  floor to what is shipped and a test asserts the relationship, so a future oversized Pattern fails the suite
  instead of reaching a Viewer — which matters because the floor will have to rise if a larger Pattern is
  ever added.

- **The predicted panel-height problem did not exist.** Planning flagged ~2px of headroom on a portrait
  phone and asked for discretion to reclaim ~50px. Putting the chooser and Random on one row cost nothing
  vertically — the row replaces the button's own row rather than stacking above it. Nothing was taken from
  anywhere. Worth recording because the previous session (#30) genuinely did have to reclaim height, and the
  instinct to assume the same again was wrong: a control added *beside* something costs no height, only one
  added *below* does.

- **A near-miss on the load-bearing architectural rule.** `panel.ts` was briefly given a value import of
  `PATTERNS` from `sim/`, which would have falsified its own docblock — "knows nothing about the Simulation
  or the renderer". Caught before commit; it is now a type-only import with the list injected by the
  composition root. The rule in `stack.md` is written one-way (`sim/` must not import rendering) but the
  reverse direction has a stated property too, and only the docblock defends it.

- **`Number("")` is 0, which the security review called unreachable and keyboard navigation makes
  reachable.** A `<select>` fires `change` per arrow-key selection, so arrowing down to a Pattern and back
  up to the placeholder resolved to `patterns[0]` and silently started a Run. Fixed by rejecting the empty
  value explicitly before the lookup. Recorded because the reasoning "the handler resets the value
  immediately, so it cannot happen" was sound for pointer input and wrong for keyboard.

- The PRD's Actors reasoning was the delicate amendment. It defended the single-actor list partly on "nobody
  occupies the role of person who chose what you see first — randomness does". That survives because a fresh
  page load ignores Patterns entirely, so the claim was narrowed to the *opening* state and the paragraph
  explains why rather than being cut. What would create an authoring role is *composing* a Pattern, and that
  stays out of scope — which is now what Out of Scope #3 says.

- B8 was renamed "Start a fresh run": choosing a Pattern is not a repeat of anything, so "Restart the run"
  had stopped describing the behaviour.

- Known gap, tracked: no DOM test asserts the dropdown writes into the Restart request, because the project
  has no DOM test environment. That is #25's scope and it is open. Layout and hit size are covered by
  `pnpm smoke --phone`, which now measures the select.

- All acceptance criteria met; issue closed.
