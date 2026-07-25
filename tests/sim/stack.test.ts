import { beforeEach, describe, expect, it } from "vitest";

import { createGrid, type Grid, setAgeAt } from "@/sim/grid";
import { LayerStack } from "@/sim/stack";

/** A Grid whose first Cell carries `marker`, so a Layer can be identified later. */
function markedGrid(marker: number, width = 3, height = 3): Grid {
	const grid = createGrid(width, height);
	setAgeAt(grid, 0, 0, marker);
	return grid;
}

/** The marker written by `markedGrid`, read back from a Layer. */
function markerOf(layer: Uint16Array): number {
	return layer[0] ?? 0;
}

describe("LayerStack", () => {
	let stack: LayerStack;

	beforeEach(() => {
		stack = new LayerStack(3, 3, 4);
	});

	it("rejects a Depth Window below 1", () => {
		expect(() => new LayerStack(3, 3, 0)).toThrow();
		expect(() => new LayerStack(3, 3, 2.5)).toThrow();
	});

	it("rejects Layer dimensions below 1x1", () => {
		expect(() => new LayerStack(0, 3, 4)).toThrow();
	});

	it("starts empty", () => {
		expect(stack.depth).toBe(0);
		expect(() => stack.layerAt(0)).toThrow();
	});

	it("adds exactly one Layer per push, newest at depth 0", () => {
		stack.push(markedGrid(1), 0);
		stack.push(markedGrid(2), 1);

		expect(stack.depth).toBe(2);
		expect(markerOf(stack.layerAt(0))).toBe(2);
		expect(markerOf(stack.layerAt(1))).toBe(1);
	});

	it("copies the Grid rather than referencing it", () => {
		// The Simulation reuses its Grid buffers between Generations. If a Layer
		// held a reference, every Layer would silently become the current
		// Generation.
		const grid = markedGrid(7);
		stack.push(grid, 0);

		setAgeAt(grid, 0, 0, 99);

		expect(markerOf(stack.layerAt(0))).toBe(7);
	});

	it("leaves a held Layer unchanged as newer Layers arrive", () => {
		stack.push(markedGrid(1), 0);
		stack.push(markedGrid(2), 1);
		stack.push(markedGrid(3), 2);

		// The Layer pushed first is now at depth 2 and still holds its own state.
		expect(markerOf(stack.layerAt(2))).toBe(1);
	});

	it("rejects a Grid of the wrong dimensions", () => {
		expect(() => stack.push(createGrid(4, 3), 0)).toThrow();
	});

	it("rejects a negative or non-integer Generation", () => {
		expect(() => stack.push(markedGrid(1), -1)).toThrow();
		expect(() => stack.push(markedGrid(1), 1.5)).toThrow();
	});

	describe("Retirement", () => {
		it("retires exactly one Layer — the oldest — when full", () => {
			for (let marker = 1; marker <= 4; marker++) {
				stack.push(markedGrid(marker), marker - 1);
			}
			expect(stack.depth).toBe(4);

			stack.push(markedGrid(5), 4);

			expect(stack.depth).toBe(4);
			expect(markerOf(stack.layerAt(0))).toBe(5);
			expect(markerOf(stack.layerAt(3))).toBe(2); // marker 1 retired
			expect(() => stack.layerAt(4)).toThrow();
		});

		it("holds constant memory however long the Run goes", () => {
			const bytesWhenEmpty = stack.byteLength;

			for (let generation = 0; generation < 10_000; generation++) {
				stack.push(markedGrid(generation % 65535), generation);
			}

			expect(stack.byteLength).toBe(bytesWhenEmpty);
			expect(stack.depth).toBe(4);
		});
	});

	describe("Generation", () => {
		it("derives a Layer's Generation from its depth", () => {
			stack.push(markedGrid(1), 10);
			stack.push(markedGrid(2), 11);
			stack.push(markedGrid(3), 12);

			expect(stack.newestGeneration).toBe(12);
			expect(stack.generationAt(0)).toBe(12);
			expect(stack.generationAt(1)).toBe(11);
			expect(stack.generationAt(2)).toBe(10);
		});

		it("throws for a depth the Stack does not hold", () => {
			stack.push(markedGrid(1), 0);

			expect(() => stack.generationAt(1)).toThrow();
			expect(() => stack.generationAt(-1)).toThrow();
		});
	});

	describe("Depth Window resize", () => {
		beforeEach(() => {
			for (let marker = 1; marker <= 4; marker++) {
				stack.push(markedGrid(marker), marker - 1);
			}
		});

		it("trims from the oldest end when lowered", () => {
			stack.maxDepth = 2;

			expect(stack.maxDepth).toBe(2);
			expect(stack.depth).toBe(2);
			expect(markerOf(stack.layerAt(0))).toBe(4);
			expect(markerOf(stack.layerAt(1))).toBe(3);
			expect(() => stack.layerAt(2)).toThrow();
		});

		it("preserves everything held when raised", () => {
			stack.maxDepth = 8;

			expect(stack.maxDepth).toBe(8);
			expect(stack.depth).toBe(4);
			expect(markerOf(stack.layerAt(0))).toBe(4);
			expect(markerOf(stack.layerAt(3))).toBe(1);
		});

		it("keeps growing correctly after being raised", () => {
			stack.maxDepth = 6;
			stack.push(markedGrid(5), 4);
			stack.push(markedGrid(6), 5);

			expect(stack.depth).toBe(6);
			expect(markerOf(stack.layerAt(0))).toBe(6);
			expect(markerOf(stack.layerAt(5))).toBe(1);

			// Full again — the next push must retire the oldest.
			stack.push(markedGrid(7), 6);
			expect(stack.depth).toBe(6);
			expect(markerOf(stack.layerAt(5))).toBe(2);
		});

		it("keeps retiring correctly after being lowered", () => {
			stack.maxDepth = 2;
			stack.push(markedGrid(5), 4);

			expect(stack.depth).toBe(2);
			expect(markerOf(stack.layerAt(0))).toBe(5);
			expect(markerOf(stack.layerAt(1))).toBe(4);
		});

		it("is a no-op when set to the current value", () => {
			stack.maxDepth = 4;

			expect(stack.depth).toBe(4);
			expect(markerOf(stack.layerAt(0))).toBe(4);
		});

		it("rejects a Depth Window below 1", () => {
			expect(() => {
				stack.maxDepth = 0;
			}).toThrow();
		});
	});

	it("empties on clear", () => {
		stack.push(markedGrid(1), 0);
		stack.push(markedGrid(2), 1);

		stack.clear();

		expect(stack.depth).toBe(0);
		expect(() => stack.layerAt(0)).toThrow();
	});
});
