## Issue #46 — feat: choosing a pattern switches the explosion off (DONE, closed)
https://github.com/WrathZA/3dgol/issues/46

Closed: 2026-07-26
Commit: bf12c8b
Security: clean
Skill-judge: not applicable
PRD sections: B8, B12a, Pattern, Configurable by the Viewer

- **The persona gate failed at QA and that failure is the entire value of this session.** The first
  implementation was three lines inside the `requestAnimationFrame` loop in `src/main.ts` — a module that
  imports three.js and is reachable by no unit test. The feature therefore had *zero* automated coverage:
  AC 1 ("selecting a pattern sets the Explosion off") and AC 3 ("Random leaves it alone") were not
  verifiable at all. Worse, the tests written in that pass looked like coverage — they exercised the
  Simulation, which already behaved correctly, and verified nothing the issue changed. Graded D, returned to
  step 6, extracted the rule to `applyStartRule` in `settings.ts`, and covered it with three tests. The
  reusable lesson: **"I added tests" is not the same as "the change is tested"**, and the question that
  separates them is which module the new behaviour actually lives in.

- **Where a rule lives determines whether it can be tested, so that placement is a testability decision
  rather than a tidiness one.** The composition root is the natural home for "what happens when a Run
  starts", and it is also the one place in this codebase nothing can reach. The product's only rule where
  one control moves another is exactly the kind of thing that must not sit there. `applyStartRule` takes the
  settings object and a Pattern, mutates rather than copying (the panel holds a reference and reads it back
  to redraw), and carries its own reasoning.

- **The asymmetry is the design, and it was chosen with its cost visible.** A Pattern switches the Explosion
  off; Random changes nothing. The operator was shown the consequence before deciding: a Viewer who tries a
  Pattern and then presses Random inherits the Explosion off, and so inherits plain Conway decaying into
  still lifes — the state the PRD says the default exists to prevent, reached without asking for it. The
  symmetric alternative was rejected because restoring the Explosion on Random would reset the control every
  time a Pattern was re-selected, taking away the reading where the gun detonates on schedule. B8 now states
  the cost plainly so a later session reads it as a decision.

- **An acceptance criterion was already satisfied, and checking beat writing.** AC 4 asked that a gun run
  still have its reflector blocks intact at Generation 300 — which #42's existing test already asserts,
  since `gunRun()` defaults the Explosion off. Verified rather than duplicated, and the new Simulation test
  went to AC 5 instead: the opt-back-in path, where switching the Explosion on detonates the gun at the next
  Generation with the counter and Stack preserved. Nothing had covered that.

- **One AC cost no code, and that was worth confirming rather than assuming.** The switch had to visibly
  move to off. `restartRun()` already calls `panel.refresh()`, which re-reads `settings.explosion` through
  the switch's refresher — so the requirement was met by machinery that already existed. The only change
  worth making was to the comment above that call, which explained it as being solely about staged-Grid
  pending marks and would have invited a future session to narrow it and break this silently.

- **Ordering is load-bearing and both paths needed checking.** `applyStartRule` runs *before* `restartRun`:
  the changed-dimensions path constructs a new Simulation from the mutated settings, and the
  reseed-in-place path is caught by the existing settings diff later in the same frame, before any
  `advance()`. No Generation is ever computed under the rule the Viewer just left behind. The security
  review independently confirmed this and that `panel.refresh()` cannot re-enter, because programmatic
  `input.checked =` does not dispatch `change`.

- **A new direction of data flow, named rather than absorbed.** `main.ts` now writes to the settings object
  where previously it only read from it and applied. Deliberate: the panel holds a reference to the same
  object and reads it back to redraw, so returning a copy would update the Run and leave the interface
  asserting a rule that is not running.

- B12a records this as a deliberate exception to every control being independent, along with the standard a
  future exception would have to meet — a control that moves another needs a reason of the kind a Pattern
  has, that it describes one Run rather than holding a value. Without that bar the panel stops being a
  statement of what is currently true.

- Fixed a stale comment left by #42: a test still claimed the gun's reflector blocks "never change state",
  which that same session's catalyst finding disproved. The source and two other places were corrected
  then; this one was missed.

- All acceptance criteria met; issue closed.
