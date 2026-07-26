# Persona review — issue #46

**Issue:** feat: choosing a pattern switches the explosion off
**Branch:** `issue-46-pattern-switches-explosion-off`
**Change type:** new feature / behaviour → all six personas apply.

## The gate failed once, and that is the useful part of this record

The first pass graded **QA: D** and returned to implementation.

The feature's entire logic was three lines inside the `requestAnimationFrame` loop in `src/main.ts` — a
module that imports three.js and is reachable by no unit test. AC 1 ("selecting a pattern sets the Explosion
off") and AC 3 ("Random leaves it alone") were therefore not verifiable at all. The tests written in the
first pass exercised the *Simulation*, which already behaved correctly; they verified nothing this issue
changed.

The fix was to extract the rule to `applyStartRule` in `src/settings.ts`, where a unit test can reach it.
That is the whole justification for the extraction — not tidiness. A product's only rule where one control
moves another should not live in its one untestable module.

## Product — B

Delivers what was asked: choosing a Pattern switches the Explosion off, Random leaves it alone. All eight
acceptance criteria met.

The cost, accepted by operator decision and now written into B8 rather than left implicit: a Viewer who
tries a Pattern and then presses Random gets a random Seed with the Explosion still off — plain Conway,
decaying into still lifes, which is the state the PRD says the Explosion default exists to prevent. Nothing
warns them. The switch is visibly off, which is the only mitigation.

## Technical — A

The rule lives beside the settings it governs, with its reasoning attached, and `main.ts` reads as a call
rather than a special case. `panel.ts` stays free of simulation rules — it writes settings on interaction
and knows nothing about why.

Ordering verified on both restart paths: the changed-dimensions path constructs the Simulation from the
already-mutated settings, and the reseed-in-place path is picked up by the existing settings diff later in
the same frame, before any `advance()`. No Generation is computed under the rule the Viewer just left.

`main.ts` now *writes* to the settings object where previously it only read and applied. That is a new
direction of data flow, and it is deliberate: the panel holds a reference to the same object and reads it
back to redraw, so a copy would update the Run and leave the interface asserting a rule that is not running.

## QA — B

121 tests. The gate's own finding is resolved:

- AC 1 asserted directly — a Pattern switches the Explosion off.
- AC 3 asserted in both directions — `null` leaves it on if on, off if off.
- A third test pins the blast radius: a Pattern changes nothing else in the settings object, so if it ever
  reaches a second control that fails here first.
- AC 5 covered by a new Simulation test — switching the Explosion back on detonates the gun on the next
  Generation, with the counter and Stack depth preserved.
- AC 4 was already satisfied by #42's 300-Generation test, which runs the gun with the Explosion off and
  asserts the four permanently-alive reflector Cells. Verified rather than duplicated.

Residual gap, unchanged by this issue: no DOM test covers the `<select>` writing into the Restart request.
That is #25's scope and it is open.

## Security — A

Reviewed clean, no findings. No new sink, source, or DOM write — a hardcoded boolean assigned to an
in-memory field of an existing object. The review independently confirmed the frame ordering is consistent
and that `panel.refresh()` cannot re-enter, because programmatic `input.checked =` does not dispatch
`change`.

## Hacker — A

Nothing to work with. The only new behaviour is a boolean the Viewer already controls being set to a
constant, on a page that talks to nothing.

## UX — B

The switch visibly moves to off, so the panel never asserts a rule the Run is not using — confirmed by
reading the refresh chain (`restartRun` → `panel.refresh()` → the switch's refresher) rather than assuming
it, and the comment above that call now records that two things depend on it so a future session cannot
narrow it away silently.

Two real gaps, both deliberate: the Viewer is not told *why* the switch moved, and is not warned that Random
inherits it off. Filing an advisory was explicitly placed out of scope on the issue.

## Outcome

All grades C or above on the second pass. Proceeding to squash-merge.
