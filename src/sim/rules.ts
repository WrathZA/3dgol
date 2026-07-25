import { contains, type Grid, indexOf, liveNeighbourCount } from "@/sim/grid";

/**
 * The rule that turns one Generation into the next.
 *
 * Classic Conway (B3/S23) plus two deliberate additions — Death by Old Age, and
 * the Explosion that accompanies it.
 *
 * Without the age cap, a Bounded Edge Grid decays into still lifes within a few
 * hundred Generations, and from that point the structure is unchanging vertical
 * stripes extruding forever. The cap means no configuration is permanently
 * stable, so movement keeps re-seeding itself into regions that had stopped.
 *
 * The Explosion makes that re-seeding literal rather than incidental: a Cell
 * reaching Maximum Age does not merely vacate its position, it scatters life
 * into every neighbour. Ordinary Conway deaths are untouched — only Death by Old
 * Age explodes. That restriction is what makes it viable at all: exploding on
 * every death saturates a bounded Grid to roughly three-quarters full within
 * three Generations and holds it there, which collapses the Colour Gradient to
 * one colour and leaves the structure an opaque brick.
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

	explode(current, next, maximumAge);
}

/**
 * Scatters life from every Cell that has just died of Old Age.
 *
 * A second pass, and deliberately separate from the first. It reads exclusively
 * from `current` — the same snapshot the ordinary rule read — which is what
 * prevents a chain reaction: a position lit up by one Explosion cannot itself
 * explode until it has aged all the way to the cap again, many Generations
 * later. Running it after the ordinary pass has finished is what keeps every
 * Cell seeing the same snapshot rather than a half-updated Grid.
 *
 * Neighbours are overwritten rather than merged, so an Explosion beats whatever
 * the ordinary rule decided for that position: a dead neighbour is born at 1, and
 * a settled neighbour of any Age is thrown back to 1. **Except** a neighbour that
 * also reached the cap — those stay dead. Two adjacent Cells at the cap are each
 * other's neighbour, so reviving them would let a cluster reset itself wholesale
 * and the age cap would stop killing the very configurations it exists to break
 * up. Leaving them dead makes a cluster's Explosion read as a hole with a young
 * shell around it, which is also what an explosion looks like.
 *
 * The cost is one more linear scan of the Grid, not a second round of neighbour
 * counting — the inner loop runs only for the few Cells actually at the cap.
 */
function explode(current: Grid, next: Grid, maximumAge: number): void {
	for (let row = 0; row < current.height; row++) {
		for (let column = 0; column < current.width; column++) {
			if (
				!diesOfOldAge(
					current.ages[indexOf(current, column, row)] ?? 0,
					maximumAge,
				)
			) {
				continue;
			}

			for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
				for (let columnOffset = -1; columnOffset <= 1; columnOffset++) {
					if (rowOffset === 0 && columnOffset === 0) {
						continue;
					}

					const neighbourColumn = column + columnOffset;
					const neighbourRow = row + rowOffset;
					// The Bounded Edge holds here too: positions outside the Grid stay
					// permanently dead, so an Explosion at the boundary is contained.
					if (!contains(current, neighbourColumn, neighbourRow)) {
						continue;
					}

					const neighbour = indexOf(current, neighbourColumn, neighbourRow);
					if (diesOfOldAge(current.ages[neighbour] ?? 0, maximumAge)) {
						continue;
					}

					next.ages[neighbour] = 1;
				}
			}
		}
	}
}

/**
 * Whether a Cell at this Age dies of Old Age this Generation.
 *
 * The Explosion trigger, exported so it can be asserted directly rather than
 * inferred from Grid output. `>=` rather than `===` because Maximum Age is
 * Viewer-adjustable: lowering it leaves Cells already past the new value, and
 * they die — and now explode — at the next Generation.
 */
export function diesOfOldAge(age: number, maximumAge: number): boolean {
	return age > 0 && age >= maximumAge;
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
	// still dies when its time is up. Shares its test with the Explosion pass, so
	// the two can never disagree about which Cells died this way.
	if (diesOfOldAge(age, maximumAge)) {
		return 0;
	}

	return SURVIVAL_NEIGHBOURS.has(liveNeighbours) ? age + 1 : 0;
}
