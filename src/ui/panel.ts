import "@/ui/panel.css";

import {
	type BoundedSetting,
	clampSetting,
	SETTING_BOUNDS,
	type SettingBound,
	type Settings,
} from "@/settings";

/**
 * The control surface: the four settings the Viewer changes while a Run is in
 * progress.
 *
 * This module mutates a plain settings object and does nothing else. It knows
 * nothing about the Simulation or the renderer, and neither knows about it —
 * whoever composed them reads the object and applies what changed. That is what
 * keeps the interface from acquiring opinions about how a Generation is computed
 * or how a Cell is drawn.
 *
 * Hand-built rather than a generic control widget. A debug-tool panel is the
 * fastest route to working sliders and it looks like what it is, which for a
 * product whose whole value is how it looks is not a saving.
 */

export interface ControlPanel {
	element: HTMLElement;
	/** Re-reads the settings object and updates every control to match. */
	refresh(): void;
	dispose(): void;
}

/** One control: which setting it moves, and how it is described. */
interface ControlSpec {
	setting: BoundedSetting;
	label: string;
	/** Renders the current value for the readout beside the label. */
	format(value: number): string;
	/** Marks the readout when the value means something more than a number. */
	emphasis?(value: number): boolean;
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
	parent: HTMLElement = document.body,
): ControlPanel {
	const element = document.createElement("section");
	element.className = "panel";
	element.setAttribute("aria-label", "Structure controls");

	const title = document.createElement("h1");
	title.className = "panel__title";
	title.textContent = "Controls";
	element.append(title);

	const refreshers: Array<() => void> = [];

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
			readout.textContent = control.format(value);
			readout.classList.toggle(
				"panel__value--paused",
				control.emphasis?.(value) ?? false,
			);
			slider.setAttribute("aria-valuetext", control.format(value));
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
		});

		refresh();
		refreshers.push(refresh);

		wrapper.append(row, slider);
		element.append(wrapper);
	}

	const note = document.createElement("p");
	note.className = "panel__note";
	note.textContent = "Drag to orbit · scroll to zoom · right-drag to pan";
	element.append(note);

	parent.append(element);

	return {
		element,
		refresh: () => {
			for (const refresh of refreshers) {
				refresh();
			}
		},
		dispose: () => {
			element.remove();
		},
	};
}
