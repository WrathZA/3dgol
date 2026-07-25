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
