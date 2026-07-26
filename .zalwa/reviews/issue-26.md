# Persona Review — Issue #26

**Issue:** feat: a cell dying of old age explodes into its neighbours
**Branch:** `issue-26-old-age-explosion`
**Change type:** New feature / behaviour — all six personas apply
**Date:** 2026-07-26

## Scope note

Two decisions were settled during the ride rather than in the issue, and both are recorded rather than
buried:

- **A cell that also reached the cap is not revived by its neighbour's explosion.** The issue did not say
  what happens when two adjacent cells hit A together — each is the other's neighbour, so the literal
  reading has them resurrect each other and a cluster resets itself wholesale, which would stop the age cap
  from breaking up exactly the configurations it exists to disturb. Put to the operator, who chose "the dead
  stay dead". A cluster now leaves a hole ringed by new life.
- **The maximum-age ceiling moved from 64 to 200 and the default sits on it.** This is deliberately the
  opposite of what the PRD's own anti-stasis reasoning argues for, and the operator reaffirmed it after
  being shown that tension. A paragraph in `prd.md` and a comment on `SETTING_BOUNDS.maximumAge` now record
  it as intended, so a later session does not "fix" it.

The literal form of the original request — *every* death explodes — was measured rather than argued about.
A throwaway model faithfully reimplementing `rules.ts` showed it saturates a 48×48 grid to 76.3% live within
three generations and holds it there, with 99.9% of cells at age 1. That would have killed B11, made the A
slider a no-op, and rendered the structure an opaque brick. The evidence is what produced the old-age-only
variant the operator chose.

## Product

All seven acceptance criteria are met and verified — six by direct assertion in `tests/sim/rules.test.ts`
built from explicit ages rather than reached by advancing a pattern, and the seventh by the PRD and glossary
amendments landing in the same branch. Driving the real controls in a browser confirmed the behaviour the
tests cannot: at A=4 the structure is dense, spans the full palette, and visibly sustains itself instead of
decaying, and dropping the slider under an established population produces the flare that B5 now describes.
The change does what the PRD already claimed the age cap was for, and now does it visibly.

Against it, and this is the honest cost: **at the default A=200 the structure renders near-monochrome
aqua.** Colour maps across the whole lifespan, so with a lifespan of 200 the ages a run actually spends most
of its cells at — roughly 1 to 30 — occupy only the first fraction of the gradient. That works against B11
("cells of different ages are visibly different colours") at the one setting every first-time visitor sees.
It is not a defect in this change and `AGE_GRADIENT_CURVE` is not wrong; a single fixed curve cannot serve
both A=4 and A=200. Fixing it is unmeasured visual tuning and is being routed to zalwa-feed as a follow-up
rather than smuggled into this branch. Two further consequences were accepted in the issue itself: the first
explosion lands around generation 214 (~27 seconds at default speed), and a cell can outlive the deepest
depth window, so a pillar may detonate without its birth ever having been on screen.

**Grade: C**

## Technical

The explosion is a second, separate pass rather than a branch inside the first, and that separation is the
whole correctness argument. It reads exclusively from `current` — the same snapshot the ordinary rule read —
so nothing chains within a generation, and running it after the ordinary pass has completed means every cell
sees the same snapshot rather than a half-updated grid. Overwriting `next` rather than merging into it is
what lets an explosion beat whatever the ordinary rule decided, which is the behaviour AC 3 asks for. The
trigger was extracted into `diesOfOldAge` and both `nextAge` and `explode` now call it, which removes the
possibility of the two passes disagreeing about which cells died — a bug class that would have been
excruciating to trace.

`src/sim/` stays pure: no three.js, no DOM, no rendering concept, functional over typed arrays, no
allocation. The cost is one additional linear scan of the grid per generation; the inner neighbour loop runs
only for the few cells actually at the cap, so it is a cheap pass rather than a second round of neighbour
counting. It has not been measured at the 96×96 ceiling, which is #12's territory rather than this branch's.
The `?? 0` defaults on every index read are noise `noUncheckedIndexedAccess` imposes rather than a design
choice, and they are consistent with the rest of the file.

**Grade: B**

## QA

99 tests pass; typecheck and Biome are clean. Six new cases cover the explosion and they map one-to-one onto
the ACs rather than approximating them: the eight-neighbour reach from a lone capped cell, silence on
ordinary death, the override of the ordinary rule for a surviving neighbour, no chaining within a step
(asserted as *exactly* eight live cells and every age in {0, 1}, which would catch a second ring), corner
containment against the bounded edge, and mutual non-revival. Three more pin `diesOfOldAge` directly,
including the case that matters when a viewer lowers the slider past established cells and the one where a
dead position has no age to have reached.

One existing test had to change. `"destroys a block once its cells reach maximum age"` expected zero alive
and now gets twelve — the old expectation encoded the old rule, so it was rewritten to assert the block's
own four positions are dead and a shell survives. Rewriting a passing test to accommodate a change deserves
suspicion; here the new assertion is strictly more specific than the one it replaced, which is the direction
that makes it acceptable.

The gap is the same one this codebase always has: the visual consequence — what the explosion looks like,
and the monochrome finding above — is unreachable by Vitest and was verified by driving a headless browser
by hand. Nothing guards it from regressing.

**Grade: B**

## Security

A dedicated review at step 8 found nothing, and there is little for it to find. The diff is pure arithmetic
over a `Uint16Array` plus a numeric default and two documentation files. No network, no storage, no DOM, no
deserialization, no dynamic evaluation, no string handling, no secrets — the product has no server and makes
no request after load.

The net effect is a slight hardening. Every write in the new pass is gated by `contains(...)` before
`indexOf` is called, so it cannot address outside the allocated grid, and `diesOfOldAge` adds an `age > 0`
clause that makes the trigger strictly narrower than the comparison it replaced. Raising the maximum-age
ceiling to 200 stays far below `MAX_REPRESENTABLE_AGE` (65535), so the age storage cannot overflow, and the
value still arrives through `clampSetting` and `validateMaximumAge` on every path.

**Grade: A**

## Hacker

There is no adversary surface to work with. The only viewer-controlled input this change touches is the
maximum-age slider, which is clamped to its bounds on every write and validated again as a positive integer
before it reaches the rule. Feeding it a non-integer or a value below 1 throws rather than being coerced
into something plausible, and the tests assert that.

The one lever an abuser has is the same one an ordinary viewer has: the explosion raises live-cell counts,
so a run at extreme settings does more GPU work. That is self-inflicted on the visitor's own device, there
is no shared resource to exhaust, and the instance ceiling that bounds it is #12's to measure. No new
exploitation vector.

**Grade: B**

## UX

The change gives the viewer something the product previously only asserted in its documentation: two deaths
that look different. An ordinary death is a disappearance and an old-age death is a burst, and a viewer can
now tell them apart by watching rather than by being told. Lowering the maximum-age slider under an
established population is the most direct way a viewer can make something dramatic happen on demand, and it
works — the flare is unmistakable.

The cost is at the default, and it is the same finding Product carries. A first-time visitor sees roughly
half a minute of a decaying, near-monochrome structure before the headline behaviour of this issue fires for
the first time. That is a deliberate trade the operator made twice, with the reasoning recorded in three
places so it reads as intent — but it is still the case that the most interesting thing this change adds is
invisible during a short first visit, and the palette does not currently reward the long one either. The
gradient follow-up is the part of that which is fixable, and it is being routed rather than dropped.

**Grade: C**

## Gate

All six applicable personas grade C or above. Gate passes.
