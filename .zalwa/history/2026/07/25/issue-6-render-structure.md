## Issue #6 — feat: show the accumulated structure in three dimensions (DONE, closed)
https://github.com/WrathZA/3dgol/issues/6

Closed: 2026-07-25
Commit: 3c7f775
Security: clean
Skill-judge: not applicable
PRD sections: Solution and Scope, Depth window, Camera, Display Configuration, B1

- Implemented derive-from-uniform exactly as `codebase.md` recorded it at bootstrap, before any renderer
  existed. Grid position is written once; birth Generation and Age are written one Layer at a time into a
  ring slot with `addUpdateRange`; height, visibility, and placement are derived in the vertex shader from
  two uniforms. Per-frame CPU work is one uniform write regardless of instance count. The pattern was
  specified a long way ahead of its implementation and needed no revision when it arrived, which is a
  point in favour of recording architectural intent up front.

- Chose `y = (layerCount − 1 − depth) × spacing` over absolute height from birth Generation. It produces
  two phases that match the PRD exactly: while filling, the structure genuinely grows upward; once full,
  the top holds and each Layer sinks a step until it drops off the bottom. Absolute height would march the
  structure out of frame under a fixed camera.

- Kept dead Cells as instances that collapse to zero scale rather than compacting them out. Fixed slots
  are what make the ring indexing work at all; compacting would reintroduce per-Cell CPU work every
  Generation, which is the exact cost this design exists to avoid.

- Set `frustumCulled = false` on the mesh. three.js computes bounding volumes from vertex positions, and
  every instance here is placed by the shader — without this the entire structure is culled and the screen
  is black, with no error to explain it.

- **Shipped a fused blue mass on the first render, and only found it by looking.** Every automated check
  passed: 60 tests, clean typecheck, clean lint, successful build, no console errors, WebGL context
  acquired. Drawn Cells were 0.4 units tall against a 0.5-unit Layer spacing, so Layers merged into one
  solid volume. Dead positions drew nothing, so AC 3 was literally satisfied — and the structure had no
  visible history, which is the single thing this product exists to show.

- Fixed it by decoupling Cell height from Layer spacing (`LAYER_THICKNESS_RATIO`) and thinning Cells
  horizontally. The lesson is recorded rather than the fix: on a product whose acceptance criteria are
  visual, passing every testable property is not evidence that it works, and the margin between "working"
  and "pointless" was a single constant.

- Committed `e2e/smoke.mjs` and a `pnpm smoke` script as a direct consequence. Verification that only
  happens once is verification that will not happen again when the constant is next touched.

- Left the smoothness half of AC 5 explicitly unverified. Headless Chromium rasterises in software, so its
  frame timings say nothing about real hardware. The design supports the criterion and the memory half was
  measured (heap flat at 10 MB across 90 seconds), but claiming smoothness from a software rasteriser
  would be asserting something not observed. Real-device measurement belongs to #12.

- Noted a deliberate divergence: `playwright` is installed and `pnpm smoke` works, but this is a script
  rather than the `@playwright/test` harness that `stack.md`'s `e2e:` command anticipates. That command
  stays aspirational until someone builds the harness.

- All five acceptance criteria met, one with the verification caveat above; issue closed.
