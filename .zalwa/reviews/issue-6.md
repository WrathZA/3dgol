# Persona Review — Issue #6

**Issue:** feat: show the accumulated structure in three dimensions
**Branch:** `issue-6-render-structure`
**Change type:** New feature / behaviour — all six personas apply
**Date:** 2026-07-25

## Product

The product now exists as something you can look at. Four of five acceptance criteria are verified by
evidence rather than assertion:

1. The structure builds unaided on load — screenshot taken with no interaction
2. Layers sit by their place in the Stack, and the structure holds a bounded height once full
3. Cells are discrete forms with dead positions empty — verified visually, after a fix (see UX)
4. Smooth while advancing — **not verified**, see below
5. Memory does not degrade — JS heap flat at 10 MB at both 15 s and 90 s into a run

**The smoothness criterion is not honestly verifiable here.** Headless Chromium rasterises in software, so
its frame timings say nothing about a real GPU. The design supports the criterion — one uniform write per
frame, one Layer written per Generation, nothing proportional to instance count — but supporting it is not
the same as demonstrating it. Real-hardware measurement belongs to #12, which owns the drawing budget.

**Grade: B** — held below A because one criterion rests on design reasoning rather than observation.

## Technical

Derive-from-uniform is implemented exactly as `codebase.md` specified before any of it existed: grid
position written once at construction, birth Generation and Age written one Layer at a time via
`addUpdateRange`, and height, visibility, and placement all derived in the vertex shader from
`uCurrentGeneration` and `uLayerCount`. The whole Stack is one draw call.

`frustumCulled = false` is set deliberately and with a stated reason — three.js cannot compute a
meaningful bounding volume for geometry the shader places, and without it the structure vanishes entirely.

Fixed instance slots mean dead Cells occupy instances and collapse to zero scale rather than being
skipped. Compacting the buffer instead would reintroduce per-Cell CPU work every Generation, which is
precisely what this design exists to avoid.

`resetLayers()` on Restart clears the whole buffer rather than relying on the (correct but fragile)
argument that stale slots hide themselves.

**Grade: A**

## QA

The ring arithmetic is extracted into pure exported functions and tested directly, including the property
that matters most for Restart: a Generation always maps to the same slot, so a replayed Generation
overwrites its predecessor rather than stranding it in the ring at a height it never occupied.

Rendering is verified the only way rendering can be — by looking at it — and now repeatably, via
`pnpm smoke`. That script earned its place immediately: the first render satisfied every testable property
and still looked wrong.

**Grade: A**

## Security

No new attack surface. Shader source is a static template literal with no interpolation; every varying
value enters as a numeric uniform. No network activity after load, no DOM writes, no storage, no
deserialization. New dependencies land pinned with integrity hashes.

**Grade: A**

## Hacker

Nothing to abuse. No input reaches this code; the page is static assets driving a local render loop.

**Grade: A**

## UX

The page loads straight into the structure with no interaction required, which is what the PRD's "beauty
survives first contact" demands.

**It did not, at first.** The initial render satisfied every automated check and still failed the product:
drawn Cells were 0.4 units tall against a 0.5-unit Layer spacing, so Layers fused into one solid blue mass
with no visible history — the single thing this product exists to show. Fixed by separating the two
numbers (`LAYER_THICKNESS_RATIO`) and thinning Cells horizontally, then re-verified by screenshot.

It remains uniform blue and ends abruptly at the bottom. Both are deliberate — colour and fade are #8.

**Grade: B** — the outcome is right, but the product shipped a fused mass until it was looked at, and the
margin between "works" and "pointless" was one constant.

## Gate result

All grades C or above — **gate passes**.
