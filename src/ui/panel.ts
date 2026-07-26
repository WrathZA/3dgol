import "@/ui/panel.css";

import {
	type BoundedSetting,
	clampSetting,
	SETTING_BOUNDS,
	type SettingBound,
	type Settings,
} from "@/settings";
import { createSignatureMark } from "@/ui/signature";

/** Where the mark points. The product's only outbound link. */
const AUTHOR_PROFILE = "https://github.com/WrathZA";

/**
 * Panels built so far, so each one's id is its own.
 *
 * The one generated id in a module that otherwise avoids them by wrapping each
 * input in its own `<label>`. `aria-controls` takes an id and nothing else, so
 * there is no structural alternative — but a *fixed* id would quietly cost the
 * property that made the labels worth writing that way: build the panel twice
 * and two elements answer to the same name, which is exactly what a DOM test
 * harness does, and it is invalid markup besides. Counted rather than random so
 * a failure names the same element on every run.
 */
let panelsBuilt = 0;

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

/**
 * The control surface: the settings the Viewer can move, and the Restart button.
 *
 * This module mutates plain objects and does nothing else. It knows nothing about
 * the Simulation or the renderer, and neither knows about it — whoever composed
 * them reads those objects and applies what changed. That is what keeps the
 * interface from acquiring opinions about how a Generation is computed or how a
 * Cell is drawn.
 *
 * Hand-built rather than a generic control widget. A debug-tool panel is the
 * fastest route to working sliders and it looks like what it is, which for a
 * product whose whole value is how it looks is not a saving.
 */

export interface ControlPanel {
	element: HTMLElement;
	/**
	 * The control that opens and dismisses the panel on a small viewport.
	 *
	 * A sibling of `element`, not a descendant — see where it is built for why.
	 * Exposed so a caller can reach it without a selector.
	 */
	toggle: HTMLButtonElement;
	/**
	 * Re-reads the settings and the running Grid, and updates every control.
	 *
	 * Call after a Restart: the staged Grid dimensions have become the running
	 * ones, so the pending marks have to clear.
	 */
	refresh(): void;
	dispose(): void;
}

/** The Restart request the loop consumes. Raised here, lowered there. */
export interface RestartRequest {
	requested: boolean;
}

/** Grid dimensions of the Run actually in progress, as opposed to staged. */
export interface RunningGrid {
	readonly width: number;
	readonly height: number;
}

export interface ControlPanelOptions {
	/**
	 * The Grid the Run in progress is using.
	 *
	 * Read on every refresh rather than captured, so the panel can show what a
	 * staged dimension change *will* do without knowing when a Restart happens.
	 */
	runningGrid?: () => RunningGrid;
	parent?: HTMLElement;
}

/**
 * Settings that are a switch rather than a range.
 *
 * Derived from `Settings` rather than listed, so a boolean added there is
 * offered here and a boolean removed there stops compiling — the panel cannot
 * drift out of step with what a setting actually is.
 */
type BooleanSetting = {
	[K in keyof Settings]: Settings[K] extends boolean ? K : never;
}[keyof Settings];

/** One slider: which setting it moves, and how it is described. */
interface SliderSpec {
	kind: "slider";
	setting: BoundedSetting;
	label: string;
	/** Renders the current value for the readout beside the label. */
	format(value: number): string;
	/** Marks the readout when the value means something more than a number. */
	emphasis?(value: number): boolean;
	/**
	 * Whether the setting reaches the Run immediately or waits for a Restart.
	 *
	 * Staged controls are marked in the interface when their value differs from
	 * what is running, because a change that quietly does nothing until later is
	 * indistinguishable from a change that did not work.
	 */
	staged?: boolean;
}

/** One switch: a setting that is on or off rather than somewhere in a range. */
interface SwitchSpec {
	kind: "switch";
	setting: BooleanSetting;
	label: string;
	format(value: boolean): string;
	emphasis?(value: boolean): boolean;
}

type ControlSpec = SliderSpec | SwitchSpec;

const CONTROLS: readonly ControlSpec[] = [
	{
		kind: "slider",
		setting: "generationsPerSecond",
		label: "Speed",
		// Zero is not shown as "0/s" — it is a different state, not a slower one,
		// and the Viewer looking for how to stop the structure should be able to
		// see that they have.
		format: (value) => (value === 0 ? "Paused" : `${value}/s`),
		emphasis: (value) => value === 0,
	},
	{
		kind: "slider",
		setting: "depthWindow",
		label: "Depth",
		format: (value) => `${value} layers`,
	},
	{
		kind: "slider",
		setting: "maximumAge",
		label: "Maximum age",
		format: (value) => `${value} gens`,
	},
	// Directly beneath Maximum age, because the two are one mechanism: the age is
	// what the Explosion triggers on, and switched off the age governs colour and
	// nothing else. Separated in the panel, the pair reads as two unrelated
	// settings that happen to share a word.
	{
		kind: "switch",
		setting: "explosion",
		label: "Explosion",
		format: (value) => (value ? "On" : "Off"),
		// Off is a different rule rather than a smaller number — plain Conway, with
		// nothing at all happening at the cap — so it is worth spotting without
		// reading, the same way Paused is.
		emphasis: (value) => !value,
	},
	{
		kind: "slider",
		setting: "cellSize",
		label: "Cell size",
		// A proportion of the lattice spacing, which is what the number means:
		// 100% is Cells touching.
		format: (value) => `${Math.round(value * 100)}%`,
	},
	{
		kind: "slider",
		setting: "gridWidth",
		label: "Grid width",
		format: (value) => `${value} cells`,
		staged: true,
	},
	{
		kind: "slider",
		setting: "gridHeight",
		label: "Grid height",
		format: (value) => `${value} cells`,
		staged: true,
	},
];

/**
 * Builds the panel and wires it to `settings`.
 *
 * Every input writes straight into `settings` on the `input` event, so a value
 * is live while a slider is still being dragged rather than on release. The
 * settings are applied to the Run in progress, so dragging is a way of finding
 * the value you want by watching the structure respond — waiting for release
 * would turn that into guesswork.
 */
export function createControlPanel(
	settings: Settings,
	restart: RestartRequest,
	options: ControlPanelOptions = {},
): ControlPanel {
	const parent = options.parent ?? document.body;
	const runningGrid =
		options.runningGrid ??
		(() => ({ width: settings.gridWidth, height: settings.gridHeight }));

	panelsBuilt += 1;
	const panelId = `structure-controls-${panelsBuilt}`;

	const element = document.createElement("section");
	element.className = "panel";
	element.id = panelId;
	element.setAttribute("aria-label", "Structure controls");

	/*
	 * The toggle, and the collapsed state it drives.
	 *
	 * On a phone the panel is a sheet that starts closed: someone arriving should
	 * see the Structure, not a stack of sliders with a sliver of it behind them.
	 * On a desktop there is room for both, so the panel is simply always there and
	 * the toggle is not.
	 *
	 * Which of those applies is decided entirely in CSS. This holds one flag and
	 * writes one class; the stylesheet decides whether the absence of that class
	 * means "hidden" or means nothing at all. The alternative — matchMedia here,
	 * plus a listener to catch a rotation — would put the breakpoint in two places
	 * that have to agree, and the interface would start holding opinions about
	 * viewport size that belong in the stylesheet.
	 *
	 * A sibling of the panel rather than a child, and that is not arbitrary:
	 * `backdrop-filter` makes `.panel` a containing block, so a `position: fixed`
	 * child anchors to the panel instead of the viewport and travels with it out
	 * of view. Both sit inside the layer built below.
	 */
	const toggle = document.createElement("button");
	toggle.type = "button";
	toggle.className = "panel__toggle";
	toggle.setAttribute("aria-controls", panelId);
	toggle.append(createToggleIcon());

	const toggleText = document.createElement("span");
	toggleText.className = "panel__toggle-text";
	toggle.append(toggleText);

	let open = false;

	const setOpen = (next: boolean): void => {
		open = next;
		element.classList.toggle("panel--open", open);
		toggle.classList.toggle("panel__toggle--open", open);
		toggle.setAttribute("aria-expanded", String(open));
		// The accessible name says what pressing it will do, not what state the
		// panel is in — `aria-expanded` already carries the state, and saying it
		// twice makes a screen reader read the panel as closed while announcing a
		// button called "Close".
		const action = open ? "Hide controls" : "Show controls";
		toggle.setAttribute("aria-label", action);
		toggleText.textContent = open ? "Hide" : "Controls";
	};

	toggle.addEventListener("click", () => {
		setOpen(!open);
	});

	const title = document.createElement("h1");
	title.className = "panel__title";
	title.textContent = "Controls";
	element.append(title);

	/*
	 * There is deliberately no close button inside the sheet.
	 *
	 * One was written, on the reasoning that the toggle would sit behind an open
	 * sheet and dismissing would mean reaching past the thing being dismissed.
	 * Anchoring the sheet *above* the toggle made that false — the toggle stays
	 * visible and reads "Hide" while the sheet is open — so the close control was
	 * a second way to do what the toggle already does, and it cost 44px of height
	 * on the viewport with the least of it to spare.
	 */

	const dismissOnEscape = (event: KeyboardEvent): void => {
		if (event.key === "Escape" && open) {
			setOpen(false);
			toggle.focus();
		}
	};

	// On the document rather than the panel: Escape should dismiss regardless of
	// whether focus is inside the sheet, and after a tap on a slider it usually is
	// not.
	document.addEventListener("keydown", dismissOnEscape);

	const refreshers: Array<() => void> = [];

	/** Whether a staged Grid dimension differs from the Run in progress. */
	const restartPending = (): boolean => {
		const running = runningGrid();
		return (
			settings.gridWidth !== running.width ||
			settings.gridHeight !== running.height
		);
	};

	for (const control of CONTROLS) {
		if (control.kind === "switch") {
			// A native checkbox, restyled — the same reasoning as the sliders. It
			// already answers to Space, to a tap, and to a screen reader as a
			// checkbox, and the wrapping label makes the whole row the hit target
			// rather than the drawn track alone.
			const wrapper = document.createElement("label");
			wrapper.className = "panel__control panel__control--switch";

			const name = document.createElement("span");
			name.textContent = control.label;

			const side = document.createElement("span");
			side.className = "panel__switch-side";

			const readout = document.createElement("span");
			readout.className = "panel__value";
			// Hidden from the accessibility tree, and the label is why. It wraps both
			// this and the name, so anything readable here joins the checkbox's
			// accessible name — which would make it "Explosion On", a name that
			// changes as the control is used while the checkbox's own checked state
			// already says the same thing. The same reasoning as the panel toggle's
			// aria-label: state belongs in the state, not in the name.
			readout.setAttribute("aria-hidden", "true");

			const input = document.createElement("input");
			input.type = "checkbox";
			input.className = "panel__switch";

			const showValue = (value: boolean): void => {
				readout.textContent = control.format(value);
				readout.classList.toggle(
					"panel__value--off",
					control.emphasis?.(value) ?? false,
				);
			};

			const refresh = (): void => {
				const value = settings[control.setting];
				input.checked = value;
				showValue(value);
			};

			input.addEventListener("change", () => {
				settings[control.setting] = input.checked;
				showValue(input.checked);
			});

			refresh();
			refreshers.push(refresh);

			side.append(readout, input);
			wrapper.append(name, side);
			element.append(wrapper);
			continue;
		}

		const bound: SettingBound = SETTING_BOUNDS[control.setting];

		// A label wrapping its input, so the two are associated without generated
		// ids — which keeps the panel safe to build more than once on a page. The
		// name and the readout sit in a row of their own inside it, above the
		// slider rather than beside it.
		const wrapper = document.createElement("label");
		wrapper.className = "panel__control";

		const row = document.createElement("span");
		row.className = "panel__label";

		const name = document.createElement("span");
		name.textContent = control.label;

		const readout = document.createElement("span");
		readout.className = "panel__value";

		row.append(name, readout);

		const slider = document.createElement("input");
		slider.type = "range";
		slider.className = "panel__slider";
		slider.min = String(bound.min);
		slider.max = String(bound.max);
		slider.step = String(bound.step);

		const showValue = (value: number): void => {
			// A staged value that differs from the Run in progress says so. Without
			// this the Viewer moves the slider, watches nothing happen, and reasonably
			// concludes the control is broken rather than deferred.
			const pending = control.staged === true && restartPending();
			const text = pending
				? `${control.format(value)} on restart`
				: control.format(value);

			readout.textContent = text;
			readout.classList.toggle(
				"panel__value--paused",
				control.emphasis?.(value) ?? false,
			);
			readout.classList.toggle("panel__value--pending", pending);
			slider.setAttribute("aria-valuetext", text);
		};

		const refresh = (): void => {
			const value = clampSetting(settings[control.setting], bound);
			settings[control.setting] = value;
			slider.value = String(value);
			showValue(value);
		};

		slider.addEventListener("input", () => {
			// `valueAsNumber` rather than parsing `value`: a range input always
			// yields a number in range, and clamping guards the setting against
			// anything a browser rounds differently.
			const value = clampSetting(slider.valueAsNumber, bound);
			settings[control.setting] = value;
			showValue(value);
			syncPending();
		});

		refresh();
		refreshers.push(refresh);

		wrapper.append(row, slider);
		element.append(wrapper);
	}

	const restartButton = document.createElement("button");
	restartButton.type = "button";
	restartButton.className = "panel__restart";
	restartButton.addEventListener("click", () => {
		// Raising a flag rather than doing anything: the loop owns when a Run is
		// replaced, so a Restart cannot land part-way through a frame.
		restart.requested = true;
	});
	element.append(restartButton);

	/**
	 * Says on the button itself what a Restart will now do.
	 *
	 * Hoisted deliberately — the slider handlers above close over it, and it needs
	 * the button that is created below them.
	 */
	function syncPending(): void {
		const pending = restartPending();
		restartButton.classList.toggle("panel__restart--pending", pending);
		restartButton.textContent = pending
			? `Restart at ${settings.gridWidth} × ${settings.gridHeight}`
			: "Restart";
	}

	syncPending();

	/*
	 * How to move the camera — in the terms of the input the Viewer actually has.
	 *
	 * The gestures genuinely differ: a mouse zooms on the wheel and pans on the
	 * right button, neither of which a phone has, and a phone pans and zooms with
	 * the same two-finger movement. One line cannot describe both, and the desktop
	 * wording on a phone is worse than no line at all — it names two controls that
	 * do not exist and leaves the ones that do unmentioned.
	 *
	 * Both are written, and the stylesheet shows one. Choosing here would mean
	 * reading pointer type in JavaScript and re-reading it when a tablet's keyboard
	 * is attached or removed; the media query does that on its own.
	 */
	const note = document.createElement("p");
	note.className = "panel__note";

	const pointerHint = document.createElement("span");
	pointerHint.className = "panel__note-hint panel__note-hint--fine";
	pointerHint.textContent =
		"Drag to orbit · scroll to zoom · right-drag to pan";

	const touchHint = document.createElement("span");
	touchHint.className = "panel__note-hint panel__note-hint--coarse";
	touchHint.textContent = "Drag to orbit · pinch to zoom · two fingers to pan";

	note.append(pointerHint, touchHint);
	element.append(note);

	// The author's mark, and the only way out of the product.
	//
	// A new tab rather than the current one: History is a window, not an archive
	// — the Stack holds at most N Layers and everything past that is gone. A
	// Viewer who navigates away and comes back does not resume, they restart from
	// a fresh Seed, and the Run they were watching is unrecoverable. `noopener`
	// also denies the opened page a handle on this one, which `noreferrer` alone
	// would not.
	const signature = document.createElement("a");
	signature.className = "panel__signature";
	signature.href = AUTHOR_PROFILE;
	signature.target = "_blank";
	signature.rel = "noopener noreferrer";
	// The drawing is `aria-hidden`, so this is the link's entire accessible name.
	// It says whose profile and where, because "GitHub" alone tells a screen
	// reader user nothing about where the one outbound link goes.
	signature.setAttribute("aria-label", "Built by WrathZA — profile on GitHub");
	signature.append(createSignatureMark());
	element.append(signature);

	/*
	 * The layer both controls live in, and the reason it exists.
	 *
	 * `position: fixed` resolves against the *layout* viewport. On iOS Safari that
	 * is the large viewport — the page as it would be with the browser toolbar
	 * collapsed — so a control pinned to `bottom: 0.75rem` sits behind the toolbar
	 * and is simply not there. This shipped, and the toggle was unreachable on a
	 * real iPhone while headless Chromium, which has no toolbar, measured it
	 * comfortably on screen.
	 *
	 * The layer is fixed and exactly `100dvh` tall, and the panel and toggle are
	 * positioned inside it. `dvh` tracks what is actually visible, so "the bottom"
	 * becomes the bottom of what the Viewer can see rather than the bottom of a
	 * viewport the toolbar is covering. It also carries the safe-area insets, so
	 * nothing lands under the home indicator.
	 *
	 * `pointer-events: none` on the layer is load-bearing: it spans the whole
	 * viewport, and without it every orbit, pan, and pinch would land on the layer
	 * instead of the camera. The two controls re-enable pointer events for
	 * themselves.
	 */
	const layer = document.createElement("div");
	layer.className = "panel-layer";
	layer.append(element, toggle);
	parent.append(layer);

	// Closed is the starting state, and the class the stylesheet keys off has to
	// exist from the first paint rather than after the first tap.
	setOpen(false);

	return {
		element,
		toggle,
		refresh: () => {
			for (const refresh of refreshers) {
				refresh();
			}
			syncPending();
		},
		dispose: () => {
			document.removeEventListener("keydown", dismissOnEscape);
			layer.remove();
		},
	};
}

/**
 * Three stacked sliders — the panel in miniature.
 *
 * Drawn rather than lettered because the toggle has to survive being narrow: on
 * the smallest phones in landscape the word alone is most of the control's
 * width, and a mark reads at a glance where a word has to be looked at.
 *
 * `createElementNS` rather than `innerHTML`, matching the author's mark: nothing
 * here is Viewer-supplied, so this defends against nothing today — it keeps the
 * places this codebase writes markup free of an HTML parser, so none of them can
 * acquire one later by someone interpolating into a template literal.
 */
function createToggleIcon(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NAMESPACE, "svg");
	svg.setAttribute("viewBox", "0 0 16 16");
	svg.setAttribute("aria-hidden", "true");
	svg.classList.add("panel__toggle-icon");

	// Each row is a full-width rule with a thumb sitting at a different point
	// along it, so the mark reads as sliders rather than as a list.
	const rows: ReadonlyArray<{ y: number; thumb: number }> = [
		{ y: 3.5, thumb: 11 },
		{ y: 8, thumb: 5.5 },
		{ y: 12.5, thumb: 9 },
	];

	for (const row of rows) {
		const track = document.createElementNS(SVG_NAMESPACE, "line");
		track.setAttribute("x1", "1.5");
		track.setAttribute("x2", "14.5");
		track.setAttribute("y1", String(row.y));
		track.setAttribute("y2", String(row.y));
		svg.append(track);

		const thumb = document.createElementNS(SVG_NAMESPACE, "circle");
		thumb.setAttribute("cx", String(row.thumb));
		thumb.setAttribute("cy", String(row.y));
		thumb.setAttribute("r", "2");
		thumb.classList.add("panel__toggle-thumb");
		svg.append(thumb);
	}

	return svg;
}
