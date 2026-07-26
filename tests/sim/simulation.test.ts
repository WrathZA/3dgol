import { describe, expect, it } from "vitest";

import { ageAt, population, setAgeAt } from "@/sim/grid";
import { GOSPER_GLIDER_GUN } from "@/sim/patterns";
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

	/**
	 * Restart is the only influence the Viewer has over what a Run contains — they
	 * choose *when* a Seed is drawn, never what it holds. That is only true if each
	 * Restart draws a fresh one: a Restart that reproduced the same Seed would make
	 * the control pointless without looking broken.
	 */
	it("draws a different Seed on each Restart", () => {
		const simulation = new Simulation({
			width: 16,
			height: 16,
			maximumAge: 10,
			random: seededRandom(7),
		});

		const first = Uint16Array.from(simulation.grid.ages);
		simulation.restart();
		const second = Uint16Array.from(simulation.grid.ages);

		expect(second).not.toEqual(first);
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

			// Every Cell that had reached the new cap is back at the start of the
			// Gradient or below it — none runs past.
			for (const age of simulation.grid.ages) {
				expect(age).toBeLessThanOrEqual(3);
			}
		});
	});

	describe("Explosion", () => {
		it("is on unless asked otherwise", () => {
			const simulation = new Simulation({
				width: 8,
				height: 8,
				maximumAge: 4,
			});

			expect(simulation.explosion).toBe(true);
		});

		it("switches mid-Run without clearing the Stack or reseeding", () => {
			const simulation = new Simulation({
				width: 16,
				height: 16,
				maximumAge: 4,
				random: seededRandom(11),
			});

			for (let generation = 0; generation < 6; generation++) {
				simulation.advance();
			}

			const generation = simulation.generation;
			const layers = simulation.stack.depth;
			const before = Array.from(simulation.grid.ages);

			simulation.explosion = false;

			// The switch alone changes nothing already computed — the Run keeps its
			// Generation counter, every Layer it holds, and the Grid it is on.
			expect(simulation.explosion).toBe(false);
			expect(simulation.generation).toBe(generation);
			expect(simulation.stack.depth).toBe(layers);
			expect(Array.from(simulation.grid.ages)).toEqual(before);

			// And it takes effect from the next Generation, which continues the Run
			// rather than starting one.
			simulation.advance();
			expect(simulation.generation).toBe(generation + 1);
			expect(simulation.stack.depth).toBe(layers + 1);
		});

		it("leaves a still life standing at the cap while it is off", () => {
			// A block on an otherwise empty Grid survives forever under plain Conway,
			// and its Age stops at the cap rather than running past it.
			const simulation = new Simulation({
				width: 8,
				height: 8,
				maximumAge: 3,
				explosion: false,
				seedDensity: 0,
			});

			const block = simulation.grid;
			for (const [column, row] of [
				[3, 3],
				[4, 3],
				[3, 4],
				[4, 4],
			] as const) {
				setAgeAt(block, column, row, 1);
			}

			for (let generation = 0; generation < 12; generation++) {
				simulation.advance();
			}

			for (const [column, row] of [
				[3, 3],
				[4, 3],
				[3, 4],
				[4, 4],
			] as const) {
				expect(ageAt(simulation.grid, column, row)).toBe(3);
			}
		});
	});

	describe("Pattern", () => {
		/** A Run seeded with the gun, on a Grid the interface would permit. */
		function gunRun(explosion = false, maximumAge = 200) {
			const simulation = new Simulation({
				width: 50,
				height: 50,
				maximumAge,
				explosion,
				random: seededRandom(3),
			});
			simulation.restart(GOSPER_GLIDER_GUN);
			return simulation;
		}

		it("puts the Pattern and nothing else in Generation 0", () => {
			const simulation = gunRun();

			expect(simulation.generation).toBe(0);
			// Every live Cell is newborn, and there are exactly as many as the Pattern
			// draws — so no random Seed survived underneath it.
			let live = 0;
			for (const age of simulation.grid.ages) {
				if (age > 0) {
					expect(age).toBe(1);
					live++;
				}
			}
			expect(live).toBe(36);
		});

		it("places it inset from the top-left, leaving the Pattern's output room", () => {
			const simulation = gunRun();

			// The left reflector block sits at the Pattern's rows 4-5, columns 0-1,
			// so on the Grid it lands one Cell in from each edge.
			expect(ageAt(simulation.grid, 1, 5)).toBe(1);
			expect(ageAt(simulation.grid, 2, 5)).toBe(1);
			expect(ageAt(simulation.grid, 1, 6)).toBe(1);
			expect(ageAt(simulation.grid, 2, 6)).toBe(1);

			// Nothing on the boundary itself.
			for (let column = 0; column < simulation.width; column++) {
				expect(ageAt(simulation.grid, column, 0)).toBe(0);
			}
			for (let row = 0; row < simulation.height; row++) {
				expect(ageAt(simulation.grid, 0, row)).toBe(0);
			}

			// And the whole lower-right of the Grid is clear, which is the room the
			// gliders travel into.
			expect(population(simulation.grid)).toBe(36);
			for (let row = 11; row < simulation.height; row++) {
				for (let column = 0; column < simulation.width; column++) {
					expect(ageAt(simulation.grid, column, row)).toBe(0);
				}
			}
		});

		it("is a working gun — still emitting after 60 Generations", () => {
			const simulation = gunRun();

			for (let generation = 0; generation < 60; generation++) {
				simulation.advance();
			}

			// A gun is not a still life and not a dying soup: it emits a glider every
			// 30 Generations, so the population climbs rather than settling. Two
			// gliders (5 Cells each) have left by Generation 60.
			expect(population(simulation.grid)).toBeGreaterThan(36);

			// The machinery survived — the left reflector block's permanent outer
			// column has been alive throughout, so its Age is the Generation count.
			expect(ageAt(simulation.grid, 1, 5)).toBe(61);
			expect(ageAt(simulation.grid, 1, 6)).toBe(61);

			// And something has reached the lower-right, which nothing does unless
			// gliders are actually travelling.
			let reachedFar = false;
			for (let row = 12; row < simulation.height; row++) {
				for (let column = 12; column < simulation.width; column++) {
					if (ageAt(simulation.grid, column, row) > 0) {
						reachedFar = true;
					}
				}
			}
			expect(reachedFar).toBe(true);
		});

		it("stays a gun rather than degenerating, 300 Generations in", () => {
			// The check that the Pattern data is *actually* Gosper's gun and not
			// approximately it. A wrong arrangement dies or collapses into chaos, and
			// chaos on a Bounded Edge Grid fills it — the steady population below is
			// what a working period-30 gun looks like once gliders are leaving at the
			// same rate the boundary destroys them.
			const simulation = gunRun();

			for (let generation = 0; generation < 300; generation++) {
				simulation.advance();
			}

			// The four Cells that never change state: the *outer* column of each
			// reflector block. The inner column does not survive — a reflector is a
			// catalyst rather than a still life, so the shuttle disturbs its near face
			// every cycle and the block reforms. Asserting all eight would be asserting
			// something a working gun does not do.
			//
			// These four are what reaches Maximum Age, which is why the Explosion
			// dismantles the gun and why #30 blocked this issue.
			for (const [column, row] of [
				[1, 5],
				[1, 6],
				[36, 3],
				[36, 4],
			] as const) {
				expect(ageAt(simulation.grid, column, row)).toBe(200);
			}

			// Steady rather than growing or dying: measured at 56 here and still 56 at
			// Generation 600.
			expect(population(simulation.grid)).toBe(56);
		});

		it("is dismantled by the Explosion, which is why #30 blocked this", () => {
			// The gun's reflector blocks never change state, so they age continuously
			// and reach Maximum Age. With the Explosion on they detonate and the gun
			// destroys itself — the dependency that made #30 a blocker rather than a
			// tidiness concern. A low cap brings it forward from ~200 Generations.
			const simulation = gunRun(true, 20);

			for (let generation = 0; generation < 30; generation++) {
				simulation.advance();
			}

			// The left block's position has been through a detonation, so it is no
			// longer the settled pair it started as.
			const settled =
				ageAt(simulation.grid, 1, 5) > 20 && ageAt(simulation.grid, 2, 5) > 20;
			expect(settled).toBe(false);
		});

		it("still seeds randomly when no Pattern is given", () => {
			const simulation = gunRun();
			simulation.restart();

			// A random Seed at the default density fills far more of a 50x50 Grid than
			// a 36-Cell Pattern does.
			expect(population(simulation.grid)).toBeGreaterThan(500);
			expect(simulation.generation).toBe(0);
		});

		it("throws rather than clipping a Pattern too large for the Grid", () => {
			// Unreachable from the interface, since the Grid floor is set from the
			// largest Pattern — so it is a programmer error and stack.md says those
			// are loud.
			const simulation = new Simulation({
				width: 20,
				height: 20,
				maximumAge: 200,
			});

			expect(() => simulation.restart(GOSPER_GLIDER_GUN)).toThrow(
				/larger than the 20x20 Grid/,
			);
		});
	});

	describe("Stack", () => {
		it("freezes the Seed as the first Layer", () => {
			// Generation 0 is a Generation like any other. Skipping it would leave
			// the bottom of a fresh structure missing the state it grew from.
			const simulation = new Simulation({
				width: 8,
				height: 8,
				maximumAge: 10,
				depthWindow: 5,
				random: seededRandom(21),
			});

			expect(simulation.stack.depth).toBe(1);
			expect(simulation.stack.newestGeneration).toBe(0);
			expect(Array.from(simulation.stack.layerAt(0))).toEqual(
				Array.from(simulation.grid.ages),
			);
		});

		it("adds exactly one Layer per Generation", () => {
			const simulation = new Simulation({
				width: 8,
				height: 8,
				maximumAge: 10,
				depthWindow: 10,
				random: seededRandom(22),
			});

			simulation.advance();
			simulation.advance();
			simulation.advance();

			// Three advances plus the Seed.
			expect(simulation.stack.depth).toBe(4);
			expect(simulation.stack.newestGeneration).toBe(3);
			expect(simulation.stack.generationAt(3)).toBe(0);
		});

		it("holds the Depth Window once full, however long the Run goes", () => {
			const simulation = new Simulation({
				width: 8,
				height: 8,
				maximumAge: 10,
				depthWindow: 6,
				random: seededRandom(23),
			});

			const bytesAtStart = simulation.stack.byteLength;

			for (let generation = 0; generation < 500; generation++) {
				simulation.advance();
			}

			expect(simulation.stack.depth).toBe(6);
			expect(simulation.stack.byteLength).toBe(bytesAtStart);
			expect(simulation.stack.newestGeneration).toBe(500);
		});

		it("empties the Stack and returns to Generation 0 on Restart", () => {
			const simulation = new Simulation({
				width: 8,
				height: 8,
				maximumAge: 10,
				depthWindow: 5,
				random: seededRandom(24),
			});

			for (let generation = 0; generation < 20; generation++) {
				simulation.advance();
			}
			expect(simulation.stack.depth).toBe(5);

			simulation.restart();

			// Only the fresh Seed remains.
			expect(simulation.generation).toBe(0);
			expect(simulation.stack.depth).toBe(1);
			expect(simulation.stack.newestGeneration).toBe(0);
		});

		it("keeps each Layer matching the Generation it froze", () => {
			const simulation = new Simulation({
				width: 6,
				height: 6,
				maximumAge: 10,
				depthWindow: 4,
				random: seededRandom(25),
			});

			const atGenerationOne = Array.from(simulation.grid.ages);
			simulation.advance();
			simulation.advance();

			// The Seed is now at depth 2 and must still hold Generation 0's state,
			// even though the Simulation has reused its Grid buffers since.
			expect(Array.from(simulation.stack.layerAt(2))).toEqual(atGenerationOne);
			expect(simulation.stack.generationAt(2)).toBe(0);
		});
	});
});
