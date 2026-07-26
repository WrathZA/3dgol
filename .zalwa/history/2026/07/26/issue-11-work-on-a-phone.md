## Issue #11 — feat: work on a phone (DONE, closed)
https://github.com/WrathZA/3dgol/issues/11

Closed: 2026-07-26
Commit: 8211aaf
Security: clean
Skill-judge: not applicable
PRD sections: Constraints (mobile), B9 (navigate the structure), B6 (set cell size — touch targets), Display Configuration

- **The breakpoint lives in the stylesheet, not in TypeScript.** `panel.ts` holds one boolean
  and writes one class; `panel.css` decides whether the absence of that class means "hidden" or
  means nothing at all. The alternative — `matchMedia` in the panel plus a listener to catch a
  rotation — would have put the breakpoint in two places that must agree, and given the
  interface opinions about viewport size that belong in the stylesheet. The payoff is that
  rotation needs no listener and the desktop arrangement is provably untouched.

- **Touch targets are keyed on `pointer: coarse`, not on viewport width.** These are different
  questions with different answers: a tablet is wide enough for the desktop column and is still
  operated by thumb, while a narrow desktop window is small and still has a mouse. Sizing by
  width would have left every tablet with 20px sliders. Only the *hit* area grows to 44px — the
  visible track stays 2px, because the problem is where a tap lands, not what the panel looks
  like.

- **The sheet's appearance is deliberately not animated, and this is the entry worth reading.**
  The first version transitioned `opacity`, `transform`, and `visibility`. It never opened. A
  transition is created when the class changes but only runs once the compositor assigns it a
  start time, and this page can leave it pending indefinitely — a WebGL canvas redrawing every
  frame under a `backdrop-filter` surface is exactly that load. Measured after a tap:
  `getAnimations()` reported all three properties `running` with `startTime: null` and
  `currentTime: 0`, so the panel held its *closed* values forever and the tap looked ignored.
  A stuck transition always strands the from-value, so no property here is safe to ease: opacity
  stuck at 0 is an invisible panel, and a stuck translate is a panel 12px out of place
  overlapping the control that dismisses it (both were measured, in that order). The instinct on
  reading the CSS will be to put the motion back; the comment there says to confirm the
  transition actually starts on a device under load first.

- **`max-height` was bounding the content box.** The panel overran its own cap by its padding
  and border — about 36px — putting the last control under the edge of the window, which is the
  exact failure the cap was added in #9 to prevent. Live on desktop too, so `box-sizing:
  border-box` fixes both. A cap that silently does not cap is worse than no cap, because it
  reads as handled.

- **Heights moved to `dvh`.** `100%` of the body is iOS's *large* viewport — measured as if the
  browser toolbar were already collapsed — so the canvas ran underneath the toolbar and the
  panel's cap put Restart beneath it. No `vh` fallback: biome rejects the duplicate-property
  pattern and `dvh` is Baseline, so the fallback bought nothing.

- **Flex items in a scrolling sheet must not shrink.** Content taller than the sheet made every
  child a shrink candidate and collapsed the dismiss control from 44px to the 16px of its icon.

- **The landscape sheet is width-capped rather than full-bleed.** At 844×320 the gutters are
  820px apart, and a sheet taking all of it turned every slider into an 800px sweep of the thumb
  while covering the Structure completely. Capped at 24rem and pushed right, it stays a sheet
  instead of becoming a wall.

- **Each panel gets its own id.** `aria-controls` takes an id and nothing else, but a fixed one
  would have cost the documented property that the panel is safe to build more than once — which
  is exactly what the DOM test harness in #25 will do.

- **Verification is a real tap at a real phone viewport.** `pnpm smoke --phone` emulates 390×664
  and 844×320 with `hasTouch` (load-bearing: without it the page renders the *desktop*
  arrangement at phone dimensions and the run reports success against something no phone will
  ever see), taps the toggle, and asserts fit, target size, scrollability, and hint wording in
  both orientations. Three of the defects above were found by it and by nothing else; all three
  passed typecheck, lint, and 99 unit tests.

- **Known cost, deliberately left:** in landscape the sheet shows about three controls, so
  reaching Restart means scrolling inside it — consistent with the desktop panel's behaviour on
  short viewports since #9. None of this is reachable by `vitest` either, which runs in
  `environment: "node"` with no DOM; #25 owns that harness.

- All acceptance criteria met; issue closed
