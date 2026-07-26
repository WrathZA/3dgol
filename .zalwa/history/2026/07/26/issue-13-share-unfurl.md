## Issue #13 — feat: unfurl correctly when the link is shared (DONE, closed)
https://github.com/WrathZA/3dgol/issues/13

Closed: 2026-07-26
Commit: b695f34
Security: clean
Skill-judge: not applicable
PRD sections: none amended — the behaviour lives in `.zalwa/stack.md` (*Interface → Page metadata*,
and `public/og-image.png` in *Project Layout*), both of which already specified it

- **The naming trap was answered in the title, not the description.** "3D Game of Life" already names a
  different and better-known thing — Life on a three-dimensional lattice, 26 neighbours, rules like 5766 —
  and the PRD's Out of Scope #2 calls that a permanent non-goal. A description carrying the correction is
  truncated by search results at ~160 characters and dropped entirely by some chat previews, so the title
  became `3D Game of Life — the third dimension is time` and the description repeats it early rather than
  closing with it.
- **The preview image is a script, not a screenshot.** `e2e/og-capture.mjs` (`pnpm og-image`) exists
  because the visuals change: any issue touching colour, fade, or geometry silently ages the card, and a
  recapture has to be one command rather than archaeology into what viewport and what wait produced the
  picture in the repo. The alternative — capture once by hand — leaves the next session unable to
  reproduce it and therefore unlikely to try.
- **The capture dollies back one scroll before the shutter falls, and that is a finding about the product
  rather than about the harness.** The arrival camera aims at the middle of the Stack's height from above,
  which puts the near bottom edge well below the point being looked at. In a full window that reads
  correctly; in a 630px-tall frame the Structure runs off the bottom while a third of the top stays empty.
  The first capture shipped that clipping. The fix is the same movement a Viewer makes with a scroll
  wheel, so the frame stays a real one — but the underlying framing is worth remembering if the card ever
  needs to be a straight arrival shot.
- **The control layer is hidden for the capture.** The card is an argument for opening the page and a
  stack of sliders is furniture, not the argument. Hiding the layer rather than cropping a region keeps
  the image a frame of the run exactly as drawn, at full card dimensions, instead of a detail lifted out
  of one.
- **Open Graph URLs are absolute, and this is the part that quietly breaks.** A card is rendered by a
  crawler holding only the markup, so a root-relative `/og-image.png` resolves against nothing and the
  card arrives imageless. The apex `goluniverse.cc` is now written three times (canonical, `og:url`,
  `og:image`) — duplication a static page cannot factor out without introducing a build-time template,
  which would be a mechanism to avoid four literals in one screen of one file.
- **Only two X tags, deliberately.** X reads the Open Graph set for everything except card size, so just
  `twitter:card` and `twitter:image:alt` are present. Repeating title and description would create a
  second copy to keep in step, and the copy that drifts is always the one nobody is looking at.
- **`robots.txt` is stated rather than left to the default.** `not_found_handling: "404-page"` in
  `wrangler.jsonc` means a request for a file that does not exist returns the HTML 404 page, and a crawler
  reading an error document where a robots file should be is one interpretation away from indexing
  nothing.
- **The colour in the committed frame is near-monochrome, and that was left alone.** It is #28 (the
  gradient reads as one colour at the A=200 default), which carries `priority:deferred`. Recapturing at a
  lower Maximum Age would have produced a prettier card that misrepresents what a first-time Viewer
  actually sees.
- Persona gate: Product A, Technical B, QA C, Security A, Hacker A, UX B. QA's C is the honest one —
  `vitest` runs without a DOM, so no automated check guards the tags or the image, and a later change that
  drops one ships silently.
- All acceptance criteria met; issue closed.
