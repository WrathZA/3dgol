## Issue #51 — feat: cells are always drawn at full size (DONE, closed)
https://github.com/WrathZA/3dgol/issues/51

Closed: 2026-07-26
Commit: 4826c4f
Security: clean
Skill-judge: not applicable
PRD sections: Configurable by the Viewer, Actors — Viewer, Display Configuration, B6 — Set cell size

- **The control was removed for panel height, and the PRD's own language was the thing standing in
  the way.** B6 promised that large values make layers "read as solid sheets" and the Depth Window
  section warned that deep stacks "occlude themselves into an opaque brick" — both written as if
  the grid were dense. It is not: the measured population is 3–7% live at the defaults and nearer
  2% on a pattern run, so full-size cells produce chunky connected clusters rather than filled
  layers. Checking the measured number against the prose is what made this issue possible; taking
  the PRD at its word would have made removing the control look like a regression.

- **Full size turned out to be the absence of a factor, not a factor of 1.0.** The geometry was
  already `new BoxGeometry(CELL_SPACING, CELL_SPACING, CELL_SPACING)`, so the shader edit was
  deleting `* uCellSize` from the placement expression rather than pinning a constant. Recorded
  because the obvious implementation — keep the uniform, hardcode 1.0 — would have left per-vertex
  work and a uniform slot behind for nothing, and because a future reader looking for a
  `CELL_SIZE` constant will not find one.

- **The work extended past the acceptance criteria on purpose, to two places the ACs did not
  name:** the Viewer responsibility bullet "Sets how large cells are drawn." in the Actors section,
  and `stack.md`'s Interface table row plus its architecture sentence "scale (from the cell-size
  setting)". Neither was in scope as written. Both are exactly the stranded-clause failure #48
  exists to catch — a clause whose truth depended on the one being edited, sitting in a section
  the issue never touched — and this issue's own "Note on reversibility" cites that failure mode,
  so leaving them would have been the specific mistake it was written to avoid.

- **The gap B6 leaves in the behaviour numbering was left open rather than closed.** Renumbering
  B7 through B13 upward would strand every citation in closed issues, history entries, and
  `stack.md`'s Interface table, all of which name behaviours by number. A gap that reads as
  deliberate costs less than a renumbering that silently invalidates references, and this bullet
  is where a future session should look before "fixing" it.

- **A test was deleted rather than rehomed, and that leaves a real hole.** "keeps a stepped
  fraction free of floating-point tails" used `cellSize` as its vehicle because `cellSize` was the
  only bound with a fractional step. Every surviving bound steps by 1, so there is nothing left to
  assert against — which also means `decimalPlaces()` and the `toFixed()` call in `clampSetting`
  are now correct but unexercised. If a fractional-step setting is ever reintroduced, that
  regression guard has to be written again alongside it; it will not simply start working.

- **The height this bought is already spent.** `pnpm smoke --phone` now reports the portrait panel
  at `contentHeight` 516 against `visibleHeight` 516 — it fits exactly, with no headroom. The
  smoke assertion that would catch a regression is `contentHeight > visibleHeight`, so the next
  control added to the sheet puts it straight back into overflow. Three previous sessions (#37,
  #30, #42) each fought the same shortage; this one removed a row instead of shrinking one, and
  the next will have neither option left without removing another.

- **What was actually surrendered is the porous reading**, not legibility — a Viewer can no longer
  see into the structure through gaps between cells, and camera zoom is not a substitute, which
  was the entire point of the paragraph this change deleted. The persona gate graded UX B on that
  basis rather than A: the removal is well-argued and the loss is real and unreplaced.

- All acceptance criteria met; issue closed.
