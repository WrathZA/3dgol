# Persona review — issue #30

**Issue:** feat: turn death by old age off
**Branch:** `issue-30-death-by-old-age-control`
**Change type:** new feature / behaviour + data model change → all six personas apply.

## Scope note

The rule this issue shipped is not the rule it was filed for. Mid-session the operator redirected the
design: reaching Maximum Age no longer kills a Cell at all. With the control on it detonates, resetting
itself and every in-grid neighbour to age 1; with it off the Cell carries on and its Age saturates at A for
the Colour Gradient. Two consequences follow, and both were settled with the operator before implementation:

- The neighbour-at-cap exclusion was dropped, having become provably unobservable — a capped neighbour now
  resets through its own burst regardless, so the branch could not change an outcome.
- The control is named **Explosion**, not "Death by old age", because nothing dies of old age in either
  branch. `.zalwa/principles.md` principle 6 was revised in this session (PR #43) to match; its previous
  wording instructed the opposite, on premises the rule change obsoleted.

## Product — B

Delivers the outcome the issue was reframed around: the Viewer can remove the mechanism and get plain
Conway, and curated patterns gain the permanence #42 depends on. Two written acceptance criteria are
deliberately unmet because the design changed — "the existing rule and explosion tests pass untouched" and
"the control's label names the mechanism rather than the Explosion". The issue body now describes a design
that was not built, so the close comment states that rather than ticking those boxes.

## Technical — B

The rule got smaller rather than larger: a branch removed from `nextAge`, the exclusion removed from
`explode`, one conditional call added. The `BooleanSetting` mapped type derives switch-able settings from
`Settings`, so the panel cannot drift from what a setting actually is.

Two blemishes:

- `nextGeneration`'s `explosion = true` default parameter is a quiet footgun if a future caller forgets it.
  Kept because it preserves the signature for existing callers and the Simulation always passes it.
- The no-divider grouping rule must be restated inside the coarse-pointer media query, because an
  equal-specificity rule later in the file wins otherwise. Two places that must agree.

## QA — C

105 tests pass. New coverage hits what actually changed: self-revival, the whole-3x3 burst, corner
containment including the corner, a capped pair resetting through its own bursts, saturation with the
switch off, and mid-run switching leaving generation, stack depth, and grid untouched. Population was
measured across three seeds over 600 generations rather than assumed — 3-7% live at the default A, 11-21%
at A=4, so reviving the exploder did not inflate the run toward saturation.

The gap: no DOM test asserts the checkbox writes into the settings object, because the project has no DOM
test environment. That is issue #25's scope and it is open. Layout and hit size are covered by the smoke
check, which now measures the switch.

## Security — A

Reviewed clean, no findings. The product has no network, storage, or URL-derived input, and the change adds
a boolean read from `input.checked`. Every `explode()` write remains bounds-guarded after the self-skip was
removed, and Age cannot overflow the `Uint16Array` because `validateMaximumAge` caps at 65535 and the
saturating clamp binds unconditionally.

## Hacker — A

Nothing to work with. The only new state is a boolean the visitor already controls by tapping it, on a page
that talks to nothing.

## UX — B

The switch sits under Maximum age with no divider, which says the two are one mechanism rather than two
settings sharing a word. Native checkbox semantics carry keyboard, touch, and screen reader without custom
handling, and `prefers-reduced-motion` is honoured.

One defect was found in this gate and fixed: the wrapping label put the On/Off readout into the checkbox's
accessible name, making it "Explosion On" — a name that changes as the control is used, while the checkbox's
checked state already carries that. The readout is now `aria-hidden`, matching the reasoning the panel
toggle's `aria-label` already records.

Remaining trade: on coarse pointers the row is ~32px rather than 44px. Justified by the file's existing
rationale for sliders and by measurement — held at 44px the portrait sheet ran past the screen and
scrolled, which is the #10 failure the check exists to catch — but it is a real deviation from the
guideline.

## Outcome

All grades C or above. Proceeding to squash-merge.
