/**
 * Renders the running product headlessly and saves a screenshot.
 *
 * Exists because the acceptance criteria for the structure are about what you
 * see. Tests can prove the Life rule and the ring arithmetic; nothing but a
 * picture can tell you whether Layers read as separate strata or fuse into one
 * solid mass — and the difference between those is a single constant.
 *
 * Local only, never in CI: this runs against a software rasteriser, so it is
 * slow and its timings say nothing about real hardware.
 *
 * Usage:
 *   pnpm build && pnpm preview &
 *   pnpm smoke                       # writes smoke.png
 *   pnpm smoke http://localhost:4173/ out.png 30000
 *   pnpm smoke --phone               # phone layout, both orientations
 */
import { chromium, devices } from "playwright";

const phone = process.argv.includes("--phone");
const positional = process.argv.slice(2).filter((arg) => arg !== "--phone");

const url = positional[0] ?? "http://localhost:4173/";
const out = positional[1] ?? (phone ? "smoke-phone.png" : "smoke.png");
const waitMs = Number(positional[2] ?? (phone ? 8_000 : 30_000));

/*
 * Phone geometry, and why both orientations are checked.
 *
 * A phone in landscape is not a narrow viewport — at 844 × 390 it is a *short*
 * one, and the two fail differently: portrait is where the panel is too wide to
 * sit beside the Structure, landscape is where it is taller than the window and
 * Restart falls off the end. Checking one proves nothing about the other.
 *
 * These are iPhone 14-class viewports with the browser chrome already taken off,
 * rather than the screen sizes — 664 and 320, not 844 and 390. The smaller pair
 * is what the page is actually given, and landscape at 320 is the tightest the
 * product has to survive, so measuring the screen would quietly check a case no
 * Viewer is ever in.
 *
 * `hasTouch` is the load-bearing option below: the layout is keyed on
 * `pointer: coarse`, so without it the page renders the *desktop* arrangement at
 * phone dimensions and the run reports success against something no phone will
 * ever see.
 */
const PORTRAIT = { width: 390, height: 664 };
const LANDSCAPE = { width: 844, height: 320 };

/*
 * Minimum hit heights, in CSS pixels — two of them, not one.
 *
 * Restart and the toggle are tapped once and get the usual 44px. Sliders get
 * 32px: six of them stacked on a phone are not six independent targets, and at
 * 44px apiece the sheet ran 270px past the screen, which made every control
 * harder to reach rather than easier. A slider is dragged rather than tapped and
 * spans the panel's full width, so its height is the least of what makes it
 * hittable.
 */
const MINIMUM_TARGET = 44;
const MINIMUM_SLIDER = 32;

const browser = await chromium.launch({
	// Headless Chromium has no GPU here; SwiftShader draws in software.
	args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});

/*
 * Everything the layout is judged on, read in a single `evaluate`.
 *
 * One round trip rather than a sequence of locator calls, and that is not a
 * micro-optimisation: repeated locator resolution against this page has hung for
 * its full timeout, reproducibly, even after `waitForSelector` on the same
 * selector had already succeeded. Collapsing the reads into one evaluate fixed
 * it outright.
 */
function readLayout() {
	const box = (element) => {
		if (element === null) return null;
		const rect = element.getBoundingClientRect();
		return {
			x: Math.round(rect.x),
			y: Math.round(rect.y),
			width: Math.round(rect.width),
			height: Math.round(rect.height),
		};
	};

	const shown = (element) => {
		if (element === null) return false;
		const style = getComputedStyle(element);
		return (
			style.display !== "none" &&
			style.visibility !== "hidden" &&
			Number(style.opacity) > 0
		);
	};

	const canvas = document.querySelector("#viewport");
	const panel = document.querySelector(".panel");
	const toggle = document.querySelector(".panel__toggle");

	// Every control a finger has to land on. The sliders are measured one by one
	// rather than sampled, because they are the ones sized by a media query and a
	// rule that missed one would still pass a sample of the first.
	const targets = [
		...document.querySelectorAll(".panel__slider"),
		// The switch row, not the drawn track inside it: the label wraps the input,
		// so the whole row is what a finger lands on and the track alone would
		// measure 18px and fail a control that is comfortably hittable.
		...document.querySelectorAll(".panel__control--switch"),
		...document.querySelectorAll(".panel__restart"),
		...document.querySelectorAll(".panel__toggle"),
		...document.querySelectorAll(".panel__signature"),
	]
		.filter(shown)
		.map((element) => ({
			className: element.className,
			// The switch is held to the slider's minimum rather than the tapped
			// control's, for the reason the sliders are: it is one of seven settings
			// stacked in a sheet, not an independent target, and the label wraps the
			// input so the hit area is the sheet's full width. Holding it to 44px
			// pushed the portrait sheet past the screen, which is the #10 failure —
			// a control that is technically large and actually harder to reach.
			isSlider:
				element.classList.contains("panel__slider") ||
				element.classList.contains("panel__control--switch"),
			height: Math.round(element.getBoundingClientRect().height),
		}));

	const hint = [...document.querySelectorAll(".panel__note-hint")]
		.filter(shown)
		.map((element) => element.textContent);

	return {
		viewport: { width: window.innerWidth, height: window.innerHeight },
		// `documentElement` rather than body: a page that has acquired something to
		// scroll is a page whose gestures are no longer all going to the camera.
		scrollable:
			document.documentElement.scrollHeight > window.innerHeight ||
			document.documentElement.scrollWidth > window.innerWidth,
		canvas:
			canvas === null
				? null
				: {
						...box(canvas),
						drawingWidth: canvas.width,
						drawingHeight: canvas.height,
						hasContext:
							(canvas.getContext("webgl2") ?? canvas.getContext("webgl")) !==
							null,
					},
		panel:
			panel === null
				? null
				: {
						shown: shown(panel),
						...box(panel),
						/*
						 * The measurement that matters, and the one this harness used to
						 * miss. The panel's *box* always fits the viewport, because
						 * `max-height` caps it — so asserting that proves nothing while
						 * the content overflows inside and scrolls. It shipped 852px of
						 * controls into a 664px screen and reported success.
						 */
						contentHeight: panel.scrollHeight,
						visibleHeight: panel.clientHeight,
					},
		toggle:
			toggle === null
				? null
				: {
						shown: shown(toggle),
						...box(toggle),
						/*
						 * Which element the toggle is positioned against — a structural
						 * proxy for a bug headless genuinely cannot reproduce.
						 *
						 * `position: fixed` resolves against the layout viewport, which on
						 * iOS Safari is the large one, so the toggle sat behind the browser
						 * toolbar and was unreachable. Chromium has no toolbar and measured
						 * it comfortably on screen. A fixed element reports `offsetParent`
						 * null; positioned inside the `100dvh` layer it reports the layer.
						 * Asserting the layer is therefore the check that fails the moment
						 * someone reverts to `position: fixed`.
						 */
						positionedAgainst: toggle.offsetParent === null
							? null
							: toggle.offsetParent.classList.contains("panel-layer")
								? "panel-layer"
								: toggle.offsetParent.className,
					},
		targets,
		hint,
		heapMB: performance.memory
			? Math.round(performance.memory.usedJSHeapSize / 1048576)
			: null,
	};
}

const errors = [];

const watch = (page) => {
	page.on("console", (msg) => {
		if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
	});
	page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
};

/** Records a failure against the orientation it was seen in. */
const fail = (where, message) => errors.push(`${where}: ${message}`);

/** Checks that hold in either orientation, once the panel has been opened. */
function checkOpened(where, layout) {
	if (layout.panel === null || !layout.panel.shown) {
		fail(where, "panel did not open on tap");
		return;
	}

	// Fitting is the whole point of the sheet: a panel taller than the window has
	// controls that cannot be reached, and there is no page to scroll to them.
	if (layout.panel.y < 0 || layout.panel.y + layout.panel.height > layout.viewport.height) {
		fail(
			where,
			`panel does not fit the viewport (${layout.panel.y}..${layout.panel.y + layout.panel.height} of ${layout.viewport.height})`,
		);
	}
	if (layout.panel.x < 0 || layout.panel.x + layout.panel.width > layout.viewport.width) {
		fail(where, "panel overflows the viewport horizontally");
	}

	// The toggle is also the dismiss control, so an open sheet must not cover it.
	if (layout.toggle !== null && layout.panel.y + layout.panel.height > layout.toggle.y) {
		fail(where, "open panel overlaps the toggle that dismisses it");
	}

	/*
	 * The controls have to fit, not merely the box that holds them. Portrait only:
	 * a phone in landscape is 320px tall and six sliders cannot fit in that at any
	 * size, so the sheet scrolls there by design.
	 */
	if (where === "portrait" && layout.panel.contentHeight > layout.panel.visibleHeight) {
		fail(
			where,
			`controls do not fit — ${layout.panel.contentHeight}px of content in a ${layout.panel.visibleHeight}px sheet, so it scrolls`,
		);
	}

	for (const target of layout.targets) {
		const minimum = target.isSlider ? MINIMUM_SLIDER : MINIMUM_TARGET;
		if (target.height < minimum) {
			fail(
				where,
				`${target.className} is ${target.height}px tall, under the ${minimum}px minimum`,
			);
		}
	}

	if (layout.hint.length !== 1) {
		fail(where, `expected exactly one navigation hint, saw ${layout.hint.length}`);
	} else if (!/pinch/.test(layout.hint[0])) {
		fail(where, `navigation hint describes a mouse on a touch device: "${layout.hint[0]}"`);
	}
}

let report;

if (phone) {
	const context = await browser.newContext({
		viewport: PORTRAIT,
		isMobile: true,
		hasTouch: true,
		// 1, not the 3 a real iPhone reports. This draws in software, where a scale
		// factor of 3 is nine times the fragment work and the screenshot stops
		// completing — and none of what is being measured here is in pixels the
		// device ratio affects. The renderer's own clamp is a separate concern.
		deviceScaleFactor: 1,
		userAgent: devices["iPhone 14"].userAgent,
	});
	const page = await context.newPage();
	watch(page);

	await page.goto(url, { waitUntil: "load" });
	await page.waitForTimeout(waitMs);

	const atRest = await page.evaluate(readLayout);

	// AC 5, and the reason the sheet starts closed: someone arriving on a phone
	// should be looking at the Structure, not at a stack of sliders.
	if (atRest.panel !== null && atRest.panel.shown) {
		fail("portrait", "panel is open on arrival — it should start collapsed");
	}
	if (atRest.toggle === null || !atRest.toggle.shown) {
		fail("portrait", "no toggle to open the panel with");
	} else if (atRest.toggle.positionedAgainst !== "panel-layer") {
		// The one iOS bug this harness can catch structurally rather than visually:
		// `position: fixed` reports `offsetParent` null and puts the toggle behind
		// the Safari toolbar, which Chromium does not have and cannot show.
		fail(
			"portrait",
			`toggle is positioned against ${atRest.toggle.positionedAgainst ?? "the layout viewport"} rather than the 100dvh layer — it will sit behind the iOS browser toolbar`,
		);
	}
	if (atRest.canvas === null || !atRest.canvas.hasContext) {
		fail("portrait", "no WebGL context — nothing is being drawn");
	} else if (atRest.canvas.height !== atRest.viewport.height) {
		fail(
			"portrait",
			`canvas is ${atRest.canvas.height}px in a ${atRest.viewport.height}px viewport`,
		);
	}
	if (atRest.scrollable) {
		fail("portrait", "the page has something to scroll — gestures will be stolen from the camera");
	}

	await page.tap(".panel__toggle", { timeout: 15_000 });
	// Long enough for the entrance to settle. Presence is deliberately not
	// animated (see panel.css), so this is only waiting on the slide.
	await page.waitForTimeout(500);
	const opened = await page.evaluate(readLayout);
	checkOpened("portrait", opened);

	await page.setViewportSize(LANDSCAPE);
	// A rotation is a resize, and the sheet is re-measured against it. Long enough
	// for the transition to settle before anything is read.
	await page.waitForTimeout(1_000);
	const rotated = await page.evaluate(readLayout);
	checkOpened("landscape", rotated);

	await page.screenshot({ path: out, timeout: 180_000, animations: "disabled" });
	report = { portrait: { atRest, opened }, landscape: rotated };
	await context.close();
} else {
	// Deliberately small. Software rasterising the whole Stack at a large viewport
	// saturates the compositor and the screenshot never completes.
	const page = await browser.newPage({ viewport: { width: 480, height: 360 } });
	watch(page);

	await page.goto(url, { waitUntil: "load" });
	await page.waitForTimeout(waitMs);

	report = await page.evaluate(readLayout);
	await page.screenshot({ path: out, timeout: 180_000, animations: "disabled" });
}

await browser.close();

console.log(JSON.stringify({ out, phone, report, errors }, null, 2));

if (errors.length > 0) {
	process.exitCode = 1;
}
