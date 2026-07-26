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
