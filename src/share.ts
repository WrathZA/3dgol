import type { Pattern } from "@/sim/patterns";

/**
 * The URL as a share mechanism.
 *
 * The product's entire distribution is a pasted link, and until now that link
 * always opened on a random Seed — so someone sent "look at this" and the
 * recipient saw something else. Carrying the chosen Pattern in the URL is what
 * makes a link worth sending.
 *
 * **Both halves here are pure string functions**, deliberately. Reading a query
 * and building a URL are the whole of the decision, and putting them in the
 * composition root would make them unreachable by any test — which is the
 * mistake #46 paid for. `main.ts` keeps only the two-line `history` call, which
 * has no decision in it.
 *
 * Pattern only. Speed, Depth Window, Maximum Age, the Explosion and Grid
 * dimensions stay unshared, which keeps the URL readable and keeps the reversal
 * of the PRD's sharing exclusion as small as it can be.
 */

/** The query parameter a shared Pattern travels in. */
export const PATTERN_PARAM = "pattern";

/**
 * The Pattern a query string asks for, or `null` for a random Seed.
 *
 * **Anything unrecognised returns `null` rather than throwing**, and that is a
 * deliberate exception to this codebase's convention. `.zalwa/stack.md` says
 * programmer errors are thrown and there is deliberately no graceful screen for
 * a device without WebGL2 — because those are bugs, and a loud failure is how
 * they get fixed.
 *
 * A URL is different in kind: it is the first input this product accepts from
 * outside itself, and it arrives already mangled by chat clients that eat
 * characters, by people editing links by hand, and by Patterns that existed when
 * a link was shared and do not now. A shared link that renders a stack trace has
 * destroyed exactly the first impression the link was sent to create. Falling
 * back to a random Run costs the recipient the sender's Pattern and nothing
 * else — they still see the product working.
 *
 * Matched on `id` rather than name or index, so a link keeps meaning the same
 * Pattern as the list is reordered or added to.
 */
export function patternFromQuery(
	search: string,
	patterns: readonly Pattern[],
): Pattern | null {
	const requested = new URLSearchParams(search).get(PATTERN_PARAM);

	if (requested === null || requested === "") {
		return null;
	}

	return patterns.find((pattern) => pattern.id === requested) ?? null;
}

/**
 * `url` with the Pattern parameter set, or removed when there is no Pattern.
 *
 * Removing rather than emptying matters: `?pattern=` is a URL that claims a
 * Pattern and delivers none, and it is what a Viewer would copy after pressing
 * Random. The address bar should say what the Run is actually doing.
 *
 * Every other part of the URL is preserved — path, hash, and any parameter this
 * product does not own — because a link may have been through something that
 * added its own.
 */
export function urlWithPattern(url: string, pattern: Pattern | null): string {
	const next = new URL(url);

	if (pattern === null) {
		next.searchParams.delete(PATTERN_PARAM);
	} else {
		next.searchParams.set(PATTERN_PARAM, pattern.id);
	}

	return next.toString();
}
