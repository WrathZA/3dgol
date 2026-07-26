import { describe, expect, it } from "vitest";

import {
	applyStartRule,
	clampSetting,
	clampSettings,
	DEFAULT_SETTINGS,
	SETTING_BOUNDS,
	type Settings,
} from "@/settings";
import { GOSPER_GLIDER_GUN } from "@/sim/patterns";

describe("DEFAULT_SETTINGS", () => {
	/**
	 * The Speed default is judged by eye rather than derived, so `clampSettings`
	 * leaving it untouched only proves it sits on the range and the step — it
	 * would not notice the value drifting to 9. Pinning it makes a change to it
	 * deliberate: an edit that moves the default has to move this line too.
	 */
	it("ships a Speed of 10 Generations per second", () => {
		expect(DEFAULT_SETTINGS.generationsPerSecond).toBe(10);
	});
});

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

	it("admits a Speed of zero, because pausing is the bottom of the range", () => {
		expect(clampSetting(0, SETTING_BOUNDS.generationsPerSecond)).toBe(0);
	});

	it("rejects a value that is not a number", () => {
		expect(() => clampSetting(Number.NaN, SETTING_BOUNDS.depthWindow)).toThrow(
			/finite/,
		);
	});
});

describe("clampSettings", () => {
	it("leaves the defaults untouched, so they are within their own bounds", () => {
		expect(clampSettings(DEFAULT_SETTINGS)).toEqual(DEFAULT_SETTINGS);
	});

	it("does not mutate the settings it is given", () => {
		const original: Settings = { ...DEFAULT_SETTINGS, depthWindow: 10_000 };

		clampSettings(original);

		expect(original.depthWindow).toBe(10_000);
	});

	it("brings every live setting onto its range", () => {
		const clamped = clampSettings({
			...DEFAULT_SETTINGS,
			generationsPerSecond: 900,
			depthWindow: 1,
			maximumAge: 0,
		});

		expect(clamped.generationsPerSecond).toBe(
			SETTING_BOUNDS.generationsPerSecond.max,
		);
		expect(clamped.depthWindow).toBe(SETTING_BOUNDS.depthWindow.min);
		expect(clamped.maximumAge).toBe(SETTING_BOUNDS.maximumAge.min);
	});

	/**
	 * Grid dimensions are staged rather than live — read only when a Run starts —
	 * but they are bounded all the same, because the instance product they feed is
	 * what the slowest supported device has to draw. Being bounded and being
	 * applied immediately are separate questions.
	 */
	it("brings Grid dimensions onto their range too", () => {
		const clamped = clampSettings({
			...DEFAULT_SETTINGS,
			gridWidth: 7,
			gridHeight: 9_000,
		});

		expect(clamped.gridWidth).toBe(SETTING_BOUNDS.gridWidth.min);
		expect(clamped.gridHeight).toBe(SETTING_BOUNDS.gridHeight.max);
	});
});

describe("applyStartRule", () => {
	it("switches the Explosion off for a Pattern", () => {
		// The rule this exists for. A Pattern that rests on Cells which never change
		// state is destroyed by the Explosion reaching them, so choosing one asks for
		// the rule it needs as well as the Cells it starts with.
		const settings: Settings = { ...DEFAULT_SETTINGS, explosion: true };

		applyStartRule(settings, GOSPER_GLIDER_GUN);

		expect(settings.explosion).toBe(false);
	});

	it("leaves the Explosion alone for a random Seed", () => {
		// The asymmetry, asserted in both directions rather than assumed. Random does
		// not restore the Explosion, so a Viewer who tries a Pattern and then presses
		// Random inherits it off — an accepted cost, and this is where it is pinned.
		const on: Settings = { ...DEFAULT_SETTINGS, explosion: true };
		applyStartRule(on, null);
		expect(on.explosion).toBe(true);

		const off: Settings = { ...DEFAULT_SETTINGS, explosion: false };
		applyStartRule(off, null);
		expect(off.explosion).toBe(false);
	});

	it("changes nothing else about the settings", () => {
		// A Pattern reaches exactly one control. If it ever reaches a second, that is
		// a product decision and it should fail here first.
		const settings: Settings = { ...DEFAULT_SETTINGS, explosion: true };

		applyStartRule(settings, GOSPER_GLIDER_GUN);

		expect(settings).toEqual({ ...DEFAULT_SETTINGS, explosion: false });
	});
});
