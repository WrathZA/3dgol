# Stack: 3D Game of Life

## Constraints

Established before any technology choice; every entry below is subject to these.

- **Budget: $0.** Free tiers only. No paid services, no runtime infrastructure.
- **Cloudflare** is the hosting provider.
- **Must run on mobile as well as desktop.** There is no server to offload to — all simulation and
  rendering happens on the visiting device, including low-end phones. This is the binding constraint on
  the whole design.
- **No backend, no persistence, no accounts.** Enforced by the PRD's out-of-scope list, not merely absent.
- **TypeScript** is a stated language preference carried over from the PRD.
- **Analytics is not a repository concern.** Cloudflare Web Analytics is enabled from the Cloudflare
  dashboard and injected at the edge — no script tag, no dependency, no code. Caveat: a
  `Cache-Control: public, no-transform` header would silently block beacon injection.

## Tech Stack

- **Runtime (production):** the browser. No server runtime exists.
- **Runtime (tooling):** Node.js 20.19+ / 22.12+ — required by Vite, used only for build and test.
- **Language:** TypeScript, `strict` plus `noUncheckedIndexedAccess`, ES modules, ES2022 target.
- **Build tool:** Vite 8.x (`vanilla-ts` template — no framework).
- **Package manager:** pnpm, pinned via `packageManager` in `package.json` (Corepack).
- **3D library:** three.js, using `WebGLRenderer`.
- **Types:** `@types/three` — a separate, community-maintained package that versions independently of
  `three` and must be upgraded deliberately alongside it.
- **Geometry strategy:** a single `THREE.InstancedMesh` of box geometry for the entire stack.
- **Camera control:** `OrbitControls` from `three/examples/jsm/controls/OrbitControls.js`.
- **Shading:** a custom GLSL `ShaderMaterial`.
- **UI:** hand-written TypeScript, HTML, and CSS. No UI framework, no component library, no control-panel
  library.
- **Lint + format:** Biome 2.x, installed with an exact pinned version.
- **Unit tests:** Vitest.
- **End-to-end tests:** Playwright — run locally only, never in CI.
- **Hosting:** Cloudflare Workers with Static Assets, deployed with Wrangler.
- **CI:** GitHub Actions.

### Rejected alternatives

Recorded because each was a live option and the reasoning is not recoverable from the choice alone.

- **`WebGPURenderer`** — three.js's own manual classifies it as experimental and recommends
  `WebGLRenderer` for production. Decisively, it does not support `ShaderMaterial`, `RawShaderMaterial`,
  or `onBeforeCompile`; custom shading must be written as TSL node materials. Since the custom vertex
  shader is the core of this application rather than an embellishment, that restriction is disqualifying
  for v1. Mobile support is a hard constraint and is not a reasonable thing to stake on an experimental
  renderer. It does fall back to WebGL2 automatically, so this is a maturity decision, not a coverage
  one. Migration later means porting one shader, not rewriting the application.
- **Babylon.js** — written in TypeScript with first-party types and a more production-ready WebGPU
  story, both genuine advantages. Rejected as heavier, and a less well-trodden path for instanced
  voxel-style rendering specifically.
- **Raw WebGL2 with no library** — rejected because `OrbitControls` alone implements the entire
  navigation behaviour, including two-finger touch, and reimplementing pointer capture, pinch
  resolution, and damping is substantial work with no product benefit.
- **GPU compute for the simulation** — unnecessary. A 128×128 grid is 16,384 cells, roughly 130k
  neighbour checks per generation; at 30 generations per second that is about 4M operations per second,
  which a typed-array loop handles without strain. The bottleneck is drawing the stack, not computing it.
- **`lil-gui` for the control panel** — the fastest route to working sliders, and it looks like the debug
  tool it is. The PRD requires the product to be beautiful on first contact without explanation, which a
  developer-tools widget undercuts.
- **React / Svelte / Preact** — six sliders and a button do not need a virtual DOM, and the render loop
  is imperative `requestAnimationFrame` regardless, so a framework would sit beside the architecture
  rather than support it.
- **An SSR framework (Next.js, SvelteKit, Nuxt)** — there is nothing to pre-render. The content is a
  canvas that does not exist until JavaScript runs.
- **`localStorage` for settings** — would contradict the PRD, which specifies that settings do not
  survive a page reload.
- **Cloudflare Pages** — still supported, but Cloudflare's current guidance is to start new projects on
  Workers with Static Assets; Pages and Workers are converging and all investment is going to Workers.

## Architecture

A single-page static bundle with no network activity after load. Three internal layers with a strict
one-way dependency: simulation knows nothing about rendering, rendering knows nothing about the DOM
control surface, and a thin composition root wires them together.

**Simulation.** Pure TypeScript over flat typed arrays. Given the current grid it produces the next
generation by applying B3/S23 with two modifications: positions outside the grid are permanently dead
(bounded, non-wrapping), and any live cell reaching maximum age A dies regardless of neighbour count.
Each live cell carries an age. This layer imports nothing from three.js and has no rendering concepts in
it whatsoever — that isolation is what makes it testable.

**History buffer.** The stack of computed layers is a fixed-capacity ring buffer sized
`width × height × N`, allocated once. Layers are immutable once written, and exactly one new layer is
produced per generation, so each generation writes only one layer's worth of instance data and marks
only that byte range dirty for upload. Retirement of the oldest layer is not a delete: the ring position
is simply overwritten, and the shader stops drawing instances that have aged beyond the depth window.

**Rendering.** One `InstancedMesh` holds the entire stack, so the whole structure is a single draw call
regardless of how many cells are alive. Each instance carries its grid position, its birth generation,
and its age. A custom GLSL vertex shader derives, from a single `currentGeneration` uniform: vertical
position (from the difference between the current generation and birth generation), opacity (a fade
curve over the same difference, producing the dissolving bottom edge), and colour (age against A along
the gradient). Cells are drawn at the full lattice spacing, so there is no size factor to apply and no
setting behind one. The consequence is that per-frame CPU work is
constant — one uniform write — and does not grow with the number of instances. `OrbitControls` owns the
camera and handles pointer and touch input natively.

**Composition root.** A `requestAnimationFrame` loop reads a plain settings object mutated by the DOM
control panel. It advances the simulation on an accumulator derived from the speed setting — decoupled
from frame rate, so display refresh does not affect simulation speed — and renders every frame
regardless, so camera movement stays smooth while paused or running slowly.

**Execution path for one generation:** timer accumulator fires → simulation computes the next grid from
the current one → the new layer's live cells are written into the ring buffer slice → that range is
marked for partial GPU upload → the generation counter increments → the next frame's uniform update
causes the shader to place, fade, and colour every instance accordingly.

**Instance budget.** The product of grid dimensions and depth window determines instance count, and
there is no server to absorb it. A single conservative cap applies to all devices, chosen by measuring
on the slowest hardware the product targets rather than by device detection. Adaptive per-device limits
are explicitly deferred.

## Project Layout

```
src/
  sim/            Pure simulation. MUST NOT import three.js.
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

## Conventions

Only conventions that differ from language or tool defaults are listed.

- **`src/sim/` must never import three.js, touch the DOM, or reference rendering concepts.** This is the
  load-bearing rule of the codebase. It is what allows the simulation to be unit tested at all, and
  violating it silently destroys the testing strategy.
- **TypeScript:** `strict: true` and `noUncheckedIndexedAccess: true`. The latter is normally friction,
  but this codebase is almost entirely flat-array index arithmetic, which is exactly where off-by-one
  errors hide.
- **Named exports only.** No default exports. No barrel/index re-export files — they obscure what is
  actually imported and provide nothing across four directories.
- **Path alias `@/` → `src/`**, declared in both `tsconfig.json` and `vite.config.ts`; the two must be
  kept in agreement.
- **Functional style in `src/sim/`** — pure functions over typed arrays, no classes, no mutation outside
  the buffer explicitly being written. **Light classes in `src/render/`**, where three.js is class-based
  and resisting it produces awkward code.
- **Errors are thrown.** No `Result` type, no error-return convention. Programmer errors are bugs and
  should be loud. There is deliberately no graceful capability screen for missing WebGL2: such a device
  gets a thrown error, not a styled message.
- **Grid state lives in flat typed arrays, never arrays of objects.** Per-cell objects would defeat the
  memory and iteration characteristics the simulation depends on.
- **Allocate once.** The instance buffer and grid arrays are allocated at their configured capacity and
  reused. Per-generation or per-frame allocation is a defect — it produces garbage-collection pauses
  visible as stutter in a continuously animating product.
- **Only the newest layer's range is uploaded per generation**, via `BufferAttribute.addUpdateRange`.
  Re-uploading the whole instance buffer each generation is a defect, not an optimisation opportunity.
- **Per-frame CPU work must not scale with instance count.** Anything derivable in the vertex shader from
  the `currentGeneration` uniform belongs in the vertex shader.
- **Device pixel ratio is clamped** when sizing the renderer. Uncapped `devicePixelRatio` on a high-DPI
  phone multiplies fragment work several-fold for no perceptible benefit.
- **Shader math stays in TypeScript wherever it can.** GLSL is unreachable by unit tests, so any logic
  that could live in a tested TypeScript function should live there rather than in the shader.
- **Biome is pinned to an exact version** (`-E`), so formatting cannot drift between local builds and CI.

## Development Commands

```
install:    pnpm install
dev:        pnpm exec vite
build:      pnpm exec vite build
preview:    pnpm exec vite preview
test:       pnpm exec vitest run
test:watch: pnpm exec vitest
e2e:        pnpm exec playwright test        # local only — never run in CI
format:     pnpm exec biome check --write
lint:       pnpm exec biome check
typecheck:  pnpm exec tsc --noEmit
deploy:     pnpm exec wrangler deploy
```

**CI (GitHub Actions), on push and pull request:**

```
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit
pnpm exec biome check
pnpm exec vitest run
pnpm exec vite build
```

Playwright is deliberately excluded from CI: it would require installing browsers on the runner, and the
smoke test would execute against a software rasteriser, producing failures unrelated to application
correctness.

## Interface

**There is no network interface and no command-line interface.** No HTTP routes, no API, no exported
package, no CLI. The product is static assets; after the page loads, no request is made. This section
records that as a deliberate property rather than an omission — no PRD behaviour requires a network call,
so there is no route surface to specify.

What the product exposes externally:

**The public URL** — a single route, `/`, serving the static bundle from Cloudflare Workers Static
Assets. No other paths exist.

**One query parameter, `?pattern=<id>`** — the product's only externally-supplied input, added in #50. It
names one of the starting patterns the product ships and is read once at boot; anything unrecognised is
ignored and the run seeds randomly. Nothing else is accepted from the URL, and no value in it reaches the
DOM, a request, or a property key. This is worth stating in the interface section rather than only in the
PRD, because every security assumption in this repository rested on the product having no external input
at all, and that is no longer true.

**The on-screen control surface** — the means of interacting with the running product, and the only means
of changing anything once it is loaded. Each control maps to a PRD behaviour:

| Control | PRD behaviour | Effect |
|---------|---------------|--------|
| Speed | B2, B3 | Generations advanced per second, including zero (paused) |
| Depth (N) | B4 | Size of the visible history window; resizes the ring buffer |
| Maximum age (A) | B5, B12 | Age at which a cell dies, and the span of the colour gradient |
| Grid width / height | B7 | Staged; applied only on the next restart |
| Restart | B8 | Clears the stack, reseeds randomly, resets the generation counter |

Both pointer and touch input are supported on every control, and the panel is collapsed by default on
small viewports.

**Camera input** — orbit, pan, and zoom via `OrbitControls`, satisfying B9. Mouse: left-drag orbits,
wheel zooms, right-drag pans. Touch: one finger orbits, two fingers zoom and pan together.

**Page metadata** — `<title>`, description, and Open Graph tags in `index.html`, with a preview image at
`public/og-image.png`, so the URL unfurls correctly when shared.
