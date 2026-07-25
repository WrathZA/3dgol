# Codebase: 3D Game of Life

Live map of project layout, components, and patterns. Seeded at bootstrap; updated after every issue.

## Current state

**Toolchain, deployment path, and the simulation core exist. Nothing is rendered yet.**

Issue #3 scaffolded the project and proved the deployment path. Issue #4 built the simulation — the part
that produces generations. Nothing imports `src/sim/` yet, so the deployed bundle is unchanged and the
modules are tree-shaken out of the build; rendering (#6) wires them up.

What is built:

| Area | State |
|------|-------|
| Language | TypeScript 7.0.2 — `strict` + `noUncheckedIndexedAccess`, `@/` → `src/` alias |
| Build | Vite 8.1.5 |
| Package manager | pnpm 10.33.0, pinned via `packageManager`; Node pinned in `.nvmrc` |
| Lint / format | Biome 2.5.5, pinned exact, scoped to `src/`, `tests/`, and config files |
| Tests | Vitest 4.1.10 — one toolchain smoke test |
| Deploy | Cloudflare Workers static assets via Wrangler |
| Live URL | https://3dgol.miller-brettm.workers.dev |

**Not automated:** CI does not run, and merging does not deploy. Deployment is `pnpm exec wrangler deploy`
run locally. Automating it additionally requires a Cloudflare API token as a repository secret. Tracked
separately — deferred by operator decision during #3.

Everything under "Planned layout" below that is not listed above is still unbuilt.

## Actual files

```
index.html            Placeholder page — title, description, #app mount point
src/
  main.ts             Mounts the placeholder message; throws if #app is absent
  placeholder.ts      Returns the placeholder string; stands in until rendering lands
  sim/                Pure simulation — imports nothing outside itself
    grid.ts           Grid storage, index arithmetic, Bounded Edge, neighbour counting
    rules.ts          B3/S23 + age increment + Death by Old Age
    simulation.ts     Run state — generation counter, Maximum Age, advance(), restart()
tests/
  placeholder.test.ts Toolchain smoke test — runner, @/ alias, module import
  sim/
    helpers.ts        Pattern-to-Grid fixtures and comparison helpers (not a test file)
    grid.test.ts      Dimensions, Bounded Edge, neighbour counting
    rules.test.ts     Golden Life patterns, Age semantics, Death by Old Age
    simulation.test.ts Run lifecycle, Seed density, determinism, Maximum Age changes
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

Each instance carries its grid position, birth generation, and age. Per frame, exactly one uniform is
written: `currentGeneration`. The vertex shader derives from it:

| Derived | From |
|---------|------|
| Vertical position | `currentGeneration − birthGeneration`, mapped to layer height |
| Opacity | A fade curve over that same difference — produces the dissolving bottom edge |
| Colour | `age / A` along the gradient |
| Scale | The cell-size setting |

The consequence, and the reason the design exists: per-frame CPU work is constant regardless of how many
instances are alive. Moving any of this back to the CPU reintroduces per-instance per-frame work and
undoes it.

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

### `src/sim/simulation.ts`

Owns Run state: the current Grid, the generation counter, and Maximum Age.

Holds two Grids allocated once at construction and swaps them on `advance()` — no allocation per
Generation, because GC pauses read as stutter in a continuously animating product. `restart()` ends the
Run and reseeds randomly from a `RandomSource`, which defaults to `Math.random` and is injectable so tests
get reproducible Runs.

Setting `maximumAge` does **not** reach into the Grid to kill over-age Cells; they die on the next
`advance()`, where the rule lives. Duplicating the rule in the setter would create two copies that
eventually disagree.

Exposes: `Simulation`, `SimulationOptions`, `RandomSource`, `DEFAULT_SEED_DENSITY`.

### `src/placeholder.ts`

Exists only so the deployment path could be proven and the smoke test has something to import. Expected to
be deleted once rendering lands.

## Known risks

- **The instance cap has no number.** Grid dimensions × depth determines instance count, and there is no
  server to absorb it. A single conservative cap applies to all devices, and its value can only be set by
  measuring on real low-end hardware.
- **The vertex shader is unreachable by tests.** It is the heart of the visual output and no unit test can
  verify it. Mitigation: keep math in TypeScript wherever it can live there instead of GLSL.
- **`@types/three` versions independently of `three`.** Upgrade the two together and deliberately.
