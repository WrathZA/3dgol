# Codebase: 3D Game of Life

Live map of project layout, components, and patterns. Seeded at bootstrap; updated after every issue.

## Current state

**No source files exist yet.** The repository contains the `.zalwa/` workflow documents, `CLAUDE.md`, and
`README.md`. Everything below is the planned layout derived from `.zalwa/stack.md`, not an observed one.
The first implementation issue should scaffold the Vite project and replace this section with the actual
state.

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

Nothing implemented yet. As modules land, record here what each owns and what it exposes.

## Known risks

- **The instance cap has no number.** Grid dimensions × depth determines instance count, and there is no
  server to absorb it. A single conservative cap applies to all devices, and its value can only be set by
  measuring on real low-end hardware.
- **The vertex shader is unreachable by tests.** It is the heart of the visual output and no unit test can
  verify it. Mitigation: keep math in TypeScript wherever it can live there instead of GLSL.
- **`@types/three` versions independently of `three`.** Upgrade the two together and deliberately.
