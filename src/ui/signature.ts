/**
 * The author's mark — a figure in a bowler hat with an apple where the face is.
 *
 * An original drawing of the *idea*, not a copy of the painting that made it
 * famous. Magritte's "The Son of Man" is under copyright until 2038 and his
 * estate licenses it; the composition and the joke are not protected, his
 * brushwork is. So this is geometry: a dome, a brim, a circle, and a coat. It
 * must never be replaced by a trace, a filter, or a background-removed
 * reproduction of the painting, however much closer that would look.
 *
 * Drawn rather than photographed for a second reason. The panel is dark glass
 * with hairline rules and one accent lifted from the birth end of the Colour
 * Gradient; a rectangle of oil paint dropped onto that reads as a sticker stuck
 * on the product. Monoline strokes in `currentColor` belong to the same picture.
 *
 * SVG over a raster: a few hundred bytes against 85 KB, sharp at any device
 * pixel ratio without a second asset, no extra request, and it takes its colours
 * from the stylesheet.
 */

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

/**
 * The drawing, in a 32 × 40 box.
 *
 * Coordinates are deliberately literal rather than derived — this is a picture,
 * not a computation, and a reader adjusting the hat should be able to see which
 * numbers are the hat.
 *
 * **Filled shapes rather than monoline strokes.** The first attempt drew this as
 * hairlines to match the panel's rules, and at 3rem it read as an indistinct
 * glyph: a shallow arch over a dot over a wide bracket. Solid silhouettes
 * survive being shrunk in a way thin outlines do not, which is why every icon
 * set is built from them. Order matters below — the coat is laid down first, the
 * hat over it, and the apple last, because the apple is in front of the face.
 */
const PARTS: ReadonlyArray<{ d: string; part: string }> = [
	// The coat: shoulders rising to a notched collar. Drawn to the bottom edge so
	// the figure is cropped by the frame rather than floating inside it.
	{
		d: "M3.6 40V32q0-5.2 5.2-7.2l4.9 3 4.9-3q5.2 2 5.2 7.2V40Z",
		part: "coat",
	},
	// The crown: wider than it is tall, with a fully rounded top. A bowler is a
	// low dome — the first pass made it tall and square and it read as a top hat.
	{ d: "M8.4 11.4V9q0-4 5.3-4T19 9v2.4Z", part: "hat" },
	// The brim, wider than the crown on both sides and thick enough to read at
	// 3rem, so the hat looks worn rather than balanced on top.
	{
		d: "M2.4 10.8h22.6a1.3 1.3 0 0 1 0 2.6H2.4a1.3 1.3 0 0 1 0-2.6Z",
		part: "hat",
	},
];

/**
 * The apple: the one shape in colour, and the last one drawn.
 *
 * Sized and placed to touch the brim above and the shoulders below. The first
 * pass left a gap at both ends and the apple read as floating in front of the
 * figure rather than sitting where a face would be.
 *
 * There is no stem. One was drawn, and at this size a 2px tick between the apple
 * and the brim read as a pole holding the apple up — worse than the ambiguity it
 * was there to resolve. The colour does that work instead: nothing else in the
 * mark is coloured, so the disc is plainly not a head.
 */
const APPLE = { cx: 13.7, cy: 19.4, r: 5.6 } as const;

/**
 * Builds the mark as an SVG element.
 *
 * Every node is created through `createElementNS` rather than assigned as an
 * `innerHTML` string. Nothing here is Viewer-supplied, so this is not defending
 * against anything today — it means the one place this codebase writes markup
 * has no HTML parser in it at all, and cannot acquire one by someone later
 * interpolating a value into the string.
 *
 * `aria-hidden` because the mark carries no information the link's own
 * accessible name does not already give: announcing a decorative drawing twice
 * is worse than not announcing it.
 */
export function createSignatureMark(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NAMESPACE, "svg");
	svg.setAttribute("viewBox", "0 0 27.4 40");
	svg.setAttribute("class", "panel__signature-mark");
	svg.setAttribute("aria-hidden", "true");
	// Without this, IE-era SVG focus behaviour puts the drawing in the tab order
	// separately from the link that wraps it.
	svg.setAttribute("focusable", "false");

	for (const { d, part } of PARTS) {
		const path = document.createElementNS(SVG_NAMESPACE, "path");
		path.setAttribute("d", d);
		path.setAttribute("data-part", part);
		svg.append(path);
	}

	// Appended last so it paints over the coat's collar and the hat's brim —
	// the apple is in front of the face, not behind it.
	const apple = document.createElementNS(SVG_NAMESPACE, "circle");
	apple.setAttribute("cx", String(APPLE.cx));
	apple.setAttribute("cy", String(APPLE.cy));
	apple.setAttribute("r", String(APPLE.r));
	apple.setAttribute("class", "panel__signature-apple");
	svg.append(apple);

	return svg;
}

/**
 * GitHub's own mark, from Octicons (`mark-github`, 16px), which is MIT licensed.
 *
 * Borrowed rather than drawn, and that is the opposite of the decision made
 * above for the figure. The reasoning differs because the two marks do different
 * jobs: the bowler-hatted figure is a signature, so an original drawing is the
 * point, while this one is a *signpost* and has to be recognised instantly by
 * someone who has never seen this product. An invented GitHub logo would fail at
 * the only thing it is for. Magritte's estate licenses his painting and GitHub
 * publishes this file under a licence that permits exactly this use, so the two
 * decisions are consistent even though they point opposite ways.
 *
 * Deliberately smaller than the figure in the stylesheet. Side by side at the
 * same height the solid octocat outweighs the slender figure and the row reads
 * as two logos rather than as a signature with a source link beside it.
 */
const GITHUB_MARK =
	"M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z";

/**
 * Builds the source mark as an SVG element.
 *
 * Same construction discipline as the figure above — `createElementNS`, never an
 * `innerHTML` string — so the one place this codebase writes markup still has no
 * HTML parser in it.
 */
export function createSourceMark(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NAMESPACE, "svg");
	svg.setAttribute("viewBox", "0 0 16 16");
	svg.setAttribute("class", "panel__source-mark");
	svg.setAttribute("aria-hidden", "true");
	svg.setAttribute("focusable", "false");

	const path = document.createElementNS(SVG_NAMESPACE, "path");
	path.setAttribute("d", GITHUB_MARK);
	svg.append(path);

	return svg;
}
