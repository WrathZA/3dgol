# Persona review — issue #11 (feat: work on a phone)

Change type: **New feature / behavior** → all six personas apply.

Branch: `issue-11-work-on-a-phone`
Security review: clean (no HIGH or MEDIUM findings)

---

## Product

Grade: **B**

All five acceptance criteria are met and measured, not asserted. The sheet is collapsed on
arrival so a Viewer landing on a phone sees the Structure rather than the controls, which is
the outcome the issue actually asks for; the toggle, the close control, and Escape give three
ways back out. Two user-visible behaviours arrived that the ACs do not name — the navigation
hint now changes wording by pointer type, and the sheet's entrance is not animated. Both are
harmless and both are explained where they live, but neither is an AC, which is what keeps
this off an A.

## Technical

Grade: **A**

The breakpoint exists in exactly one place. `panel.ts` holds one boolean and writes one class;
the stylesheet decides whether the absence of that class means "hidden" or means nothing,
which is why a rotation needs no `matchMedia` listener and no resize handler, and why the
desktop arrangement is provably untouched (measured at 1024×768: panel 240×644 top-right,
toggle and close `display: none`, mouse hint shown, Restart in frame). No new coupling: `ui/`
still imports nothing from `sim/` or `render/`, and the one-way dependency graph is unchanged.
Per-frame CPU work is untouched — none of this runs in the render loop.

The one deliberate deviation is that the sheet's appearance is not transitioned. That is
documented at length at the site with the measurement that forced it, because the instinct on
reading it will be to add the motion back.

## QA

Grade: **B**

The harness found three defects that no amount of reading would have: a transition that is
created but never given a start time by the compositor, leaving the sheet permanently closed
after a tap; `max-height` bounding the content box so the panel overran its own cap by its
own padding; and flex-shrink collapsing the dismiss control from 44px to the 16px of its icon.
All three are the kind that pass every static check. `pnpm smoke --phone` now taps for real and
asserts fit, target size, orientation, scrollability, and hint wording in both orientations.

Held to B rather than A because none of it is reachable by `vitest` — the suite runs in
`environment: "node"` with no DOM, so the phone layout is covered only by a local Playwright
run that never executes in CI. Issue #25 owns that harness; this is a known, tracked gap rather
than an unhandled one.

## Security

Grade: **A**

`/security-review` returned no HIGH or MEDIUM findings. The diff adds no new input, no network
call, no storage, and no markup parser: both new SVG builders use `createElementNS` with
hardcoded numeric literals, matching `signature.ts`, so the codebase still contains zero uses of
`innerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, or `new Function`. The new
document-level `keydown` listener is symmetrically removed in `dispose()`. The one outbound link
is unchanged and keeps `rel="noopener noreferrer"`.

The review's non-security nit was acted on rather than filed: a fixed element id would have cost
the panel's documented "safe to build more than once" property, so the id is now per-instance.

## Hacker

Grade: **A**

There is nothing here to abuse. No privileged action exists to redress, and the collapsed sheet
uses `visibility: hidden` rather than opacity alone, so it is out of both the tab order and hit
testing — a transparent overlay over the canvas would have been the one plausible UI-redress
shape and it is not what was built. DOM clobbering via the new id is not reachable: the name is
hyphenated, nothing resolves globals by name, and there is no injection sink through which a
competing element could be planted.

## UX

Grade: **B**

Every control clears 44px on a coarse pointer and the spacing between them was widened to match,
keyed on pointer type rather than viewport width so a tablet is treated as the thumb-operated
device it is. The hint now describes gestures the Viewer's input actually has instead of naming
a scroll wheel and a right button to someone holding a phone. Dismissal is reachable three ways,
and focus returns to the toggle rather than being stranded on a control that has just been
hidden.

One real cost, and it is why this is not an A: in landscape the sheet is 240px tall and shows
about three controls, so reaching Restart means scrolling inside it. That is consistent with how
the desktop panel has behaved on short viewports since #9, and the sheet is width-capped so most
of the Structure stays watchable while a slider moves — but it is a compromise rather than a
solved problem, and a denser landscape layout is the obvious follow-up.

---

**Result: all six grades C or above — gate passes.**
