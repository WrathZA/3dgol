// Type-only: `applyStartRule` needs to know what a Pattern is, and nothing more.
// Erased at build, so this module still pulls in nothing at runtime.
import type { Pattern } from "@/sim/patterns";

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
	/** Age at which a Cell detonates, and the far end of the Colour Gradient. */
	maximumAge: number;
	/** Whether a Cell reaching Maximum Age scatters life into its neighbourhood. */
	explosion: boolean;
	/** Generations advanced per second. Zero is a pause. */
	generationsPerSecond: number;
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
	 * The floor is 2 rather than 1: at 1 every Cell is at the cap the moment it
	 * is born, so with the Explosion on every live Cell detonates every
	 * Generation and the Grid saturates, and with it off nothing ever traverses
	 * the Colour Gradient because every Cell is already at its end. Neither is a
	 * setting, they are both the control ceasing to mean anything.
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
	 * Staged, not live — applied when a Run starts.
	 *
	 * **The floor is set by the largest Pattern the product ships, not by what
	 * Life needs.** It was 16, on the reasoning that a smaller Bounded Edge Grid
	 * destroys almost everything before it moves. Offering Patterns replaced that
	 * with a harder constraint: a Grid that cannot hold Gosper's gun (36 × 9) would
	 * mean either a clipped Pattern or a control that refuses, and 50 removes the
	 * case entirely — every selectable Grid holds every Pattern, so there is no
	 * disabled state to design and no partial Pattern to guard against. A Pattern
	 * larger than this floor is caught by the bounds test rather than by a Viewer
	 * selecting it; see `largestPatternExtent()` in `sim/patterns.ts`.
	 *
	 * The floor therefore equals the default, so the Grid sliders start at their
	 * minimum and only move upward. That is a real loss — small Grids were
	 * reachable before — and it is the price of the Pattern list.
	 *
	 * The ceiling is where the instance product stops being defensible: the cost
	 * is area, so 96 is not twice 50 but nearly four times it.
	 */
	gridWidth: { min: 50, max: 96, step: 1 },
	gridHeight: { min: 50, max: 96, step: 1 },
} as const satisfies Record<string, SettingBound>;

/** Any setting with a declared range. */
export type BoundedSetting = keyof typeof SETTING_BOUNDS;

/**
 * Starting values, chosen to look right rather than to stress anything.
 *
 * The Grid is small enough that individual Cells are legible at the default
 * camera distance, and the Depth Window deep enough that a glider's diagonal
 * reads as a streak. Together they set the instance count — 50 × 50 × 60 is
 * 150,000 — which is comfortable everywhere.
 *
 * The Grid is 50 rather than 48 because that is the floor Patterns impose, and
 * it happens to suit the Depth Window: Gosper's gun leaves its gliders about
 * fourteen columns of diagonal travel before the Bounded Edge, which is roughly
 * 56 Generations, so a glider's whole life very nearly fills the 60 Layers on
 * screen and its streak spans the structure rather than stopping part-way up.
 *
 * These are not the ceiling. What a device can actually afford is measured
 * rather than assumed, and that work has its own issue.
 *
 * Maximum Age starts at its own ceiling, which is the one default here chosen
 * for character rather than for comfort — see `SETTING_BOUNDS.maximumAge`.
 *
 * The Explosion starts on, and the alternative is worse than it sounds. With it
 * off the rule is plain Conway on a Bounded Edge Grid — nothing at all happens
 * at Maximum Age — and the PRD is explicit about where that ends up: still lifes
 * and blinkers within a few hundred Generations, after which the structure is
 * unchanging vertical stripes extruding upward forever. That is the state the
 * cap exists to prevent, so it is not somewhere a first-time Viewer should land
 * without having asked for it.
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
	gridWidth: 50,
	gridHeight: 50,
	depthWindow: 60,
	maximumAge: 200,
	explosion: true,
	generationsPerSecond: 10,
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

/**
 * Applies the rule a Run's Seed requires, before that Run starts.
 *
 * **A Pattern switches the Explosion off. Random changes nothing.**
 *
 * Most Patterns worth shipping rest on Cells that never change state, and those
 * Cells reach Maximum Age. Gosper's gun rests on four: with the Explosion on it
 * runs perfectly for about two hundred Generations and then blows itself apart,
 * which reads as the product breaking rather than as a rule worth watching. A
 * Pattern is a description of one Run rather than a value the product holds, so
 * the rule that Run needs is part of what the Viewer chose.
 *
 * The asymmetry is the whole of it, and it is deliberate: `null` falls through
 * untouched, so pressing Random after a Pattern inherits the Explosion off and
 * with it a Run that decays into still lifes. That cost was accepted rather than
 * overlooked — restoring the Explosion on Random would reset the control every
 * time a Pattern was re-selected, taking away the reading where the gun detonates
 * on schedule. The switch stays live, and the Viewer can see it is off.
 *
 * Lives here rather than in the composition root so it can be tested at all: the
 * root imports three.js and is reachable by no unit test. This is the only rule
 * in the product where one control moves another, which is exactly the kind of
 * thing that should not sit in an untestable module.
 *
 * Mutates rather than returning a copy, because the panel holds a reference to
 * this object and reads it back to redraw — a copy would update the Run and leave
 * the interface asserting a rule that is not running.
 */
export function applyStartRule(
	settings: Settings,
	pattern: Pattern | null,
): void {
	if (pattern !== null) {
		settings.explosion = false;
	}
}

/** Digits after the decimal point in a step, so rounding matches it exactly. */
function decimalPlaces(step: number): number {
	const text = String(step);
	const point = text.indexOf(".");
	return point === -1 ? 0 : text.length - point - 1;
}
