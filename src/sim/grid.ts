/**
 * The bounded two-dimensional field a Run takes place on.
 *
 * This module — and everything else under `src/sim/` — must never import
 * three.js, touch the DOM, or reference rendering concepts. That isolation is
 * what makes the simulation testable at all.
 */

/**
 * A single generation of the Grid.
 *
 * Cell state and Age are the same value: `ages[i]` is 0 when the Cell is dead
 * and its Age when alive. Storing them separately would allow states that
 * cannot occur — alive with no Age, dead carrying an Age — so they are not
 * stored separately.
 */
export interface Grid {
	readonly width: number;
	readonly height: number;
	/** Row-major Age per position. 0 means dead. */
	readonly ages: Uint16Array;
}

/** Largest Age representable, and therefore the ceiling on Maximum Age. */
export const MAX_REPRESENTABLE_AGE = 65535;

export function createGrid(width: number, height: number): Grid {
	if (!Number.isInteger(width) || !Number.isInteger(height)) {
		throw new Error(`Grid dimensions must be integers, got ${width}x${height}`);
	}
	if (width < 1 || height < 1) {
		throw new Error(
			`Grid dimensions must be at least 1x1, got ${width}x${height}`,
		);
	}

	return { width, height, ages: new Uint16Array(width * height) };
}

/** Row-major offset of a position. Callers must ensure the position is in bounds. */
export function indexOf(grid: Grid, column: number, row: number): number {
	return row * grid.width + column;
}

export function contains(grid: Grid, column: number, row: number): boolean {
	return column >= 0 && column < grid.width && row >= 0 && row < grid.height;
}

/**
 * Age at a position, or 0 outside the Grid.
 *
 * The Bounded Edge lives here: positions beyond the Grid are permanently dead
 * and never become alive. Returning 0 rather than wrapping is what destroys a
 * pattern that reaches the boundary instead of reappearing on the far side.
 */
export function ageAt(grid: Grid, column: number, row: number): number {
	if (!contains(grid, column, row)) {
		return 0;
	}
	return grid.ages[indexOf(grid, column, row)] ?? 0;
}

export function isAlive(grid: Grid, column: number, row: number): boolean {
	return ageAt(grid, column, row) > 0;
}

/** Sets a position's Age directly. Out-of-bounds writes are ignored. */
export function setAgeAt(
	grid: Grid,
	column: number,
	row: number,
	age: number,
): void {
	if (!contains(grid, column, row)) {
		return;
	}
	grid.ages[indexOf(grid, column, row)] = age;
}

const NEIGHBOUR_OFFSETS: ReadonlyArray<readonly [number, number]> = [
	[-1, -1],
	[0, -1],
	[1, -1],
	[-1, 0],
	[1, 0],
	[-1, 1],
	[0, 1],
	[1, 1],
];

/**
 * How many of the eight surrounding positions hold a live Cell.
 *
 * Eight, not twenty-six — neighbours are counted within a single Generation.
 * The third axis of this product is time, not space.
 */
export function liveNeighbourCount(
	grid: Grid,
	column: number,
	row: number,
): number {
	let count = 0;
	for (const offset of NEIGHBOUR_OFFSETS) {
		if (isAlive(grid, column + offset[0], row + offset[1])) {
			count++;
		}
	}
	return count;
}

/** Number of live Cells in the Grid. */
export function population(grid: Grid): number {
	let count = 0;
	for (const age of grid.ages) {
		if (age > 0) {
			count++;
		}
	}
	return count;
}

/** Clears every position to dead, reusing the existing buffer. */
export function clearGrid(grid: Grid): void {
	grid.ages.fill(0);
}
