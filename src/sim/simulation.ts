import {
	clearGrid,
	createGrid,
	type Grid,
	MAX_REPRESENTABLE_AGE,
	setAgeAt,
} from "@/sim/grid";
import {
	type Pattern,
	patternHasCellAt,
	patternHeight,
	patternWidth,
} from "@/sim/patterns";
import { nextGeneration } from "@/sim/rules";
import { LayerStack } from "@/sim/stack";

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
	/** Age at which a live Cell detonates, and the top of the Colour Gradient. */
	maximumAge: number;
	/** Whether reaching Maximum Age detonates. Defaults on; off is plain Conway. */
	explosion?: boolean;
	/** N — how many Layers of history the Stack retains. */
	depthWindow?: number;
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

/**
 * Layers of history retained when none is specified.
 *
 * Deep enough that a glider's diagonal streak reads as a streak rather than a
 * smudge, shallow enough that the structure does not occlude itself into an
 * opaque brick. The binding ceiling is not this value but the drawing budget —
 * grid dimensions multiplied by depth determines how much must be drawn, and
 * that limit is set by measurement on real hardware.
 */
export const DEFAULT_DEPTH_WINDOW = 120;

export class Simulation {
	readonly width: number;
	readonly height: number;

	private currentGrid: Grid;
	private scratchGrid: Grid;
	private generationCount = 0;
	private currentMaximumAge: number;
	private currentExplosion: boolean;
	private readonly seedDensity: number;
	private readonly random: RandomSource;
	private readonly layers: LayerStack;

	constructor(options: SimulationOptions) {
		const { width, height, maximumAge } = options;
		const seedDensity = options.seedDensity ?? DEFAULT_SEED_DENSITY;
		const depthWindow = options.depthWindow ?? DEFAULT_DEPTH_WINDOW;

		if (seedDensity < 0 || seedDensity > 1) {
			throw new Error(`Seed density must be within [0, 1], got ${seedDensity}`);
		}

		this.width = width;
		this.height = height;
		this.currentGrid = createGrid(width, height);
		this.scratchGrid = createGrid(width, height);
		this.currentMaximumAge = validateMaximumAge(maximumAge);
		this.currentExplosion = options.explosion ?? true;
		this.seedDensity = seedDensity;
		this.random = options.random ?? Math.random;
		this.layers = new LayerStack(width, height, depthWindow);

		this.restart();
	}

	/** The current Generation. Callers must not mutate it. */
	get grid(): Grid {
		return this.currentGrid;
	}

	/** The bounded window of history — the Layers currently visible. */
	get stack(): LayerStack {
		return this.layers;
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

	get explosion(): boolean {
		return this.currentExplosion;
	}

	/**
	 * Switches the Explosion for subsequent Generations.
	 *
	 * Takes effect on the next `advance()` and touches nothing already computed:
	 * the Stack keeps every Layer it holds and the Run does not reseed. Switching
	 * it on does not detonate the Cells already sitting at the cap retroactively —
	 * they detonate at the next Generation, which is where the rule lives.
	 */
	set explosion(value: boolean) {
		this.currentExplosion = value;
	}

	/** Advances the Run by one Generation, freezing it as the newest Layer. */
	advance(): void {
		nextGeneration(
			this.currentGrid,
			this.scratchGrid,
			this.currentMaximumAge,
			this.currentExplosion,
		);

		const previous = this.currentGrid;
		this.currentGrid = this.scratchGrid;
		this.scratchGrid = previous;

		this.generationCount++;
		this.layers.push(this.currentGrid, this.generationCount);
	}

	/**
	 * Ends the current Run and begins a new one.
	 *
	 * Without a Pattern the Seed is random, which is what a fresh page load and
	 * the Random control both do. With one, Generation 0 holds that Pattern and
	 * nothing else — the Viewer chooses from a fixed list the product ships, never
	 * composing or placing Cells themselves.
	 *
	 * Both are Restarts in every other sense: the Stack clears, the Generation
	 * counter returns to 0, and the Run continues at the Grid it was built with.
	 */
	restart(pattern?: Pattern): void {
		clearGrid(this.currentGrid);

		if (pattern === undefined) {
			const ages = this.currentGrid.ages;
			for (let index = 0; index < ages.length; index++) {
				ages[index] = this.random() < this.seedDensity ? 1 : 0;
			}
		} else {
			this.placePattern(pattern);
		}

		this.generationCount = 0;

		// Generation 0 is a Generation like any other, so the Seed becomes the
		// first Layer. Skipping it would leave the bottom of a fresh structure
		// missing the state everything above it grew from.
		this.layers.clear();
		this.layers.push(this.currentGrid, 0);
	}

	/**
	 * Writes a Pattern into the cleared Grid at Age 1.
	 *
	 * **Placed toward the top-left rather than centred**, and that is about where
	 * the Pattern's output goes rather than about tidiness. Gosper's gun emits
	 * gliders travelling south-east, so centring it would halve the distance they
	 * cover before the Bounded Edge destroys them — and the streak those gliders
	 * carve through time is the entire reason for offering the Pattern. A small
	 * inset rather than hard against the corner, so the reflector blocks are not
	 * touching the boundary.
	 *
	 * A Pattern too large for the Grid throws. It is unreachable from the
	 * interface — the Grid floor is set from the largest Pattern shipped, so every
	 * selectable Grid holds every Pattern — which makes it a programmer error, and
	 * `.zalwa/stack.md` says those are loud rather than handled.
	 */
	private placePattern(pattern: Pattern): void {
		const width = patternWidth(pattern);
		const height = patternHeight(pattern);

		if (width > this.width || height > this.height) {
			throw new Error(
				`Pattern "${pattern.name}" is ${width}x${height}, larger than the ${this.width}x${this.height} Grid`,
			);
		}

		const columnOffset = Math.min(PATTERN_INSET, this.width - width);
		const rowOffset = Math.min(PATTERN_INSET, this.height - height);

		for (let row = 0; row < height; row++) {
			for (let column = 0; column < width; column++) {
				if (patternHasCellAt(pattern, column, row)) {
					setAgeAt(this.currentGrid, columnOffset + column, rowOffset + row, 1);
				}
			}
		}
	}
}

/**
 * Cells between a Pattern and the top-left boundary.
 *
 * Enough that a Pattern with live Cells on its own edge is not immediately
 * interacting with the Bounded Edge, small enough that it does not eat into the
 * room the Pattern's output needs on the other side.
 */
const PATTERN_INSET = 1;

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
