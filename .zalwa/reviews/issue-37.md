# Persona review — issue #37 (fix: the control sheet does not fit an iPhone)

Change type: **New feature / behavior** (user-visible layout change) → all six personas apply.

Branch: `issue-37-sheet-fits-iphone`
Security review: clean (no HIGH or MEDIUM findings; two non-security notes raised and both fixed)

---

## Product

Grade: **A**

The reported defect is gone and was verified by measurement rather than assertion: 852px of content
in a 664px viewport became 542px in a 542px sheet, and the toggle now resolves against a layer that
tracks the visible viewport instead of the one an iOS toolbar is covering. Nothing was removed that
a Viewer could use — the close button that went was a second way to do what the toggle already does,
and the toggle stays visible above the open sheet. All six ACs met.

## Technical

Grade: **A**

The positioning fix is structural rather than a tuned offset, which is the right shape for this
bug: `bottom` now means the bottom of what the Viewer can see because the layer is `100dvh`, not
because a magic number was subtracted from something. Safe-area insets ride on the layer's padding,
so one declaration covers both controls — absolutely positioned children resolve against the
padding box. `pointer-events: none` is the load-bearing detail and it is verified, not assumed: the
desktop probe confirms the centre of the screen still hit-tests to the canvas.

`dispose()` came out strictly more symmetric than before — every listener-bearing node is now a
descendant of the single element that gets removed, with only the document-level `keydown` needing
explicit removal.

## QA

Grade: **A**

The harness gained the assertion whose absence caused this: it compared the sheet's *box* against
the viewport, which `max-height` guarantees will always pass, instead of comparing content against
the box. It now does both.

The iOS half cannot be reproduced headlessly at all — Chromium has no browser toolbar — so it is
covered structurally instead: `offsetParent` is `null` for a fixed element and the layer for an
absolute one, so the check fails the moment someone reverts to `position: fixed`. That is the
closest a headless run can get to a defect it cannot see, and it is worth more than nothing.

The split target floors (32px sliders, 44px for tapped controls) immediately earned themselves by
catching the signature's hit area dropping to 36px when the mark was shrunk.

## Security

Grade: **A**

No HIGH or MEDIUM findings. The obvious question a full-viewport overlay raises — clickjacking —
was checked directly and does not apply: `pointer-events: none` genuinely removes the layer from
hit-testing, the only children that re-enable it are opaque first-party controls, and the closed
sheet uses `visibility: hidden` so it leaves both hit-testing and the tab order. There is also no
privileged action in this product to redress. `viewport-fit=cover` is layout-only.

Both non-security notes the review raised were fixed rather than deferred: a stale comment still
naming the deleted close control, and an exact-`className` comparison in the harness that would
have failed with a misleading iOS message if a second class were ever added to the layer.

## Hacker

Grade: **A**

The new overlay is the only thing worth attacking and it is inert — no input reaches it, no
privileged target sits behind it, and there is no network call, storage, or auth anywhere in the
product to aim at. Removing an element and a listener reduces surface rather than adding any.

## UX

Grade: **B**

Portrait now shows every control at once with nothing hidden below a fold, which is the outcome
that was asked for. The tightening is a real trade and is recorded as one: sliders dropped from
44px to 32px on the reasoning that six stacked controls are not six independent targets, that a
slider is dragged rather than tapped, and that it spans the panel's full width — while Restart, the
toggle, and the signature stay at 44px because those are tapped once.

Not an A for two reasons. The heading was hidden to buy 28px; it is still in the accessibility tree
and the toggle says "Controls" a few pixels below, but it is a real reduction in on-screen labelling.
And landscape still scrolls — four controls visible instead of two, which is better, but six sliders
cannot fit in 320px of height at any size, so that remains a compromise rather than a solved
problem.

---

**Result: all six grades C or above — gate passes.**
