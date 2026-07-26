## Issue #57 — feat: a source link sits beside the author's mark (DONE, closed)
https://github.com/WrathZA/3dgol/issues/57

Closed: 2026-07-26
Commit: 3a3b490
Security: clean
Skill-judge: not applicable
PRD sections: Author credit, B13 — Find who made it

- **The issue was written after the code, and that order is worth naming rather than hiding.** The change
  was requested directly and implemented on a branch; the tracking issue was filed retroactively so the
  work would have the same record as everything else. The cost is that the acceptance criteria were
  derived from what was built instead of constraining what got built, so they cannot have failed. Anyone
  reading them as evidence the design was tested against a spec should read them as a description
  instead.

- **A PRD guarantee was deleted, not weakened.** "Author credit" claimed the mark was "the only outbound
  link in the product" and B13 claimed "This is the only way out of the product" — both stated as
  load-bearing facts in three places between them, and both made false by the second link. They were
  rewritten to state *two*, and the count was made explicit precisely so a third link has to be argued
  for in the document rather than added quietly. The replacement records what earns the second link: the
  figure is a signature and goes to the person, the octocat is a signpost and goes to the code, so
  neither makes the other redundant. Pointing both at the same place would have been the version not
  worth having.

- **The two marks are now held to opposite rules, and the inconsistency is the correct outcome.** The
  figure must stay an original drawing because a signature is the whole point — the standing constraint
  from #32 and the Magritte copyright reasoning. The GitHub octocat must be *GitHub's own file* (Octicons,
  MIT) because a signpost nobody recognises fails at the only thing it is for. Both reasons are recorded
  next to both marks, in `signature.ts` and in B13, because the natural instinct on encountering this is
  to make the two consistent — and either direction of consistency breaks one of them.

- **Zero headroom was a design input rather than a thing discovered afterwards.** #51 left the portrait
  sheet fitting at exactly 516px of 516, so a stacked second line was ruled out before anything was
  written. Side by side, the row costs what one mark cost, and the smoke test confirmed portrait
  unchanged at 516/516. This is the first change since #51 to be constrained by that, and it will not be
  the last — the observation has now paid for itself once.

- **The hit-area floor moved from the row to the links, and the distinction matters.** `.panel__signature`
  now matches two elements rather than one, so `pnpm smoke --phone` measures each separately and both
  report 44px. Putting the minimum on the container would have passed the check while saying nothing
  about the octocat, which is the smaller of the two and the easier to miss with a thumb.

- **`createOutboundLink()` exists so `rel="noopener noreferrer"` cannot drift.** Two hand-built anchors
  would have worked identically today; the helper is there because a third link added later without
  `noopener` hands the opened page a handle on this one, and that omission is invisible in review.
  Routing every outbound link through one function makes the safe form the only form reachable.

- All acceptance criteria met; issue closed.
