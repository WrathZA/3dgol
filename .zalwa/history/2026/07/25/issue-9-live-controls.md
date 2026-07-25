## Issue #9 — feat: control speed, depth, maximum age, and cell size while running (DONE, closed)
https://github.com/WrathZA/3dgol/issues/9

Closed: 2026-07-25
Commit: 3848d58
Security: clean
Skill-judge: not applicable
PRD sections: Configurable by the Viewer, Display Configuration, B2, B3, B4, B5, B6, B10, B11

- **Cell Size had to become a uniform, not a rebuilt geometry.** It was baked into `BoxGeometry` at
  construction in #6, so making it live meant either rebuilding geometry per change — allocation on a slider
  drag, in a product that animates continuously — or scaling a unit cube in the vertex shader. Chose the
  shader. Renamed `DEFAULT_CELL_SCALE` to `DEFAULT_CELL_SIZE` at the same time so the code says what the
  Ubiquitous Language says.

- **The instance ring is allocated at the panel's Depth Window ceiling, not at the current setting.** The
  Depth Window is a Viewer control, so allocating exactly what it currently asks for would reallocate the
  whole instance buffer on a drag. Consequence: `SETTING_BOUNDS.depthWindow.max` now determines memory at
  rest, and at the default Grid that is 276,480 instances — double what has ever shipped. Nothing has
  measured it on real low-end hardware. `SETTING_BOUNDS` is deliberately the single place issue #12 sets
  that number once it has.

- **The drawn range tracks the window even though the allocation does not.** Lowering the Depth Window had
  to genuinely reduce what is drawn, otherwise the slider is useless as the escape hatch a slow device
  needs — it would only change how the structure looks. This forced two separate concepts in
  `instances.ts`: `setDepthWindow` (what the shader fades and cuts against, fractional) and `setSlotCount`
  (how many ring slots are drawn, integer). Collapsing them into one number is the obvious simplification
  and it is wrong: a Layer written to a high slot would stop being drawn however new it was.

- **The Depth Window travels rather than snapping, because the PRD asks for a fade.** AC 2 said only "trims
  from the bottom", but B4 and B10 both say retiring Layers fade rather than vanish. The shader's existing
  fade completes exactly where its cut-off begins, so easing the window makes given-up Layers dissolve on
  the way out for free — no new shader code. Narrowing defers the Stack trim until the travel arrives, so
  those Layers stay held long enough to fade; widening applies to the Stack immediately, since there is
  nothing to dissolve and the Stack needs room to start retaining more.

- **The camera follows the Depth Window; it does not follow the growing Stack.** #6 deliberately fixed the
  orbit centre at the mid-height of a *full* Stack so the structure rises into frame while filling. That
  decision is preserved — what moves now is only the height a full Stack means. Without it, narrowing to a
  short Stack leaves the structure hanging low in an empty frame and widening leaves the Viewer unable to
  retreat far enough to see the silhouette. Camera *position* is never touched.

- **Two bugs found by reading, not by tests, in the ring relay path.** First: `writeLayer` narrows the GPU
  upload to the slot it touched — which is the point of it — so rewriting every Layer in a batch would have
  uploaded only the last one, leaving the rest of the ring showing the previous layout. Added an explicit
  `uploadAll`. Second, and worse: the height Layers are placed against came from the Stack's *held* depth,
  which drops discontinuously when a narrowed window finally trims. A full Stack narrowed 60 → 20 would
  have faded correctly and then snapped the entire structure 40 units downward, with the camera already
  looking where it was about to land. Fixed by placing against the drawn window, and extracted as
  `drawnLayerCount` so the one property that matters — that height moves continuously as the window crosses
  the held Layer count — is unit-tested rather than reasoned about.

- **The generation accumulator moved out of the render loop into `sim/clock.ts`.** Pause is where this
  hides: a paused Run that banked elapsed time would look correct until released, then discharge a burst of
  Generations. Inline in `main.ts` no test could reach it. Pure function, and a changed Speed now trims a
  carried accumulator to one new interval so raising Speed does not discharge time banked against a slower
  one.

- **The panel is native range inputs, restyled.** Hand-drawn sliders would mean reimplementing pointer
  capture, touch, keyboard, and screen-reader semantics — and issue #11 depends on the touch half already
  working. What is hand-built is everything around them, because the PRD makes beauty on first contact a
  requirement and a debug-tool panel undercuts the thing it is attached to.

- **Verified by driving the real controls headlessly, not by reasoning.** Paused is pixel-identical three
  seconds apart; resuming moves again; Cell Size at 100% fuses neighbours into solid bars and at 20% opens a
  scatter with gaps. An earlier run produced blank frames that looked like a product fault and were the
  software rasteriser's GPU process dying after repeated full-page captures — the rerun with fewer captures
  reported an empty error log throughout. Worth knowing before trusting a blank frame from `pnpm smoke`.

- All five acceptance criteria met; issue closed. Persona gate: Product B, Technical B, QA C, Security A,
  Hacker A, UX B.
