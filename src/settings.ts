/**
 * The values a Run starts with, and the range each one may be moved through.
 *
 * The Viewer changes four of these while a Run is in progress; Grid dimensions
 * are staged and apply on the next Restart. They live here so there is one place
 * to look rather than constants scattered through the modules that consume them.
 */
export interface Settings {
	/** Columns and rows in the Grid. Applied on Restart. */
	gridWidth: number;
	gridHeight: number;
	/** N — Layers of history retained. */
	depthWindow: number;
	/** Age at which a Cell dies regardless of its neighbours. */
	maximumAge: number;
	/** Generations advanced per second. Zero is a pause. */
	generationsPerSecond: number;
	/** Edge length of a drawn Cell, as a fraction of the lattice spacing. */
	cellSize: number;
}

/** The range a setting may be moved through, and the granularity it moves in. */
export interface SettingBound {
	min: number;
	max: number;
	step: number;
}

/**
 * Bounds for the settings the Viewer changes while a Run is in progress.
 *
 * These are the interface, not suggestions: whatever the panel permits is what
 * the slowest supported device has to survive, so the limits *are* the
 * performance strategy. The Depth Window ceiling in particular sets how large
 * the instance ring is allocated, and Grid dimensions multiplied by Depth
 * Window is the number that gets away from you. Establishing that ceiling by
 * measurement on real low-end hardware is its own issue; until then these are
 * conservative rather than measured.
 *
 * Grid dimensions are absent because they are not live controls — they are
 * staged and applied on Restart, and arrive with that issue.
 */
export const SETTING_BOUNDS = {
	/**
	 * Zero is included deliberately: pausing is the bottom of the speed range
	 * rather than a separate control, so there is one thing to reach for when
	 * the Viewer wants the structure to stop.
	 */
	generationsPerSecond: { min: 0, max: 30, step: 1 },
	/**
	 * The floor is well above 1 because a Stack of a few Layers is not a
	 * structure — the product's whole premise needs enough history to read a
	 * shape in. The ceiling bounds the instance ring.
	 */
	depthWindow: { min: 10, max: 120, step: 1 },
	/**
	 * The floor is 2 rather than 1: at 1 every Cell dies the Generation after
	 * it is born, so nothing ever survives to traverse the Colour Gradient and
	 * the structure degenerates into unconnected sparks. The ceiling is far
	 * short of what an Age can hold — beyond it, Death by Old Age stops being
	 * the thing that keeps the structure moving.
	 */
	maximumAge: { min: 2, max: 64, step: 1 },
	/**
	 * Reaches 1 exactly, where Cells span the full lattice spacing and touch,
	 * so layers can be driven all the way to solid sheets. The floor stays
	 * clear of zero — a Cell has to remain visible to be seen through.
	 */
	cellSize: { min: 0.15, max: 1, step: 0.01 },
} as const satisfies Record<string, SettingBound>;

/** Settings the Viewer changes without disturbing the Run in progress. */
export type LiveSetting = keyof typeof SETTING_BOUNDS;

/**
 * Starting values, chosen to look right rather than to stress anything.
 *
 * The Grid is small enough that individual Cells are legible at the default
 * camera distance, and the Depth Window deep enough that a glider's diagonal
 * reads as a streak. Together they set the instance count — 48 × 48 × 60 is
 * about 138,000 — which is comfortable everywhere.
 *
 * These are not the ceiling. What a device can actually afford is measured
 * rather than assumed, and that work has its own issue.
 */
export const DEFAULT_SETTINGS: Settings = {
	gridWidth: 48,
	gridHeight: 48,
	depthWindow: 60,
	maximumAge: 24,
	generationsPerSecond: 8,
	cellSize: 0.55,
};

/**
 * Brings a value onto a setting's range and granularity.
 *
 * Snapping to the step as well as clamping to the range matters because the
 * consumers of these numbers are not all sliders: the Depth Window indexes a
 * ring of whole slots and Maximum Age is compared against integer Ages, so a
 * fractional value part-way between steps is not merely untidy but wrong.
 *
 * A value that is not a number at all is a bug in the caller rather than a
 * Viewer action to accommodate, so it throws rather than being coerced to
 * something plausible.
 */
export function clampSetting(value: number, bound: SettingBound): number {
	if (!Number.isFinite(value)) {
		throw new Error(`Setting value must be a finite number, got ${value}`);
	}

	const { min, max, step } = bound;
	const snapped = min + Math.round((value - min) / step) * step;
	const clamped = Math.min(Math.max(snapped, min), max);

	// Snapping in floating point drifts — 0.15 + 40 × 0.01 is not 0.55 — and the
	// drift shows up as a slider that will not sit still and a readout with a
	// tail of digits. Rounding to the step's own precision removes it.
	return Number(clamped.toFixed(decimalPlaces(step)));
}

/** Brings every live setting onto its range. Grid dimensions are left alone. */
export function clampLiveSettings(settings: Settings): Settings {
	const clamped = { ...settings };
	for (const key of Object.keys(SETTING_BOUNDS) as LiveSetting[]) {
		clamped[key] = clampSetting(settings[key], SETTING_BOUNDS[key]);
	}
	return clamped;
}

/** Digits after the decimal point in a step, so rounding matches it exactly. */
function decimalPlaces(step: number): number {
	const text = String(step);
	const point = text.indexOf(".");
	return point === -1 ? 0 : text.length - point - 1;
}
