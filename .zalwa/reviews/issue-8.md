# Persona Review — Issue #8

**Issue:** feat: encode cell age as colour and history depth as fade
**Branch:** `issue-8-colour-and-fade`
**Change type:** New feature / behaviour — all six personas apply
**Date:** 2026-07-25

## Scope note

The operator added a requirement during invocation: "make sure the cells are square with defined edges."
The issue's acceptance criteria say nothing about Cell shape or edges. It is delivered and recorded here as
a scope extension rather than folded in as though it had always been there.

Making Cells cubic forced `LAYER_SPACING` from 0.7 to 1.0. A 0.55 cube at the old spacing would have left
a 0.1 gap and refused the Layers back into the fused mass fixed in #6.

## Product

All five acceptance criteria met. The two visual channels do what the PRD wanted: pillars read violet and
red where regions held stable, aqua churns through the body, and the difference between a settled region
and a churning one is legible at a glance without explanation.

**AC 2 initially failed.** "The gradient spans exactly birth to maximum age... no part of the palette goes
unused" — but Life's Age distribution is heavily skewed young. Most Cells die within a few Generations, so
under a linear map nearly everything sat in the first tenth of the gradient and the structure was uniformly
aqua. Fixed by curving the Age-to-gradient mapping, which changes the pacing without moving either
endpoint, so the criterion holds in both letter and intent.

**Grade: A**

## Technical

Colour and fade are both derived in the shader from data already carried per instance — no per-instance
CPU work was added, and the derive-from-uniform property from #6 is intact.

Fading toward a shared `BACKGROUND_COLOR` rather than using alpha is the load-bearing decision. Real
transparency across 138,000 unsorted instances produces depth-sorting artifacts — Cells punching holes
through each other. Mixing toward the background keeps every Cell opaque and correctly sorted, and against
a flat background is visually identical. The cost, recorded because it is a real constraint: this only
works while the background stays a flat colour.

`FADE_START` is duplicated in both shaders because they must dissolve in step. A comment flags it; the
language cannot enforce it.

The gradient stop count appears both in TypeScript and literally in the GLSL uniform declaration. That is
unavoidable — GLSL needs a compile-time array size — but a mismatch now throws at construction rather than
silently dropping a colour.

**Grade: B** — two places where a constant has to be kept in sync by hand.

## QA

No new testable surface: this is shader work end to end. The existing ring arithmetic tests still pass.

Verification was visual and iterative — three renders, two defects found and fixed, each one invisible to
every automated check. `pnpm smoke` makes the check repeatable, which matters because both defects were
constants rather than logic. But it only works if someone chooses to run it and look.

**Grade: B** — the method is right and the coverage is real, but it rests on human attention rather than
anything that fails a build.

## Security

No new attack surface. Shader source remains a static template literal with no interpolation. The new
`gradientColor` array access is bounds-guarded by a clamp and an early return. Gradient length mismatch
throws.

**Grade: A**

## Hacker

Nothing to abuse. No input reaches this code; the page is static assets driving a local render loop.

**Grade: A**

## UX

This is where the product stopped being a demo. The structure now carries information in its surface —
colour says how long a Cell has left, height says when it happened, and the base dissolves instead of
terminating on a shelf. Cubes with drawn edges make the lattice legible rather than a haze of dots.

The remaining gaps are deliberate and owned elsewhere: no camera movement (#7), no controls (#9, #10).

**Grade: A**

## Gate result

All grades C or above — **gate passes**.
