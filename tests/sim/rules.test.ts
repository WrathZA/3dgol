import { beforeEach, describe, expect, it } from "vitest";

import { ageAt, createGrid, type Grid, setAgeAt } from "@/sim/grid";
import { diesOfOldAge, nextAge, nextGeneration } from "@/sim/rules";

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
		const block = gridFromPattern([
			".....",
			".##..",
			".##..",
			".....",
			".....",
		]);

		// Ages run 1, 2, 3 — then every Cell is at the cap and dies together.
		expect(aliveCells(advance(block, 2, 3))).toHaveLength(4);

		// The block's own four positions are gone. What remains is the shell its
		// Explosions threw outward — none of the four revives the others, because
		// every one of them also reached the cap.
		const after = advance(block, 3, 3);
		for (const [column, row] of [
			[1, 1],
			[2, 1],
			[1, 2],
			[2, 2],
		] as const) {
			expect(ageAt(after, column, row)).toBe(0);
		}
		expect(aliveCells(after).length).toBeGreaterThan(0);
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

/**
 * The Explosion.
 *
 * A Cell reaching Maximum Age scatters life into its neighbours instead of merely
 * vacating its position. Every case below is built from an explicit Age rather
 * than reached by advancing a pattern, because the trigger is an Age and stating
 * it directly is the only way to be sure which death is being tested.
 */
describe("Explosion on Death by Old Age", () => {
	/** A Grid with one Cell placed at a given Age and nothing else alive. */
	function loneCell(size: number, column: number, row: number, age: number) {
		const grid = createGrid(size, size);
		setAgeAt(grid, column, row, age);
		return grid;
	}

	it("throws every in-bounds neighbour to Age 1", () => {
		const grid = loneCell(5, 2, 2, 4);

		const after = advance(grid, 1, 4);

		// The Cell itself is gone — it died of Old Age.
		expect(ageAt(after, 2, 2)).toBe(0);

		// All eight neighbours are alive at 1, despite a lone Cell's neighbours
		// having exactly one live neighbour each, which is ordinarily no birth.
		for (const [column, row] of [
			[1, 1],
			[2, 1],
			[3, 1],
			[1, 2],
			[3, 2],
			[1, 3],
			[2, 3],
			[3, 3],
		] as const) {
			expect(ageAt(after, column, row)).toBe(1);
		}
	});

	it("leaves neighbours alone when the death was ordinary", () => {
		// The same lone Cell, but well short of the cap: it dies of underpopulation
		// instead, and underpopulation does not explode.
		const grid = loneCell(5, 2, 2, 1);

		const after = advance(grid, 1, 50);

		expect(aliveCells(after)).toEqual([]);
	});

	it("overrides whatever the ordinary rule decided for a neighbour", () => {
		// A blinker's centre Cell survives to Age 3 while its ends are reborn at 1.
		// Put a capped Cell diagonally adjacent to the centre and the centre is
		// thrown back to 1 rather than allowed to reach 3.
		const grid = gridFromPattern([".....", ".....", ".###.", ".....", "....."]);
		setAgeAt(grid, 2, 2, 2);
		setAgeAt(grid, 1, 1, 6);

		const after = advance(grid, 1, 6);

		// Ordinarily the centre would survive and age to 3.
		expect(ageAt(after, 2, 2)).toBe(1);
		// And the exploder is gone.
		expect(ageAt(after, 1, 1)).toBe(0);
	});

	it("does not chain within a single Generation", () => {
		// The Explosion reads only the previous Generation, so a position lit up by
		// one cannot explode in the same step — everything it touches is Age 1, and
		// Age 1 is nowhere near the cap.
		const grid = loneCell(7, 3, 3, 5);

		const after = advance(grid, 1, 5);

		// Exactly the eight neighbours, not a second ring beyond them.
		expect(aliveCells(after)).toHaveLength(8);
		for (const age of after.ages) {
			expect(age === 0 || age === 1).toBe(true);
		}
	});

	it("stays inside the Bounded Edge when it detonates at a corner", () => {
		const grid = loneCell(4, 0, 0, 3);

		const after = advance(grid, 1, 3);

		// Only the three in-bounds neighbours of a corner exist to be lit.
		expect(aliveCells(after).sort()).toEqual(["0,1", "1,0", "1,1"]);
	});

	it("does not revive a neighbour that also reached the cap", () => {
		// Two adjacent Cells at the cap are each other's neighbour. Reviving them
		// would let a cluster reset itself and the age cap would stop breaking up
		// the configurations it exists to disturb.
		const grid = createGrid(5, 5);
		setAgeAt(grid, 2, 2, 4);
		setAgeAt(grid, 3, 2, 4);

		const after = advance(grid, 1, 4);

		expect(ageAt(after, 2, 2)).toBe(0);
		expect(ageAt(after, 3, 2)).toBe(0);
		// The shell around the pair is alive, so both did explode.
		expect(ageAt(after, 1, 1)).toBe(1);
		expect(ageAt(after, 4, 3)).toBe(1);
	});
});

describe("diesOfOldAge", () => {
	it("is true at the cap and beyond, so a lowered Maximum Age still kills", () => {
		expect(diesOfOldAge(24, 24)).toBe(true);
		// A Viewer lowering the slider leaves Cells already past the new value.
		expect(diesOfOldAge(200, 24)).toBe(true);
	});

	it("is false below the cap", () => {
		expect(diesOfOldAge(23, 24)).toBe(false);
	});

	it("is false for a dead position, which has no Age to have reached", () => {
		expect(diesOfOldAge(0, 24)).toBe(false);
	});
});
