## Issue #50 — feat: a chosen pattern can be shared by URL (DONE, closed)
https://github.com/WrathZA/3dgol/issues/50

Closed: 2026-07-26
Commit: 465edf0
Security: clean
Skill-judge: not applicable
PRD sections: B1, B8, B13, Actors, Out of Scope #5

- **This is the product's first externally-controlled input, and that fact had to be stated to be
  assessed.** Every prior security review concluded "no attacker-controlled surface exists" — true then,
  false now. The review for this branch was briefed explicitly not to inherit that conclusion. The reusable
  point is that a security review is only as good as the threat model it is handed: a reviewer told "this
  product has no inputs" will confirm it, because the sentence is a premise rather than a finding.

- **Prototype pollution was the one finding that could have been real, and the code shape is why it is
  not.** The lookup is `patterns.find((p) => p.id === requested)` — it iterates and compares a *value*, so
  attacker data never becomes a property key. Written as `patterns[requested]` or `PATTERN_MAP[requested]`,
  `?pattern=__proto__` would have been a live question. The `find` form was chosen for the stable-id
  requirement rather than for safety, and got safety as a consequence; worth recording because the next
  person optimising a linear scan into a map lookup would be re-introducing the question without noticing.

- **The browser check found a defect that unit tests structurally could not.** A URL naming an unknown
  Pattern degraded to a random Run correctly, but *kept the parameter in the address bar* — so the URL
  claimed a Pattern the Run was not using, and copying it would propagate a broken link. Neither pure
  function was wrong; the defect lived in the boot wiring between them. The general form: a property that
  spans two correct components is invisible to tests of either. It cost one throwaway Playwright script.

- **That same script produced a false alarm, and diagnosing it mattered more than the check itself.**
  Reusing one page across navigations let the previous Run's `requestAnimationFrame` WebGL loop saturate the
  software rasteriser and starve the next navigation, which presented as `page.goto` timing out on
  `?pattern=pulsar` — indistinguishable from the app hanging on a Pattern URL. Making the Pattern URL the
  first and only navigation passed cleanly and isolated the harness as the fault. **A failing check against
  a new feature is not evidence the feature is broken**, and the cost of assuming it is would have been
  hours spent debugging correct code.

- **The convention this codebase states about errors needed its first exception, and stating why is the
  work.** `.zalwa/stack.md` says programmer errors are thrown and there is deliberately no graceful screen
  for a device without WebGL2 — sound, because those are bugs and loud failure is how bugs get fixed. A URL
  is different in kind: it arrives from outside, already mangled by chat clients, hand edits, and Patterns
  that existed when a link was shared and do not now. A shared link that renders a stack trace has destroyed
  the one moment it existed for. The exception and its reasoning live in `share.ts`, not in a commit
  message, so the next person to see a silent `?? null` does not "fix" it.

- **The Actors justification was replaced, not amended, and that distinction is the substance of the
  documentation work.** It argued the actor list stays at one because "nobody occupies the role of person
  who chose what you see first — randomness does". A shared link makes that flatly false: somebody does.
  Patching the sentence would have produced a hedge; the argument had to be rebuilt on a different basis —
  a sender picks one entry from a fixed list they can neither add to nor alter, which is pointing at content
  rather than authoring it. The line now recorded as what the actor list rests on: **choosing among what
  exists is not authorship; creating what others see is.** Five PRD passages needed amending and only two
  were in the acceptance criteria, which is the #48 pattern for the fifth consecutive session — but this
  time they were found at step 5 rather than by wash after the merge.

- **A subagent mutated the shared working tree.** The security reviewer ran `git checkout` to read branch
  files and returned the repo to `main` mid-session. Nothing was lost only because everything had been
  committed before the review was launched; an uncommitted change would have been carried onto `main` or
  blocked the checkout. Routed to zalwa-feed. The habit worth keeping regardless: commit before delegating,
  because a read-only reviewer is only read-only by convention.

- Both halves of the URL handling are pure string functions in `src/share.ts`, leaving `main.ts` with a
  `history.replaceState` call containing no decision. That is #46's lesson applied on the first attempt
  rather than after a failed QA gate.

- All acceptance criteria met; issue closed. #13 (unfurl) is now unblocked.
