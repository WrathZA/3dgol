## Issue #32 — feat: sign the panel with a link to the author's GitHub (DONE, closed)
https://github.com/WrathZA/3dgol/issues/32

Closed: 2026-07-26
Commit: fbb27b6
Security: clean
Skill-judge: not applicable
PRD sections: Solution and Scope (new "Author credit" subsection), B13 (new)

- **The supplied image was a copyright problem, and saying so before writing the issue was the whole
  decision.** `assets/som.webp` is Magritte's *The Son of Man* with the background removed — the painting
  itself, under copyright until 2038 and licensed through SABAM/ADAGP, which does pursue infringement.
  Shipping it on a public site is the kind of use that draws a takedown. Raised at feed time rather than
  discovered at deploy time; the operator chose an original homage. The general lesson: for anything visual
  arriving as a supplied file, work out what it actually *is* before writing acceptance criteria around it.

- **Copying the idea is fine; copying the expression is not, and the mark is built to stay on the right side
  of that.** A bowler hat and an apple obscuring a face is a composition, not brushwork. The mark is four
  filled paths and a circle. The reasoning is recorded in the module header and in the PRD specifically so a
  later session does not "improve" it by tracing or filtering the painting, which would look closer and be
  infringing. The residual risk is not zero — the composition is deliberately evocative — and that is
  recorded as a considered position rather than an oversight.

- **The artwork was drawn twice, and only rendering it large caught why.** The first pass was monoline
  strokes chosen to match the panel's hairline rules; at 3rem it read as an arch over a dot over a bracket.
  Filled silhouettes survive being shrunk in a way thin outlines do not — which is why every icon set is
  built from them. The second pass still had a top hat instead of a bowler and an apple floating detached
  from both brim and shoulders, caught by blowing the mark up to 22rem on the panel's own background. **A
  48px thumbnail is not enough to judge 48px artwork by**; measurement said 48px tall and inside the panel
  while the drawing was unreadable.

- **`getBoundingClientRect` assertions cannot see that something looks wrong.** Every acceptance criterion
  passed against the illegible first draft. This is the sharpest instance yet of the gap #25 owns: the panel
  has no test harness, and even with one, legibility would not be covered.

- **`createElementNS` rather than an `innerHTML` string.** Nothing here is Viewer-supplied so it defends
  against nothing today. What it buys is that the one place this codebase writes markup contains no HTML
  parser at all and cannot acquire one later by someone interpolating a value into a template literal.

- **New tab is a product requirement, not a convention.** History is a window rather than an archive, so
  navigating away discards the run and a back button returns a fresh random seed instead of the structure
  the Viewer was watching. A same-tab link would quietly destroy what they came to see. `noopener` is
  separately deliberate — it is the control that denies the opened page a handle back into this one, which
  `noreferrer` alone would not.

- **Gitignored the reference painting rather than deleting it.** AC 2 only required it stay out of the
  build, which was already true since `assets/` is outside Vite's `publicDir`. Ignoring the directory is
  what stops a future `git add -A` putting a copyrighted work in a public repo. Deleting the operator's own
  reference file was not the ride's call to make.

- **The Playwright harness had to be rewritten mid-session.** Repeated locator resolution hung under
  SwiftShader even after `waitForSelector` had already succeeded — consistently, across three runs.
  Collapsing every read into one `page.evaluate` fixed it. Second recorded instance of this rasteriser's
  flakiness; the first was blank frames during #9.

- Contrast at rest is ~2.5:1 for the silhouette, under WCAG 1.4.11's 3:1 for non-text components. The apple
  stays at full accent and clears ~14.6:1, so the mark is still locatable and its most distinctive element
  is the high-contrast one. Graded honestly (UX B) rather than passed over.

- All acceptance criteria met; 99 tests pass; issue closed.
