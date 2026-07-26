# Principles: 3D Game of Life

Project-level design principles that guide implementation. Distinct from `.zalwa/stack.md` conventions,
which govern *how code is written*; these govern *what decisions are correct*. Updated via
`/zalwa-reflect`.

## 1. The device is the entire budget

There is no server. Every cell computed and every instance drawn happens on the visitor's hardware,
including a low-end phone, which the PRD makes a supported target rather than a degraded fallback.

Any feature whose cost scales with grid size or depth must be evaluated against the slowest device the
product targets, not the development machine. "It runs fine locally" is not evidence.

## 2. Beauty on first contact is a requirement, not polish

The PRD's stated problem is aesthetic. A visitor arrives with no context and no explanation, and the
product either justifies itself in the first few seconds or fails.

A change that makes the product more correct but less beautiful has failed. "We will style it later" is
not a plan for a product whose entire value is how it looks — it is a decision to ship the failure mode.

## 3. The simulation core stays pure

`src/sim/` is the only part of this codebase that can be meaningfully tested. That property exists solely
because it has no dependency on three.js, the DOM, or any rendering concept.

Convenience is never a sufficient reason to let rendering into it. When a change to `sim/` becomes hard
to test, the isolation has already been broken and that is the bug to fix first.

## 4. Derive, don't recompute

Anything obtainable from the current generation and an instance's birth generation belongs in the vertex
shader, not in a per-frame CPU loop.

Per-frame CPU work that scales with instance count is a design failure, not a performance issue to
optimise later. The whole rendering design exists to keep that work constant; a change that reintroduces
per-instance per-frame work has undone it, however reasonable the change looks in isolation.

## 5. History is a window, not an archive

Retired layers are gone. The fixed depth window is not a memory optimisation — it is the design.

Any feature that implies retained history — timeline scrubbing, replay, seeking to an earlier generation,
exporting past states — contradicts it. Such a request is a PRD conversation, not an implementation one.
This principle is recorded explicitly because scrubbing is the most tempting item on the out-of-scope
list, and the natural instinct is to add it as a helpful extra.

## 6. Maximum Age is a trigger and a gradient, not a lifespan

A cell reaching Maximum Age is never removed by the rule. With the Explosion on it detonates, resetting
itself and every in-grid neighbour to age 1; with the Explosion off it simply carries on, and its age
saturates at A so the Colour Gradient still has a top end. A is therefore two things and neither is a death
sentence — the trigger for the burst, and the far end of the palette. Ordinary Conway death by over- and
underpopulation is untouched in both branches.

This is recorded because "maximum age" reads as a lifespan, and code written from that reading introduces a
third state the product does not have: a quiet death at the cap. That state was measured when it existed —
0.9–1.4% live by generation 250 against 4–6% with the burst — and it is a slow bleed rather than a rule.
One control governs the burst because there is no separable half left to govern: strip the Explosion and the
cap has no remaining behaviour to switch off. The control is named after the Explosion for the same reason,
which is the opposite of what this principle said before the rule changed.
