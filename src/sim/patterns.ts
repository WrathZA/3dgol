/**
 * Named starting arrangements a Run can begin from, as data.
 *
 * Pure data and nothing else — no placement policy, no rendering, no reference
 * to the panel that offers them. A Pattern is a picture of live Cells; where it
 * goes on the Grid and when it is used belong to the Simulation and the caller
 * respectively.
 *
 * Written as rows of characters rather than coordinate pairs because the whole
 * point of a curated Pattern is that a human recognises it. `#` is alive, every
 * other character is dead, and a shorter row is padded with dead positions — so
 * trailing dots are optional and the shape stays readable in the source.
 *
 * Adding a Pattern is adding an entry to `PATTERNS`. Nothing else changes: the
 * control reads that array, and the Simulation takes whatever it is handed.
 */

export interface Pattern {
	/** What the Viewer sees in the control. */
	readonly name: string;
	/** Rows of `#` (alive) and anything else (dead), top row first. */
	readonly rows: readonly string[];
}

/**
 * Gosper's glider gun — the first known pattern to grow without bound.
 *
 * Chosen as the first Pattern because it demonstrates the product's premise more
 * directly than anything else available. A glider is a diagonal streak through
 * time; a gun emits one every 30 Generations, so it lays down a regular lattice
 * of parallel diagonal streaks — a shape that is genuinely invisible in a flat
 * renderer and that a random Seed only ever produces by accident.
 *
 * It depends on two stationary reflector blocks whose Cells never change state,
 * which is why it needs the Explosion switched off to run indefinitely: with the
 * Explosion on those blocks reach Maximum Age and detonate, and the gun
 * dismantles itself. Both readings are worth seeing and neither is wrong — see
 * #30, which made that a choice rather than the only outcome.
 *
 * 36 × 9. The two blocks at the left and right ends are the reflectors; the
 * machinery between them is the pair of queen-bee shuttles that produce a glider
 * on every collision.
 */
export const GOSPER_GLIDER_GUN: Pattern = {
	name: "Gosper's glider gun",
	rows: [
		"........................#",
		"......................#.#",
		"............##......##............##",
		"...........#...#....##............##",
		"##........#.....#...##",
		"##........#...#.##....#.#",
		"..........#.....#.......#",
		"...........#...#",
		"............##",
	],
};

/** Every Pattern the product offers, in the order the control lists them. */
export const PATTERNS: readonly Pattern[] = [GOSPER_GLIDER_GUN];

/** Columns the Pattern spans — its longest row. */
export function patternWidth(pattern: Pattern): number {
	return pattern.rows.reduce((widest, row) => Math.max(widest, row.length), 0);
}

/** Rows the Pattern spans. */
export function patternHeight(pattern: Pattern): number {
	return pattern.rows.length;
}

/**
 * Whether a live Cell sits at this position within the Pattern.
 *
 * Out-of-range positions are dead rather than an error, which is what lets rows
 * be ragged: a row shorter than the Pattern's width is padded with dead Cells
 * instead of having to be filled with dots.
 */
export function patternHasCellAt(
	pattern: Pattern,
	column: number,
	row: number,
): boolean {
	return pattern.rows[row]?.[column] === "#";
}

/**
 * The largest Pattern the product ships, as columns and rows.
 *
 * Derived rather than written down, and that is the point: it is what the Grid
 * floor is set from (see `SETTING_BOUNDS.gridWidth` in `settings.ts`), so adding
 * a Pattern larger than the floor is caught by the bounds test rather than by a
 * Viewer selecting it.
 */
export function largestPatternExtent(): { width: number; height: number } {
	return {
		width: PATTERNS.reduce(
			(widest, pattern) => Math.max(widest, patternWidth(pattern)),
			0,
		),
		height: PATTERNS.reduce(
			(tallest, pattern) => Math.max(tallest, patternHeight(pattern)),
			0,
		),
	};
}
