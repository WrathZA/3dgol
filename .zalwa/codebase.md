# Codebase: 3D Game of Life

Live map of project layout, components, and patterns. Seeded at bootstrap; updated after every issue.

## Current state

**The product renders.** Generations accumulate into a structure you can look at.

Issue #3 scaffolded the project and proved the deployment path. #4 built the simulation, #5 the bounded
history window, and #6 drew it — one instanced draw call with placement derived in the vertex shader.

Not yet built: camera movement (#7), colour and fade (#8), any controls (#9, #10), phone layout (#11), the
drawing budget (#12), and link previews (#13). The structure is uniform blue, viewed from a fixed angle,
and ends abruptly at the bottom — all deliberate, all owned by those issues.

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
| Live URL | https://3dgol.miller-brettm.workers.dev |

**Not automated:** CI does not run, and merging does not deploy. Deployment is `pnpm exec wrangler deploy`
run locally. Automating it additionally requires a Cloudflare API token as a repository secret. Tracked
separately — deferred by operator decision during #3.

Everything under "Planned layout" below that is not listed above is still unbuilt.

## Actual files

```
index.html            Full-viewport canvas (#viewport), meta tags, minimal inline CSS
src/
  main.ts             Composition root — rAF loop, accumulator-driven generations
  settings.ts         Starting values for grid, depth, maximum age, and speed
  sim/                Pure simulation — imports nothing outside itself
    grid.ts           Grid storage, index arithmetic, Bounded Edge, neighbour counting
    rules.ts          B3/S23 + age increment + Death by Old Age
    stack.ts          LayerStack — ring buffer, Depth Window, retirement
    simulation.ts     Run state — generation counter, Maximum Age, Stack, advance(), restart()
  render/             Drawing — may read the simulation, never the reverse
    scene.ts          Renderer, fixed angled camera, resize, spacing constants
    instances.ts      Instanced geometry, GLSL shaders, ring slot arithmetic
    structure.ts      Binds a Run's Stack to the instance buffer
e2e/
  smoke.mjs           Headless render + screenshot — local only, never CI
tests/
  sim/
    helpers.ts        Pattern-to-Grid fixtures and comparison helpers (not a test file)
    grid.test.ts      Dimensions, Bounded Edge, neighbour counting
    rules.test.ts     Golden Life patterns, Age semantics, Death by Old Age
    stack.test.ts     Retirement, Depth Window resize, constant memory, copy-not-reference
    simulation.test.ts Run lifecycle, Seed density, determinism, Maximum Age, Stack integration
  render/
    instances.test.ts Ring slot arithmetic — the only testable part of rendering
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

**Implemented in #6.** Each instance carries its grid position (written once), birth generation, and age.
Per frame, exactly two uniforms change: `uCurrentGeneration` and `uLayerCount`. The vertex shader derives:

| Derived | From | State |
|---------|------|-------|
| Vertical position | `(layerCount − 1 − depth) × LAYER_SPACING`, where `depth = currentGeneration − birthGeneration` | built |
| Visibility | Age above zero, birth generation written, and depth inside the window | built |
| Opacity | A fade curve over depth — the dissolving bottom edge | #8 |
| Colour | `age / A` along the gradient | #8 |
| Scale | The cell-size setting | #9 |

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

Owns the renderer, the camera, and the two spacing constants everything else is measured against.

`CELL_SPACING` (1) and `LAYER_SPACING` (0.7) set the structure's proportions. The camera is fixed and
angled — looking straight down an axis would flatten a glider's diagonal into a dot. Device pixel ratio is
clamped at 2; uncapped on a modern phone it triples, multiplying fragment work ninefold for a difference
nobody can see on small blocks.

### `src/render/instances.ts`

Owns the single instanced draw and the shaders that place it.

**`LAYER_THICKNESS_RATIO` (0.4) is the most consequential number in the codebase.** It sets how tall a
drawn Cell is relative to the distance between Layers. Near 1, Layers touch and the Stack fuses into one
solid mass — history becomes invisible, which is the one thing this product exists to show. This was
shipped wrong once and caught only by screenshotting it; every automated check passed.

Instance count is `width × height × depthWindow`. Dead Cells occupy instances and collapse to zero scale
rather than being compacted out — fixed slots are what make the ring indexing work.

`slotRange` and `slotForGeneration` are pure and exported: the ring arithmetic is the only part of the
rendering layer verifiable without a GPU and an eye, so it is tested directly.

### `src/render/structure.ts`

Owns the bookkeeping between a Run's Stack and the instance buffer — which slot a Generation lands in, and
when a slot needs rewriting. One Layer written per Generation, one uniform per frame, never anything
proportional to Stack size.

## Known risks

- **The instance cap has no number.** Defaults are 48 × 48 × 60 — about 138,000 instances — chosen to look
  right, not measured. Grid dimensions × depth determines the draw, and there is no server to absorb it. A
  single conservative cap set by measurement on real low-end hardware is #12.
- **Smoothness has never been observed on a real GPU.** Every render check so far ran against a software
  rasteriser, whose frame timings mean nothing. The design keeps per-frame CPU work constant, but that is
  reasoning, not evidence.
- **The vertex shader is unreachable by tests.** It is the heart of the visual output and no unit test can
  verify it. Mitigations: keep math in TypeScript wherever it can live there, and run `pnpm smoke` after
  touching anything that affects proportions.
- **`@types/three` versions independently of `three`.** Currently aligned at 0.185.1. Upgrade the two
  together and deliberately.
