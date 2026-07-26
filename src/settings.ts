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
 * Bounds for every setting the Viewer can move.
 *
 * These are the interface, not suggestions: whatever the panel permits is what
 * the slowest supported device has to survive, so the limits *are* the
 * performance strategy.
 *
 * **The number that matters is the product, not any single bound.** Grid width ×
 * Grid height × Depth Window is how many Cell instances exist, and every one of
 * them is a cube transformed each frame whether its Cell is alive or dead —
 * fixed ring slots are what make the indexing work, so dead Cells are collapsed
 * rather than skipped. At the ceilings below that product is 96 × 96 × 120 =
 * 1,105,920 instances, about thirteen million triangles a frame, and roughly
 * four times the largest configuration ever shipped. Nothing here has been
 * measured on real low-end hardware — that is its own issue, and this table is
 * deliberately the single place it writes the measured limit for both halves of
 * the product.
 *
 * Grid dimensions are bounded here alongside the live settings even though they
 * behave differently: they are *staged*, read only when a Run starts, because a
 * Layer computed at one Grid size cannot coherently stack on Layers computed at
 * another. Being bounded and being applied immediately are separate questions.
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
	 * the structure degenerates into unconnected sparks.
	 *
	 * The ceiling is 200, and the default sits on it. That is a deliberate
	 * choice with a real cost: nothing reaches the cap before Generation 200,
	 * so the first Explosion lands around Generation 214 — roughly twenty
	 * seconds at the default Speed — and until then the Run behaves like classic
	 * Conway and decays. What it buys is the sparse, dramatic reading: Cells
	 * spread right across the Colour Gradient instead of bunching young, long
	 * pillars accumulate, and their Explosions are rare events rather than
	 * constant churn. Lowering the slider trades that back for immediacy.
	 */
	maximumAge: { min: 2, max: 200, step: 1 },
	/**
	 * Reaches 1 exactly, where Cells span the full lattice spacing and touch,
	 * so layers can be driven all the way to solid sheets. The floor stays
	 * clear of zero — a Cell has to remain visible to be seen through.
	 */
	cellSize: { min: 0.15, max: 1, step: 0.01 },
	/**
	 * Staged, not live — applied when a Run starts.
	 *
	 * The floor keeps the Grid large enough for Life to have somewhere to happen;
	 * below about sixteen a Bounded Edge destroys almost everything before it
	 * moves. The ceiling is where the instance product stops being defensible: the
	 * cost is area, so 96 is not twice 48 but four times it.
	 */
	gridWidth: { min: 16, max: 96, step: 1 },
	gridHeight: { min: 16, max: 96, step: 1 },
} as const satisfies Record<string, SettingBound>;

/** Any setting with a declared range. */
export type BoundedSetting = keyof typeof SETTING_BOUNDS;

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
 *
 * Maximum Age starts at its own ceiling, which is the one default here chosen
 * for character rather than for comfort — see `SETTING_BOUNDS.maximumAge`.
 *
 * Speed is 10 rather than something nearer the top of its range because the
 * structure has to stay legible while it builds. Past a certain rate a Layer is
 * on screen too briefly to be read as a shape, and the eye takes the whole thing
 * as motion — which works against the reason the third axis is time at all. 10
 * is fast enough that the first Explosion arrives around twenty seconds in
 * rather than twenty-seven, and slow enough that a Layer holds for six seconds
 * at the default Depth Window.
 */
export const DEFAULT_SETTINGS: Settings = {
	gridWidth: 48,
	gridHeight: 48,
	depthWindow: 60,
	maximumAge: 200,
	generationsPerSecond: 10,
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

/**
 * Brings every setting onto its range, returning a copy.
 *
 * A copy rather than a mutation because `DEFAULT_SETTINGS` is exported and the
 * panel writes into whatever object it is handed — clamping in place would make
 * the module's own defaults drift as the Viewer moved a slider.
 */
export function clampSettings(settings: Settings): Settings {
	const clamped = { ...settings };
	for (const key of Object.keys(SETTING_BOUNDS) as BoundedSetting[]) {
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
