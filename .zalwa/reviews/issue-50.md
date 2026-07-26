# Persona review — issue #50

**Issue:** feat: a chosen pattern can be shared by URL
**Branch:** `issue-50-share-pattern-by-url`
**Change type:** new feature / behaviour + data model change → all six personas apply.

## What makes this issue different

**It introduces the product's first externally-controlled input.** Every prior security review of this
repository concluded that no attacker-controlled surface existed. That is no longer true: an attacker can
craft a URL and send it to a victim. The review for this branch was framed to assess that from scratch
rather than inherit the previous conclusion.

## Product — B

A link is now worth sending. Until this, someone pasting the URL with "look at this" gave the recipient a
random soup — not the thing being pointed at. Pattern-only keeps the reversal of Out of Scope #5 as small as
it can be: no speed, depth, maximum age, explosion or grid dimensions travel.

The documentation was larger than the code, and only two of the five amendments were in the acceptance
criteria. B1 said the grid seeds randomly on load; B13 argued from the back button giving a fresh random
seed; and the Actors justification asserted outright that nobody chooses what a first-time visitor sees.

## Technical — A

Both halves are pure string functions in `src/share.ts` — parsing a query and building a URL are the whole
of the decision, and `main.ts` keeps only a `history.replaceState` call with no decision in it. That is the
lesson #46 paid for (a rule inside the composition root is unreachable by any test), applied on the first
attempt rather than after a failed gate.

One module, two exported functions, no coupling added. `share.ts` imports only the `Pattern` type.

## QA — A

157 tests, 18 new, including a round-trip property: for every shipped Pattern, what `urlWithPattern` writes,
`patternFromQuery` reads back. Degradation is covered by nine cases — unknown id, empty value, name instead
of id, index instead of id, markup, path traversal, repeated parameter, foreign parameters, no query at all.

**The browser check found a defect the unit tests structurally could not.** A URL naming an unknown Pattern
degraded to a random Run correctly — but kept the parameter in the address bar, so the URL claimed a Pattern
the Run was not using, and a Viewer copying it would have propagated a broken link. The unit tests could not
see this because it is a property of the *boot wiring*, not of either pure function. Boot now syncs the URL
to the Pattern that actually started; re-verified in a real browser.

The harness also produced a false alarm worth recording: reusing one page across navigations let the
previous Run's `requestAnimationFrame` WebGL loop saturate the software rasteriser and starve the next
navigation, which looked exactly like the app hanging on a Pattern URL. Diagnosed by making the Pattern URL
the first and only navigation, which passed cleanly.

## Security — A

Reviewed clean, no findings, against a deliberately re-framed threat model. Three results worth keeping:

- **Prototype pollution was assessed on merits rather than dismissed by category.** The lookup is
  `patterns.find((p) => p.id === requested)`, which iterates and compares a *value* — no property write and
  no lookup keyed by attacker data. `?pattern=__proto__` falls through to `null`. Written as
  `patterns[requested]` or `PATTERN_MAP[requested]` the answer would have been different.
- **`replaceState` cannot navigate.** Its URL argument is `new URL(window.location.href).toString()` with
  one `searchParams` mutation, so it is same-origin by construction.
- **A genuine parser differential exists with no security impact.** `?pattern=acorn&pattern=pulsar` resolves
  to the first while a human skimming reads the last. Nothing downstream consumes the parameter — no
  authentication, no authorization, no cache key, no request — so there is nothing to smuggle past.

## Hacker — A

The honest new capability: an attacker can send a link that forces the recipient's Explosion switch off and
selects one of seven Patterns the product ships. That is the specified behaviour, and the ceiling on it is
that a sender can only point at content that already exists — they cannot compose, alter, or inject
anything. Unrecognised input fails *closed*, toward the less attacker-influenced state.

## UX — B

The address bar tells the truth in every case, including the one that looked least necessary — a link naming
a Pattern this build does not have now has the parameter stripped on arrival rather than left lying.

The remaining cost: a recipient whose shared Pattern did not load is never told. They see a working product
and a random Run, and no indication that the sender meant something else. Silent degradation is the right
default — an error page would waste the moment the link existed for — but "silent" is doing real work there
and nothing softens it.

## Process note

The security subagent ran `git checkout` on the shared working tree, moving it from this branch to `main`
mid-review. No work was lost because everything had been committed first, but an uncommitted change would
have been carried onto `main` or blocked the checkout. Routed to zalwa-feed at step 16 — a read-only
reviewer should not mutate repository state.

## Outcome

All grades C or above. Proceeding to squash-merge.
