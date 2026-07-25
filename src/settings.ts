/**
 * The values a Run starts with.
 *
 * All of these become Viewer controls in later issues. They live here so there
 * is one place to look when the interface arrives, rather than constants
 * scattered through the modules that happen to consume them.
 */
export interface Settings {
	/** Columns and rows in the Grid. Applied on Restart. */
	gridWidth: number;
	gridHeight: number;
	/** N — Layers of history retained. */
	depthWindow: number;
	/** Age at which a Cell dies regardless of its neighbours. */
	maximumAge: number;
	/** Generations advanced per second. */
	generationsPerSecond: number;
}

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
};
