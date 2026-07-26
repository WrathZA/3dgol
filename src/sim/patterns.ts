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
	/**
	 * Stable identifier, independent of position in `PATTERNS`.
	 *
	 * Deliberately not the index. An index breaks the first time the list is
	 * reordered or an entry removed, and it breaks in the worst way — a link
	 * still resolves, to the wrong Pattern. #50 uses this as a URL parameter, so
	 * changing an id after release breaks every link already shared.
	 */
	readonly id: string;
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
 * It depends on two reflector blocks, and those are **catalysts rather than
 * still lifes** — the shuttle disturbs each block's inner face every cycle and
 * the block reforms, so only the *outer* column of each is continuously alive.
 * Those four Cells are the ones that age without interruption, so those are the
 * ones that reach Maximum Age: with the Explosion on they detonate and the gun
 * dismantles itself, which is why this Pattern waited on #30. Both readings are
 * worth seeing and neither is wrong — #30 made it a choice rather than the only
 * outcome.
 *
 * 36 × 9, 36 live Cells, period 30. The two blocks at the left and right ends
 * are the reflectors; the machinery between them is the pair of queen-bee
 * shuttles that produce a glider on every collision.
 */
export const GOSPER_GLIDER_GUN: Pattern = {
	id: "gosper-glider-gun",
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

/**
 * The pulsar — the most common period-3 oscillator, and the most ornate shape
 * on the list.
 *
 * Four-fold symmetric in both axes, so its cross-section reads as a figure
 * rather than as a smudge, and a three-Generation period means the column
 * repeats twenty times inside the default Depth Window. The clearest available
 * demonstration that an oscillator is a *column* with a repeating cross-section,
 * which is one of the three things the PRD says a flat renderer cannot show.
 *
 * 13 × 13, 48 Cells.
 */
export const PULSAR: Pattern = {
	id: "pulsar",
	name: "Pulsar",
	rows: [
		"..###...###",
		"",
		"#....#.#....#",
		"#....#.#....#",
		"#....#.#....#",
		"..###...###",
		"",
		"..###...###",
		"#....#.#....#",
		"#....#.#....#",
		"#....#.#....#",
		"",
		"..###...###",
	],
};

/**
 * The pentadecathlon — period 15, the longest-period small oscillator here.
 *
 * Worth its place precisely because of that period. A period-2 or period-3
 * column repeats too fast to read as anything but texture; fifteen Layers is
 * slow enough that the braid is legible as a shape while still repeating four
 * times inside the default Depth Window.
 *
 * 10 × 3 at rest, expanding to 10 × 9 through its cycle.
 */
export const PENTADECATHLON: Pattern = {
	id: "pentadecathlon",
	name: "Pentadecathlon",
	rows: ["..#....#..", "##.####.##", "..#....#.."],
};

/**
 * Kok's galaxy — period 8, and the only oscillator here that visibly rotates.
 *
 * Its symmetry is rotational rather than reflective, so successive Layers turn
 * rather than pulse. Through time that reads as a twisting column, which is a
 * different shape from anything else on the list.
 *
 * 9 × 9 at rest, expanding to 13 × 13 through its cycle — so it needs room
 * beyond its starting extent, which the Grid floor of 50 provides comfortably.
 */
export const KOKS_GALAXY: Pattern = {
	id: "koks-galaxy",
	name: "Kok's galaxy",
	rows: [
		"######.##",
		"######.##",
		".......##",
		"##.....##",
		"##.....##",
		"##.....##",
		"##.......",
		"##.######",
		"##.######",
	],
};

/**
 * The queen bee shuttle — period 30, and the engine inside Gosper's gun.
 *
 * A shuttle travelling back and forth between two stationary blocks, which is
 * what a gun is built from: the gun is two of these arranged so their output
 * collides into gliders. Alone it emits nothing, so what it offers is the
 * mechanism rather than the product — a zigzag column, thirty Layers a cycle.
 *
 * The blocks at each end are load-bearing. Without them the shuttle destroys
 * itself; they are the catalysts it reflects off, and they are what makes this
 * period 30 rather than a brief mess.
 *
 * 22 × 7.
 */
export const QUEEN_BEE_SHUTTLE: Pattern = {
	id: "queen-bee-shuttle",
	name: "Queen bee shuttle",
	rows: [
		".........#",
		".......#.#",
		"......#.#",
		"##...#..#...........##",
		"##....#.#...........##",
		".......#.#",
		".........#",
	],
};

/**
 * The R-pentomino — five Cells, and the most famous methuselah in Life.
 *
 * The largest gap on this list between what you start with and what you get.
 * Five Cells produce roughly eleven hundred Generations of chaos on an
 * unbounded Grid; on a Bounded Edge Grid it collides with the boundary sooner
 * and settles earlier, but the churn is still enormous relative to the input.
 *
 * With the Explosion off — which choosing any Pattern does, see #46 — it
 * eventually stabilises into still lifes and blinkers, and from that point the
 * structure is unchanging. That is accepted rather than overlooked: the Viewer
 * sees the interesting part first, and switching the Explosion back on
 * re-seeds the settled region on the next Generation.
 *
 * 3 × 3, 5 Cells.
 */
export const R_PENTOMINO: Pattern = {
	id: "r-pentomino",
	name: "R-pentomino",
	rows: [".##", "##.", ".#."],
};

/**
 * The acorn — seven Cells, and a longer fuse than the R-pentomino.
 *
 * Runs for several thousand Generations unbounded, and sprawls much further
 * before settling. On this Grid the Bounded Edge cuts that short, but it fills
 * the space more completely than anything else here starts to.
 *
 * Same caveat as the R-pentomino: with the Explosion off it eventually settles.
 *
 * 7 × 3, 7 Cells.
 */
export const ACORN: Pattern = {
	id: "acorn",
	name: "Acorn",
	rows: [".#", "...#", "##..###"],
};

/**
 * Every Pattern the product offers, in the order the control lists them.
 *
 * Ordered by what a Viewer arriving with no context should try first rather
 * than alphabetically or by size: the gun demonstrates the premise most
 * directly, the oscillators show the same idea more simply, and the methuselahs
 * are the ones worth watching once you know what you are looking at.
 *
 * Two Patterns were considered and deliberately left out (#49):
 *
 * - **A lone spaceship** — a lightweight spaceship travels about forty-eight
 *   Cells before the Bounded Edge destroys it, and the Grid is then empty and
 *   stays empty. An empty structure is the one thing this product cannot show,
 *   and the streak it draws is one the gun already produces.
 * - **Simkin's glider gun** — period 120 against a default Depth Window of 60,
 *   so a Viewer at the default would see under half an emission cycle: a mostly
 *   static blob with an occasional streak, strictly worse than the gun already
 *   here for anyone who does not know to raise Depth.
 */
export const PATTERNS: readonly Pattern[] = [
	GOSPER_GLIDER_GUN,
	PULSAR,
	PENTADECATHLON,
	KOKS_GALAXY,
	QUEEN_BEE_SHUTTLE,
	R_PENTOMINO,
	ACORN,
];

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
