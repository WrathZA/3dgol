# Persona Review — Issue #9

**Issue:** feat: control speed, depth, maximum age, and cell size while running
**Branch:** `issue-9-live-controls`
**Change type:** New feature / behaviour — all six personas apply
**Date:** 2026-07-25

## Scope note

Two additions go slightly past the literal acceptance criteria, both raised in the plan phase and approved
before implementation:

- **The Depth Window travels rather than snapping.** AC 2 asks only that lowering trims from the bottom.
  The PRD's B4 and B10 both say retiring Layers *fade* rather than vanish, and the shader's existing fade
  meets its own cut-off exactly, so easing the window makes the given-up Layers dissolve on their way out.
- **The camera reframes on a Depth Window change.** Without it, narrowing to a short Stack leaves the
  structure hanging low in an empty frame, and widening leaves the Viewer unable to retreat far enough to
  see the whole silhouette. Camera *position* is untouched.

## Product

All five criteria are met and verified by driving the real controls rather than by reasoning: paused holds
the structure pixel-identical three seconds apart and resumes without a discontinuity, the Depth Window
narrows and widens on a continuing Run without reseeding, Maximum Age visibly changes the picture at both
ends of its range, and Cell Size drives Layers from a porous scatter at 20% to fused solid bars at 100%
with no camera movement. Nothing clears the Stack.

The two additions above are user-visible and outside the ACs. Both were deliberate, both serve stated PRD
behaviours, and neither introduces a surprise — but they are more than the criteria asked for.

**Grade: B**

## Technical

The change holds the line the rendering design exists to protect. Cell Size moved from baked
`BoxGeometry` into a uniform on a unit cube, so a slider drag allocates nothing. The instance ring is
allocated once at the largest Depth Window the panel permits, so changing that window re-lays the ring
rather than reallocating it, and the draw range tracks the window so a lower setting genuinely draws less —
the slider is a way out for a slow device, not only a way to change how the structure looks. Per-frame CPU
work is four scalar comparisons regardless of instance count.

The one-way dependency survives: `render/` does not import `settings`, so `main.ts` passes the ring
capacity in. `sim/clock.ts` imports nothing and keeps `sim/` pure.

Against it: the travelling Depth Window is held in two places — `main.ts` drives it and `structure.ts`
keeps a mirror for the placement clamp. The mirror is written on every travel frame and its only reader is
one `Math.min`, so it cannot drift meaningfully, but it is the same concept living twice.

**Grade: B**

## QA

89 tests pass. New coverage sits exactly where the codebase says coverage can exist: the generation clock
(pause banks nothing, resume produces no burst, a backgrounded gap is capped, negative time is ignored),
the setting bounds (range, step snapping, floating-point drift, non-finite rejection), and the Stack
placement height including the continuity property that the placement bug violated.

Two bugs were found during this issue by reading and reasoning rather than by a failing test: the batch
upload after a ring relay (each write narrows the upload range, so only the last Layer would have reached
the GPU), and the placement height reading held Layers instead of the drawn window (which would have
dropped a narrowed structure bodily once its fade completed). The first is still not unit-tested — it is
three.js buffer plumbing, unreachable without a GPU, and its arithmetic neighbours *are* tested. That the
riskiest path in this change is verified visually rather than automatically is the honest weakness here,
and a follow-up for a Layer-preservation test across a Depth Window change is routed to zalwa-feed.

**Grade: C**

## Security

A dedicated review found nothing. The change adds no network, storage, deserialization, or secret
handling, and every DOM write goes through `textContent` — there is no `innerHTML` anywhere in the panel.
`clampLiveSettings` iterates a compile-time object literal, so no attacker-supplied key reaches an
assignment.

Net effect is hardening rather than exposure: values that were previously fixed constants are now
Viewer-settable, and both new entry points validate. `clampSetting` bounds and snaps or throws on
non-finite input, and `setSlotCount` rejects a slot count outside the allocated ring rather than indexing
past it.

**Grade: A**

## Hacker

There is no second party to attack — no server, no storage, no sharing, no other Viewer's state to reach.
Someone editing the DOM or driving the settings object from a console can ask for any value they like, and
the two things that would matter if unbounded are both guarded: out-of-range settings are clamped at entry,
and an out-of-range slot count throws rather than being used for buffer arithmetic. The worst reachable
outcome is a slower render on the attacker's own device.

**Grade: A**

## UX

The panel is built to sit with the structure rather than on top of it, and it reads as designed rather
than as a debug widget — which the PRD makes a requirement rather than polish. Values update live while a
slider is still moving, so finding the value you want is a matter of watching the structure respond.
Zero Speed reads "Paused" rather than "0/s", because it is a different state and not merely a slower one.
Native range inputs carry keyboard, touch, and screen-reader support for free, each label wraps its own
input, and tabular numerals stop the readout jittering sideways as digits change.

One ambiguity: "Cell size 100%" describes a proportion of the lattice spacing, and what that means —
neighbours touching — is only apparent once the slider is moved. It resolves immediately on use.

On a phone-sized viewport the panel covers much of the structure. That is the layout this issue does not
own; issue #11 states the problem in those words and owns the collapsed state.

**Grade: B**

## Gate

Product B · Technical B · QA C · Security A · Hacker A · UX B — all C or above. Gate passes.
