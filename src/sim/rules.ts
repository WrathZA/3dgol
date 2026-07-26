import { contains, type Grid, indexOf, liveNeighbourCount } from "@/sim/grid";

/**
 * The rule that turns one Generation into the next.
 *
 * Classic Conway (B3/S23) plus one deliberate addition — the Explosion.
 *
 * **Age alone never kills.** Maximum Age is a trigger and the far end of the
 * Colour Gradient, not a lifespan: a Cell reaching it detonates, scattering life
 * into its own position and every neighbour inside the Grid, and every one of
 * them lands at age 1. Ordinary Conway death by over- and underpopulation is the
 * only way a Cell is removed, and it is untouched.
 *
 * That the exploding Cell revives *itself* is what stops the burst being a death
 * with a flourish. A capped Cell is thrown back to the start of its life along
 * with its neighbourhood, so the region restarts rather than leaving a hole, and
 * the Cell has to age all the way to the cap again before it can detonate a
 * second time. Nothing chains within a Generation, because the pass reads
 * exclusively from the previous one.
 *
 * Only Maximum Age triggers it, and that restriction is what makes it viable at
 * all: exploding on every death saturates a bounded Grid to roughly
 * three-quarters full within three Generations and holds it there, which
 * collapses the Colour Gradient to one colour and leaves the structure an opaque
 * brick.
 *
 * With the Explosion off the rule is plain Conway. Nothing whatsoever happens at
 * Maximum Age — a Cell there carries on, and its Age saturates so the Gradient
 * still has a top end. There is deliberately no third state in which a Cell dies
 * quietly of age: that configuration was measured at 0.9–1.4% live by Generation
 * 250 against 4–6% with the burst, which is a slow bleed rather than a rule. See
 * `.zalwa/principles.md` principle 6.
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
 * @param maximumAge Age at which a live Cell detonates, and the top of the
 *   Colour Gradient. Age saturates here rather than running past it.
 * @param explosion Whether reaching Maximum Age detonates. Off, the rule is
 *   plain Conway and Maximum Age governs colour alone.
 */
export function nextGeneration(
	current: Grid,
	next: Grid,
	maximumAge: number,
	explosion = true,
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

	// Not "explode, but write nothing" — the pass does not run at all. There is
	// one mechanism here, and switching it off has to remove it rather than leave
	// a version of it that still reaches Maximum Age and does something quieter.
	if (explosion) {
		explode(current, next, maximumAge);
	}
}

/**
 * Scatters life from every Cell that has reached Maximum Age.
 *
 * A second pass, and deliberately separate from the first. It reads exclusively
 * from `current` — the same snapshot the ordinary rule read — which is what
 * prevents a chain reaction: a position lit up by one Explosion cannot itself
 * explode until it has aged all the way to the cap again, many Generations
 * later. Running it after the ordinary pass has finished is what keeps every
 * Cell seeing the same snapshot rather than a half-updated Grid.
 *
 * The whole 3×3 block is written, the exploding Cell's own position included.
 * That is the difference between a burst and a death: the Cell is thrown back to
 * the start of its life rather than vacating, so a cluster reaching the cap
 * together leaves a solid patch of new colour instead of a hole. Positions are
 * overwritten rather than merged, so the Explosion beats whatever the ordinary
 * rule decided — a dead position is born at 1, a settled Cell of any Age is
 * thrown back to 1, and a capped Cell the ordinary rule would have removed for
 * underpopulation is revived by its own burst.
 *
 * There is deliberately no exception for a neighbour that also reached the cap.
 * One existed while the cap still killed, to stop a cluster reviving itself
 * wholesale; now that a capped Cell revives its own position, such a neighbour
 * lands at 1 through its own burst regardless, so the exception could not change
 * an outcome and only read as though it could.
 *
 * The cost is one more linear scan of the Grid, not a second round of neighbour
 * counting — the inner loop runs only for the few Cells actually at the cap.
 */
function explode(current: Grid, next: Grid, maximumAge: number): void {
	for (let row = 0; row < current.height; row++) {
		for (let column = 0; column < current.width; column++) {
			if (
				!reachedMaximumAge(
					current.ages[indexOf(current, column, row)] ?? 0,
					maximumAge,
				)
			) {
				continue;
			}

			for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
				for (let columnOffset = -1; columnOffset <= 1; columnOffset++) {
					const reachedColumn = column + columnOffset;
					const reachedRow = row + rowOffset;
					// The Bounded Edge holds here too: positions outside the Grid stay
					// permanently dead, so an Explosion at the boundary is contained.
					if (!contains(current, reachedColumn, reachedRow)) {
						continue;
					}

					next.ages[indexOf(current, reachedColumn, reachedRow)] = 1;
				}
			}
		}
	}
}

/**
 * Whether a live Cell at this Age has reached Maximum Age.
 *
 * The Explosion trigger, and nothing else — a Cell answering true here is not
 * removed by the rule, it detonates. Exported so it can be asserted directly
 * rather than inferred from Grid output. `>=` rather than `===` because Maximum
 * Age is Viewer-adjustable: lowering it leaves Cells already past the new value,
 * and they detonate at the next Generation.
 */
export function reachedMaximumAge(age: number, maximumAge: number): boolean {
	return age > 0 && age >= maximumAge;
}

/**
 * The Age a position holds in the next Generation, given its current Age and
 * live neighbour count. 0 means dead.
 *
 * Ordinary Conway, with one wrinkle: Age saturates at Maximum Age rather than
 * counting past it. There is no death by Age here and there is deliberately no
 * branch for one — the Explosion pass is where reaching the cap has its effect,
 * and a Cell whose burst is switched off simply carries on.
 *
 * The saturation is unconditional because it costs nothing to make it so. With
 * the Explosion on, a Cell at the cap is rewritten to 1 by its own burst before
 * the clamp could ever bind; with it off, the clamp is what keeps the Colour
 * Gradient's top end defined instead of leaving every long-lived Cell painted
 * the final colour with no way to tell them apart.
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

	return SURVIVAL_NEIGHBOURS.has(liveNeighbours)
		? Math.min(age + 1, maximumAge)
		: 0;
}
