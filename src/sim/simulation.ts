import {
	clearGrid,
	createGrid,
	type Grid,
	MAX_REPRESENTABLE_AGE,
} from "@/sim/grid";
import { nextGeneration } from "@/sim/rules";

/**
 * A Run: a continuous sequence of Generations from 0 until the next Restart.
 *
 * Holds two Grids and swaps between them. Both are allocated once, at
 * construction, and reused for the life of the Run — allocating per Generation
 * would produce garbage-collection pauses, which read as stutter in a product
 * that animates continuously.
 */

/** Returns a number in [0, 1). Injectable so a Run can be made reproducible. */
export type RandomSource = () => number;

export interface SimulationOptions {
	width: number;
	height: number;
	/** Age at which a live Cell dies regardless of its neighbours. */
	maximumAge: number;
	/** Proportion of positions alive at Generation 0, in [0, 1]. */
	seedDensity?: number;
	random?: RandomSource;
}

/**
 * Proportion of positions seeded alive at Generation 0.
 *
 * Chosen so a fresh Run reliably produces sustained movement: sparse soups die
 * out quickly, dense ones overcrowd and collapse in the first few Generations.
 */
export const DEFAULT_SEED_DENSITY = 0.35;

export class Simulation {
	readonly width: number;
	readonly height: number;

	private currentGrid: Grid;
	private scratchGrid: Grid;
	private generationCount = 0;
	private currentMaximumAge: number;
	private readonly seedDensity: number;
	private readonly random: RandomSource;

	constructor(options: SimulationOptions) {
		const { width, height, maximumAge } = options;
		const seedDensity = options.seedDensity ?? DEFAULT_SEED_DENSITY;

		if (seedDensity < 0 || seedDensity > 1) {
			throw new Error(`Seed density must be within [0, 1], got ${seedDensity}`);
		}

		this.width = width;
		this.height = height;
		this.currentGrid = createGrid(width, height);
		this.scratchGrid = createGrid(width, height);
		this.currentMaximumAge = validateMaximumAge(maximumAge);
		this.seedDensity = seedDensity;
		this.random = options.random ?? Math.random;

		this.restart();
	}

	/** The current Generation. Callers must not mutate it. */
	get grid(): Grid {
		return this.currentGrid;
	}

	/** Generations elapsed since the Run began. 0 immediately after a Restart. */
	get generation(): number {
		return this.generationCount;
	}

	get maximumAge(): number {
		return this.currentMaximumAge;
	}

	/**
	 * Sets Maximum Age for subsequent Generations.
	 *
	 * Cells already older than the new value are not killed here — they die on
	 * the next `advance()`, which is where the rule lives. Reaching into the Grid
	 * to kill them immediately would duplicate the rule in a second place.
	 */
	set maximumAge(value: number) {
		this.currentMaximumAge = validateMaximumAge(value);
	}

	/** Advances the Run by one Generation. */
	advance(): void {
		nextGeneration(this.currentGrid, this.scratchGrid, this.currentMaximumAge);

		const previous = this.currentGrid;
		this.currentGrid = this.scratchGrid;
		this.scratchGrid = previous;

		this.generationCount++;
	}

	/**
	 * Ends the current Run and begins a new one from a fresh random Seed.
	 *
	 * The Seed is always random. Choosing *when* a new one is generated is the
	 * only influence over what a Run contains — there is no pattern picker and no
	 * placing of Cells.
	 */
	restart(): void {
		clearGrid(this.currentGrid);

		const ages = this.currentGrid.ages;
		for (let index = 0; index < ages.length; index++) {
			ages[index] = this.random() < this.seedDensity ? 1 : 0;
		}

		this.generationCount = 0;
	}
}

function validateMaximumAge(value: number): number {
	if (!Number.isInteger(value) || value < 1) {
		throw new Error(`Maximum Age must be a positive integer, got ${value}`);
	}
	if (value > MAX_REPRESENTABLE_AGE) {
		throw new Error(
			`Maximum Age exceeds what an Age can hold (${MAX_REPRESENTABLE_AGE}), got ${value}`,
		);
	}
	return value;
}
