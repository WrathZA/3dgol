# Codebase: 3D Game of Life

Live map of project layout, components, and patterns. Seeded at bootstrap; updated after every issue.

## Current state

**Every control the PRD specifies now exists.** Generations accumulate into a structure you can look at,
walk around, adjust, resize, and start over.

Issue #3 scaffolded the project and proved the deployment path. #4 built the simulation, #5 the bounded
history window, #6 drew it, #8 gave it colour, fade, and cubic edge-drawn cells, #7 made it something you
can walk around, #9 gave it a control panel for Speed, Depth Window, Maximum Age, and Cell Size, and #10
added staged Grid dimensions and Restart.

Not yet built: phone layout (#11), the drawing budget (#12), and link previews (#13). The panel's layout is
desktop-shaped — it scrolls rather than fits on a short viewport — and the instance ceiling it permits has
never been measured. Both deliberate, and owned by those issues.

What is built:

| Area | State |
|------|-------|
| Language | TypeScript 7.0.2 — `strict` + `noUncheckedIndexedAccess`, `@/` → `src/` alias |
| Build | Vite 8.1.5 |
| Package manager | pnpm 10.33.0, pinned via `packageManager`; Node pinned in `.nvmrc` |
| Lint / format | Biome 2.5.5, pinned exact, scoped to `src/`, `tests/`, and config files |
| Tests | Vitest 4.1.10 — one toolchain smoke test |
| 3D | three.js 0.185.1 on `WebGLRenderer`, `@types/three` at a matching version |
| Headless check | Playwright 1.62 — `pnpm smoke`, local only |
| Deploy | Cloudflare Workers static assets via Wrangler |
| Live URL | https://goluniverse.cc — apex only; `www` deliberately does not resolve |
| Fallback URL | https://3dgol.miller-brettm.workers.dev — kept live alongside the custom domain |

**Not automated:** CI does not run, and merging does not deploy. Deployment is `pnpm exec wrangler deploy`
run locally. Automating it additionally requires a Cloudflare API token as a repository secret. Tracked
separately — deferred by operator decision during #3.

Everything under "Planned layout" below that is not listed above is still unbuilt.

## Actual files

```
index.html            Full-viewport canvas (#viewport), meta tags, minimal inline CSS
src/
  main.ts             Composition root — the Run object, rAF loop, settings diff, Restart
  settings.ts         Starting values, bounds for every setting, clamping
  sim/                Pure simulation — imports nothing outside itself
    grid.ts           Grid storage, index arithmetic, Bounded Edge, neighbour counting
    rules.ts          B3/S23 + age increment + Death by Old Age
    stack.ts          LayerStack — ring buffer, Depth Window, retirement
    simulation.ts     Run state — generation counter, Maximum Age, Stack, advance(), restart()
    clock.ts          Elapsed time to Generations — pause, resume, backgrounded-tab cap
  render/             Drawing — may read the simulation, never the reverse
    scene.ts          Renderer, camera, OrbitControls, resize, reframe on extent change
    instances.ts      Instanced geometry, GLSL shaders, ring slot arithmetic, uniforms
    structure.ts      Binds a Run's Stack to the instance buffer; re-lays the ring
  ui/                 Control surface — mutates settings, knows nothing else
    panel.ts          Six controls plus Restart, built from native range inputs
    panel.css         Panel styling, including the viewport height bound
e2e/
  smoke.mjs           Headless render + screenshot — local only, never CI
tests/
  sim/
    helpers.ts        Pattern-to-Grid fixtures and comparison helpers (not a test file)
    grid.test.ts      Dimensions, Bounded Edge, neighbour counting
    rules.test.ts     Golden Life patterns, Age semantics, Death by Old Age
    stack.test.ts     Retirement, Depth Window resize, constant memory, copy-not-reference
    simulation.test.ts Run lifecycle, Seed density, determinism, Maximum Age, Stack integration
    clock.test.ts     Pause banks nothing, resume has no burst, long gaps are capped
  render/
    instances.test.ts Ring slot arithmetic and Stack placement height
  settings.test.ts    Setting bounds, step snapping, clamping
biome.json            Scoped to src/, tests/, and config files only
vite.config.ts        @/ alias + Vitest config (tests live in tests/**/*.test.ts)
tsconfig.json         strict, noUncheckedIndexedAccess, @/ paths
wrangler.jsonc        Static assets from ./dist, not_found_handling: 404-page
package.json          Scripts mirror .zalwa/stack.md Development Commands
.nvmrc                Node version pin
.gitignore            node_modules, dist, .wrangler, *.local, .DS_Store
```

## Planned layout

```
src/
  sim/            Pure simulation. Never imports three.js.
    grid.ts       Typed-array grid allocation, indexing, random seeding
    rules.ts      B3/S23 + bounded edges + death at maximum age A
    stack.ts      Ring buffer: capacity, write position, retirement, resize on N change
  render/
    scene.ts      Renderer, scene, camera, resize handling, pixel-ratio clamping
    instances.ts  InstancedMesh setup, per-instance attributes, partial buffer uploads
    material.ts   ShaderMaterial construction and uniform wiring
    shaders/
      cell.vert.glsl   Derives position, opacity, colour, scale from currentGeneration
      cell.frag.glsl
    controls.ts   OrbitControls configuration (pointer + touch)
  ui/
    panel.ts      Control panel construction and event wiring
    panel.css     Panel styling, including the mobile collapsed state
  settings.ts     The settings object shape and its default values
  main.ts         Composition root and requestAnimationFrame loop
index.html        Single page, meta tags, Open Graph tags
public/
  og-image.png    Open Graph preview image (a captured frame of the running structure)
tests/
  sim/            Vitest unit tests for grid, rules, stack
e2e/              Playwright smoke test — local only, not run in CI
wrangler.jsonc    Workers configuration with the static assets binding
biome.json
vite.config.ts
tsconfig.json
.nvmrc
```

## Structural patterns

Three patterns carry the design. A session that does not know these will produce code that works and is
wrong in ways that only show up as stutter or as untestable logic.

### One-way dependency

```
ui  ──▶  settings  ◀──  main  ──▶  render  ──▶  sim
```

`sim/` depends on nothing. `render/` may read simulation output but the reverse never happens. `ui/`
mutates the settings object and knows nothing about either. `main.ts` is the only module that wires them
together.

**`render/` deliberately does not import `settings`.** It would be convenient — `instances.ts` needs the
Depth Window ceiling to size the ring — and it would add an edge to the graph above. Instead `main.ts`
passes `ringCapacity` in. Every value the renderer needs from a setting arrives as an argument.

**How a moved slider reaches the thing it changes.** The panel writes into the settings object on `input`,
so a value is live mid-drag. `main.ts` compares a handful of scalars per frame against what it has applied
and acts on the difference — constant work regardless of instance count. Nothing observes, subscribes, or
notifies: the interface would otherwise need opinions about what each setting affects.

**Live settings versus staged settings.** Speed, Depth Window, Maximum Age, and Cell Size reach the Run on
the next frame. Grid width and height are *staged* — read only when a Run starts, because a Layer computed at
one Grid size cannot coherently stack on Layers computed at another. All six are bounded in the same table;
being bounded and being applied immediately are separate questions.

The consequence is an interface obligation, not just a code one: a staged change that silently waits is
indistinguishable from one that failed, so `panel.ts` marks a staged value whose Run has not caught up yet
and says on the Restart button what pressing it will do.

The hard rule: **`src/sim/` must never import three.js, touch the DOM, or reference rendering concepts.**
This is what makes the simulation unit-testable, and it is the first thing to check when a change to
`sim/` becomes difficult to test.

### Ring buffer with partial uploads

The instance buffer is allocated once at capacity `width × height × N` and treated as a ring. Layers are
immutable once written, and exactly one new layer appears per generation, so each generation writes only
one layer's slice and marks only that byte range dirty via `BufferAttribute.addUpdateRange`.

Retiring the oldest layer is not a delete — the ring position is overwritten, and the shader stops
drawing instances that have aged past the depth window. Re-uploading the whole buffer per generation
would discard the main advantage of this design.

### Derive-from-uniform

**Implemented in #6, completed in #9.** Each instance carries its grid position (written once), birth
generation, and age. Per frame, exactly two uniforms change: `uCurrentGeneration` and `uLayerCount`.
Viewer settings change three more, but only when moved. The vertex shader derives:

| Derived | From | State |
|---------|------|-------|
| Vertical position | `(layerCount − 1 − depth) × LAYER_SPACING`, where `depth = currentGeneration − birthGeneration` | built |
| Visibility | Age above zero, birth generation written, and depth inside the window | built |
| Dissolve | A fade toward `BACKGROUND_COLOR` plus a shrink, both over depth | built |
| Colour | Age along `GRADIENT_STOPS`, curved by `AGE_GRADIENT_CURVE` | built |
| Scale | `uCellSize`, scaling a unit cube | built |

`uLayerCount` is **not** simply the Stack's held depth — see `drawnLayerCount`. A narrowed Depth Window
travels toward its new value while the Stack still holds the Layers being given up, so the height Layers
are measured against is `min(heldLayers, drawnDepthWindow)`. Using the held depth instead drops the whole
structure the moment those Layers are finally released.

The height formula produces the two phases the PRD describes: while the Stack fills, `layerCount` grows
and the structure genuinely rises; once full it holds, and each Layer sinks a step per Generation until it
drops off the bottom.

The consequence, and the reason the design exists: per-frame CPU work is constant regardless of how many
instances are alive. Moving any of this back to the CPU reintroduces per-instance per-frame work and
undoes it.

**`mesh.frustumCulled` must stay `false`.** three.js computes bounding volumes from vertex positions, and
every instance here is placed by the shader — leaving culling on makes the whole structure vanish with no
error to explain it.

## Components

### `src/sim/grid.ts`

Owns Grid storage and the Bounded Edge.

A Grid is `{ width, height, ages: Uint16Array }`. **Age is the state**: `ages[i]` is 0 when a Cell is dead
and its Age when alive. There is no separate alive flag, because storing one would permit states that
cannot occur — alive with no Age, dead carrying an Age.

`ageAt()` returns 0 outside the Grid, and that single behaviour *is* the Bounded Edge: it makes
out-of-bounds positions permanently dead, so a pattern reaching the boundary is destroyed rather than
reappearing on the far side. `liveNeighbourCount()` counts eight positions — never twenty-six; neighbours
are counted within one Generation because the third axis of this product is time, not space.

Exposes: `Grid`, `MAX_REPRESENTABLE_AGE`, `createGrid`, `indexOf`, `contains`, `ageAt`, `isAlive`,
`setAgeAt`, `liveNeighbourCount`, `population`, `clearGrid`.

### `src/sim/rules.ts`

Owns the rule: B3/S23 plus Death by Old Age.

`nextGeneration(current, next, maximumAge)` reads exclusively from `current` and writes exclusively to
`next`. That separation is what makes every Cell see the same snapshot — computing in place would let
Cells resolved earlier in the pass influence Cells resolved later, which is not Life and produces
plausible-looking wrong output.

`nextAge(age, liveNeighbours, maximumAge)` is exported deliberately so the age cap can be asserted
directly rather than inferred from Grid output. **Death by Old Age is checked before neighbour count**,
because it applies regardless of neighbours.

### `src/sim/stack.ts`

Owns the bounded window of history — which Layers are retained and which are gone.

A single ring buffer sized `width × height × maxDepth`, allocated once. **Retirement is not a delete**:
the oldest slot is overwritten by the next push, which is what makes held memory constant by construction
rather than by discipline. `layerAt(0)` is the newest Layer.

`push()` **copies** the Grid rather than referencing it. `Simulation` reuses its Grid buffers between
Generations, so a referencing Stack would silently turn every Layer into the current Generation — a
failure that surfaces visually as "the structure is a solid extrusion of the present" and is very hard to
trace back from the render.

`generationAt(depth)` is **derived** as `newestGeneration − depth`, not stored. Exactly one Layer is
pushed per Generation, so the derivation is exact; a parallel array would be a second source of truth.

`layerAt()` returns a `subarray` **view**, not a copy — the renderer reads every Layer whenever the window
changes. Callers must not mutate it.

`set maxDepth` is the only allocating operation here, and it happens on a Viewer action rather than per
Generation. It copies newest-first into slots `0..n`, so the new ring starts in a known layout instead of
inheriting the old rotation.

Exposes: `LayerStack`, `validateMaxDepth`.

### `src/sim/simulation.ts`

Owns Run state: the current Grid, the generation counter, Maximum Age, and the Stack.

Holds two Grids allocated once at construction and swaps them on `advance()` — no allocation per
Generation, because GC pauses read as stutter in a continuously animating product. `restart()` ends the
Run and reseeds randomly from a `RandomSource`, which defaults to `Math.random` and is injectable so tests
get reproducible Runs.

Setting `maximumAge` does **not** reach into the Grid to kill over-age Cells; they die on the next
`advance()`, where the rule lives. Duplicating the rule in the setter would create two copies that
eventually disagree.

`advance()` pushes the new Generation onto the Stack. `restart()` clears it and pushes the Seed — **a
fresh Stack holds one Layer, not zero.** Generation 0 is a Generation like any other, and skipping it
would leave the bottom of a new structure missing the state everything above it grew from. Issue #5's AC 4
("restart empties the stack") and AC 1 ("each generation produces exactly one layer") pull against each
other here; this is the deliberate resolution.

Exposes: `Simulation`, `SimulationOptions`, `RandomSource`, `DEFAULT_SEED_DENSITY`,
`DEFAULT_DEPTH_WINDOW`.

### `src/render/scene.ts`

Owns the renderer, the camera, the camera controls, and the constants everything else is measured against.

**`OrbitControls`** provides orbit, pan, zoom, and touch. Three details are load-bearing:

- **The polar angle is deliberately unclamped** — the reflex is to stop a camera passing under the floor,
  but viewing the Stack from below is an acceptance criterion.
- **Distance limits derive from the structure's extent**, not from feel. Each bound can fail a criterion
  alone: too far a near limit and Cells never become legible, too near a far limit and the silhouette
  never fits.
- **The target does not follow the growing Stack.** It sits at the mid-height of a full Stack, so while
  the Stack fills the structure sits low in frame. Auto-following would fight the Viewer mid-drag.

Damping requires `controls.update()` every frame — `main.ts` calls it outside the generation accumulator,
so navigation and the Run cannot interfere in either direction.

`CELL_SPACING` and `LAYER_SPACING` are **both 1** — the lattice is isotropic, so a Cell is a cube and the
gap above it matches the gap beside it. The camera is fixed and angled; looking straight down an axis
would flatten a glider's diagonal into a dot. Device pixel ratio is clamped at 2.

`BACKGROUND_COLOR` is shared with the shader on purpose: the renderer clears to it and descending Layers
mix toward it, so a Layer leaving the window lands exactly on nothing. **If the two ever diverge, the
dissolve becomes a visible grey floor.**

### `src/render/instances.ts`

Owns the single instanced draw and the shaders that place it.

**`DEFAULT_CELL_SIZE` (0.55) is the most consequential number in the codebase.** On an isotropic lattice
it sets the gap in every direction at once. Near 1, Cells touch and the Stack fuses into one solid mass —
history becomes invisible, which is the one thing this product exists to show. This was shipped wrong once
and caught only by screenshotting it; every automated check passed. Since #9 it is a Viewer control and a
`uCellSize` uniform scaling a unit cube, so it is now a *default* rather than a constant — and a Viewer can
deliberately drive the Stack to that solid mass, which is the point of the control.

**Two windows, not one.** `setDepthWindow` sets what the shader fades and cuts against and takes fractional
values, because it is eased. `setSlotCount` sets how many ring slots are drawn and must cover every slot
the ring assigns. Collapsing them is the obvious simplification and it is wrong: a Layer written to a high
slot would stop being drawn however new it is.

**`GRADIENT_STOPS`** is the Colour Gradient, birth to death. A Cell traverses it exactly once over its
lifetime, so the palette is a countdown rather than decoration.

**`AGE_GRADIENT_CURVE` (0.45) exists because a linear map does not work.** Life's Age distribution is
heavily skewed young — most Cells die within a few Generations — so mapping Age linearly leaves the far
end of the palette unused and paints nearly everything the birth colour. The curve spreads early Ages
across more of the gradient without moving either endpoint. Raising it toward 1 quietly undoes the
palette.

**The Cell edge must retire as Cells shrink.** `EDGE_FADE_START`/`EDGE_FADE_END` fade the rim out once one
screen pixel spans a large share of a face. Without them the rim swallows the Cell whole at distance —
every fragment reads as edge, the Cell becomes its own outline and darkens to near black, and zooming out
makes the structure vanish. This shipped broken in #8 and was only found in #7, when the camera could
first move far enough to expose it.

**Two constants are kept in sync by hand.** `FADE_START` appears in both shaders and they must dissolve
together. The gradient stop count appears in TypeScript and literally in the GLSL uniform declaration —
that one throws at construction on mismatch; `FADE_START` does not, and cannot.

Instance count is `width × height × depthWindow`. Dead Cells occupy instances and collapse to zero scale
rather than being compacted out — fixed slots are what make the ring indexing work.

`slotRange` and `slotForGeneration` are pure and exported: the ring arithmetic is the only part of the
rendering layer verifiable without a GPU and an eye, so it is tested directly.

### `src/render/structure.ts`

Owns the bookkeeping between a Run's Stack and the instance buffer — which slot a Generation lands in, and
when a slot needs rewriting. One Layer written per Generation, one uniform per frame, never anything
proportional to Stack size.

**`relayRing()` is the one exception, and it is allowed to be.** A Generation's slot is
`generation % maxDepth`, so a changed Depth Window moves every held Layer, and all of them are rewritten.
That is proportional to Stack size — acceptable only because it happens on a Viewer action and nowhere
else. It allocates nothing.

**A batch rewrite must end with `uploadAll()`.** `writeLayer` narrows the upload to the single slot it
touched, which is the whole point of it; without a final full upload, only the last Layer of a batch
reaches the GPU and the rest of the ring shows the layout it just replaced.

### `src/sim/clock.ts`

Turns elapsed time into Generations. Pure, and in `sim/` because pacing a Run is simulation, not rendering.

Exists as a module rather than inline in the loop because pause is where the subtle bug lives: a paused Run
that banked elapsed time looks correct until it is released, then discharges a burst. Speed zero therefore
advances nothing *and* accumulates nothing. `retimeAccumulator` trims a carried accumulator when Speed
changes, so raising it does not discharge time banked against a slower interval.

### `src/main.ts`

The composition root, and the only module that knows about all three layers.

**The Run is one object, replaced whole.** `startRun()` is the single path that begins a Run, used at boot
and on any Restart that changes dimensions. It is the one place here that allocates, and that is acceptable
only because it happens on a Viewer action: a Grid size is fixed for the life of a `Simulation`, the Stack is
sized from it, and instance Grid positions are written once at construction, so a new size means new buffers.

Grouping the Run's state — the two Grid dimensions it started at, three applied-setting snapshots, both Depth
Window travel values, and the time accumulator — is deliberate. Held separately, starting a Run means
resetting each of them, and forgetting one fails severely and traces back poorly: stale travel state re-lays
a ring that no longer exists, and a stale accumulator discharges the previous Run's banked time into the new
one. Replacing an object cannot half-happen.

**Restart is a flag the loop lowers, not a callback the panel invokes.** Every change to Run state then
happens at one known point in the frame, instead of a `Simulation` being swapped part-way through a frame
that still holds a reference to the old one — and a Restart requested while paused behaves like any other,
because the loop runs regardless of Speed.

**Restart takes the cheap path when it can.** Unchanged dimensions reseed inside buffers that are already the
right size (`simulation.restart()` + `view.reset()`, no allocation); only a changed Grid rebuilds. The
`stage` deliberately outlives every Run — the camera is the Viewer's vantage point and starting a new Run
should not throw away where they were standing.

### `src/ui/panel.ts`

Six controls and the Restart button. Mutates plain objects; imports nothing from `sim/` or `render/`.

Native `<input type="range">` restyled rather than hand-drawn sliders: pointer capture, touch, keyboard,
and screen-reader semantics come free, and #11's touch requirement depends on that half already working.
Each control is a `<label>` wrapping its own input, so no generated ids are needed and the panel is safe to
build more than once.

`SETTING_BOUNDS` in `settings.ts` is the single source for every control's range and step — the panel reads
it, and clamping is applied on every write so a value off the step never reaches the ring arithmetic.

**The panel is bounded to the viewport height and scrolls inside itself.** It is `position: fixed`, so
anything past the bottom of the viewport is unreachable — there is no page to scroll. With six controls and a
button it exceeds a short window, and the control that fell off the end was Restart. Adding a seventh control
without checking a short viewport reintroduces that, and nothing automated guards it.

## Known risks

- **The instance cap has no number, and the panel now permits four times what has ever shipped.** Defaults
  are 48 × 48 × 60 — about 138,000 instances — chosen to look right, not measured. Since #9 the Depth Window
  slider reaches 120; since #10 both Grid dimensions reach 96. A Viewer can therefore ask for
  96 × 96 × 120 = 1,105,920 instances, roughly thirteen million triangles a frame, and the ring is
  *allocated* at the Depth Window ceiling regardless of the current setting. The cost is area, not length:
  96 is four times 48, not twice. Every instance is transformed each frame whether its Cell is alive or dead,
  and in a typical Run most are dead. There is no server to absorb any of it. `SETTING_BOUNDS` is
  deliberately the single place #12 writes the measured limit for both halves of the product.
- **Smoothness has never been observed on a real GPU.** Every render check so far ran against a software
  rasteriser, whose frame timings mean nothing. The design keeps per-frame CPU work constant, but that is
  reasoning, not evidence.
- **The vertex shader is unreachable by tests.** It is the heart of the visual output and no unit test can
  verify it. Mitigations: keep math in TypeScript wherever it can live there, and run `pnpm smoke` after
  touching anything that affects proportions.
- **`@types/three` versions independently of `three`.** Currently aligned at 0.185.1. Upgrade the two
  together and deliberately.
- **The dissolve depends on a flat background.** Fading toward `BACKGROUND_COLOR` keeps Cells opaque and
  correctly depth-sorted, which real transparency across 138,000 unsorted instances would not. A gradient
  or image behind the structure would force that decision to be revisited.
- **Darkening terms compound.** Face shading, the edge rim, and the depth fade all reduce the same pixel.
  Each is defensible alone; together they once turned the middle of the structure to mud. Check the render
  before adding a fourth.
- **A blank frame from a headless run may be the rasteriser, not the product.** During #9 a run that took
  nine full-page screenshots produced rich frames and then blank ones for the rest of the session, which
  read exactly like a rendering bug. It was SwiftShader's GPU process dying under repeated captures — the
  same sequence with four captures reported an empty error log throughout. Check the console error list
  before believing a blank frame.

- **Screen-space effects need checking across the whole camera range.** The edge rim was correct at the
  fixed distance #6 and #8 could reach and wrong once #7 allowed zooming out. Anything using `fwidth` or
  otherwise scaling with apparent size should be looked at from near, default, and far — the smoke script
  defaults to one distance only.
