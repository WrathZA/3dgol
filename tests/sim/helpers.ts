import { ageAt, createGrid, type Grid, setAgeAt } from "@/sim/grid";

/**
 * Builds a Grid from a picture. `#` is a live Cell at Age 1, anything else dead.
 *
 * Patterns are written as they appear, so a test failure can be read against the
 * shape it was meant to produce.
 */
export function gridFromPattern(rows: readonly string[]): Grid {
	const height = rows.length;
	const width = Math.max(...rows.map((row) => row.length));
	const grid = createGrid(width, height);

	rows.forEach((line, row) => {
		for (let column = 0; column < line.length; column++) {
			if (line[column] === "#") {
				setAgeAt(grid, column, row, 1);
			}
		}
	});

	return grid;
}

/** Renders the live Cells of a Grid as a picture, for comparison against a pattern. */
export function patternFromGrid(grid: Grid): string[] {
	const rows: string[] = [];
	for (let row = 0; row < grid.height; row++) {
		let line = "";
		for (let column = 0; column < grid.width; column++) {
			line += ageAt(grid, column, row) > 0 ? "#" : ".";
		}
		rows.push(line);
	}
	return rows;
}

/** Sorted `column,row` keys of every live Cell — order-independent comparison. */
export function aliveCells(grid: Grid): string[] {
	const cells: string[] = [];
	for (let row = 0; row < grid.height; row++) {
		for (let column = 0; column < grid.width; column++) {
			if (ageAt(grid, column, row) > 0) {
				cells.push(`${column},${row}`);
			}
		}
	}
	return cells.sort();
}

/** An Age high enough that the Explosion never fires during a test. */
export const NO_AGE_LIMIT = 10_000;
