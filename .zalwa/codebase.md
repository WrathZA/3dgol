# Codebase: 3D Game of Life

Live map of project layout, components, and patterns. Seeded at bootstrap; updated after every issue.

## Current state

**Every control the PRD specifies now exists.** Generations accumulate into a structure you can look at,
walk around, adjust, resize, and start over.

Issue #3 scaffolded the project and proved the deployment path. #4 built the simulation, #5 the bounded
history window, #6 drew it, #8 gave it colour, fade, and cubic edge-drawn cells, #7 made it something you
can walk around, #9 gave it a control panel for Speed, Depth Window, Maximum Age, and Cell Size, #10
added staged Grid dimensions and Restart, #26 made reaching Maximum Age detonate, #32 signed the panel, #11
laid the whole thing out for a phone, #37 made that layout survive a real one, #29 raised the starting
Speed to 10 Generations per second, #30 made the detonation a reset rather than a death and gave the
Viewer a switch for it, #42 added a starting-Pattern picker with Gosper's glider gun, #46 made choosing a
Pattern switch the Explosion off so the gun is not destroyed by it, #49 grew that list to seven, #50
put the chosen Pattern in the URL so a run can be shared, #51 removed the Cell Size control so Cells
are always drawn at the full lattice spacing, and #13 made a shared link unfurl as a card.

**Every behaviour the PRD names is now built.** The instance ceiling the panel permits has never been
measured — deliberate, and owned by #12, which is now `priority:deferred` and reachable only via
`/zalwa-ride 12`.

Queued: the author's mark is under the contrast threshold at rest (#35), `pnpm smoke` writes a screenshot to
the repo root that is not gitignored (#34) — hit twice more during #42 — and the PRD's tuned-defaults list
does not name the starting Speed (#41).

Deferred by decision rather than by ordering: the drawing budget (#12) and the near-monochrome Colour
Gradient at the A=200 default (#28) both carry `priority:deferred`, so neither surfaces in auto-pick. #31
(Grid ceiling to 128) is blocked by #12 and is therefore blocked behind a deferred issue — reviving it means
reviving #12 first.

**The panel has no automated coverage at all.** `vitest` runs in `environment: "node"` with no DOM, so
nothing in `src/ui/` is reachable by a unit test — the phone layout is verified only by a local
`pnpm smoke --phone` run that never executes in CI. #25 owns that harness, and until it lands every
interface change is guarded by a screenshot and a pair of eyes.

**A check that cannot fail is worse than no check.** #11's harness asserted that the sheet's *box* fits the
viewport. `max-height` caps the box, so that assertion passes by construction while the content overflows
inside it and scrolls — which is exactly what shipped. It now asserts `scrollHeight <= clientHeight`. When
adding an assertion here, ask what state would make it fail; if there isn't one, it is reading as coverage
without providing any.

**Some defects are structurally unreachable headlessly, and the answer is a proxy, not a skip.** Chromium
has no browser toolbar, so it cannot reproduce the iOS positioning bug at all. The harness instead asserts
that the toggle's `offsetParent` is the layer — `null` for a fixed element, the layer for an absolute one —
so a revert to `position: fixed` fails immediately. Not equivalent to a device, but the honest ceiling.

What is built:

| Area | State |
|------|-------|
| Language | TypeScript 7.0.2 — `strict` + `noUncheckedIndexedAccess`, `@/` → `src/` alias |
| Build | Vite 8.1.5 |
| Package manager | pnpm 10.33.0, pinned via `packageManager`; Node pinned in `.nvmrc` |
| Lint / format | Biome 2.5.5, pinned exact, scoped to `src/`, `tests/`, and config files |
| Tests | Vitest 4.1.10 — one toolchain smoke test |
| 3D | three.js 0.185.1 on `WebGLRenderer`, `@types/three` at a matching version |
| Headless check | Playwright 1.62 — `pnpm smoke` and `pnpm smoke --phone`, local only |
| Deploy | Cloudflare Workers static assets via Wrangler |
| Live URL | https://goluniverse.cc — apex only; `www` deliberately does not resolve |
| Fallback URL | https://3dgol.miller-brettm.workers.dev — kept live alongside the custom domain |

**Not automated:** CI does not run, and merging does not deploy. Deployment is `pnpm exec wrangler deploy`
run locally. Automating it additionally requires a Cloudflare API token as a repository secret. Tracked
separately — deferred by operator decision during #3.

Everything under "Planned layout" below that is not listed above is still unbuilt.

## Actual files

```
index.html            Full-viewport canvas (#viewport), share-card metadata, minimal inline CSS
public/
  og-image.png        The link preview — a 1200 × 630 frame of a real run, captured, not mocked up
  robots.txt          Crawling allowed explicitly, because a missing file returns the 404 page
src/
  main.ts             Composition root — the Run object, rAF loop, settings diff, Restart
  settings.ts         Starting values, bounds, clamping, and the rule a Pattern imposes
  share.ts            The URL as a share mechanism — parse a Pattern from a query, write one back
  sim/                Pure simulation — imports nothing outside itself
    grid.ts           Grid storage, index arithmetic, Bounded Edge, neighbour counting
    rules.ts          B3/S23 + saturating age + the Explosion at Maximum Age
    stack.ts          LayerStack — ring buffer, Depth Window, retirement
    simulation.ts     Run state — counter, Maximum Age, Explosion, Stack, advance(), restart(pattern?)
    patterns.ts       Named starting arrangements as data — seven Patterns, each with a stable id
    clock.ts          Elapsed time to Generations — pause, resume, backgrounded-tab cap
  render/             Drawing — may read the simulation, never the reverse
    scene.ts          Renderer, camera, OrbitControls, resize, reframe on extent change
    instances.ts      Instanced geometry, GLSL shaders, ring slot arithmetic, uniforms
    structure.ts      Binds a Run's Stack to the instance buffer; re-lays the ring
  ui/                 Control surface — mutates settings, knows nothing else
    panel.ts          Six settings, the Pattern chooser and Random, the toggle, the 100dvh layer
    panel.css         Both arrangements — desktop column, small-viewport sheet, coarse-pointer targets
    signature.ts      The author's mark (original SVG) and GitHub's octocat — the two links out
e2e/
  smoke.mjs           Headless render + screenshot; `--phone` checks the sheet in both orientations
  og-capture.mjs      `pnpm og-image` — recaptures public/og-image.png when the visuals change
tests/
  sim/
    helpers.ts        Pattern-to-Grid fixtures and comparison helpers (not a test file)
    grid.test.ts      Dimensions, Bounded Edge, neighbour counting
    rules.test.ts     Golden Life patterns, Age semantics, saturation, the Explosion
    stack.test.ts     Retirement, Depth Window resize, constant memory, copy-not-reference
    simulation.test.ts Run lifecycle, Seed density, determinism, Explosion, Pattern seeding, Stack
    patterns.test.ts  Pattern measurement, ragged rows, id uniqueness, the Grid floor
    pattern-fidelity.test.ts  Is each Pattern actually that Pattern — period round-trips
    clock.test.ts     Pause banks nothing, resume has no burst, long gaps are capped
  render/
    instances.test.ts Ring slot arithmetic and Stack placement height
  settings.test.ts    Setting bounds, step snapping, clamping, applyStartRule
  share.test.ts       Pattern-from-query, URL building, degradation, round-trip
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

**Live settings versus staged settings.** Speed, Depth Window, Maximum Age, and the Explosion reach the
Run on the next frame. Grid width and height are *staged* — read only when a Run starts, because a
Layer computed at one Grid size cannot coherently stack on Layers computed at another. The five numeric
settings are bounded in the same table; being bounded and being applied immediately are separate questions.
The Explosion has no entry there, because a boolean has no range — which is why `SETTING_BOUNDS` and
`clampSettings` stay numeric and `panel.ts` derives its switch-able settings from the `Settings` type
instead.

The starting **Pattern** is a third kind: not live, not staged, and not a setting at all. It never sits in
the settings object — it travels on the Restart request and is consumed by the Run it starts, because it
describes one Run's Generation 0 rather than a value the product holds.

**It does, however, write into the settings object (#46).** Choosing a Pattern switches the Explosion off,
via `applyStartRule` in `settings.ts`. This is the only place in the product where one control moves
another, and the justification is specific rather than general: a Pattern describes a Run, so the rule that
Run needs is part of what was chosen. Random is not symmetric and deliberately touches nothing — see B12a
for the standard any future exception has to meet.

**`applyStartRule` lives in `settings.ts` for testability, not tidiness.** It was first written inline in
the frame loop in `main.ts`, which imports three.js and is reachable by no unit test — so the feature had
zero coverage and the persona gate failed it at QA. The rule a Viewer cannot see happening is exactly the
one that has to be asserted, so it belongs somewhere a test can reach.

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
Viewer settings change two more, but only when moved. The vertex shader derives:

| Derived | From | State |
|---------|------|-------|
| Vertical position | `(layerCount − 1 − depth) × LAYER_SPACING`, where `depth = currentGeneration − birthGeneration` | built |
| Visibility | Age above zero, birth generation written, and depth inside the window | built |
| Dissolve | A fade toward `BACKGROUND_COLOR` plus a shrink, both over depth | built |
| Colour | Age along `GRADIENT_STOPS`, curved by `AGE_GRADIENT_CURVE` | built |
| Scale | None — the cube is built at `CELL_SPACING`, so live Cells touch; dead Cells and retired Layers collapse to zero | built |

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

### `src/share.ts`

The URL as a share mechanism (#50), and **the only place the product accepts input from outside itself**.

`patternFromQuery(search, patterns)` resolves a query string to a Pattern or `null`; `urlWithPattern(url,
pattern)` returns that URL with the parameter set or removed. Both are pure string functions, so `main.ts`
keeps only a `history.replaceState` call with no decision in it — the same reasoning that moved
`applyStartRule` into `settings.ts` after #46's QA gate failed on an untestable rule.

**Anything unrecognised returns `null` rather than throwing, and that is a deliberate exception to
`stack.md`'s convention.** Programmer errors are thrown here and there is no graceful screen for a device
without WebGL2, because those are bugs and loud failure is how bugs get fixed. A URL is different in kind:
it arrives already mangled by chat clients, hand edits, and Patterns that existed when a link was shared and
do not now. A shared link that renders a stack trace has destroyed the one moment it existed for. If a
future session sees the `?? null` and reaches for a throw, this is the reason not to.

**Matching is `patterns.find((p) => p.id === requested)`, and the shape matters beyond style.** It compares
a *value*, so attacker-supplied text never becomes a property key — `?pattern=__proto__` is inert. Rewritten
as `patterns[requested]` or a lookup map keyed by id, prototype pollution becomes a live question again. The
security review for #50 assessed this specifically; the linear scan is the safe form and there are seven
Patterns, so there is no performance case for changing it.

**The URL is synced to what actually started, not to what was asked for.** `main.ts` calls `urlWithPattern`
at boot as well as on every Restart, so a link naming a Pattern this build does not have degrades to a
random Run *and* loses the parameter. Without that, the address bar would keep claiming a Pattern the Run is
not using, and a Viewer copying it would pass the broken link on. Unit tests cannot see this — it is a
property of the wiring between two correct functions — and it was found by driving a real browser.

Exposes: `PATTERN_PARAM`, `patternFromQuery`, `urlWithPattern`.

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

Owns the rule: B3/S23, plus the Explosion.

`nextGeneration(current, next, maximumAge, explosion)` reads exclusively from `current` and writes
exclusively to `next`. That separation is what makes every Cell see the same snapshot — computing in place
would let Cells resolved earlier in the pass influence Cells resolved later, which is not Life and produces
plausible-looking wrong output.

**Age alone never kills (#30).** Maximum Age is a trigger and the top of the Colour Gradient, not a
lifespan. `nextAge(age, liveNeighbours, maximumAge)` is plain Conway with one wrinkle — surviving Age is
`Math.min(age + 1, maximumAge)`, so it saturates rather than counting past the cap. There is deliberately no
branch for death by Age, and adding one back is the defect this file is most likely to acquire: the phrase
"maximum age" reads as a lifespan and the code written from that reading is wrong. The clamp is
unconditional because it costs nothing to make it so — with the Explosion on, a capped Cell is rewritten to
1 by its own burst before the clamp could bind; with it off, the clamp is what keeps the Gradient's top end
defined instead of every long-lived Cell sharing the final colour.

**The Explosion (#26) is a second pass, not a branch inside the first.** `explode()` runs after the ordinary
pass has finished and writes Age 1 across the full 3×3 around a Cell that has reached the cap — **its own
position included** — overwriting whatever the ordinary rule decided. Reviving itself is what makes the
burst a reset rather than a death with a flourish: a Cell the ordinary rule would have removed for
underpopulation is brought back by its own detonation, and a cluster at the cap leaves a solid patch of new
colour instead of a hole. Three properties are load-bearing and each has tests:

- **It reads exclusively from `current`**, so nothing chains within a Generation. A position lit by one
  Explosion cannot itself explode until it has aged to the cap again. Running it *after* the ordinary pass
  rather than interleaved is what keeps every Cell on the same snapshot.
- **Only reaching Maximum Age explodes.** Ordinary over- and underpopulation deaths stay silent. This is not
  taste: modelling showed that exploding on every death saturates a 48×48 Grid to 76% live within three
  Generations and holds it there, which collapses the Colour Gradient to one colour and makes the Maximum
  Age slider a no-op. Detonating only at the cap settles at 3–7% live at the default A and 11–21% at A=4,
  measured across three seeds over 600 Generations.
- **`explosion === false` skips the pass entirely** rather than running a quieter version of it. The rule is
  then plain Conway and nothing whatsoever happens at Maximum Age. There is no third state in which a Cell
  dies quietly of Age — see `.zalwa/principles.md` principle 6.

**There is no exception for a neighbour that also reached the cap**, and one must not be re-added. It
existed while the cap still killed, to stop a cluster reviving itself wholesale; now that a capped Cell
revives its own position, such a neighbour lands at 1 through its own burst regardless, so the branch cannot
change an outcome and only reads as though it could.

`reachedMaximumAge(age, maximumAge)` is the trigger, exported so it can be asserted directly. It is the
Explosion's condition and nothing else — a Cell answering true is not removed, it detonates. `>=` rather
than `===` because Maximum Age is Viewer-adjustable and lowering it leaves Cells already past the new value.

The Bounded Edge holds inside the Explosion: every write is gated by `contains()`, so a detonation at the
boundary scatters only inward.

### `src/sim/patterns.ts`

Named starting arrangements as data (#42). No placement policy, no rendering, no knowledge of the control
that offers them — a Pattern is a picture of live Cells and nothing else.

Rows are strings of `#` and `.` rather than coordinate pairs, because the point of a curated Pattern is that
a human recognises it in the source. Ragged rows are allowed: `patternHasCellAt` reads past the end of a
short row as dead, so trailing dots are optional. Adding a Pattern is one entry in `PATTERNS` — the control
reads that array and the Simulation takes whatever it is handed.

**`largestPatternExtent()` is what the Grid floor is set from**, and `patterns.test.ts` asserts
`largest ≤ SETTING_BOUNDS.gridWidth.min`. That is the safeguard: adding a Pattern bigger than the floor
fails the suite rather than reaching a Viewer as a clipped shape. Currently 36 wide (the gun) by 13 tall
(the pulsar) against a floor of 50.

**Each Pattern carries a stable `id`, and it is what the chooser keys on (#49).** Not the array index — an
index resolves to a different Pattern the moment the list is reordered, and does so silently. #50 reads the
same id out of the URL, which is why there must be exactly one naming scheme. `patterns.test.ts` asserts the
ids are unique and match `/^[a-z0-9-]+$/`, since an id becomes a query parameter verbatim.

**A Pattern is verified by its period, not by looking at it (#49).** `pattern-fidelity.test.ts` advances
each oscillator exactly one period and compares against Generation 0, **and separately asserts it does not
return early** — the second half is what stops a still life passing trivially or a shorter-period impostor
passing by coincidence. This is not ceremony: it caught the queen bee shuttle shipping with 23 Cells and no
period at all. A mistranscribed Pattern still renders and still looks like something, so nothing else finds
it. Methuselahs have no period and are pinned instead by exact starting Cell count, by outliving 300
Generations, and by settling — compared two Generations apart, because what they settle into includes
blinkers.

**Published Pattern figures are for an unbounded Grid.** Population counts and lifetimes quoted in the
literature do not transfer: the Bounded Edge trims the sprawl, so an acorn here settles smaller and sooner
than the usual figures suggest. A test asserting a published number will fail for the right reason and look
like the wrong one.

**Two Patterns were considered and deliberately excluded (#49)**, recorded beside `PATTERNS` because that is
where the next person asking "why isn't there a spaceship" will be reading. A lone spaceship leaves the Grid
permanently empty once the Bounded Edge destroys it; Simkin's glider gun is period 120 against a default
Depth Window of 60.

**A reflector block is a catalyst, not a still life** — worth knowing before editing the gun. The queen-bee
shuttle disturbs each block's inner face every cycle and the block reforms, so only the *outer* column of
each is continuously alive. Four Cells age without interruption, not eight, and those four are what reaches
Maximum Age and detonates. The natural description ("stationary blocks whose cells never change state") is
wrong, and #42 shipped with that belief until a test contradicted it.

Exposes: `Pattern`, `PATTERNS`, the seven Pattern constants (`GOSPER_GLIDER_GUN`, `PULSAR`,
`PENTADECATHLON`, `KOKS_GALAXY`, `QUEEN_BEE_SHUTTLE`, `R_PENTOMINO`, `ACORN`), `patternWidth`,
`patternHeight`, `patternHasCellAt`, `largestPatternExtent`.

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

Owns Run state: the current Grid, the generation counter, Maximum Age, the Explosion flag, and the Stack.

Holds two Grids allocated once at construction and swaps them on `advance()` — no allocation per
Generation, because GC pauses read as stutter in a continuously animating product. `restart()` ends the
Run and reseeds randomly from a `RandomSource`, which defaults to `Math.random` and is injectable so tests
get reproducible Runs.

Setting `maximumAge` does **not** reach into the Grid to act on over-age Cells; they are dealt with on the
next `advance()`, where the rule lives. Duplicating the rule in the setter would create two copies that
eventually disagree. Since #26 this also has a visible payoff: lowering the slider past a lot of
established Cells detonates all of them at once on the next Generation, which is the most direct way a
Viewer can make something happen on demand.

Setting `explosion` follows the same discipline (#30) and is tested for it: the switch alone changes nothing
already computed — the Generation counter, every held Layer, and the Grid are untouched — and takes effect
from the next `advance()`. Switching it on does not retroactively detonate the Cells already sitting at the
cap; they detonate at the next Generation.

`restart(pattern?)` takes an optional Pattern (#42). Absent means a random Seed, which is what a fresh page
load and the Random control both do; present means Generation 0 holds that Pattern and nothing else.
`placePattern()` writes it inset one Cell from the **top-left rather than centred** — Gosper's gun emits
south-east, so centring would halve the distance its gliders cover before the Bounded Edge, and that travel
is the reason the Pattern is offered. A Pattern too large for the Grid throws; it is unreachable from the
interface because the Grid floor is set from the largest Pattern shipped, which makes it a programmer error.

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

**Cell size is no longer a number at all (#51).** The cube is built at `CELL_SPACING` and the vertex
shader applies no size factor, so neighbouring live Cells touch. It was a Viewer control from #9 to #51,
defaulting to 0.55 and scaling a unit cube through a `uCellSize` uniform, on the reasoning that near 1 the
Stack fuses into one solid mass and history becomes invisible.

That reasoning assumed a dense Grid and the measured one is not: 3–7% live at the defaults, nearer 2% on a
Pattern run. At that density full size produces chunky connected clusters rather than filled Layers, so
what #51 surrendered was the *porous* reading — seeing the interior through gaps — rather than legibility,
and it bought a row of panel height that #37, #30 and #42 had each fought for. **Full size is the absence
of a factor, not a factor of 1.0**: there is no `CELL_SIZE` constant to find, because the geometry already
spans the lattice spacing. The reasoning for wanting the control back lives in #51 and its history entry.

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

**Boot reads the URL before anything starts (#50).** `patternFromQuery(window.location.search, PATTERNS)`
runs before `applyStartRule` and before the first `startRun`, so a shared Pattern arrives under the same
Explosion rule a dropdown choice gets — one path, not two. A Pattern that behaved differently depending on
how it was chosen would be a defect nobody would think to look for.

**`applyStartRule` is called before `restartRun`, and the ordering is load-bearing (#46).** It writes
`settings.explosion = false` when the Restart carries a Pattern. Both paths then pick it up without extra
work: the changed-dimensions path constructs a new `Simulation` from the already-mutated settings, and the
reseed-in-place path is caught by the settings diff further down the same frame, before any `advance()`. No
Generation is ever computed under the rule the Viewer just left behind. Calling it *after* would break the
first path silently, since the constructor reads settings once.

This is also the only place this module *writes* to the settings object rather than reading and applying it.
Deliberate: the panel holds a reference to the same object and reads it back to redraw, so a copy would
update the Run and leave the interface asserting a rule that is not running.

**Restart is a flag the loop lowers, not a callback the panel invokes.** Every change to Run state then
happens at one known point in the frame, instead of a `Simulation` being swapped part-way through a frame
that still holds a reference to the old one — and a Restart requested while paused behaves like any other,
because the loop runs regardless of Speed.

**Restart takes the cheap path when it can.** Unchanged dimensions reseed inside buffers that are already the
right size (`simulation.restart()` + `view.reset()`, no allocation); only a changed Grid rebuilds. The
`stage` deliberately outlives every Run — the camera is the Viewer's vantage point and starting a new Run
should not throw away where they were standing.

### `src/ui/panel.ts`

Six settings — five sliders and a switch — plus the two ways to start a fresh Run: a Pattern chooser and
the Random button, sharing one row. Since #51 the portrait sheet fits at exactly `contentHeight` 516 of
`visibleHeight` 516, so there is no headroom left: the next control added overflows it again. Mutates plain objects; imports nothing from `sim/` or `render/` **at
runtime**.

That last qualifier is load-bearing since #42. The panel needs to know what a `Pattern` *is* to hand one
back on the Restart request, so it takes a **type-only** import from `sim/patterns` — erased at build — and
receives the actual list through `ControlPanelOptions.patterns` from the composition root. A value import
was written first and would have quietly falsified this module's own docblock; if one appears again, that is
the regression.

**`RestartRequest` carries the Pattern, not the panel.** A Pattern is chosen *for one Restart*: holding it
as panel state would mean pressing Random after picking the gun silently re-seeds the gun. `main.ts` takes
and clears both fields together in the same frame.

**The chooser keys its options by Pattern `id`, not by array index (#49).** An index resolves to a
different Pattern the moment the list is reordered, and does so silently — and it would leave the product
with two ways to name a Pattern, which is what the id exists to prevent. #50 reads the same id from the URL.

**The chooser needs a placeholder it returns to after every choice.** A `<select>` fires no `change` event
when the already-selected option is chosen again, so without one, picking the same Pattern twice would
silently do nothing. The handler also rejects the empty value explicitly, though since #49 that is
belt-and-braces rather than the only defence: matching on id means an empty value matches nothing. Under the
old index lookup it was load-bearing, because `Number("")` is `0` and falling through started a Run with the
first Pattern — reachable by arrow key, and patched in #46. Keying on id removed the hazard by construction
rather than guarding it, which is the better shape of fix when it is available.

Native `<input type="range">` and `<input type="checkbox">` restyled rather than hand-drawn controls:
pointer capture, touch, keyboard, and screen-reader semantics come free, and #11's touch requirement depends
on that half already working. Each control is a `<label>` wrapping its own input, so no generated ids are
needed and the panel is safe to build more than once.

`SETTING_BOUNDS` in `settings.ts` is the single source for every slider's range and step — the panel reads
it, and clamping is applied on every write so a value off the step never reaches the ring arithmetic.

**`CONTROLS` is a discriminated union on `kind` (#30)**, so a boolean setting is offered as a switch and a
bounded one as a slider without a second list to keep in step. The `BooleanSetting` mapped type derives the
switch-able keys from `Settings` itself rather than listing them, so a boolean added or removed there is
reflected here or stops compiling.

**The switch's readout is `aria-hidden`, and that is not decoration.** The `<label>` wraps both the name and
the readout, so anything readable in the readout joins the checkbox's accessible name — which would make it
"Explosion On", a name that changes as the control is used while the checkbox's own checked state already
carries it. Same reasoning as the panel toggle's `aria-label`: state belongs in the state, not in the name.
This shipped as a defect and was caught by the persona gate with typecheck, lint, tests, and the smoke check
all green.

**No divider above the switch.** Maximum age and the Explosion are one mechanism, and a rule between them
would read as two unrelated settings sharing a word. It also buys the height that lets a seventh control fit
a portrait phone.

**The panel is bounded to the viewport height and scrolls inside itself.** It is `position: fixed`, so
anything past the bottom of the viewport is unreachable — there is no page to scroll. With seven controls and
a button it exceeds a short window, and the control that fell off the end was Restart. `pnpm smoke --phone`
now guards this in both orientations; nothing guards it at desktop sizes.

**Hit heights are an interface-wide budget, not a per-control target (#37, #30).** Sliders and the switch
take 32px on a coarse pointer; Restart, the toggle, and the signature take 44px. Both are measured by
`pnpm smoke --phone`. The switch was added at 44px and pushed the portrait sheet 17px past the screen, so it
scrolled — a control technically large and actually harder to reach, which is the #10 failure the check
exists to catch. It takes the slider minimum on the rationale the stylesheet already records: the label
wraps the input, so the hit area is the sheet's full width and height is the least of what makes it
hittable.

The cap is in `dvh` and the panel is `border-box`, and both were bugs. `vh` measures a phone's viewport as
if the browser toolbar were already collapsed, so a bound in `vh` still puts Restart underneath it. And
`max-height` bounds the *content* box by default, so the panel overran its own cap by its padding and
border — about 36px — which is the failure the cap exists to prevent, silently reintroduced by the default
box model. A cap that does not cap is worse than no cap, because it reads as handled.

**Two arrangements, and `panel.css` alone decides which applies (#11).** Below `40rem` wide *or* `30rem`
tall the panel becomes a sheet along the bottom, width-capped, closed until a toggle asks for it; above
that it is the desktop column and the toggle does not exist. `panel.ts` holds one boolean and writes one
`panel--open` class — whether the *absence* of that class means "hidden" or means nothing at all is a
stylesheet decision. That is why a rotation needs no listener and why there is no `matchMedia` in the
interface: putting the breakpoint in both places would mean keeping two definitions in agreement.

Width *or* height, because a phone in landscape is not narrow, it is short — 844 × 320 — and the desktop
column fails there by being taller than the window rather than by being too wide.

**Touch targets are keyed on `pointer: coarse`, never on viewport width.** Different questions, different
answers: a tablet is wide enough for the desktop column and is still operated by thumb, while a narrow
desktop window is small and still has a mouse. Only the *hit* area grows — the visible track stays 2px and
the signature mark stays small, because the problem is where a tap lands, not what the panel looks like.

**There are two floors, not one, and #37 is why.** Restart, the toggle, and each credits link get 44px:
they are tapped once. Sliders get 32px. The 44px floor sits on the links rather than on the credits row,
so both are targets — a row tall enough would say nothing about the octocat, which is the smaller of the
two and the easier to miss, and `pnpm smoke --phone` measures each separately because `.panel__signature`
now matches both. The first version gave everything 44px and the sheet needed 852px of
content in a 664px viewport — six controls plus their separation accounted for 508px of it — so most of
them ended up below the fold and *every* control got harder to reach. A slider is dragged rather than
tapped and spans the panel's full width, so its height is the least of what makes it hittable. The
guideline is about a target, not about a screenful of them.

**The sheet's contents are tuned to fit with ~60px of slack, and the slack is not spare.** Every number was
measured in headless Chromium on Linux; an iPhone resolves the same font stack to `-apple-system`, whose
metrics differ. A layout measured to fit with two pixels to spare fits on the machine it was measured on.
Adding a control means re-measuring — `pnpm smoke --phone` fails when the content stops fitting.

**Nothing about the sheet's appearance is transitioned, and that is load-bearing.** The first version eased
`opacity`, `transform`, and `visibility`, and the sheet never opened. A transition is created when the class
changes but only runs once the compositor assigns it a start time, and this page can leave it pending
indefinitely — a WebGL canvas redrawing every frame under a `backdrop-filter` surface is exactly that load.
Measured after a tap, `getAnimations()` reported all three properties `running` with `startTime: null` and
`currentTime: 0`, so the panel held its *closed* values forever and the tap looked ignored. A stuck
transition always strands the from-value, so no property here is safe to ease: opacity stuck at 0 is an
invisible panel, a stuck translate is a panel overlapping the control that dismisses it. Both were measured,
in that order. Before adding motion back, confirm the transition actually starts on a device under load.

**The sheet is a flex column, so its children need `flex-shrink: 0`.** Content taller than the sheet makes
every child a shrink candidate. Found when a 44px button collapsed to the 16px of its icon — that button has
since been removed, but the rule still guards every remaining child, and landscape still overflows the
sheet, so the condition that triggers it is live.

**Nothing here uses `position: fixed`, and that is the whole of #37.** A fixed element resolves against the
*layout* viewport, which on iOS Safari is the **large** viewport — the page as it would be with the browser
toolbar collapsed. So a control pinned to `bottom` sits behind the toolbar and cannot be pressed. This
shipped: the toggle was unreachable on the first real iPhone it met, while headless Chromium, which has no
toolbar, measured it comfortably on screen.

The panel and toggle instead live in **`.panel-layer`** — fixed, exactly `100dvh` tall, carrying the
`env(safe-area-inset-*)` padding. `dvh` tracks what is actually visible, so `bottom` means the bottom of
what the Viewer can see by construction rather than by arithmetic, and absolutely positioned children
resolve against the padding box, so one declaration keeps both controls clear of the home indicator.
`viewport-fit=cover` in `index.html` is what makes those insets resolve to anything but zero.

**`pointer-events: none` on the layer is load-bearing.** The layer covers the whole viewport; without it
every orbit, pan, and pinch lands on it instead of the camera and navigation silently stops working. The
two controls re-enable pointer events for themselves. The desktop probe asserts the centre of the screen
still hit-tests to the canvas.

Note for anything positioning inside the panel: **`backdrop-filter` makes `.panel` a containing block for
`position: fixed` descendants.** A fixed child does not escape to the viewport, it anchors to the panel.
This cost a confusing debugging round during #32, and it is why the sheet toggle is a *sibling* of the
panel rather than a child — as a child it would travel out of view with the thing it is meant to reveal.

The panel's `id` is per-instance (`structure-controls-1`, `-2`, …). `aria-controls` takes an id and nothing
else, but a fixed one would cost the property that the panel is safe to build more than once — which is
exactly what a DOM test harness does.

### `src/ui/signature.ts`

Both marks in the credits row: the author's mark — a bowler-hatted figure with an apple where the face is
— and GitHub's octocat beside it. Together they are the product's only two outbound links (#32, PRD B13).

**The two marks are held to opposite rules, on purpose.** The figure is drawn from scratch because it is a
*signature* and an original drawing is the point. The octocat is GitHub's own file, taken from Octicons
under its MIT licence, because it is a *signpost* — it has to be recognised instantly by someone who has
never seen this product, and an invented GitHub logo would fail at the only thing it is for. Anyone
tempted to "fix" the inconsistency should read both reasons before touching either.

**Original geometry, and it has to stay that way.** Magritte's *The Son of Man* is under copyright until
2038 and licensed through SABAM/ADAGP. The composition and the joke are not protected; his rendering of
them is. So this is four filled paths and a circle. Replacing it with a trace, a filter, or a
background-removed reproduction would look closer and be infringing. `assets/` is gitignored to keep the
reference painting out of the repo.

**Filled silhouettes, not monoline strokes.** The first version used hairlines to match the panel's rules
and read as an arch over a dot over a bracket at 3rem. Solid shapes survive being shrunk; thin outlines do
not. The lesson worth keeping: a 48px screenshot cannot be used to judge 48px artwork — the mark had to be
blown up to 22rem before the wrong shapes were visible, and every `getBoundingClientRect` assertion passed
against the illegible draft.

Built with `createElementNS`, never `innerHTML`. Nothing here is Viewer-supplied, so this defends against
nothing today — it keeps the one place this codebase writes markup free of an HTML parser, so it cannot
acquire one by someone later interpolating into a template literal.

Geometry lives here; colour lives in `panel.css` via `currentColor` and the `panel__signature-apple` class,
so hover and focus are one CSS property rather than a redraw.

**The link opens in a new tab, and that is a product requirement.** History is a window, not an archive —
navigating away discards the Run and the back button returns a fresh Seed, not the structure the Viewer was
watching. `rel="noopener noreferrer"`: `noopener` is what denies the opened page a handle back into this
one, which `noreferrer` alone does not do.

Exposes: `createSignatureMark`.

## Known risks

- **The instance cap has no number, and the panel now permits four times what has ever shipped.** Defaults
  are 50 × 50 × 60 — 150,000 instances — chosen to look right, not measured. Since #9 the Depth Window
  slider reaches 120; since #10 both Grid dimensions reach 96. A Viewer can therefore ask for
  96 × 96 × 120 = 1,105,920 instances, roughly thirteen million triangles a frame, and the ring is
  *allocated* at the Depth Window ceiling regardless of the current setting. The cost is area, not length:
  96 is nearly four times 50, not twice. #42 raised the floor to 50, so the smallest Run a Viewer can ask
  for is now the default rather than 16 × 16 — the bottom of the range went up, not just the middle. Every instance is transformed each frame whether its Cell is alive or dead,
  and in a typical Run most are dead. There is no server to absorb any of it. `SETTING_BOUNDS` is
  deliberately the single place #12 writes the measured limit for both halves of the product.
- **The Colour Gradient is tuned for a short lifespan and the default lifespan is now 200.** Colour maps
  across a Cell's whole lifetime, so at A=200 the Ages a Run actually spends most of its Cells at occupy
  only the first fraction of the palette and the structure reads near-monochrome. `AGE_GRADIENT_CURVE` is
  not wrong — one fixed curve cannot serve both A=4 and A=200. This works against B11 at the one setting
  every first-time visitor sees, and is the clearest open cost against principle 2. Making the curve adapt
  to A is unmeasured visual tuning with its own issue.
- **The share card ages silently, and nothing checks it.** `public/og-image.png` is a captured frame, so
  any change to colour, fade, or geometry makes it a picture of a product that no longer exists — and the
  only place that shows is somebody else's Slack. `pnpm og-image` recaptures it in one command, but it is
  a command someone has to remember rather than a check that fires. The same gap covers the tags: `vitest`
  runs in `environment: "node"` with no DOM, so a change that drops `og:image` or renames the file ships
  without a failing test. Recapture after anything visual; #25's harness is where a tag check would live.
- **Smoothness has never been observed on a real GPU.** Every render check so far ran against a software
  rasteriser, whose frame timings mean nothing. The design keeps per-frame CPU work constant, but that is
  reasoning, not evidence.
- **The vertex shader is unreachable by tests.** It is the heart of the visual output and no unit test can
  verify it. Mitigations: keep math in TypeScript wherever it can live there, and run `pnpm smoke` after
  touching anything that affects proportions.
- **`@types/three` versions independently of `three`.** Currently aligned at 0.185.1. Upgrade the two
  together and deliberately.
- **The dissolve depends on a flat background.** Fading toward `BACKGROUND_COLOR` keeps Cells opaque and
  correctly depth-sorted, which real transparency across 150,000 unsorted instances would not. A gradient
  or image behind the structure would force that decision to be revisited.
- **Darkening terms compound.** Face shading, the edge rim, and the depth fade all reduce the same pixel.
  Each is defensible alone; together they once turned the middle of the structure to mud. Check the render
  before adding a fourth.
- **A blank frame from a headless run may be the rasteriser, not the product.** During #9 a run that took
  nine full-page screenshots produced rich frames and then blank ones for the rest of the session, which
  read exactly like a rendering bug. It was SwiftShader's GPU process dying under repeated captures — the
  same sequence with four captures reported an empty error log throughout. Check the console error list
  before believing a blank frame.
  Second instance, #32: repeated Playwright **locator** resolution hung for its full timeout even after
  `waitForSelector` on the same selector had already succeeded — reproducibly, three runs in a row.
  Collapsing every read into a single `page.evaluate` fixed it outright. Prefer one `page.evaluate` over a
  sequence of locator calls when scripting this project headlessly.

- **Screen-space effects need checking across the whole camera range.** The edge rim was correct at the
  fixed distance #6 and #8 could reach and wrong once #7 allowed zooming out. Anything using `fwidth` or
  otherwise scaling with apparent size should be looked at from near, default, and far — the smoke script
  defaults to one distance only.
