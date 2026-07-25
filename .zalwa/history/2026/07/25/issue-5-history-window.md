## Issue #5 — feat: retain a bounded window of history (DONE, closed)
https://github.com/WrathZA/3dgol/issues/5

Closed: 2026-07-25
Commit: a446acb
Security: clean
Skill-judge: not applicable
PRD sections: Layer, Stack, Depth window, Simulation

- Chose a ring buffer over an array of per-Layer copies. The array version reads more simply but
  allocates a typed array every Generation, against the "allocate once" convention — and GC pauses read
  as stutter in a product that animates continuously. Retirement therefore is not a delete: the oldest
  slot is overwritten by the next push, which is also what makes held memory constant by construction
  rather than by discipline.

- Left `set maxDepth` as the single allocating operation. Resizing must reallocate because capacity
  changes, but it happens on a Viewer action rather than per Generation, so the hot path stays
  allocation-free. Resizing also rebuilds the ring's rotation deliberately — copying newest-first into
  slots 0..n means the new ring starts in a known layout instead of inheriting the old rotation, which
  would have made `writeSlot` arithmetic depend on history.

- Derived a Layer's Generation as `newestGeneration − depth` instead of storing a parallel array. Exactly
  one Layer is pushed per Generation, so the derivation is exact by construction. A stored array would
  be a second source of truth and the two would eventually disagree.

- Returned a `subarray` view from `layerAt()` rather than a copy. The renderer will read every Layer
  whenever the window changes; copying would allocate on each read. The cost is that callers hold mutable
  memory, which is the same contract `Simulation.grid` already carries and is documented the same way.

- Copied the Grid on push rather than holding a reference. `Simulation` reuses its Grid buffers between
  Generations, so a referencing Stack would silently turn every Layer into the current Generation. The
  failure would surface visually as "the structure is a solid extrusion of the present" and be very hard
  to trace back from the render, so it has a dedicated named test.

- Resolved a genuine tension between two acceptance criteria. AC 4 says Restart "empties the stack"; AC 1
  says every Generation produces exactly one Layer. Generation 0 is a Generation. Chose AC 1: all prior
  history is discarded, then the Seed is pushed like any other Generation, so a fresh Stack holds one
  Layer rather than zero. Skipping it would leave the bottom of a new structure missing the state
  everything above it grew from. Recorded at the call site, in a named test, and surfaced on the PR and
  the issue rather than left for a future reader to discover.

- Made `depthWindow` optional with `DEFAULT_DEPTH_WINDOW = 120` after making it required broke ten
  existing test call sites for no gain. Matches how `seedDensity` already works in the same file. The
  docstring states explicitly that the binding ceiling is not this constant but the drawing budget in
  #12 — grid dimensions multiplied by depth.

- All five acceptance criteria met; issue closed.
