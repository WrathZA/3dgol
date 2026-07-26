## Issue #37 — fix: the control sheet does not fit an iPhone (DONE, closed)
https://github.com/WrathZA/3dgol/issues/37

Closed: 2026-07-26
Commit: 01ec698
Security: clean
Skill-judge: not applicable
PRD sections: Constraints (mobile), B6 (set cell size — touch targets), B13 (find who made it)

- **Reported from a real iPhone within minutes of deploying #11, and both defects were real.** This
  is the entry to read before trusting a headless run again: the layout had passed a purpose-built
  Playwright harness, 99 unit tests, typecheck, lint, and a persona gate, and it was unusable on the
  first actual phone it met.

- **44px was right per control and wrong for the interface.** The sheet needed 852px of content in a
  664px viewport, and six controls at 44px plus 37px of separation accounted for 508px of it.
  Sizing each target correctly in isolation produced something where every control was *harder* to
  reach, because most of them were below the fold. Sliders now take 32px on the reasoning that a
  slider is dragged rather than tapped and spans the panel's full width, so its height is the least
  of what makes it hittable; Restart, the toggle, and the signature stay at 44px because those are
  tapped once. The guideline is about a target, not about a screenful of them.

- **`position: fixed` is not fixed to what the Viewer can see.** It resolves against the *layout*
  viewport, which on iOS Safari is the large one — the page as it would be with the browser toolbar
  collapsed — so the toggle pinned to `bottom: 0.75rem` sat behind the toolbar and could not be
  pressed. The fix is structural rather than an offset: both controls now live in a `.panel-layer`
  that is fixed, exactly `100dvh` tall, and carries the `env(safe-area-inset-*)` padding.
  Absolutely positioned children resolve against the padding box, so one declaration keeps both
  clear of the home indicator, and `bottom` means the bottom of the visible viewport by
  construction rather than by arithmetic. `viewport-fit=cover` is what makes those insets resolve
  to anything but zero.

- **`pointer-events: none` on that layer is load-bearing, not tidiness.** The layer spans the whole
  viewport; without it every orbit, pan, and pinch lands on it instead of the camera and navigation
  silently stops working. Verified rather than assumed — the desktop probe checks that the centre of
  the screen still hit-tests to the canvas.

- **The harness asserted the wrong thing, and that is the reusable lesson.** It compared the sheet's
  *box* against the viewport. `max-height` caps the box, so that assertion can never fail while the
  content overflows inside it and scrolls. A check that cannot fail reads as coverage and is worse
  than no check. It now compares content against the box.

- **The iOS half cannot be reproduced headlessly at all**, since Chromium has no browser toolbar, so
  it is covered structurally: a fixed element reports `offsetParent` null, one inside the layer
  reports the layer. That fails the moment someone reverts to `position: fixed`. Not equivalent to
  testing on a device, but not nothing either — and it is the honest ceiling for this class of bug.

- **The close button was removed rather than shrunk.** It was added in #11 believing the toggle would
  sit behind an open sheet; anchoring the sheet *above* the toggle made that false in the same
  session, and nobody noticed the justification had evaporated. A control that exists because of a
  constraint that no longer holds is worth deleting, and it cost 44px on the viewport with the least
  to spare.

- **The tightening leaves ~60px of deliberate slack under the cap.** Every number here was measured
  in headless Chromium on Linux; an iPhone resolves the same font stack to `-apple-system`, whose
  metrics differ. A layout measured to fit with two pixels to spare fits on the machine it was
  measured on. Re-measure when adding a control rather than assuming the slack absorbs it.

- **Known cost, deliberately left:** landscape shows four controls instead of two and still scrolls.
  Six sliders cannot fit in 320px of height at any size, so this is a compromise rather than a
  solved problem.

- All acceptance criteria met; issue closed
