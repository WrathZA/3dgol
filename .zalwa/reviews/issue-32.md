# Persona Review — Issue #32

**Issue:** feat: sign the panel with a link to the author's GitHub
**Branch:** `issue-32-panel-signature`
**Change type:** New feature / behaviour — all six personas apply
**Date:** 2026-07-26

## Scope note

The issue was filed against a supplied image, `assets/som.webp`, which is Magritte's *The Son of Man* with
the background removed — the painting itself, not an homage. Raised before the issue was written; the
operator chose "original homage instead". The mark shipped here is therefore new geometry drawn for this
product, and the supplied file is gitignored rather than deleted, because it is the operator's reference
material and deleting it was not mine to do.

Two things landed that the acceptance criteria do not name:

- **The artwork was drawn twice.** The first pass was monoline strokes chosen to match the panel's hairline
  rules. Rendered at 3rem it read as an arch over a dot over a bracket — not a figure. Redrawn as filled
  silhouettes and the geometry corrected a second time after enlarging it. Repairing this issue's own
  deliverable, not scope creep.
- **`assets/` is gitignored rather than the file being deleted.** AC 2 only requires the image stay out of
  the build, which was already true. The ignore rule is what stops a future `git add -A` putting a
  copyrighted painting in a public repo, which is the accident the criterion is actually protecting against.

Discovered and deliberately not fixed here: `pnpm smoke` writes `smoke.png` to the repo root and that path
is not gitignored. Pre-existing, unrelated to this issue, and routed to zalwa-feed rather than folded in.

## Product

All eight acceptance criteria are met and verified by measurement in a real browser rather than by eye: the
mark renders at 48px (ceiling 56), below Restart, `inPanel` at both a 420px and a 760px viewport; the link
carries `href=https://github.com/WrathZA`, `target=_blank`, `rel="noopener noreferrer"`, and the accessible
name "Built by WrathZA — profile on GitHub"; the hit area measures 240 × 63, clearing 44px on its short
side; `find dist` returns no `.webp`; and the PRD gained an Author credit subsection and B13.

The honest caveat is legal rather than technical, and the operator should hold it consciously. The mark is
original geometry — a dome, a bar, a notched coat, a disc — and copying the *idea* of a bowler hat with an
apple for a face is not infringement. That substantially reduces the exposure the supplied file carried. It
does not reduce it to zero: the composition is deliberately evocative, which is the entire point of a
homage, and a maximalist reading of what counts as Magritte's protected expression rather than his idea
could still take issue. This is a considered position rather than a discovered one, and the reasoning is
recorded in the PRD and in the module so a later session does not quietly redraw it closer to the painting.

**Grade: B**

## Technical

A 108-line module that exports one function and imports nothing. `panel.ts` gains an import and twenty
lines; no other file is touched. The layering is right: geometry lives in TypeScript, colour lives in CSS
via `currentColor` and a class, so the hover and focus states are one CSS property rather than a redraw,
and the drawing inherits the palette instead of hardcoding it twice.

`createElementNS` throughout rather than an `innerHTML` string. Nothing here is Viewer-supplied so this
defends against nothing today; what it buys is that the one place this codebase writes markup contains no
HTML parser at all and cannot acquire one by someone later interpolating a value into a template literal.

Against it: the `data-part` attributes on each path are read by nothing — not CSS, not TypeScript, not the
tests. They are documentation expressed as markup, which is a slightly worse place for it than the comment
directly above each path, and they ship in every rendered DOM.

**Grade: B**

## QA

99 tests pass; typecheck and Biome clean; `pnpm smoke` reports a live context, 10 MB heap, and an empty
error list. Every AC was verified against actual rendered geometry — widths, heights, and containment read
out of `getBoundingClientRect` in a real page, not asserted from the source.

Two real weaknesses. First, **none of it is automated.** The verification ran from a throwaway script in
`.zalwa/tmp/` that is deleted at the campsite check, so the 420px containment guard — the exact defect #10
shipped, now with an eighth element added below the button that fell off — exists once and never again.
That is precisely the gap #25 owns, and this change makes filling it more valuable rather than less.

Second, **nothing guards the artwork.** The first two drawings were legible to a `getBoundingClientRect`
assertion and unreadable to a human; only enlarging the mark and looking at it caught that. A future edit
to a path string can silently produce a smear and every automated check will still pass.

Worth recording as a positive: the verification harness itself had to be rewritten. Repeated Playwright
locator resolution hung under SwiftShader even after `waitForSelector` succeeded — consistent across three
runs. Collapsing to a single `page.evaluate` fixed it, which is a second instance of the rasteriser
flakiness already in `codebase.md`'s known risks.

**Grade: C**

## Security

A dedicated review found nothing. No untrusted input reaches any new code path — every value written is a
module-level literal, and there is no network read, storage, deserialization, or dynamic evaluation
anywhere in the diff.

The one genuinely new surface is the product's first outbound link, and it is correctly hardened rather
than accidentally safe. `href` is a constant assigned directly rather than composed, so there is no
open-redirect path. `noopener` and `noreferrer` are both present rather than one being assumed to imply the
other — `noopener` is the control that actually denies the opened document a handle back into this page.
The inline SVG contains only `<path>` and `<circle>`: no `<script>`, no `<foreignObject>`, no `<use>`, no
external references, which are the elements that make inline SVG an injection vector at all.

**Grade: A**

## Hacker

There is nothing to work with. No Viewer-controlled value reaches the new code, so there is no input to
malform. The only lever is a link, and it points at a hardcoded HTTPS origin that cannot be influenced from
the page.

The one realistic abuse path for a `target="_blank"` link is reverse tabnabbing — the opened page reaching
back through `window.opener` to navigate the original tab to a lookalike. `rel="noopener"` closes it, and
it was added deliberately with the reasoning in a comment rather than pasted as boilerplate. No new
exploitation vector.

**Grade: B**

## UX

The mark works by pointer, by touch, and by keyboard, with a focus ring matching the Restart button rather
than a new visual language. The accessible name says whose profile and where it goes, which matters more
here than usual because it is the only link in the product and "GitHub" alone would tell a screen reader
user nothing about what they are about to leave for. Opening in a new tab is the correct call and not
merely conventional: History is a window rather than an archive, so navigating away discards the run and a
back button returns a fresh random seed instead of the structure the Viewer was watching.

The weakness is contrast at rest. The silhouette sits at 34% of `#cdd6e4` over the panel's dark glass,
which computes to roughly 2.5:1 — under the 3:1 that WCAG 1.4.11 asks of non-text UI components. What saves
it is the apple, which stays at full `#7ef9e8` and clears about 14.6:1, so the mark remains locatable and
its most distinctive element is the high-contrast one. It reaches full strength on hover and on keyboard
focus. That is a defensible design for a signature that should not compete with the structure, but it is a
real threshold missed rather than a comfortable pass.

**Grade: B**

## Gate

All six applicable personas grade C or above. Gate passes.
