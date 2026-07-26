## Issue #26 — feat: a cell dying of old age explodes into its neighbours (DONE, closed)
https://github.com/WrathZA/3dgol/issues/26

Closed: 2026-07-26
Commit: 43a8e74
Security: clean
Skill-judge: not applicable
PRD sections: The rule, B5, B12, Cell, Out of Scope #1

- **Measured the literal request before implementing it, and it would have destroyed the product.** The ask
  was "when a cell dies, it should explode and make all its neighbours a 1". A throwaway model faithfully
  reimplementing `rules.ts` showed that exploding on *every* death saturates a 48×48 grid to 76.3% live
  within three generations and holds it there permanently, with 99.9% of cells at age 1. That collapses the
  colour gradient to one colour, makes the maximum-age slider a no-op, and leaves an opaque brick. The
  operator chose the old-age-only variant on that evidence. The general lesson: for a rule change whose
  consequence is a population dynamic, a ten-minute model is cheaper and far more convincing than an
  argument, and the model belongs in `.zalwa/tmp/` and is thrown away afterwards.

- **Only Death by Old Age explodes; ordinary Conway death stays silent.** This is not an aesthetic
  preference but the constraint that makes the feature viable at all, per the measurement above. It also
  gives the viewer something the PRD previously only asserted: two deaths that *look* different — one a
  disappearance, one a burst — so the distinction is observable rather than documented.

- **A neighbour that also reached the cap is not revived.** The issue did not say what happens when two
  adjacent cells hit A together; each is the other's neighbour, so the literal reading has them resurrect
  each other. Put to the operator, who chose "the dead stay dead". Without this a cluster resets itself
  wholesale and the age cap stops breaking up exactly the configurations it exists to disturb. The visible
  consequence is that a cluster leaves a hole ringed by young colour, which also happens to be what an
  explosion looks like.

- **Implemented as a second pass reading only the previous generation.** Not a branch inside the ordinary
  pass. Reading exclusively from `current` is what prevents chaining within a single step — a position lit by
  one explosion cannot itself explode until it has aged to the cap again — and running after the ordinary
  pass completes means every cell sees the same snapshot rather than a half-updated grid. Neighbours are
  overwritten rather than merged, which is how an explosion beats whatever the ordinary rule decided.

- **Extracted `diesOfOldAge` so both passes share one trigger.** Two separate copies of `age >= maximumAge`
  drifting apart would produce cells that die without exploding, or explode without dying, and that failure
  traces back terribly. `>=` rather than `===` because maximum age is viewer-adjustable and lowering it
  leaves cells already past the new value.

- **Maximum age defaults to 200, its own ceiling — deliberately against the PRD's own anti-stasis
  reasoning.** A high A behaves closer to classic Conway, which is the behaviour the age cap exists to
  prevent; the first explosion lands around generation 214, roughly half a minute in. The operator was shown
  that tension explicitly and reaffirmed 200. What it buys is the sparse, dramatic reading: ages spread
  across the palette, pillars grow tall enough to be worth losing, explosions are events rather than
  weather. Recorded in `prd.md` and in a comment on `SETTING_BOUNDS.maximumAge` specifically so a later
  session reads it as intent rather than an oversight to correct.

- **The default now renders near-monochrome, and that was reported rather than hidden.** Colour maps across
  the whole lifespan, so at A=200 the ages a run actually spends most of its cells at occupy only the first
  fraction of the gradient. It works against B11 at the one setting every first-time visitor sees.
  `AGE_GRADIENT_CURVE` is not wrong — a single fixed curve cannot serve both A=4 and A=200 — so fixing it is
  unmeasured visual tuning, deferred to its own issue and carried honestly in the persona grades (Product C,
  UX C) rather than graded as if the default looked right.

- **An existing test had to be rewritten, which deserves suspicion and survived it.** `"destroys a block once
  its cells reach maximum age"` expected zero alive and now gets twelve, because the old expectation encoded
  the old rule. The replacement asserts the block's own four positions are dead *and* that a shell remains —
  strictly more specific than what it replaced, which is the direction that makes rewriting acceptable.

- Two consequences accepted rather than solved: a brief first visit sees no explosion at all, and a cell can
  live 200 generations while the depth window holds at most 120 layers, so a pillar can detonate without its
  birth ever having been on screen.

- All acceptance criteria met; 99 tests pass; issue closed.
