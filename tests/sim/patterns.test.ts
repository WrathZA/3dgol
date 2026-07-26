import { describe, expect, it } from "vitest";

import { SETTING_BOUNDS } from "@/settings";
import {
	GOSPER_GLIDER_GUN,
	largestPatternExtent,
	PATTERNS,
	patternHasCellAt,
	patternHeight,
	patternWidth,
} from "@/sim/patterns";

describe("Pattern data", () => {
	it("measures a Pattern by its longest row, so ragged rows are allowed", () => {
		// The gun's rows are deliberately not padded to equal length — trailing dead
		// Cells are noise in the source and the shape is easier to read without them.
		const rows = GOSPER_GLIDER_GUN.rows.map((row) => row.length);
		expect(Math.min(...rows)).toBeLessThan(Math.max(...rows));

		expect(patternWidth(GOSPER_GLIDER_GUN)).toBe(36);
		expect(patternHeight(GOSPER_GLIDER_GUN)).toBe(9);
	});

	it("reads a position past the end of a short row as dead", () => {
		// Row 7 is 16 characters. Anything beyond it is dead rather than undefined.
		expect(patternHasCellAt(GOSPER_GLIDER_GUN, 35, 7)).toBe(false);
		expect(patternHasCellAt(GOSPER_GLIDER_GUN, 11, 7)).toBe(true);
	});

	it("holds the two reflector blocks the gun depends on", () => {
		// The left block at rows 4-5, columns 0-1, and the right at rows 2-3,
		// columns 34-35. They are catalysts rather than still lifes: the shuttle
		// disturbs each block's inner face every cycle and the block reforms, so
		// only the outer column of each is continuously alive. Those four Cells are
		// what reaches Maximum Age, which is why the Explosion dismantles the gun.
		for (const [column, row] of [
			[0, 4],
			[1, 4],
			[0, 5],
			[1, 5],
			[34, 2],
			[35, 2],
			[34, 3],
			[35, 3],
		] as const) {
			expect(patternHasCellAt(GOSPER_GLIDER_GUN, column, row)).toBe(true);
		}
	});

	it("fits every Pattern inside the smallest Grid the Viewer can select", () => {
		// The binding constraint on the Grid floor, asserted rather than assumed:
		// adding a Pattern larger than the floor fails here rather than when a
		// Viewer selects it and gets a clipped shape.
		const largest = largestPatternExtent();

		expect(largest.width).toBeLessThanOrEqual(SETTING_BOUNDS.gridWidth.min);
		expect(largest.height).toBeLessThanOrEqual(SETTING_BOUNDS.gridHeight.min);
	});

	it("offers at least one Pattern, or the control has nothing to show", () => {
		expect(PATTERNS.length).toBeGreaterThan(0);
	});
});
