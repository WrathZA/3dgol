# Persona review — issue #29 (feat: the run starts at 10 generations per second)

Change type: New feature / behavior (a user-visible default moves) ∪ `.zalwa/` doc only (PRD text).
Union of both persona sets, so all six apply.

Branch: `issue-29-ten-generations-per-second`
Security review: clean, no findings.

## Product

All three acceptance criteria are met and verified: the constant is 10, the readout renders `10/s` on load
against a freshly built bundle, and `vitest run` exits 0 across 100 tests. The change advances the stated
outcome — the dead window before the first Explosion narrows from about twenty-seven seconds to about
twenty-one, which is the reason the issue exists. One user-visible consequence sits outside the ACs: the
Structure now travels upward a quarter faster and a Layer holds for six seconds rather than seven and a half.
The issue names this as a knock-on to state rather than solve, so it is declared rather than hidden, but it is
still behaviour no AC checks.

Grade: B

## Technical

A single numeric literal, two corrected prose figures in existing doc comments, and one test. No abstraction
touched, no coupling introduced, nothing added to the render path or the simulation. The reasoning for the
value now sits beside the value, which is what stops a later session reading 10 as arbitrary and "tidying" it.
The corrected timing figures in `SETTING_BOUNDS.maximumAge` and `prd.md` matter more than they look: both
asserted a wall-clock number derived from the old default, so leaving them would have shipped two documents
confidently stating a wrong figure.

Grade: A

## QA

AC 1 is now pinned by a permanent assertion, which is more than the issue asked for — `clampSettings` leaving
the defaults untouched only ever proved the value sat on the range and the step, and would not have noticed a
drift to 9. AC 3 ran clean. AC 2 is the weak one: it was verified by a throwaway Playwright script that read
`.panel__value` from the rebuilt bundle, and that script was deleted afterwards, so nothing permanent asserts
the readout format. That gap is real but already owned — issue #25 covers control-panel wiring coverage
including readouts, and duplicating it here would collide with that branch.

Grade: B

## Security

No new attack surface. The changed value is a compile-time constant with no path from untrusted input; it is
not read from a URL, query string, storage, or network response, and the project has no backend by design.
`clampSetting` is untouched and the new default already sits inside its declared bounds, so it passes the same
validation any Viewer-supplied value passes. No dependency, CSP, or config surface moved.

Grade: A

## Hacker

Nothing here to abuse. There is no input to smuggle a value through — an attacker who could edit
`DEFAULT_SETTINGS` already has commit access, which is not a boundary this change weakens. The only reachable
consequence is the client doing 25% more of its own simulation work per second on the visitor's own device,
which is the visitor's hardware and the visitor's tab.

Grade: A

## UX

The interaction surface is unchanged — same slider, same range, same `10/s` readout formatting, and Paused
still reads as its own state rather than `0/s`. The honest weakness is in the rationale rather than the
implementation. The doc comment claims that past a certain rate a Layer is on screen too briefly to be read as
a shape, and that 10 stays under it. That claim is temporal: a still frame at 10/s is indistinguishable from
one at 8/s, since the Depth Window and Structure are identical, so no screenshot can substantiate it and the
smoke check cannot either. It can only be judged by watching the running product, which is the author's call
rather than something this session verified. The claim is plausible and conservative — 10 is a third of the
way up a 0–30 range — but it is asserted, not demonstrated.

Grade: B

## Outcome

All six grades C or above. Gate passes; proceeding to squash-merge.
