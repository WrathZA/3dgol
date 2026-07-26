import { describe, expect, it } from "vitest";

import { ageAt, createGrid, type Grid, population, setAgeAt } from "@/sim/grid";
import {
	ACORN,
	KOKS_GALAXY,
	type Pattern,
	PENTADECATHLON,
	PULSAR,
	patternHasCellAt,
	patternHeight,
	patternWidth,
	QUEEN_BEE_SHUTTLE,
	R_PENTOMINO,
} from "@/sim/patterns";
import { nextGeneration } from "@/sim/rules";

/**
 * Is this Pattern actually the Pattern it claims to be?
 *
 * The one question a transcription error survives everywhere else. A wrong
 * arrangement still renders, still has a plausible cell count, and still looks
 * like *something* — so eyeballing it proves nothing. What a wrong arrangement
 * cannot do is keep a period.
 *
 * Every oscillator below is advanced exactly one period and compared against
 * Generation 0. A layout with a misplaced Cell either dies, drifts, or settles
 * at a different period, and all three fail this. The methuselahs have no
 * period, so they are pinned by their exact starting Cell count and by
 * outliving several hundred Generations.
 *
 * The Grid is deliberately large and the Explosion off, so the Bounded Edge and
 * the rule's own additions cannot interfere with what is being measured.
 */

const ROOM = 60;

/** Places a Pattern well clear of the boundary and returns the Grid. */
function seed(pattern: Pattern): Grid {
	const grid = createGrid(ROOM, ROOM);
	const column = Math.floor((ROOM - patternWidth(pattern)) / 2);
	const row = Math.floor((ROOM - patternHeight(pattern)) / 2);

	for (let r = 0; r < patternHeight(pattern); r++) {
		for (let c = 0; c < patternWidth(pattern); c++) {
			if (patternHasCellAt(pattern, c, r)) {
				setAgeAt(grid, column + c, row + r, 1);
			}
		}
	}

	return grid;
}

/** Advances `count` Generations with the Explosion off, on a copy. */
function advance(start: Grid, count: number): Grid {
	let current = createGrid(start.width, start.height);
	current.ages.set(start.ages);
	let scratch = createGrid(start.width, start.height);

	for (let generation = 0; generation < count; generation++) {
		nextGeneration(current, scratch, 100_000, false);
		const previous = current;
		current = scratch;
		scratch = previous;
	}

	return current;
}

/** Live positions as a sorted list, so two Grids can be compared exactly. */
function livePositions(grid: Grid): string[] {
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

describe("oscillator fidelity", () => {
	const oscillators: ReadonlyArray<{
		pattern: Pattern;
		period: number;
		cells: number;
	}> = [
		{ pattern: PULSAR, period: 3, cells: 48 },
		{ pattern: PENTADECATHLON, period: 15, cells: 12 },
		{ pattern: KOKS_GALAXY, period: 8, cells: 48 },
		{ pattern: QUEEN_BEE_SHUTTLE, period: 30, cells: 20 },
	];

	for (const { pattern, period, cells } of oscillators) {
		it(`${pattern.name} returns to its starting state after ${period} Generations`, () => {
			const start = seed(pattern);
			const before = livePositions(start);

			// Not dead, and not something that merely happens to be drawn.
			expect(before.length).toBeGreaterThan(0);
			if (cells > 0) {
				expect(before.length).toBe(cells);
			}

			expect(livePositions(advance(start, period))).toEqual(before);
		});

		it(`${pattern.name} does not return early, so the period is exactly ${period}`, () => {
			// Guards against a layout that is stable, or has a shorter period than
			// claimed — a still life passes the test above trivially.
			const start = seed(pattern);
			const before = livePositions(start);

			let returnedEarly = false;
			for (let generation = 1; generation < period; generation++) {
				if (
					livePositions(advance(start, generation)).join() === before.join()
				) {
					returnedEarly = true;
				}
			}

			expect(returnedEarly).toBe(false);
		});
	}
});

describe("methuselah fidelity", () => {
	const methuselahs: ReadonlyArray<{ pattern: Pattern; cells: number }> = [
		{ pattern: R_PENTOMINO, cells: 5 },
		{ pattern: ACORN, cells: 7 },
	];

	for (const { pattern, cells } of methuselahs) {
		it(`${pattern.name} starts with exactly ${cells} Cells`, () => {
			expect(population(seed(pattern))).toBe(cells);
		});

		it(`${pattern.name} is still running hundreds of Generations later`, () => {
			// A methuselah's whole character is outliving its size. A mistranscribed
			// one usually dies within a few dozen Generations or settles immediately,
			// so the bar is that it is still substantially alive — not a specific
			// figure, since the Bounded Edge trims the sprawl and the published
			// populations are all for an unbounded Grid.
			const after = advance(seed(pattern), 300);

			expect(population(after)).toBeGreaterThan(cells * 3);
		});

		it(`${pattern.name} eventually settles, which is the accepted cost`, () => {
			// Compared two Generations apart rather than one, because what it settles
			// into is still lifes *and blinkers* — blinkers alternate every
			// Generation and would fail a one-Generation comparison forever.
			const settled = advance(seed(pattern), 1_500);
			const later = advance(settled, 2);

			expect(livePositions(later)).toEqual(livePositions(settled));
		});
	}
});
