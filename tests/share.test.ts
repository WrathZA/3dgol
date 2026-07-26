import { describe, expect, it } from "vitest";

import { PATTERN_PARAM, patternFromQuery, urlWithPattern } from "@/share";
import { GOSPER_GLIDER_GUN, PATTERNS, PULSAR } from "@/sim/patterns";

const ORIGIN = "https://goluniverse.cc/";

describe("patternFromQuery", () => {
	it("resolves a known id to its Pattern", () => {
		expect(patternFromQuery("?pattern=pulsar", PATTERNS)).toBe(PULSAR);
		expect(patternFromQuery("?pattern=gosper-glider-gun", PATTERNS)).toBe(
			GOSPER_GLIDER_GUN,
		);
	});

	it("reads the parameter wherever it sits in the query", () => {
		// A link may have been through something that added its own parameters.
		expect(
			patternFromQuery("?utm_source=chat&pattern=acorn", PATTERNS)?.id,
		).toBe("acorn");
	});

	it("works with or without the leading question mark", () => {
		// `location.search` includes it; a hand-built string may not.
		expect(patternFromQuery("pattern=pulsar", PATTERNS)).toBe(PULSAR);
	});

	/**
	 * Everything below returns null rather than throwing.
	 *
	 * The deliberate exception to this codebase's loud-failure convention: a URL
	 * arrives from outside the product, already mangled by chat clients, hand
	 * edits, and Patterns that existed when a link was shared and do not now. A
	 * shared link that renders a stack trace has destroyed the first impression it
	 * was sent to create.
	 */
	it.each([
		["no query at all", ""],
		["a query with no pattern", "?speed=10"],
		["an empty value", "?pattern="],
		["an unknown id", "?pattern=not-a-pattern"],
		["a name rather than an id", "?pattern=Pulsar"],
		["an index, which ids exist to replace", "?pattern=1"],
		["markup", "?pattern=%3Cscript%3E"],
		["a path traversal attempt", "?pattern=../../etc/passwd"],
		["a repeated parameter", "?pattern=nope&pattern=also-nope"],
	])("returns null for %s", (_label, search) => {
		expect(patternFromQuery(search, PATTERNS)).toBeNull();
	});

	it("never returns a Pattern that is not in the list it was given", () => {
		// Guards the lookup against ever reaching past its argument.
		expect(patternFromQuery("?pattern=pulsar", [GOSPER_GLIDER_GUN])).toBeNull();
	});
});

describe("urlWithPattern", () => {
	it("sets the parameter to the Pattern's id", () => {
		expect(urlWithPattern(ORIGIN, PULSAR)).toBe(`${ORIGIN}?pattern=pulsar`);
	});

	it("removes the parameter rather than emptying it", () => {
		// `?pattern=` is a URL that claims a Pattern and delivers none — which is
		// what a Viewer would copy after pressing Random.
		const shared = urlWithPattern(ORIGIN, PULSAR);

		expect(urlWithPattern(shared, null)).toBe(ORIGIN);
		expect(urlWithPattern(shared, null)).not.toContain(PATTERN_PARAM);
	});

	it("replaces an existing Pattern rather than appending a second", () => {
		const first = urlWithPattern(ORIGIN, PULSAR);
		const second = urlWithPattern(first, GOSPER_GLIDER_GUN);

		expect(second).toBe(`${ORIGIN}?pattern=gosper-glider-gun`);
	});

	it("leaves every other part of the URL alone", () => {
		// Path, hash, and parameters this product does not own.
		const busy = `${ORIGIN}?utm_source=chat#view`;

		expect(urlWithPattern(busy, PULSAR)).toBe(
			`${ORIGIN}?utm_source=chat&pattern=pulsar#view`,
		);
	});

	it("round-trips: what it writes, the parser reads back", () => {
		// The property that actually matters to a Viewer pasting a link.
		for (const pattern of PATTERNS) {
			const url = new URL(urlWithPattern(ORIGIN, pattern));

			expect(patternFromQuery(url.search, PATTERNS)).toBe(pattern);
		}
	});
});
