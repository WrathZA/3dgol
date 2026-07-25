## Issue #4 — feat: compute generations under the Life rule (DONE, closed)
https://github.com/WrathZA/3dgol/issues/4

Closed: 2026-07-25
Commit: a287af7
Security: clean
Skill-judge: not applicable
PRD sections: The rule, Cell, Grid Configuration, Seed, Simulation

- Made Age the state rather than storing it alongside an alive flag. `ages[i]` is 0 when a Cell is dead
  and its Age when alive, in a single typed array. The alternative permits states that cannot occur —
  alive with no Age, dead carrying an Age — and every future reader would have to know the invariant.
  This makes the invalid states unrepresentable instead of merely avoided.

- Chose `Uint16Array` over `Uint8Array` on the operator's call. `Uint8Array` would have capped Maximum Age
  at 255 and forced a ceiling into the PRD that it does not currently state; `Uint16Array` raises it to
  65535 for two bytes per cell, which is 32 KB at 128x128 and irrelevant at this layer.

- Checked Death by Old Age before neighbour count in the rule, because it applies *regardless* of
  neighbours. A Cell with exactly the right company still dies when its time is up; reversing the order
  would let a well-placed Cell live forever and reintroduce the permanent still lifes the age cap exists
  to prevent.

- Double-buffered with both Grids allocated once at construction. Reading exclusively from one and
  writing exclusively to the other is what makes every Cell see the same snapshot — a single-buffer
  implementation lets Cells computed earlier in the pass influence Cells computed later, which is not
  Life and would silently produce plausible-looking wrong output.

- Made the random source injectable rather than calling `Math.random` directly. The seed-density
  criterion is otherwise only testable by running real randomness and hoping; with injection, a failing
  Run is reproducible.

- Kept the Maximum Age setter from reaching into the Grid to kill over-age Cells. They die on the next
  `advance()`, where the rule lives. Killing them in the setter would put the rule in two places, and the
  two copies would eventually disagree.

- Exported `nextAge` alongside `nextGeneration` so the age-cap behaviour can be asserted directly rather
  than inferred from Grid output. The rule is the one part of this product verifiable without looking at
  anything, and keeping it reachable in isolation is how that stays true.

- Chose known Life patterns for the tests rather than hand-rolled fixtures. A single-buffered
  implementation passes a naive "does the grid change" assertion and fails the blinker and glider
  immediately — golden patterns detect a class of implementation error, not just absent output.

- The suite caught a real bug on its first run, in the test helper rather than the rule: buffer swapping
  meant the second Generation wrote back into the caller's fixture, so earlier assertions silently
  mutated the input for later ones. Fixed by copying the start Grid. The same aliasing exists inside
  `Simulation.advance()`, where it is deliberate and encapsulated.

- All five acceptance criteria met; issue closed.
