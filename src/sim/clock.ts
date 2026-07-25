/**
 * How elapsed time becomes Generations.
 *
 * Generations and frames are deliberately decoupled: a Run advances on a time
 * accumulator, so how fast the structure grows does not depend on how fast the
 * display refreshes. Speed can therefore be changed, and a Run paused and
 * resumed, without the two ever being conflated.
 *
 * This lives in `sim/` and is pure for one reason: the pacing of a Run is the
 * one part of the loop where a mistake is invisible on screen but obvious in a
 * test — a pause that quietly banks time looks fine until it is released, and
 * then dumps a burst of Generations at once. Inline in the render loop none of
 * it is reachable by a test.
 */

/** Generations to advance now, and the time left over toward the next one. */
export interface ClockStep {
	generations: number;
	accumulated: number;
}

/**
 * Largest single time step honoured, in seconds.
 *
 * A backgrounded tab produces an enormous gap on return. Without a cap the Run
 * would try to catch up all at once and freeze the page — better to lose the
 * missing Generations than to stall.
 */
export const MAX_FRAME_DELTA = 0.25;

/**
 * Advances the accumulator by `elapsed` seconds and reports what that owes.
 *
 * At a speed of zero the Run is paused: nothing advances and, critically,
 * nothing accumulates either. Banking time while paused would make resuming
 * discharge it as a burst of Generations, which is a visible break in the
 * structure rather than the continuation the Viewer asked for.
 *
 * @param accumulated Time carried over from the previous frame, in seconds.
 * @param elapsed Seconds since the previous frame. Capped at `MAX_FRAME_DELTA`.
 * @param generationsPerSecond Speed. Zero pauses.
 */
export function advanceClock(
	accumulated: number,
	elapsed: number,
	generationsPerSecond: number,
): ClockStep {
	if (
		!Number.isFinite(accumulated) ||
		!Number.isFinite(elapsed) ||
		!Number.isFinite(generationsPerSecond)
	) {
		throw new Error(
			`Clock inputs must be finite, got accumulated=${accumulated} elapsed=${elapsed} speed=${generationsPerSecond}`,
		);
	}
	if (generationsPerSecond < 0) {
		throw new Error(`Speed cannot be negative, got ${generationsPerSecond}`);
	}

	if (generationsPerSecond === 0) {
		return { generations: 0, accumulated };
	}

	// Time never runs backwards, and a negative step would rewind the
	// accumulator into a state no amount of waiting recovers from.
	const step = Math.min(Math.max(elapsed, 0), MAX_FRAME_DELTA);
	const secondsPerGeneration = 1 / generationsPerSecond;
	const total = accumulated + step;

	const generations = Math.floor(total / secondsPerGeneration);
	return {
		generations,
		accumulated: total - generations * secondsPerGeneration,
	};
}

/**
 * Trims a carried-over accumulator to fit a speed that has just changed.
 *
 * Raising the speed shortens the interval between Generations, and time banked
 * against the old, longer interval can be worth several of the new ones — which
 * would discharge as a burst the moment the Viewer moved the slider. Holding at
 * most one interval's worth means a speed change is felt as a change of pace and
 * nothing else.
 */
export function retimeAccumulator(
	accumulated: number,
	generationsPerSecond: number,
): number {
	if (generationsPerSecond <= 0) {
		return accumulated;
	}
	return Math.min(accumulated, 1 / generationsPerSecond);
}
