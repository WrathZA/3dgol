import { describe, expect, it } from "vitest";

import { advanceClock, MAX_FRAME_DELTA, retimeAccumulator } from "@/sim/clock";

describe("advanceClock", () => {
	it("advances one Generation per interval at the configured Speed", () => {
		const step = advanceClock(0, 0.125, 8);

		expect(step.generations).toBe(1);
		expect(step.accumulated).toBeCloseTo(0);
	});

	it("advances nothing until an interval has passed", () => {
		const step = advanceClock(0, 0.05, 8);

		expect(step.generations).toBe(0);
		expect(step.accumulated).toBeCloseTo(0.05);
	});

	it("carries the remainder toward the next Generation", () => {
		const first = advanceClock(0, 0.1, 8);
		const second = advanceClock(first.accumulated, 0.1, 8);

		expect(first.generations).toBe(0);
		expect(second.generations).toBe(1);
		// 0.2s at 8/s owes one Generation and 0.075s toward the next.
		expect(second.accumulated).toBeCloseTo(0.075);
	});

	it("advances several Generations when a frame spans several intervals", () => {
		const step = advanceClock(0, 0.1, 30);

		expect(step.generations).toBe(3);
	});

	/**
	 * The structure is a record of Generations, so time not spent advancing must
	 * not be owed later. A paused Run that banked time would discharge it as a
	 * burst on resume, which is a visible break rather than a continuation.
	 */
	it("neither advances nor banks time while paused", () => {
		const step = advanceClock(0.05, 10, 0);

		expect(step.generations).toBe(0);
		expect(step.accumulated).toBe(0.05);
	});

	it("resumes from where it paused with no burst", () => {
		const before = advanceClock(0, 0.06, 8);
		const paused = advanceClock(before.accumulated, 30, 0);
		const after = advanceClock(paused.accumulated, 0.07, 8);

		expect(paused.generations).toBe(0);
		// The 0.06s banked before the pause plus 0.07s after is one interval's
		// worth — exactly what an uninterrupted Run would have advanced.
		expect(after.generations).toBe(1);
	});

	/**
	 * A backgrounded tab returns with an enormous gap. Catching all of it up at
	 * once would freeze the page; losing the missing Generations is the better
	 * failure.
	 */
	it("caps a long gap rather than catching all of it up", () => {
		const step = advanceClock(0, 600, 8);

		expect(step.generations).toBe(Math.floor(MAX_FRAME_DELTA * 8));
	});

	it("ignores a step that would run time backwards", () => {
		const step = advanceClock(0.02, -5, 8);

		expect(step.generations).toBe(0);
		expect(step.accumulated).toBeCloseTo(0.02);
	});

	it("rejects a negative Speed", () => {
		expect(() => advanceClock(0, 0.1, -1)).toThrow(/negative/);
	});

	it("rejects inputs that are not numbers", () => {
		expect(() => advanceClock(0, Number.NaN, 8)).toThrow(/finite/);
	});
});

describe("retimeAccumulator", () => {
	it("trims time banked against a slower Speed to one new interval", () => {
		// 0.5s was less than one interval at 2/s; at 30/s it is worth fifteen.
		expect(retimeAccumulator(0.5, 30)).toBeCloseTo(1 / 30);
	});

	it("leaves an accumulator that already fits", () => {
		expect(retimeAccumulator(0.01, 30)).toBeCloseTo(0.01);
	});

	it("holds the accumulator untouched while paused", () => {
		expect(retimeAccumulator(0.4, 0)).toBe(0.4);
	});
});
