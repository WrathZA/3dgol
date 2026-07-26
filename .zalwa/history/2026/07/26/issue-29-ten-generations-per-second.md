## Issue #29 — feat: the run starts at 10 generations per second (DONE, closed)
https://github.com/WrathZA/3dgol/issues/29

Closed: 2026-07-26
Commit: 2eb4143
Security: clean
Skill-judge: not applicable
PRD sections: B2 — Control speed, The rule (the "A defaults to its own maximum" paragraph), Defaults tuned
during implementation

- **The issue was filed at 15/s and shipped at 10/s**, revised at pick time rather than implemented as
  written. The reasoning is legibility over immediacy: past some rate a Layer is on screen too briefly to be
  read as a shape and the eye takes the whole thing as motion, which works against the reason the third axis
  is time rather than space. 10 is a third of the way up a 0–30 range, so it is a deliberately conservative
  step. The number that actually matters is the one it buys — the first Explosion arrives around twenty-one
  seconds instead of twenty-seven, because Maximum Age is pinned at its 200 ceiling and nothing can detonate
  before Generation 214.
- **The reasoning lives beside the value, not only here.** A bare `generationsPerSecond: 10` reads as
  arbitrary and invites a later session to "tune" it without knowing what was traded away, so the
  `DEFAULT_SETTINGS` doc comment now carries the legibility argument and both wall-clock figures.
- **Two documents were asserting a figure derived from the old default and would have shipped wrong.**
  `SETTING_BOUNDS.maximumAge` and the PRD's "A defaults to its own maximum" paragraph both said the first
  Explosion lands "roughly half a minute in at the default speed" — true at 8/s, wrong at 10/s. The general
  point for future default changes: any prose stating a *duration* rather than a *generation count* is
  coupled to Speed and has to be re-derived whenever Speed moves. Generation 214 is invariant; twenty-seven
  seconds was not.
- **The default is now pinned by a test, which AC 3 did not ask for.** The pre-existing "leaves the defaults
  untouched" assertion only proves the value sits on its range and step — it would not notice a drift to 9.
  The trade-off was named before applying it and is real: the PRD calls this a tuned default, so every future
  tuning change now edits a test line as well. That was judged worth it, on the grounds that a default whose
  exact value carries an argument should not be able to move silently.
- **The evidence for choosing 10 over anything else is the weakest part of this change, and it is a limit
  rather than an oversight.** The legibility claim is temporal: the Depth Window and Structure are identical
  at 8/s and 10/s, so a still frame cannot distinguish them and neither `pnpm smoke` nor any headless check
  can substantiate the claim. It is settled by watching the running product. Both UX and Product graded B on
  exactly this, and a future session that wants to move Speed again should expect the same ceiling on what
  automated checks can tell it.
- **Two issues were parked during selection, which changes the backlog shape.** #12 (device drawing budget)
  and #28 (colour gradient near-monochrome at A=200) both received `priority:deferred` on the author's call,
  and the label itself did not exist in the repo before this session — it was created here. Consequence worth
  knowing: #31 (grid ceiling to 128) is blocked by #12, so it is now blocked behind a deferred issue and will
  not surface in auto-pick until #12 is deliberately revived via `/zalwa-ride 12`.
- All acceptance criteria met; issue closed.
