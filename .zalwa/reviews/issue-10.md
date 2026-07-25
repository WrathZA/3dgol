# Persona Review — Issue #10

**Issue:** feat: set grid dimensions and restart a run
**Branch:** `issue-10-grid-and-restart`
**Change type:** New feature / behaviour — all six personas apply
**Date:** 2026-07-26

## Scope note

Two things landed that the acceptance criteria do not name:

- **The camera reframes when the Grid footprint changes.** Raised in the plan and approved before
  implementation. Without it, AC 4 is barely observable — the retreat limit derives from the larger of
  footprint and height, so a Run restarted at a bigger Grid could not be backed away from far enough to see
  whole.
- **The panel is bounded to the viewport and scrolls within itself.** Not planned. Verification found that
  six sliders plus a button plus the note exceed a 420px-high viewport, and because the panel is
  `position: fixed` there is nothing to scroll — the Restart button added by this very issue was
  unreachable. Repairing this issue's own deliverable, not scope creep.

The Grid ceiling of 96 was chosen by the operator after being shown the instance arithmetic. It permits
1,105,920 instances at maximum depth, four times anything shipped, unmeasured on real hardware. Recorded as
a deliberate decision with #12 owning the measured limit.

## Product

All five criteria met and verified by driving the real controls. A staged dimension change announces itself
twice over — the readout reads "80 cells on restart" and the button becomes "Restart at 80 × 32" — while the
Run in progress carries on untouched, which is precisely the failure AC 2 exists to prevent. Restarting
reseeds and empties the Stack, restarting after a dimension change uses the new size, and restarting with
nothing touched still produces a different Run.

Against it: the change knowingly puts an unmeasured ceiling in front of the public. A visitor who drives
both Grid sliders and Depth to maximum on weak hardware may stall their tab, and that consequence lies
outside the ACs. It is tracked by #12 and was chosen deliberately rather than stumbled into.

**Grade: B**

## Technical

The Run is now one object rather than six variables, and starting one replaces the whole object. That is the
substantive improvement here: the previous shape required remembering to reset the accumulator, three
applied-setting snapshots, and two Depth Window travel values, and forgetting any one of them fails in a way
that is severe and hard to trace — stale travel state re-lays a ring that no longer exists. Replacing an
object cannot half-happen.

Restart chooses between two paths for a real reason rather than for tidiness: an unchanged Grid reseeds
inside buffers that are already the right size, and only a changed Grid pays for new ones. Restart is
requested by a flag the loop lowers rather than a callback the panel invokes, so a Simulation is never
replaced part-way through a frame that already holds a reference to the old one.

Two pieces of bounded coupling. `startRun` reads the module-level settings rather than taking them as
arguments, so its inputs are implicit. And `main.ts` calls `panel.refresh()` after a Restart, which is a
direction the documented dependency graph does not draw — defensible for a composition root, but it is new.

**Grade: B**

## QA

90 tests pass. The new one covers the property AC 5 actually rests on: that each Restart draws a fresh Seed,
so the control is not silently reproducing the same Run. Grid dimensions are now covered by the bounds
tests.

The weakness is that almost none of the restart *wiring* is automated. The dimension comparison, the choice
between the two paths, the completeness of the per-Run reset, and the pending indicator were all verified by
driving a headless browser and reading the result, not by tests — they live in the composition root and the
DOM, which this codebase has no harness for. Worse, the panel-overflow defect reached verification
undetected and there is still no automated guard against it recurring the next time a control is added,
which #11 will do. That follow-up is routed to zalwa-feed rather than left implicit.

**Grade: C**

## Security

A dedicated review found nothing. No network, storage, deserialization, or secret handling is added, and
both new DOM writes go through `textContent` and a non-executable ARIA attribute.

The net effect is hardening. Grid dimensions were previously a fixed module constant and are now
Viewer-settable — but they arrive through `clampSetting` on every write, and the constructors downstream
(`Simulation`, `createStructureMesh`) already validate positive integers and throw otherwise. `clampSettings`
still iterates a compile-time literal, so widening it to six keys reaches no attacker-supplied key.

**Grade: A**

## Hacker

There is no second party to attack, and this change does not create one: settings are not encoded in the URL
and do not persist, so there is no way to hand someone else a link that maxes their sliders. The panel is
given a boolean flag and a read-only getter, not a reference to the Simulation or the scene, so a
compromised panel cannot reach renderer or simulation methods.

The one thing a Viewer can now do more of is make their own device work harder. That is self-inflicted,
bounded by the sliders, and cannot be aimed at anyone.

**Grade: A**

## UX

The staged-versus-live distinction is the whole interface problem in this issue, and it is signposted in two
places at once: the readout says when a value is waiting, and the button says what pressing it will do. That
is better than a generic "changes pending" note, because the Viewer never has to work out *which* change is
waiting. Restart is shaped as a button rather than another slider, because it does something rather than
sets something.

The panel is now tall enough that on a short viewport the title and the Speed control scroll out of sight.
Bounding it to the viewport keeps everything reachable — the alternative was a control that could not be
clicked — but scrolling a control panel is a compromise rather than a design. Issue #11 owns the layout and
states this as its problem.

**Grade: B**

## Gate

Product B · Technical B · QA C · Security A · Hacker A · UX B — all C or above. Gate passes.
