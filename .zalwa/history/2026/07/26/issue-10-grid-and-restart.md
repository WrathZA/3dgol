## Issue #10 — feat: set grid dimensions and restart a run (DONE, closed)
https://github.com/WrathZA/3dgol/issues/10

Closed: 2026-07-26
Commit: 41db17c
Security: clean
Skill-judge: not applicable
PRD sections: Configurable by the Viewer, Grid Configuration, Seed, B7, B8

- **The staged/live distinction is an interface problem before it is a simulation one.** The simulation side
  of this issue already existed — `Simulation.restart()` has cleared the Stack, reset the counter and drawn a
  fresh Seed since #5. What did not exist was any way for a Viewer to reach it, or any way to tell that a
  Grid change had been *accepted* rather than ignored. A control that quietly does nothing until later is
  indistinguishable from one that failed, so the pending state is signposted twice: the readout becomes
  "80 cells on restart" and the button becomes "Restart at 80 × 32". Signposting on the button as well as the
  readout means the Viewer never has to work out which pending change the button refers to.

- **The Grid ceiling was an operator decision, taken on the arithmetic rather than on feel.** Grid width ×
  height × Depth Window is the instance count, and every instance is a cube transformed each frame whether
  its Cell is alive or dead — fixed ring slots are what make the indexing work, so dead Cells collapse rather
  than being skipped, and in a typical Run 80–90% of that work is invisible. The cost is also area, not
  length: 96 is four times 48, not twice. Presented as a table (48 → 276k instances, 64 → 492k, 96 → 1.1M,
  128 → 2.0M) with the honest caveat that none of it, including the existing ceiling, has been measured on
  real hardware. 96 was chosen. That is 1,105,920 instances and roughly thirteen million triangles a frame,
  about four times anything shipped.

- **The Run became one object because the reset had six parts.** Held as separate module-level variables,
  starting a Run meant remembering to reset the accumulator, three applied-setting snapshots, and two Depth
  Window travel values. Forgetting one fails severely and traces back poorly — stale travel state re-lays a
  ring that no longer exists, and a stale accumulator discharges the previous Run's banked time into the new
  one. Replacing a whole object cannot half-happen. This was a larger change than "extract startRun()" but
  the smaller version needed either a definite-assignment assertion or a started flag, and neither removes
  the failure mode.

- **Restart has two paths because they cost very differently.** Unchanged dimensions reseed inside buffers
  already the right size; only a changed Grid allocates new ones. Always rebuilding would have been less
  code and would dispose and recreate a million-instance GPU buffer on a Viewer action that changes nothing
  about its size.

- **Restart is a flag the loop lowers, not a callback the panel invokes.** Two reasons: every change to Run
  state then happens at one known point in the frame, rather than a Simulation being replaced part-way
  through a frame that still holds a reference to the old one; and a Restart requested while paused behaves
  like any other, because the loop runs regardless of Speed. It also matches the existing architecture, where
  the panel mutates plain objects and the loop reads them.

- **The camera had to learn about footprint, not just height.** #9 gave the scene a `setDepthWindow`; the
  retreat limit derives from the larger of footprint and height, so a Run restarted at a bigger Grid kept a
  limit sized for the old one and could not be backed away from far enough to see whole. Widened to
  `setExtent`. Camera position is still never touched — only what is framed.

- **Verification found a defect this issue created: the Restart button was unreachable.** Six sliders plus a
  button plus the note exceed a 420px-high viewport, and the panel is `position: fixed`, so there is nothing
  to scroll and no way to reach what falls off the end. This is distinct from #11's phone layout — it is a
  control that cannot be clicked in a modest desktop window. Bounded the panel to the viewport with internal
  scrolling and contained overscroll. Scrolling a control panel is a compromise rather than a design, and
  the layout still belongs to #11; the point here was that the button had to be clickable at all.

- All five acceptance criteria met; issue closed. Persona gate: Product B, Technical B, QA C, Security A,
  Hacker A, UX B. The QA grade reflects that the restart wiring and the panel layout are verified by driving
  a headless browser rather than by tests, and that the overflow defect reached verification undetected — a
  follow-up for automated coverage there is routed to zalwa-feed.
