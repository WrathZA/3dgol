## Issue #30 — feat: turn death by old age off (DONE, closed)
https://github.com/WrathZA/3dgol/issues/30

Closed: 2026-07-26
Commit: 811900c
Security: clean
Skill-judge: not applicable
PRD sections: The rule, Configurable by the Viewer, Actors (Viewer), Cell, Simulation, Grid Configuration,
B5, B12, B12a (new), Out of Scope #1

- **The rule shipped is not the rule that was filed, and the redirection happened at the plan gate rather
  than during implementation.** The issue asked for a control suppressing Death by Old Age. The operator's
  correction — "there is no longer an old age where the cell disappears, it only explodes when the boolean
  is true, otherwise it carries on" — was ambiguous between two rules that differ materially, and the
  cheapest moment to resolve it was before any code existed. Reaching Maximum Age now *detonates*: the Cell
  scatters life across its own position and every in-grid neighbour, all at age 1, and survives its own
  burst. Age alone never kills in either branch; ordinary Conway death is the only removal.

- **The neighbour-at-cap exclusion was dropped because it became unobservable, not because it became
  inconvenient.** The original rule refused to revive a neighbour that had also reached the cap, so a
  cluster would leave a hole rather than resetting wholesale. Once a capped Cell revives its *own* position,
  that neighbour lands at 1 through its own burst regardless — the excluded and unexcluded outcome sets are
  identical, so the branch could not change a result and only read as though it could. Worth recording
  because the first analysis offered keeping it as the conservative option that would "preserve the PRD
  sentence and the existing test", and both of those turned out to be false on inspection: B12's hole and
  the capped-neighbour test had to change either way.

- **A principle was revised before the code that contradicted it was written.** `.zalwa/principles.md`
  principle 6 instructed that the control be "named after the mechanism rather than after the Explosion",
  justified by a measurement (0.9–1.4% live with the burst suppressed) taken against a rule where the cap
  still killed. The new rule makes that configuration unreachable, so the instruction inverted: naming the
  control "Death by old age" would name a thing the product no longer contains. Revised via `/zalwa-reflect`
  in PR #43, merged into the issue branch before implementation began. The routing itself was a correction —
  ride's philosophy detection names `/zalwa-meditate`, which owns the engine's own `philosophy.md`; a
  *project* principle belongs to `/zalwa-reflect`.

- **The population claim was measured, not assumed.** The new rule injects nine Cells per exploder instead
  of eight and removes the hole that acted as a sink, so the settled density could not be inherited from the
  old measurements. Three seeds, 48×48, density 0.35, 600 Generations: 3–7% live at the default A=200,
  5–12% at A=24, 11–21% at A=4. The default settles where the old rule did, and even the pathological low-A
  case stays far from the three-quarters saturation the PRD warns about for exploding on every death. The
  reusable point is that a rule change altering how much life a mechanism injects invalidates every density
  figure written against the old one, including the ones in principles.

- **A 44px control made the interface worse, and the smoke check caught it.** The switch at the tapped-control
  minimum pushed the portrait sheet 17px past the screen, so it scrolled — the #10 failure, where a control
  is technically large and actually harder to reach. It now takes the slider's minimum on coarse pointers,
  on the rationale the file already records for sliders: the label wraps the input, so the hit area is the
  sheet's full width and height is the least of what makes it hittable. Two thirds of the height came back
  from removing the divider between Maximum age and Explosion, which is grouping rather than economy — a
  rule between them would assert they are unrelated settings sharing a word.

- **Test-threshold changes deserve naming.** `e2e/smoke.mjs` was edited to hold the switch to the slider
  minimum, which is loosening a check to accommodate the code. Recorded here rather than buried because the
  justification is specific (the existing precedent, plus a measurement showing the strict threshold caused
  the worse failure) and a future session should be able to re-examine it rather than inherit it silently.

- **The accessible-name defect was found by the persona gate, not by any check.** The wrapping label put the
  On/Off readout into the checkbox's accessible name, making it "Explosion On" — a name that changes as the
  control is used, while the checkbox's checked state already carries it. This codebase had already rejected
  exactly that pattern in writing for the panel toggle's `aria-label`. Typecheck, lint, 105 tests, and the
  smoke check all passed with the defect present.

- Two acceptance criteria are deliberately unmet and were ticked as superseded rather than done: "the
  existing rule and explosion tests pass untouched" and "the control's label names the mechanism rather than
  the Explosion". Both describe the design that was replaced.

- Known gap, tracked: no DOM test asserts the switch writes into the settings object, because the project
  has no DOM test environment. That is issue #25's scope and it is open. Layout and hit size are covered.

- All other acceptance criteria met; issue closed.
