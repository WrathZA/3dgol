import { describe, expect, it } from "vitest";

import { population } from "@/sim/grid";
import {
	DEFAULT_SEED_DENSITY,
	type RandomSource,
	Simulation,
} from "@/sim/simulation";

/**
 * Deterministic stand-in for Math.random.
 *
 * A seeded generator rather than real randomness, so a failing Run can be
 * reproduced instead of guessed at.
 */
function seededRandom(seed: number): RandomSource {
	let state = seed >>> 0;
	return () => {
		// xorshift32
		state ^= state << 13;
		state ^= state >>> 17;
		state ^= state << 5;
		state >>>= 0;
		return state / 0x100000000;
	};
}

describe("Simulation", () => {
	it("begins a Run at Generation 0", () => {
		const simulation = new Simulation({
			width: 16,
			height: 16,
			maximumAge: 10,
			random: seededRandom(1),
		});

		expect(simulation.generation).toBe(0);
	});

	it("counts Generations as it advances", () => {
		const simulation = new Simulation({
			width: 16,
			height: 16,
			maximumAge: 10,
			random: seededRandom(1),
		});

		simulation.advance();
		simulation.advance();

		expect(simulation.generation).toBe(2);
	});

	it("seeds every Cell of a new Run at Age 1", () => {
		const simulation = new Simulation({
			width: 16,
			height: 16,
			maximumAge: 10,
			random: seededRandom(7),
		});

		for (const age of simulation.grid.ages) {
			expect(age === 0 || age === 1).toBe(true);
		}
	});

	it("returns to Generation 0 and reseeds on Restart", () => {
		const simulation = new Simulation({
			width: 16,
			height: 16,
			maximumAge: 10,
			random: seededRandom(3),
		});

		simulation.advance();
		simulation.advance();
		simulation.restart();

		expect(simulation.generation).toBe(0);
		for (const age of simulation.grid.ages) {
			expect(age === 0 || age === 1).toBe(true);
		}
	});

	it("produces the same Run from the same random source", () => {
		const first = new Simulation({
			width: 12,
			height: 12,
			maximumAge: 8,
			random: seededRandom(42),
		});
		const second = new Simulation({
			width: 12,
			height: 12,
			maximumAge: 8,
			random: seededRandom(42),
		});

		for (let generation = 0; generation < 20; generation++) {
			first.advance();
			second.advance();
		}

		expect(Array.from(first.grid.ages)).toEqual(Array.from(second.grid.ages));
	});

	describe("Seed", () => {
		it("seeds roughly at the configured density", () => {
			const simulation = new Simulation({
				width: 100,
				height: 100,
				maximumAge: 20,
				random: seededRandom(99),
			});

			const density = population(simulation.grid) / (100 * 100);

			expect(density).toBeGreaterThan(DEFAULT_SEED_DENSITY - 0.05);
			expect(density).toBeLessThan(DEFAULT_SEED_DENSITY + 0.05);
		});

		it("sustains movement rather than dying out", () => {
			// The acceptance criterion the default density exists to satisfy: a
			// fresh Run must still be alive after a long time, not fizzle out.
			for (const seed of [1, 2, 3, 4, 5]) {
				const simulation = new Simulation({
					width: 64,
					height: 64,
					maximumAge: 20,
					random: seededRandom(seed),
				});

				for (let generation = 0; generation < 500; generation++) {
					simulation.advance();
				}

				expect(population(simulation.grid)).toBeGreaterThan(0);
			}
		});

		it("rejects a density outside [0, 1]", () => {
			expect(
				() =>
					new Simulation({
						width: 8,
						height: 8,
						maximumAge: 5,
						seedDensity: 1.5,
					}),
			).toThrow();
			expect(
				() =>
					new Simulation({
						width: 8,
						height: 8,
						maximumAge: 5,
						seedDensity: -0.1,
					}),
			).toThrow();
		});
	});

	describe("Maximum Age", () => {
		it("rejects values below 1 or above what an Age can hold", () => {
			expect(
				() => new Simulation({ width: 8, height: 8, maximumAge: 0 }),
			).toThrow();
			expect(
				() => new Simulation({ width: 8, height: 8, maximumAge: 70000 }),
			).toThrow();
		});

		it("applies a lowered value on the next Generation", () => {
			const simulation = new Simulation({
				width: 16,
				height: 16,
				maximumAge: 100,
				random: seededRandom(11),
			});

			for (let generation = 0; generation < 10; generation++) {
				simulation.advance();
			}

			// Some Cells are now older than 3.
			const olderThanThree = Array.from(simulation.grid.ages).filter(
				(age) => age > 3,
			);
			expect(olderThanThree.length).toBeGreaterThan(0);

			simulation.maximumAge = 3;
			simulation.advance();

			// Every Cell that had reached the new cap is gone.
			for (const age of simulation.grid.ages) {
				expect(age).toBeLessThanOrEqual(3);
			}
		});
	});
});
