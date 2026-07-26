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

/** One control: which setting it moves, and how it is described. */
interface ControlSpec {
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

const CONTROLS: readonly ControlSpec[] = [
	{
		setting: "generationsPerSecond",
		label: "Speed",
		// Zero is not shown as "0/s" — it is a different state, not a slower one,
		// and the Viewer looking for how to stop the structure should be able to
		// see that they have.
		format: (value) => (value === 0 ? "Paused" : `${value}/s`),
		emphasis: (value) => value === 0,
	},
	{
		setting: "depthWindow",
		label: "Depth",
		format: (value) => `${value} layers`,
	},
	{
		setting: "maximumAge",
		label: "Maximum age",
		format: (value) => `${value} gens`,
	},
	{
		setting: "cellSize",
		label: "Cell size",
		// A proportion of the lattice spacing, which is what the number means:
		// 100% is Cells touching.
		format: (value) => `${Math.round(value * 100)}%`,
	},
	{
		setting: "gridWidth",
		label: "Grid width",
		format: (value) => `${value} cells`,
		staged: true,
	},
	{
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

	const element = document.createElement("section");
	element.className = "panel";
	element.setAttribute("aria-label", "Structure controls");

	const title = document.createElement("h1");
	title.className = "panel__title";
	title.textContent = "Controls";
	element.append(title);

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

	const note = document.createElement("p");
	note.className = "panel__note";
	note.textContent = "Drag to orbit · scroll to zoom · right-drag to pan";
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

	parent.append(element);

	return {
		element,
		refresh: () => {
			for (const refresh of refreshers) {
				refresh();
			}
			syncPending();
		},
		dispose: () => {
			element.remove();
		},
	};
}
