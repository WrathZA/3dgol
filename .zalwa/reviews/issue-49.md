# Persona review — issue #49

**Issue:** feat: the pattern list grows to eight
**Branch:** `issue-49-pattern-list-grows`
**Change type:** new feature / behaviour + data model change → all six personas apply.

## Scope notes

**Six patterns shipped, not eight.** Both exclusions were permitted by the acceptance criteria ("either not
offered, or…") and both are recorded in `src/sim/patterns.ts` beside `PATTERNS` rather than only here:

- **A lone spaceship** travels about forty-eight Cells before the Bounded Edge destroys it, after which the
  Grid is empty and stays empty. An empty structure is the one thing this product cannot show, and the
  streak it draws is one the gun already produces continuously.
- **Simkin's glider gun** is period 120 against a default Depth Window of 60, so a Viewer at the default
  sees under half an emission cycle — a mostly static blob with an occasional streak, strictly worse than
  the gun already shipped for anyone who does not know to raise Depth.

**The per-pattern Explosion rule was dropped by operator decision** during filing. #46's single rule stands:
every pattern switches the Explosion off.

## Product — B

Seven patterns where there was one, ordered by what a visitor with no context should try first rather than
alphabetically or by size — the gun demonstrates the premise most directly, the oscillators show the same
idea more simply, the methuselahs reward knowing what you are looking at.

Two of the eight proposed were excluded. That is a scope reduction the operator approved at the plan gate,
and it is stated here rather than left to be inferred from a shorter list than the issue describes.

## Technical — A

Pure data plus one interface field. Each pattern is one entry in `PATTERNS`, so the extensibility claim is
structural rather than promised. `sim/patterns.ts` still imports nothing.

**`id` is load-bearing rather than write-only, and it took the security review to notice it wasn't.** The
field was added for #50 and the panel still keyed its options by array index, which left the product with
two ways to name a Pattern — precisely what the acceptance criterion asked to avoid. The chooser now keys on
`id`.

That change also **structurally removed a bug class** rather than guarding it: #46 had to patch
`Number("") === 0` resolving the placeholder to `patterns[0]` and silently starting a Run. Matching on id
means an empty value matches nothing. The explicit guard is kept, but as belt-and-braces rather than as the
only thing standing between a keyboard Viewer and an unwanted Run.

## QA — A

139 tests, 19 new, and the fidelity suite is the substance.

Every oscillator is advanced exactly one period and compared against Generation 0 — **and separately
asserted not to return early**, which is what rules out a still life or a shorter-period impostor passing by
coincidence. A layout with a misplaced Cell dies, drifts, or settles at a different period, and all three
fail.

**It caught a genuinely wrong pattern.** The queen bee shuttle as first written had 23 Cells and no period;
it is now the canonical form at 20 Cells, returning to its exact starting state at Generation 30 and at no
Generation before. Two other failures were wrong *expectations* rather than wrong data — Kok's galaxy has 48
Cells rather than the 64 asserted, and the acorn's population at Generation 300 is trimmed by the Bounded
Edge, so a threshold derived from published unbounded figures could never have held.

Methuselahs have no period, so they are pinned by exact starting Cell count, by outliving 300 Generations,
and by settling — compared two Generations apart, because what they settle into includes blinkers.

Residual gap, unchanged by this issue: no DOM test covers the dropdown's wiring. That is #25's scope.

## Security — A

Reviewed clean, no findings. No new sink, source, or DOM write; pattern names render through `textContent`.

The review independently confirmed three things worth recording: the ragged-row handling in
`patternHasCellAt` is safe against the new data (the pulsar, queen bee shuttle and acorn are all ragged,
including two literal empty rows); a pattern expanding beyond its declared bounding box during evolution
cannot produce an out-of-grid write, because the declared extent bounds only initial placement while
`nextGeneration` enforces the Bounded Edge; and the floor invariant still holds at 36 wide by 13 tall
against a floor of 50.

## Hacker — A

Nothing to work with. Static string data and a dropdown whose entire value domain the application generated.

## UX — B

Seven entries still fit at 844 × 320 and on desktop, verified rather than assumed.

The list order is a genuine decision and is documented as one. The honest cost: choosing either methuselah
produces a structure that eventually stops changing, and nothing in the interface says so. The Explosion
switch is visibly off, which is the only signal a Viewer gets that the state is recoverable. That cost is
now stated in the PRD's Pattern section rather than left to be discovered.

## Outcome

All grades C or above. Proceeding to squash-merge.
