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
- **Survival** — a live cell with 2 or 3 live neighbours stays alive, and its age increments, stopping at
  the maximum age **A** rather than counting past it.
- **Death by over/underpopulation** — any other live cell dies.
- **Explosion** — a live cell that reaches **A** detonates at the next generation, scattering life across
  its own position and every one of its eight neighbours inside the grid. All of them become alive at age
  1, whatever the rule above would otherwise have made of them: a dead position is born, a settled cell of
  any age is thrown back to the start of its life, and the detonating cell itself is thrown back with them.

**Age alone never kills.** A is a trigger and the top of the colour gradient, not a lifespan — the only way
a cell is removed is ordinary Conway death by over- or underpopulation. A cell reaching A does not vacate
its position; it starts again, and has to age all the way to A once more before it can detonate again.

The explosion is a deliberate departure from classic Conway, and it exists to keep the structure moving. On
a bounded grid, classic Conway reliably decays into still lifes and blinkers within a few hundred
generations; from that point the structure is unchanging vertical stripes extruding upward forever, which
is visually dead. Making A detonate means no configuration is permanently stable — a still life that
survives A generations blows itself and its neighbourhood back to age 1, re-seeding movement into a region
that had stopped, and the disturbance is the visible event rather than an incidental side effect. A
long-lived pillar does not quietly stop; it detonates, and the region around it starts again. This is also
the mechanism that stops a bounded run from thinning away to nothing over thousands of generations.

Two constraints on the explosion, each of which matters:

- **Only reaching A explodes.** Ordinary over- and underpopulation deaths are silent, as in classic Conway.
  This is not an aesthetic preference but a necessity: exploding on *every* death fills a bounded grid to
  roughly three-quarters within three generations and holds it there permanently, which collapses the
  colour gradient to a single colour, makes A meaningless, and turns the structure into an opaque brick.
  Detonating only at A settles instead at a few per cent live at the default, and around a fifth even when
  A is low enough that nearly everything is detonating at once.
- **The explosion reads only the previous generation**, so nothing chains within a single step. A position
  lit by one explosion cannot itself explode until it has aged all the way to A again.

There is deliberately no exception for a neighbour that has also reached A. One would be unobservable:
since a cell at A revives its own position, such a neighbour lands at age 1 through its own detonation
regardless. A cluster reaching A together therefore resets whole, leaving a solid patch of new colour
rather than a hole.

The bounded edge holds here too: an explosion at the boundary scatters only inward, and no position outside
the grid becomes alive.

**The explosion can be switched off, and doing so removes the mechanism rather than muting it.** With it
off nothing whatsoever happens at A: a cell there simply carries on, and its age saturates so the colour
gradient still has a defined top end. The rule is then plain Conway on a bounded grid. There is
deliberately no third state in which a cell dies quietly of age — that configuration was measured at
0.9–1.4% live by generation 250 against 4–6% with the explosion, which is a slow bleed rather than a rule,
so the cap and the burst are one control rather than two.

The default is on, because off is the state the explosion exists to prevent: within a few hundred
generations the structure stops changing, and a first-time viewer must not land there without having asked
for it.

A is the same number as the top of the colour gradient (see Cell), so a cell's colour is a countdown to its
own detonation: it passes through the full palette as it ages, and blows up as it reaches the end. The
gradient is therefore always fully used, and the Viewer can read at a glance how long a region has left
before it goes.

**A defaults to its own maximum, and that is a deliberate choice against the reasoning above.** A high A
behaves closer to classic Conway, which is the behaviour the explosion was introduced to prevent — so for
the first A generations of a run, nothing explodes and the population decays. At the default, the first
explosion arrives around generation 214, roughly twenty seconds in at the default speed. What that buys is
the sparse and dramatic reading: ages spread right across the palette instead of bunching young, pillars
grow tall enough to be worth losing, and their explosions are events rather than weather. A viewer who
wants immediacy lowers the slider, which is a single movement. This paragraph exists so that a later
session reads the high default as intended rather than as an oversight to correct.

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
- **Maximum age (A)** — how long a cell lives before it detonates, which is also the span of the colour
  gradient.
- **Explosion** — whether reaching A detonates at all. Off, nothing happens at A and the rule is plain
  Conway; the age still governs colour. Defaults on.
- **Cell size** — how large each cell is drawn, and therefore whether layers read as porous scatters or
  solid sheets.

Chosen per run, applied immediately by starting one:

- **Starting pattern** — which named arrangement generation 0 holds, or a random seed. Selecting one starts
  a fresh run; it does not alter the run in progress.

Applied on restart:

- **Grid dimensions** — the width and height of the 2D simulation grid.

### Navigation

The viewer is not locked to a fixed camera. They can fly around the structure freely while it is building —
orbiting it, viewing it from above, below, or side-on — and zoom in and out to move between the whole
silhouette and individual cells.

### Author credit

The product is signed. A small mark sits at the bottom of the controls and links to the author's GitHub
profile — **the only outbound link in the product**, and the only place its author is present.

The mark is a bowler-hatted figure with an apple where the face is: an original drawing of the idea behind
Magritte's *The Son of Man*, not a reproduction of the painting. The painting is under copyright until 2038.
The joke and the composition are not protected; his rendering of them is. Any future version of the mark is
held to the same line — no trace, no filter, no background-removed reproduction, however much closer it
would look.

It opens in a new tab, and that is not a detail. History is a window rather than an archive: navigating away
discards the run, and a Viewer returning by the back button gets a new random seed rather than the structure
they were looking at. A link that quietly destroys what the Viewer came to see would be a defect.

This is a signature, not a role. Nobody gains an ability the Viewer does not already have, and the Actors
section below remains a list of one.

## Actors

### Viewer

Anyone who loads the public URL. No account, no identity, no persisted profile — every visitor is a Viewer
and every Viewer can do everything the product offers.

Responsibilities:
- Watches the structure build.
- Controls simulation speed, including pausing and resuming.
- Sets the depth window (N layers) and the maximum cell age (A).
- Switches the explosion on and off, which is also what decides whether anything happens at A at all.
- Sets how large cells are drawn.
- Sets the grid dimensions, which apply on the next restart.
- Moves the camera — orbits, pans, and zooms around the structure while it builds, by pointer or by touch.
- Starts a fresh run, either from a new random seed or from a pattern chosen from a fixed list.

**This list of one is intentional, not an omission.** There is no author, curator, admin, or publisher role
in v1. The opening state is a randomly seeded grid, not a hand-picked arrangement, so nobody occupies the
role of "person who chose what you see first" — randomness does. That still holds now that patterns exist,
because a fresh page load ignores them: a visitor arriving for the first time sees a random seed, and only
their own subsequent choice changes that.

The pattern list narrows the claim rather than breaking it. What would introduce an authoring role is
*composing* a pattern — deciding what someone else's run contains — and that stays out of scope, along with
drawing cells. Picking from a fixed list the product ships is a choice about what you yourself watch next,
which every other control already is. The list is content, not a role.

## Domain Objects

Described in tech-agnostic terms. No storage, transport, or rendering representation is implied.

### Cell

One position within a single generation of the grid.

| Field | Meaning |
|-------|---------|
| `column`, `row` | Position within the grid |
| `alive` | Whether the cell is alive in this generation |
| `age` | Number of consecutive generations this cell has been alive, stopping at the maximum age A rather than counting past it. Set to 1 on birth, incremented each generation it survives, discarded on death. A cell that dies and is later reborn starts again at 1, and so does one that detonates. |

`age` drives colour: cells are rendered along a colour gradient keyed to age, so a freshly born cell reads
differently from a long-stable one.

Age is bounded by the **maximum age A** — the explosion threshold from the rule above. With the explosion
on, a cell reaching A is thrown back to 1 by its own detonation, so age never exceeds A. With it off
nothing happens at A and the cell carries on, so age **saturates** there instead: it stops climbing and the
cell holds at the end of the palette.

Saturation is why `age` is not strictly "consecutive generations alive" — a cell held at A has survived
longer than its age says. That is deliberate, and the honest reason is that it keeps the quantity bounded
and its meaning defined, not that it improves the picture. With the explosion off, long-lived cells
accumulate on the final colour and a settled structure trends toward one hue — the same complaint the
gradient already attracts at a high A, and the cost of choosing to switch the mechanism off.

A cell traverses the full palette exactly once and detonates as it arrives at the final colour, so colour
and lifespan are the same quantity expressed two ways, which is why they are deliberately not independent
settings. A is Viewer-adjustable — a low A produces constant churn punctuated by frequent explosions, a
high A behaves closer to classic Conway for long stretches and then detonates rarely and conspicuously.

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

Bounded edges alone would let a run decay into permanent still lifes; the explosion (see The rule) is what
prevents that, so the two choices work together — the boundary contains the structure, the explosion keeps
it alive inside that boundary. Switching the explosion off is precisely what surrenders that, which is why
it is not the default.

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
| `maxAge` | A — the age at which a live cell detonates, and the top of the colour gradient. Viewer-adjustable. |
| `explosion` | Whether reaching A detonates at all. Off, the rule is plain Conway and A governs colour alone. Viewer-adjustable, and applied to the run in progress. |
| `running` | Whether generations are currently advancing |

### Seed

The initial state a run begins from — either a random scatter or a named pattern.

| Field | Meaning |
|-------|---------|
| `density` | Proportion of grid positions alive at generation 0, when the seed is random |
| `pattern` | The named arrangement generation 0 holds instead, when one was chosen |

A fresh page load always seeds randomly at a fixed default density, and so does the Random control.
Choosing a pattern seeds from that pattern instead. Either way seeding happens as part of a restart (B8).

The Viewer chooses *when* a new seed is generated and *which of a fixed list* it comes from — never what a
pattern contains. Patterns cannot be composed, edited, or drawn cell by cell (see Out of Scope), which is
the line that keeps a pattern picker from being an authoring tool.

### Pattern

A named arrangement of live cells the product ships, offered as a starting point.

| Field | Meaning |
|-------|---------|
| `name` | What the Viewer sees in the control |
| `cells` | The live positions the pattern draws, at age 1 |

Patterns are fixed content, not Viewer data: the list is the same for everyone and cannot be added to from
inside the product. A pattern is placed toward one corner rather than centred, because what a pattern
*emits* needs somewhere to travel before the bounded edge destroys it — and for a glider gun that travel is
the entire point.

Grid dimensions have a floor high enough to hold every pattern shipped, so no pattern can ever be clipped
and no selection has to be refused.

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

- #29 feat: the run starts at 10 generations per second

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

The Viewer lowers A → live cells detonate sooner, visibly increasing churn, and the colour gradient
compresses so cells traverse the full palette in fewer generations. The Viewer raises A → cells persist
longer, regions stay stable for longer stretches, and the palette is traversed more slowly. Cells already
older than a newly lowered A detonate at the next generation.

Lowering A far enough to catch a lot of established cells therefore produces a wave of explosions — the
structure flares as everything past the new threshold detonates at once. That is left in rather than
suppressed: it is the most direct way a Viewer can make something happen on demand.

With the explosion switched off, A moves the palette and nothing else: cells neither detonate nor die at
it, so lowering A recolours the structure without disturbing it, and cells already past the new value are
pulled back to its final colour rather than flaring.

### B6 — Set cell size

The Viewer increases cell size → cells grow until neighbouring live cells touch and layers read as solid
sheets. Decreases it → gaps open between cells, layers read as scattered points, and the interior of the
structure becomes visible through the gaps. The camera does not move.

### B7 — Set grid dimensions

- #31 feat: the grid reaches 128 cells on each side

The Viewer changes width or height → the change is accepted but does not alter the current run, and the
interface indicates the new dimensions apply on restart. On restart (B8), the new run uses them.

### B8 — Start a fresh run

The Viewer presses **Random** → the stack clears, the generation counter returns to 0, the grid reseeds
randomly, and layers begin accumulating again from an empty space using the currently configured
dimensions.

The Viewer chooses a **pattern** → exactly the same thing happens, except that generation 0 holds that
pattern and nothing else. Choosing the same pattern a second time starts it again rather than doing
nothing, so a pattern can be watched from the beginning as often as the Viewer likes.

Both paths are restarts in every sense that matters: staged grid dimensions apply, the stack empties, and
the counter returns to 0. Only the contents of generation 0 differ. The behaviour is named for starting a
run rather than for restarting one, because a pattern selection is not a repeat of anything.

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

### B12 — Cells detonate at maximum age

A live cell that reaches age A detonates at the next generation. The Viewer observes that no region of the
structure remains unchanged indefinitely: a column of stable cells is interrupted once its cells reach A,
and the disturbance re-seeds movement into that region.

The disturbance is visible rather than inferred. Where the column was, the whole neighbourhood lights up at
the start of the gradient — the Viewer sees a burst of newborn colour, and can watch movement resume in a
region that had been still. A cluster reaching A together resets whole, leaving a solid patch of new colour
rather than a hole, because a detonating cell throws its own position back to the start of its life along
with its neighbours'.

An ordinary death looks nothing like this. Cells dying of over- or underpopulation simply stop, so the
Viewer can tell a death from a detonation by watching: one is a disappearance, the other is a burst.

At the default A the first burst is some way into a run — the Viewer watching from the start sees the
structure build and thin for a while before anything detonates. Lowering A brings the bursts forward and
makes them frequent.

### B12a — Switch the explosion off

The Viewer switches the explosion off → nothing happens at A any more. Cells that reach it carry on rather
than detonating, and the run becomes plain Conway on a bounded grid: within a few hundred generations it
settles into still lifes and blinkers, and the structure above them is unchanging vertical stripes. Long-
lived cells hold at the final colour of the gradient rather than passing beyond it.

The Viewer switches it back on → the cells sitting at A detonate at the next generation, so a structure
that had stopped bursts back into movement. Neither switch clears the stack, reseeds, or disturbs the
history already built; the change lands on the next generation and the structure carries on from where it
was.

This is the one control that changes which rule is running rather than a quantity within it, which is why
it is a switch rather than a slider, and why it defaults on.

### B13 — Find who made it

At the bottom of the controls the Viewer sees a small bowler-hatted figure with an apple for a face.
Activating it — by pointer or by touch — opens the author's GitHub profile in a new tab, and the run
carries on undisturbed in the tab behind it.

The mark is dim at rest and brightens on hover and on keyboard focus, so it is findable without competing
with the structure. It is reachable by keyboard, and a screen reader announces where it goes rather than
merely that there is a link.

This is the only way out of the product. Everything else the Viewer can do keeps them inside it.

## Out of Scope (v1)

The following are deliberately not built in v1.

1. **Editable rule sets.** The birth/survival rule is fixed at B3/S23. The Viewer adjusts the maximum age A
   and switches the explosion on or off, but cannot enter arbitrary rules (B/S notation,
   Generations-family rules, or custom neighbourhoods), and cannot change what the explosion reaches or
   what it leaves behind.

2. **A true 3-dimensional cellular automaton.** No 26-neighbour lattice, no 3D rules such as 5766. This is
   a permanent non-goal, not a deferral — the third axis is time, and making it space would delete the
   product's premise.

3. **Composing or editing a pattern.** The Viewer picks from a fixed list the product ships and cannot add
   to it, alter an entry, or place cells to build one. The list itself is no longer excluded — it was
   marked "deferred rather than rejected" and has since been built — but the *authoring* half stays out,
   and that is what keeps the Actors list at one. Nobody gains the ability to decide what anyone else sees.

4. **Drawing or editing cells.** The Viewer cannot place, erase, or paint cells. The starting state can be
   influenced only by choosing which run to start — a fresh random seed, or one of the patterns the product
   ships — never by composing or altering what a pattern contains.

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

- **Default grid dimensions** — 50 × 50. The Viewer can raise them, but not lower them: this is also the
  floor, because the grid has to hold the largest pattern shipped and Gosper's glider gun is 36 × 9. It
  suits the default depth window as well as the pattern list — a glider gets about fourteen columns of
  diagonal travel before the bounded edge, roughly 56 generations, so its streak very nearly spans the 60
  layers on screen rather than stopping part-way up.
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
