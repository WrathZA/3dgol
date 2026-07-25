# Persona Review — Issue #4

**Issue:** feat: compute generations under the Life rule
**Branch:** `issue-4-life-rule`
**Change type:** New feature / behaviour — all six personas apply
**Date:** 2026-07-25

## Product

All five acceptance criteria are met and verified by test:

1. Classic Conway behaviour against block (still), blinker (period 2), and glider (displaced one cell
   diagonally per four generations)
2. Age begins at 1 on birth, increments on survival, and restarts at 1 on rebirth
3. A cell at Maximum Age dies regardless of neighbour count
4. Bounded Edge destroys patterns reaching the boundary rather than wrapping them
5. A Run begins from a random Seed at generation 0, at a density that sustains movement — verified by
   five seeded runs still alive after 500 generations

Nothing is user-visible yet, which is the issue's stated scope. This is the foundation every visible
behaviour depends on.

**Grade: A**

## Technical

`src/sim/` imports nothing outside itself — the isolation rule that makes the entire testing strategy
possible holds, and holding it from the first commit is the cheapest it will ever be.

Age-as-state (0 means dead) makes the invalid states — alive with no age, dead carrying an age —
unrepresentable rather than merely avoided. Both grids are allocated once at construction and swapped,
so no allocation occurs per generation. The rule is reachable in isolation as `nextAge`, which is what
allows the age-cap behaviour to be asserted directly rather than inferred from grid output.

One redundancy, left deliberately: `restart()` calls `clearGrid()` and then writes every index anyway.
It keeps `restart()` correct if the seeding loop ever stops covering every position, at the cost of one
redundant pass on an operation that happens once per Run.

**Grade: A**

## QA

29 tests covering golden patterns, age semantics, the age cap, bounded edges, run determinism, and every
validation path.

The golden patterns are load-bearing rather than decorative. A single-buffered implementation — computing
cells in place so early cells influence later ones — would pass a naive "does the grid change" test and
fail the blinker and glider immediately. Choosing known patterns means the test suite detects a whole
class of implementation error rather than just the absence of output.

The suite already earned its place: the first run failed on a real bug in the test helper, where buffer
swapping caused the second generation to write back into the caller's fixture, making later assertions
depend on earlier ones.

**Grade: A**

## Security

No new attack surface. No input, no network, no storage, no DOM, no dynamic evaluation, no secrets.
Bounds handling is sound — `indexOf` is documented as caller-checked and every caller gates on
`contains` first.

`Math.random()` as the default random source is not a finding: it seeds a decorative cellular-automaton
soup, not a token, key, or identifier. Predicting it grants nothing.

**Grade: A**

## Hacker

Nothing to abuse. The code is unreachable at runtime today, and once wired up it will be driven by local
interface state rather than attacker-controlled input.

**Grade: A**

## UX

No user-facing surface in this issue, by design. The closest thing is error messages, which name both the
offending value and the constraint it violated — `Maximum Age must be a positive integer, got 0` — rather
than failing silently. Consistent with the recorded convention that programmer errors should be loud.

**Grade: A**

## Gate result

All grades C or above — **gate passes**.
