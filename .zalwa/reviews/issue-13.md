# Persona review — issue #13 (feat: unfurl correctly when the link is shared)

Change type: new feature / user-visible behaviour. All six personas apply.

## Product — A

All five acceptance criteria are met: the title and description explain the product to a stranger, the
card carries a real captured frame, and the naming trap ("3D Game of Life" already names a
three-dimensional automaton) is corrected in the title rather than left to a description that search
results truncate and some chat previews drop. No user-visible behaviour was introduced that the
acceptance criteria do not cover — the browser tab title changed, which is the first criterion rather
than a side effect of it.

## Technical — B

The apex URL is written three times (`canonical`, `og:url`, `og:image`) and the alt text twice
(`og:image:alt`, `twitter:image:alt`). A static page cannot factor those out without introducing a
build-time template, and the alternative is a mechanism to avoid four literals sitting in one screen of
one file. Bounded and justified, not free. The X tags were deliberately held to the two that have no
Open Graph equivalent, so title and description exist once rather than twice.

## QA — C

The criteria were verified by parsing the built `dist/index.html` and fetching `/og-image.png` and
`/robots.txt` from the preview server — both 200, correct content types. Nothing automated guards them:
`vitest` runs in `environment: "node"` with no DOM, so a later change that drops a tag or renames the
image ships silently. The image also ages the moment colour, fade, or geometry changes; `pnpm og-image`
makes recapture one command but is not a check that fires. One deferred edge case, routed to zalwa-feed
at step 16.

## Security — A

No new input, no dynamic evaluation, no new route. `e2e/og-capture.mjs` is local-only and reads only
`process.argv`. `robots.txt` grants crawlers exactly what a visitor already has on a page with no
authenticated area and no paths other than `/`.

## Hacker — A

Nothing added here is attacker-reachable. The capture script never runs in production or CI, and every
meta tag is a literal an attacker cannot influence. The new externally-visible surface is one static PNG
and one text file.

## UX — B

The card says what the thing is, rules out the wrong reading, and carries alt text for anyone who cannot
see the image. The description runs 178 characters, so Google truncates the tail — the disambiguation
sits at character 77 and survives the cut, which is why it leads the second clause rather than closing
the sentence.

## Gate

All grades C or above. Proceeding to squash-merge.
