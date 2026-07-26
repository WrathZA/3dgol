## Issue #49 — feat: the pattern list grows to eight (DONE, closed)
https://github.com/WrathZA/3dgol/issues/49

Closed: 2026-07-26
Commit: d5fcc01
Security: clean
Skill-judge: not applicable
PRD sections: Pattern

- **A test caught a Pattern that was simply wrong, which is the entire reason the test exists.** The queen
  bee shuttle as first transcribed had 23 Cells and no period at all. Nothing else would have caught it: a
  mistranscribed Pattern still renders, still has a plausible Cell count, and still looks like *something*,
  so eyeballing proves nothing and a screenshot proves less. What a wrong arrangement cannot do is keep a
  period. Every oscillator is now advanced exactly one period and compared against Generation 0 — **and
  separately asserted not to return early**, which is the half that matters: without it a still life passes
  trivially and a shorter-period impostor passes by coincidence.

- **Three test failures, three different causes, and only one was the data.** Worth separating because the
  instinct on a red suite is to assume the implementation is wrong. Kok's galaxy failed on a Cell count I
  had asserted from memory (48, not 64) — the *expectation* was wrong. The acorn failed a population
  threshold derived from published figures, which are all for an unbounded Grid; the Bounded Edge trims the
  sprawl, so that threshold could never have held here — the *test* was wrong. Only the queen bee shuttle
  was a genuine transcription error. Reading which of the three a failure is, before editing anything, is
  the skill.

- **`id` was write-only and the security review is what noticed.** The field was added so #50 can use it as
  a URL parameter, and the chooser still keyed its options by array index — leaving the product with two
  ways to name a Pattern, which is precisely what the acceptance criterion said to avoid. An unprompted
  aside in a security review caught what the persona gate had not yet reached. The lesson is narrower than
  "reviews find things": a field added *for a future consumer* has no present consumer to exercise it, so
  nothing fails when it is wrong. Wiring it to the existing consumer is what makes it real.

- **Switching the chooser to id removed a bug class rather than guarding it.** #46 had to patch
  `Number("") === 0` resolving the placeholder to `patterns[0]` and silently starting a Run — a defect
  reachable by keyboard that the security review had called unreachable. Matching on id means an empty value
  matches nothing, so the hazard is gone by construction. The explicit guard was kept anyway, as
  belt-and-braces rather than as the only defence. The general form: prefer a change that makes a class of
  bug impossible over one that catches an instance of it.

- **Two of the eight proposed Patterns were not shipped, and the reasons live in the source rather than
  only in the issue.** A lone spaceship travels about forty-eight Cells and then the Bounded Edge destroys
  it, leaving the Grid empty and keeping it empty — an empty structure is the one thing this product cannot
  show. Simkin's glider gun is period 120 against a default Depth Window of 60, so a Viewer at the default
  sees under half an emission cycle. Both are recorded beside `PATTERNS`, because the next person to think
  "why isn't there a spaceship" will be reading that file, not this one.

- **The PRD's justification was true of the Patterns that existed when it was written and false of the ones
  added here** — the #48 failure mode again, in text written four hours earlier. It said choosing a Pattern
  switches the Explosion off "because a pattern that depends on cells which never change state is destroyed
  by the explosion reaching them". True of the gun and every oscillator. False of the R-pentomino and acorn,
  which depend on no such Cells and would merely run *differently*. The rule is unchanged; its reason had to
  widen. One rule for all Patterns is now stated as a choice made for interface predictability, with the
  cost named: a self-limiting Pattern becomes a structure that stops changing.

- The per-pattern Explosion rule was in the issue as filed and removed by operator decision before
  implementation, which is why this shipped as pure data plus one field rather than as a rule change.

- Known gap, unchanged: no DOM test covers the dropdown's wiring. That is #25's scope and it is open.

- All acceptance criteria met; issue closed.
