import { describe, expect, it } from "vitest";

import {
	ageAt,
	createGrid,
	isAlive,
	liveNeighbourCount,
	population,
	setAgeAt,
} from "@/sim/grid";

describe("Grid", () => {
	it("rejects dimensions below 1x1", () => {
		expect(() => createGrid(0, 5)).toThrow();
		expect(() => createGrid(5, -1)).toThrow();
	});

	it("rejects non-integer dimensions", () => {
		expect(() => createGrid(4.5, 5)).toThrow();
	});

	it("starts entirely dead", () => {
		expect(population(createGrid(8, 8))).toBe(0);
	});

	describe("Bounded Edge", () => {
		it("reports positions outside the Grid as dead", () => {
			const grid = createGrid(3, 3);
			setAgeAt(grid, 0, 0, 1);

			expect(isAlive(grid, 0, 0)).toBe(true);
			expect(ageAt(grid, -1, 0)).toBe(0);
			expect(ageAt(grid, 0, -1)).toBe(0);
			expect(ageAt(grid, 3, 0)).toBe(0);
			expect(ageAt(grid, 0, 3)).toBe(0);
		});

		it("does not wrap when counting neighbours", () => {
			const grid = createGrid(3, 3);
			// Live Cell on the far right edge. If the Grid wrapped, it would count
			// as a neighbour of the far left edge.
			setAgeAt(grid, 2, 1, 1);

			expect(liveNeighbourCount(grid, 0, 1)).toBe(0);
		});

		it("ignores writes outside the Grid", () => {
			const grid = createGrid(3, 3);
			setAgeAt(grid, 5, 5, 1);

			expect(population(grid)).toBe(0);
		});
	});

	it("counts the eight surrounding positions and not the position itself", () => {
		const grid = createGrid(3, 3);
		for (let row = 0; row < 3; row++) {
			for (let column = 0; column < 3; column++) {
				setAgeAt(grid, column, row, 1);
			}
		}

		expect(liveNeighbourCount(grid, 1, 1)).toBe(8);
		expect(liveNeighbourCount(grid, 0, 0)).toBe(3);
	});
});
