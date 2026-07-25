import { describe, expect, it } from "vitest";

import { slotForGeneration, slotRange } from "@/render/instances";

/**
 * The ring arithmetic is the only part of the rendering layer that can be
 * verified without looking at anything.
 *
 * Everything else in `src/render/` needs a GPU and an eye. These two functions
 * decide which instances a Layer is written into, and getting them wrong shows
 * up as Layers at the wrong height or overwriting each other — visually
 * confusing, and hard to trace back from a picture. So they live in pure
 * functions and are tested directly.
 */
describe("slotRange", () => {
	it("gives each slot a contiguous block of instances", () => {
		expect(slotRange(0, 4, 4, 3)).toEqual({ start: 0, count: 16 });
		expect(slotRange(1, 4, 4, 3)).toEqual({ start: 16, count: 16 });
		expect(slotRange(2, 4, 4, 3)).toEqual({ start: 32, count: 16 });
	});

	it("produces blocks that neither overlap nor leave gaps", () => {
		const width = 5;
		const height = 3;
		const depthWindow = 7;

		let expectedStart = 0;
		for (let slot = 0; slot < depthWindow; slot++) {
			const range = slotRange(slot, width, height, depthWindow);
			expect(range.start).toBe(expectedStart);
			expectedStart += range.count;
		}

		// The last block ends exactly at the instance count.
		expect(expectedStart).toBe(width * height * depthWindow);
	});

	it("rejects a slot outside the ring", () => {
		expect(() => slotRange(3, 4, 4, 3)).toThrow();
		expect(() => slotRange(-1, 4, 4, 3)).toThrow();
		expect(() => slotRange(1.5, 4, 4, 3)).toThrow();
	});
});

describe("slotForGeneration", () => {
	it("assigns consecutive Generations to consecutive slots", () => {
		expect(slotForGeneration(0, 4)).toBe(0);
		expect(slotForGeneration(1, 4)).toBe(1);
		expect(slotForGeneration(2, 4)).toBe(2);
		expect(slotForGeneration(3, 4)).toBe(3);
	});

	it("wraps back to the start once the ring is full", () => {
		expect(slotForGeneration(4, 4)).toBe(0);
		expect(slotForGeneration(5, 4)).toBe(1);
		expect(slotForGeneration(103, 4)).toBe(3);
	});

	it("gives a Generation the same slot every time it recurs", () => {
		// Restart replays Generation numbers from 0. A Generation landing in a
		// different slot the second time would leave the first Run's Layer
		// stranded in the ring, visible at a height it never occupied.
		const depthWindow = 6;
		for (let generation = 0; generation < 6; generation++) {
			expect(slotForGeneration(generation, depthWindow)).toBe(
				slotForGeneration(generation + depthWindow, depthWindow),
			);
		}
	});

	it("never collides within one Depth Window", () => {
		const depthWindow = 9;
		const seen = new Set<number>();

		for (let generation = 100; generation < 100 + depthWindow; generation++) {
			seen.add(slotForGeneration(generation, depthWindow));
		}

		// Every Layer held at once occupies a distinct slot — otherwise one would
		// overwrite another still on screen.
		expect(seen.size).toBe(depthWindow);
	});

	it("rejects a negative or non-integer Generation", () => {
		expect(() => slotForGeneration(-1, 4)).toThrow();
		expect(() => slotForGeneration(2.5, 4)).toThrow();
	});
});
