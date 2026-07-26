# Persona review — Issue #51: cells are always drawn at full size

Change type: new feature/behaviour (removes a user-visible control) + UX change + `.zalwa/`
documentation. Union of all six personas applied.

## Product — A

All eleven acceptance criteria are met, and the change delivers exactly what it promised: one
fewer control on a sheet that had run tight three times (#37, #30, #42), with the panel now
fitting portrait at 516px of 516 available.

The porous reading is genuinely lost — a Viewer can no longer see into the structure through
gaps between cells. The issue argued that cost explicitly and measured it against the actual
3–7% live population rather than accepting the PRD's "solid sheets" and "opaque brick"
language at face value. At that density full-size cells produce chunky connected clusters,
not filled layers.

## Technical — B

A clean subtraction: a uniform, a constructor option, a setter, a module constant, a settings
field, and a per-frame equality check all removed with nothing added in their place. The
vertex shader loses a multiplication, which is strictly less per-vertex work.

One tracked cleanup, not fixed here: every remaining entry in `SETTING_BOUNDS` now has
`step: 1`, so `decimalPlaces()` and the `toFixed()` call in `clampSetting` have no fractional
consumer left. Both remain correct — `toFixed(0)` is still meaningful rounding — but they are
now unexercised machinery kept against a future fractional setting.

## QA — B

`tsc --noEmit`, `biome check`, `vitest run` (156 tests, 10 files, all passing), `vite build`,
and `pnpm smoke` on desktop plus `pnpm smoke --phone` across both orientations all pass, the
last with `errors: []` and exit 0.

One minor edge case deferred: the "keeps a stepped fraction free of floating-point tails"
test was removed rather than rehomed, because `cellSize` was its only fractional-step vehicle
and no other bound can exercise it. If a fractional-step setting is ever reintroduced, that
regression guard no longer exists and would need rewriting alongside it.

## Security — A

Attack surface narrows rather than grows: one fewer setting, one fewer uniform, one fewer
value flowing from the control panel through to the shader. The product's only
externally-supplied input, the `?pattern=` query parameter, is untouched. `clampSettings`
still iterates a static const object, so there is no property-key path from user input.
Independent `/security-review` returned no findings.

## Hacker — A

Nothing here to abuse. Removing a Viewer control removes an input rather than adding one, and
the GLSL remains a static template literal with no interpolation — no dynamic shader
construction was introduced.

## UX — B

The win is real and measured: portrait fits without overflow, where the smoke test's own
assertion (`contentHeight > visibleHeight`) is what would have caught a regression.

Two consequences worth recording, both deliberate rather than oversights:

- **The fit has zero headroom.** Content height and visible height are both 516px. The next
  control added to the panel puts the sheet straight back into overflow, so the height this
  issue bought is already fully spent.
- **The porous reading is gone with no substitute.** Seeing the interior of the structure
  through gaps was a capability, and nothing replaces it. Camera zoom is not equivalent — that
  was the whole point of the paragraph this issue deleted.

## Outcome

All grades C or above. Gate passes.
