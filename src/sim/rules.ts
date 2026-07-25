import { type Grid, liveNeighbourCount } from "@/sim/grid";

/**
 * The rule that turns one Generation into the next.
 *
 * Classic Conway (B3/S23) plus one deliberate addition — Death by Old Age.
 *
 * Without the age cap, a Bounded Edge Grid decays into still lifes within a few
 * hundred Generations, and from that point the structure is unchanging vertical
 * stripes extruding forever. The cap means no configuration is permanently
 * stable, so movement keeps re-seeding itself into regions that had stopped.
 */

/** Live neighbour count at which a dead Cell is born. */
const BIRTH_NEIGHBOURS = 3;

/** Live neighbour counts at which a live Cell survives. */
const SURVIVAL_NEIGHBOURS: ReadonlySet<number> = new Set([2, 3]);

/**
 * Writes the Generation following `current` into `next`.
 *
 * `next` is written in full, so its prior contents are irrelevant. Both Grids
 * must share dimensions. Reading exclusively from `current` and writing
 * exclusively to `next` is what makes every Cell see the same snapshot — a
 * single-buffer implementation would let Cells computed earlier in the pass
 * influence Cells computed later, which is not Life.
 *
 * @param maximumAge Age at which a live Cell dies regardless of its neighbours.
 */
export function nextGeneration(
	current: Grid,
	next: Grid,
	maximumAge: number,
): void {
	if (current.width !== next.width || current.height !== next.height) {
		throw new Error(
			`Grid dimensions differ: ${current.width}x${current.height} vs ${next.width}x${next.height}`,
		);
	}
	if (!Number.isInteger(maximumAge) || maximumAge < 1) {
		throw new Error(
			`Maximum Age must be a positive integer, got ${maximumAge}`,
		);
	}

	for (let row = 0; row < current.height; row++) {
		for (let column = 0; column < current.width; column++) {
			const index = row * current.width + column;
			const age = current.ages[index] ?? 0;
			const neighbours = liveNeighbourCount(current, column, row);

			next.ages[index] = nextAge(age, neighbours, maximumAge);
		}
	}
}

/**
 * The Age a position holds in the next Generation, given its current Age and
 * live neighbour count. 0 means dead.
 *
 * Exported for direct testing: the rule is the one part of this product that can
 * be verified without looking at anything, and keeping it reachable in isolation
 * is how that stays true.
 */
export function nextAge(
	age: number,
	liveNeighbours: number,
	maximumAge: number,
): number {
	const alive = age > 0;

	if (!alive) {
		return liveNeighbours === BIRTH_NEIGHBOURS ? 1 : 0;
	}

	// Death by Old Age is checked before neighbour count, because it applies
	// regardless of neighbours — a Cell surrounded by exactly the right company
	// still dies when its time is up.
	if (age >= maximumAge) {
		return 0;
	}

	return SURVIVAL_NEIGHBOURS.has(liveNeighbours) ? age + 1 : 0;
}
