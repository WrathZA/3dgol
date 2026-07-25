# 3D Game of Life — Product Requirements

## Problem

Conway's Game of Life is visually striking, but every common implementation renders it as a flat grid
showing exactly one generation at a time. The previous generation is overwritten and discarded the
moment the next is computed. History exists only in the viewer's short-term memory.

This throws away the most beautiful property of the simulation: the shapes that patterns carve *through
time*. A glider is not really a small cluster of cells — it is a diagonal streak. An oscillator is a
vertical column with a repeating cross-section. A stable cluster is a solid pillar. A chaotic soup is a
turbulent mass threaded through with those forms. None of these structures are visible in a 2D renderer,
because the axis they exist along is never drawn.

The pain is aesthetic, and it is the author's own: the author wants to *see* those structures, and no
existing 2D Game of Life viewer shows them. The product is published publicly so that a visitor with no
prior interest in cellular automata can load a URL and see the same thing — the beauty has to survive
first contact, without explanation.

Concretely, a person watching a 2D Game of Life today cannot:
- see the trajectory a pattern traced to reach its current state
- distinguish an oscillator from a still life without watching and remembering several frames
- perceive the overall shape of a pattern's lifetime as a single object they can look at

## Solution and Scope

A browser-based viewer that runs a 2-dimensional Game of Life and renders its history as a 3-dimensional
structure. The third axis is **time, not space**: each computed generation is laid down as a horizontal
layer, and successive generations stack upward. The viewer flies around the accumulated structure while
it builds.

### The rule

Standard Conway (B3/S23) on a flat grid, plus one addition:

- **Birth** — a dead cell with exactly 3 live neighbours becomes alive, at age 1.
- **Survival** — a live cell with 2 or 3 live neighbours stays alive, and its age increments.
- **Death by over/underpopulation** — any other live cell dies.
- **Death by old age** — a live cell that reaches the maximum age **A** dies at the next generation,
  regardless of its neighbour count.

Death by old age is a deliberate departure from classic Conway, and it exists to keep the structure
moving. On a bounded grid, classic Conway reliably decays into still lifes and blinkers within a few
hundred generations; from that point the structure is unchanging vertical stripes extruding upward
forever, which is visually dead. Capping cell age means no configuration is permanently stable — a still
life that survives A generations dies, disturbing its neighbourhood and re-seeding movement into a region
that had stopped.

A is the same number as the top of the colour gradient (see Cell), so a cell's colour is a countdown to
its own death: it passes through the full palette as it ages, and dies as it reaches the end. The gradient
is therefore always fully used, and the Viewer can read a region's remaining lifespan at a glance.

This is explicitly *not* a 3-dimensional cellular automaton. Cells do not have 26 neighbours and there is
no 3D life rule (e.g. 5766). Neighbour counting happens within a single 2D layer. The decision is
deliberate: a true 3D automaton has no history to stack, which discards the entire premise of the product.

### Depth window

History is bounded by a **fixed depth window** of N layers, where N is Viewer-configurable at runtime.

- New generations are added at the top of the stack.
- Once the stack reaches N layers, the oldest layer at the bottom is retired as each new layer arrives, so
  the structure holds a constant height and appears to extrude upward continuously.
- Retirement is a **fade**, not an instant removal — the oldest layers visibly diminish before they leave,
  so the bottom of the structure dissolves rather than popping.

The steady state is a structure of constant height, growing at the top and dissolving at the bottom — a
window sliding along the time axis. This keeps the render legible (deep stacks occlude themselves into an
opaque brick) and bounds the amount of history held at any moment.

### Configurable by the Viewer

Applied immediately, without disturbing the run in progress:

- **Speed** — how fast generations advance, including pausing entirely.
- **Depth (N)** — how many generations of history are visible at once.
- **Maximum age (A)** — how long a cell can live before dying of old age, which is also the span of the
  colour gradient.
- **Cell size** — how large each cell is drawn, and therefore whether layers read as porous scatters or
  solid sheets.

Applied on restart:

- **Grid dimensions** — the width and height of the 2D simulation grid.

### Navigation

The viewer is not locked to a fixed camera. They can fly around the structure freely while it is building —
orbiting it, viewing it from above, below, or side-on — and zoom in and out to move between the whole
silhouette and individual cells.

## Actors

### Viewer

Anyone who loads the public URL. No account, no identity, no persisted profile — every visitor is a Viewer
and every Viewer can do everything the product offers.

Responsibilities:
- Watches the structure build.
- Controls simulation speed, including pausing and resuming.
- Sets the depth window (N layers) and the maximum cell age (A).
- Sets how large cells are drawn.
- Sets the grid dimensions, which apply on the next restart.
- Moves the camera — orbits, pans, and zooms around the structure while it builds, by pointer or by touch.
- Restarts the run, which reseeds the grid randomly.

**This list of one is intentional, not an omission.** There is no author, curator, admin, or publisher role
in v1. The opening state is a randomly seeded grid, not a hand-picked arrangement, so nobody occupies the
role of "person who chose what you see first" — randomness does. A curated pattern list would introduce a
distinct authoring role and is deferred (see Out of Scope).

## Domain Objects

Described in tech-agnostic terms. No storage, transport, or rendering representation is implied.

### Cell

One position within a single generation of the grid.

| Field | Meaning |
|-------|---------|
| `column`, `row` | Position within the grid |
| `alive` | Whether the cell is alive in this generation |
| `age` | Number of consecutive generations this cell has been alive. Set to 1 on birth, incremented each generation it survives, discarded on death. A cell that dies and is later reborn starts again at 1. |

`age` drives colour: cells are rendered along a colour gradient keyed to age, so a freshly born cell reads
differently from a long-stable one.

Age is bounded by the **maximum age A** — the death-by-old-age threshold from the rule above. A cell
reaching A dies, so age never exceeds it. A is also the top of the colour gradient: a cell traverses the
full palette exactly once over its lifetime and dies as it arrives at the final colour. Colour and
lifespan are the same quantity expressed two ways, which is why they are deliberately not independent
settings. A is Viewer-adjustable — a low A produces constant churn, a high A behaves closer to classic
Conway.

### Layer

One computed generation, frozen at the moment it was computed. Layers are immutable once created.

| Field | Meaning |
|-------|---------|
| `generation` | The generation number this layer represents |
| `cells` | The live cells of that generation, each with its age at that moment |
| `depth` | Position in the stack — 0 is the newest layer at the top, increasing downward |

A layer's `depth` determines its opacity: layers fade progressively as they descend, so the bottom of the
structure dissolves rather than terminating in a hard edge.

### Stack

The ordered collection of layers currently visible — the bounded window of history.

| Field | Meaning |
|-------|---------|
| `layers` | Ordered newest-to-oldest |
| `maxDepth` | N — the configured number of layers retained. Viewer-adjustable. |

When a new layer is added and `layers` already holds `maxDepth` entries, the oldest is retired. The stack
therefore holds a constant height once filled.

### Grid Configuration

| Field | Meaning |
|-------|---------|
| `width`, `height` | Dimensions of the 2D simulation grid. Viewer-adjustable, but locked while a run is in progress — see below. |
| `edgeBehaviour` | **Bounded.** Positions outside the grid are permanently dead and never become alive. The grid does not wrap. |

The bounded edge is a deliberate choice over a wrapping torus. Patterns reaching the boundary are
destroyed rather than re-entering the opposite side, so the structure has a defined silhouette and a
finite footprint the Viewer can orbit, rather than motion sliding endlessly around a seam.

Bounded edges alone would let a run decay into permanent still lifes; death by old age (see The rule) is
what prevents that, so the two choices work together — the boundary contains the structure, the age cap
keeps it alive inside that boundary.

**Dimension changes take effect only on restart.** A new width or height is accepted and held, but the run
in progress continues at its existing size until the Viewer restarts. A layer computed at one grid size
cannot coherently stack on layers computed at another, so resizing mid-run would either corrupt the
structure or silently discard it.

### Simulation

The live running state, distinct from the frozen history in the stack.

| Field | Meaning |
|-------|---------|
| `currentGeneration` | Generation counter for the run |
| `cells` | The current live grid, with each live cell's age |
| `speed` | Generations advanced per unit of time. Viewer-adjustable. |
| `maxAge` | A — the age at which a live cell dies of old age, and the top of the colour gradient. Viewer-adjustable. |
| `running` | Whether generations are currently advancing |

### Seed

The initial state a run begins from.

| Field | Meaning |
|-------|---------|
| `density` | Proportion of grid positions alive at generation 0 |

v1 seeds randomly at a fixed default density. Reseeding happens as part of a restart (B8) — the Viewer
chooses *when* a new seed is generated, never *what* it contains. There is no pattern picker and no cell
drawing in v1 (see Out of Scope).

### Display Configuration

How the structure is drawn, independent of where it is viewed from.

| Field | Meaning |
|-------|---------|
| `cellSize` | How large each cell is drawn. Small values leave gaps between cells, so layers read as scattered points and the structure is seen through; large values make neighbouring cells touch, so layers read as solid sheets and the structure becomes a massed volume. Viewer-adjustable. |

Cell size is distinct from camera zoom. Zoom changes how close the Viewer is to the structure; cell size
changes what the structure is made of. Both can change apparent scale, but only cell size changes whether
the structure is porous or solid.

### Camera

The Viewer's vantage point on the structure.

| Field | Meaning |
|-------|---------|
| `position` | Where the Viewer is looking from |
| `target` | The point being looked at — the structure's centre by default |
| `zoom` | Distance from the target, ranging from the whole silhouette to individual cells |

## Behaviours

Each behaviour is stated so it can be verified by performing it and observing the result.

### B1 — Open the viewer

The Viewer loads the public URL. The grid seeds randomly, the simulation begins advancing, and layers
begin accumulating upward. No configuration, dismissal, or interaction is required first — the structure
is already building when the page settles.

### B2 — Control speed

The Viewer raises the speed → generations visibly advance more frequently and the structure grows upward
faster. Lowers it → generations advance less frequently and growth slows. The change takes effect on the
current run without clearing the stack.

### B3 — Pause and resume

The Viewer pauses → no new layers are added and the structure holds its current state indefinitely. The
camera still moves freely while paused. The Viewer resumes → generations continue from the generation
where they stopped, with no discontinuity in the structure.

### B4 — Set the depth window (N)

The Viewer raises N → the structure grows taller as new layers accumulate, until it holds N layers, then
holds that height. The Viewer lowers N → the structure trims from the bottom to the new height, and the
removed layers fade out rather than vanishing instantly. The current run continues throughout; changing N
does not reseed.

### B5 — Set the maximum age (A)

The Viewer lowers A → live cells die sooner, visibly increasing churn, and the colour gradient compresses
so cells traverse the full palette in fewer generations. The Viewer raises A → cells persist longer,
regions stay stable for longer stretches, and the palette is traversed more slowly. Cells already older
than a newly lowered A die at the next generation.

### B6 — Set cell size

The Viewer increases cell size → cells grow until neighbouring live cells touch and layers read as solid
sheets. Decreases it → gaps open between cells, layers read as scattered points, and the interior of the
structure becomes visible through the gaps. The camera does not move.

### B7 — Set grid dimensions

The Viewer changes width or height → the change is accepted but does not alter the current run, and the
interface indicates the new dimensions apply on restart. On restart (B8), the new run uses them.

### B8 — Restart the run

The Viewer restarts → the stack clears, the generation counter returns to 0, the grid reseeds randomly,
and layers begin accumulating again from an empty space using the currently configured dimensions.

### B9 — Navigate the structure

The Viewer orbits, pans, and zooms → the vantage point moves around the structure, which can be viewed
from above, below, and side-on. The simulation continues advancing while the camera moves; navigating
never pauses or disturbs the run.

Navigation works on both pointer and touch input. On a phone or tablet, the Viewer performs the same three
movements — orbit, pan, zoom — through touch gestures, and reaches every vantage point available on
desktop. The control scheme differs by necessity; the reachable views do not.

### B10 — History retires from the bottom

Once the stack holds N layers, each newly added layer at the top retires the oldest layer at the bottom.
Retiring layers fade progressively as they descend, so the bottom of the structure dissolves rather than
ending in a hard edge or disappearing abruptly. The structure's height stays constant.

### B11 — Colour reads as age

At any moment, cells of different ages are visibly different colours along the gradient, and a cell's
colour advances through the palette as it survives successive generations. A newly born cell in a
long-stable region is immediately distinguishable from its neighbours.

### B12 — Cells die of old age

A live cell that reaches age A dies at the next generation regardless of its neighbour count. The Viewer
observes that no region of the structure remains unchanged indefinitely: a column of stable cells
terminates once its cells reach A, and the disturbance re-seeds movement into that region.

## Out of Scope (v1)

The following are deliberately not built in v1.

1. **Editable rule sets.** The birth/survival rule is fixed at B3/S23. The Viewer adjusts the maximum age
   A, but cannot enter arbitrary rules (B/S notation, Generations-family rules, or custom neighbourhoods).

2. **A true 3-dimensional cellular automaton.** No 26-neighbour lattice, no 3D rules such as 5766. This is
   a permanent non-goal, not a deferral — the third axis is time, and making it space would delete the
   product's premise.

3. **Curated pattern library.** No list of named starting patterns (glider gun, pulsar, and so on). Runs
   always begin from a random seed. **Deferred rather than rejected** — a curated list is of interest for
   a later version, and would introduce an authoring role that v1 has no actor for.

4. **Drawing or editing cells.** The Viewer cannot place, erase, or paint cells. The only way to influence
   the starting state is to restart and get a different random seed.

5. **Sharing and persistence.** No permalinks that encode a configuration, no saved runs, no accounts, no
   server-side state of any kind. Settings do not survive a page reload.

6. **Export.** No screenshot, video, or GIF capture from within the product.

7. **Timeline scrubbing.** History is a live window that flows past and is discarded. The Viewer cannot
   rewind through retired layers, replay a run, or seek to an earlier generation. This is the most
   expensive exclusion on the list and the most deliberate: scrubbing would require retaining all history
   rather than discarding it past N, which contradicts the fixed depth window that the whole design rests
   on.

### Defaults tuned during implementation

Some values are fixed defaults in v1 rather than product decisions, and their exact numbers are settled by
experiment rather than specified here:

- **Default grid dimensions** — the Viewer can change them; the starting value is chosen by what looks
  best at typical viewing distance.
- **Seed density** — the proportion of cells alive at generation 0. Not a Viewer control in v1; the value
  is tuned so a fresh run reliably produces interesting movement rather than dying out or overcrowding.

## Constraints

- **Runs in the browser as a public website.** Anyone can load the URL and see the product with no
  sign-up, install, or explanation.
- **Must work on mobile as well as desktop.** Phones and tablets are supported viewers, not a degraded
  fallback. This constrains achievable grid sizes and depth on lower-powered devices, and requires touch
  navigation as a first-class control scheme (see B9).
- **TypeScript is preferred** by the author. Recorded as a stated preference for the tech phase to work
  within.
- **The rendering approach is deliberately undecided in this document.** How the structure is drawn is a
  technology question, answered in `.zalwa/stack.md`, not here. Choosing a renderer before the product is
  understood constrains the product to what that renderer makes easy.
