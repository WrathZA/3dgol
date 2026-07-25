import { describe, expect, it } from "vitest";

import {
	clampLiveSettings,
	clampSetting,
	DEFAULT_SETTINGS,
	SETTING_BOUNDS,
	type Settings,
} from "@/settings";

describe("clampSetting", () => {
	it("leaves a value already on the range and the step", () => {
		expect(clampSetting(40, SETTING_BOUNDS.depthWindow)).toBe(40);
	});

	it("brings a value below the range up to the floor", () => {
		expect(clampSetting(-5, SETTING_BOUNDS.depthWindow)).toBe(
			SETTING_BOUNDS.depthWindow.min,
		);
	});

	it("brings a value above the range down to the ceiling", () => {
		expect(clampSetting(10_000, SETTING_BOUNDS.depthWindow)).toBe(
			SETTING_BOUNDS.depthWindow.max,
		);
	});

	/**
	 * The Depth Window indexes a ring of whole slots and Maximum Age is compared
	 * against integer Ages, so a value part-way between steps is wrong rather
	 * than merely untidy.
	 */
	it("snaps a fractional value onto the step", () => {
		expect(clampSetting(42.7, SETTING_BOUNDS.depthWindow)).toBe(43);
		expect(clampSetting(11.2, SETTING_BOUNDS.maximumAge)).toBe(11);
	});

	it("keeps a stepped fraction free of floating-point tails", () => {
		// 0.15 + 40 × 0.01 is not 0.55 in binary floating point, and the drift
		// shows up as a slider that will not sit still.
		expect(clampSetting(0.55, SETTING_BOUNDS.cellSize)).toBe(0.55);
		expect(clampSetting(0.333, SETTING_BOUNDS.cellSize)).toBe(0.33);
	});

	it("admits a Speed of zero, because pausing is the bottom of the range", () => {
		expect(clampSetting(0, SETTING_BOUNDS.generationsPerSecond)).toBe(0);
	});

	it("rejects a value that is not a number", () => {
		expect(() => clampSetting(Number.NaN, SETTING_BOUNDS.cellSize)).toThrow(
			/finite/,
		);
	});
});

describe("clampLiveSettings", () => {
	it("leaves the defaults untouched, so they are within their own bounds", () => {
		expect(clampLiveSettings(DEFAULT_SETTINGS)).toEqual(DEFAULT_SETTINGS);
	});

	it("does not mutate the settings it is given", () => {
		const original: Settings = { ...DEFAULT_SETTINGS, depthWindow: 10_000 };

		clampLiveSettings(original);

		expect(original.depthWindow).toBe(10_000);
	});

	it("brings every live setting onto its range", () => {
		const clamped = clampLiveSettings({
			...DEFAULT_SETTINGS,
			generationsPerSecond: 900,
			depthWindow: 1,
			maximumAge: 0,
			cellSize: 4,
		});

		expect(clamped.generationsPerSecond).toBe(
			SETTING_BOUNDS.generationsPerSecond.max,
		);
		expect(clamped.depthWindow).toBe(SETTING_BOUNDS.depthWindow.min);
		expect(clamped.maximumAge).toBe(SETTING_BOUNDS.maximumAge.min);
		expect(clamped.cellSize).toBe(SETTING_BOUNDS.cellSize.max);
	});

	/**
	 * Grid dimensions are not live controls — they are staged and applied on
	 * Restart — so they have no bounds here and must be passed through untouched.
	 */
	it("leaves Grid dimensions alone", () => {
		const clamped = clampLiveSettings({
			...DEFAULT_SETTINGS,
			gridWidth: 7,
			gridHeight: 9,
		});

		expect(clamped.gridWidth).toBe(7);
		expect(clamped.gridHeight).toBe(9);
	});
});
