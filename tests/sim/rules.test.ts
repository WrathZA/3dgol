import { beforeEach, describe, expect, it } from "vitest";

import { ageAt, createGrid, type Grid } from "@/sim/grid";
import { nextAge, nextGeneration } from "@/sim/rules";

import {
	aliveCells,
	gridFromPattern,
	NO_AGE_LIMIT,
	patternFromGrid,
} from "./helpers";

/**
 * Advances `count` Generations, returning the resulting Grid.
 *
 * Works on a copy. Buffer swapping means the second Generation writes into
 * whichever Grid it started from, so operating on `start` directly would mutate
 * the caller's fixture and make every later assertion in the same test depend on
 * the ones before it.
 */
function advance(start: Grid, count: number, maximumAge = NO_AGE_LIMIT): Grid {
	let current = createGrid(start.width, start.height);
	current.ages.set(start.ages);
	let scratch = createGrid(start.width, start.height);

	for (let generation = 0; generation < count; generation++) {
		nextGeneration(current, scratch, maximumAge);
		const previous = current;
		current = scratch;
		scratch = previous;
	}

	return current;
}

describe("classic Conway behaviour", () => {
	it("leaves a block unchanged", () => {
		const block = gridFromPattern(["....", ".##.", ".##.", "...."]);

		expect(patternFromGrid(advance(block, 1))).toEqual([
			"....",
			".##.",
			".##.",
			"....",
		]);
	});

	it("returns a blinker to its starting state every two Generations", () => {
		const blinker = gridFromPattern([
			".....",
			".....",
			".###.",
			".....",
			".....",
		]);

		expect(patternFromGrid(advance(blinker, 1))).toEqual([
			".....",
			"..#..",
			"..#..",
			"..#..",
			".....",
		]);

		expect(patternFromGrid(advance(blinker, 2))).toEqual([
			".....",
			".....",
			".###.",
			".....",
			".....",
		]);
	});

	it("displaces a glider one Cell diagonally every four Generations", () => {
		const glider = gridFromPattern([
			".#........",
			"..#.......",
			"###.......",
			"..........",
			"..........",
			"..........",
			"..........",
			"..........",
			"..........",
			"..........",
		]);

		expect(patternFromGrid(advance(glider, 4))).toEqual([
			"..........",
			"..#.......",
			"...#......",
			".###......",
			"..........",
			"..........",
			"..........",
			"..........",
			"..........",
			"..........",
		]);
	});
});

describe("Age", () => {
	it("begins at 1 on birth", () => {
		// A dead position with exactly three live neighbours is born.
		const grid = gridFromPattern(["##.", "#..", "..."]);

		expect(ageAt(advance(grid, 1), 1, 1)).toBe(1);
	});

	it("increases by one for each Generation a Cell survives", () => {
		const block = gridFromPattern(["....", ".##.", ".##.", "...."]);

		expect(ageAt(block, 1, 1)).toBe(1);
		expect(ageAt(advance(block, 1), 1, 1)).toBe(2);
		expect(ageAt(advance(block, 2), 1, 1)).toBe(3);
		expect(ageAt(advance(block, 5), 1, 1)).toBe(6);
	});

	it("starts again at 1 when a Cell dies and is later reborn", () => {
		// In a blinker, the two end Cells of each phase die and are reborn two
		// Generations later. Their Age must not resume where it left off.
		const blinker = gridFromPattern([
			".....",
			".....",
			".###.",
			".....",
			".....",
		]);

		// Centre Cell survives every Generation, so its Age climbs.
		expect(ageAt(advance(blinker, 2), 2, 2)).toBe(3);

		// This end Cell is dead at Generation 1 and reborn at Generation 2.
		expect(ageAt(advance(blinker, 1), 1, 2)).toBe(0);
		expect(ageAt(advance(blinker, 2), 1, 2)).toBe(1);
	});
});

describe("Death by Old Age", () => {
	it("kills a Cell at Maximum Age regardless of its neighbour count", () => {
		// Two live neighbours would normally mean survival.
		expect(nextAge(3, 2, 3)).toBe(0);
		expect(nextAge(3, 3, 3)).toBe(0);
		expect(nextAge(2, 2, 3)).toBe(3);
	});

	it("destroys a block once its Cells reach Maximum Age", () => {
		const block = gridFromPattern(["....", ".##.", ".##.", "...."]);

		// Ages run 1, 2, 3 — then every Cell is at the cap and dies together.
		expect(aliveCells(advance(block, 2, 3))).toHaveLength(4);
		expect(aliveCells(advance(block, 3, 3))).toHaveLength(0);
	});

	it("rejects a Maximum Age below 1", () => {
		const grid = createGrid(3, 3);
		const scratch = createGrid(3, 3);

		expect(() => nextGeneration(grid, scratch, 0)).toThrow();
		expect(() => nextGeneration(grid, scratch, 1.5)).toThrow();
	});

	it("rejects Grids of differing dimensions", () => {
		expect(() =>
			nextGeneration(createGrid(3, 3), createGrid(4, 3), 10),
		).toThrow();
	});
});

describe("Bounded Edge", () => {
	let glider: Grid;

	beforeEach(() => {
		glider = gridFromPattern([
			".#......",
			"..#.....",
			"###.....",
			"........",
			"........",
			"........",
			"........",
			"........",
		]);
	});

	it("destroys a glider that reaches the boundary rather than wrapping it", () => {
		// Travelling south-east, the glider needs ~20 Generations to reach the
		// far corner of an 8x8 Grid. By Generation 40 it has long since arrived.
		const settled = advance(glider, 40);
		const stillSettled = advance(glider, 41);

		// Whatever debris remains no longer moves — the glider is gone, not
		// circulating.
		expect(aliveCells(settled)).toEqual(aliveCells(stillSettled));

		// And nothing reappeared in the corner it started from.
		const topLeft = aliveCells(settled).filter((cell) => {
			const [column, row] = cell.split(",").map(Number);
			return (column ?? 0) < 3 && (row ?? 0) < 3;
		});
		expect(topLeft).toEqual([]);
	});
});
