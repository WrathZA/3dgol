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
 */
const PARTS: ReadonlyArray<{ d: string; part: string }> = [
	// The crown: a dome that meets the brim on both sides.
	{ d: "M9.5 11.6V7.2Q16 2.6 22.5 7.2v4.4", part: "hat" },
	// The brim, drawn past the crown on each side so the hat reads as worn
	// rather than balanced.
	{ d: "M4 11.6h24", part: "hat" },
	// The stem, which is the whole reason the apple is legible at this size —
	// without it the circle is just a head.
	{ d: "M16 15.1v-1.9", part: "stem" },
	// The coat: shoulders falling from a collar that the apple sits in front of.
	{
		d: "M5.5 39.5V30q1-4.5 6.5-5.8l4 2.3 4-2.3q5.5 1.3 6.5 5.8v9.5",
		part: "coat",
	},
];

/** The apple: the one filled shape, and the only colour in the mark. */
const APPLE = { cx: 16, cy: 19.6, r: 4.8 } as const;

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
	svg.setAttribute("viewBox", "0 0 32 40");
	svg.setAttribute("class", "panel__signature-mark");
	svg.setAttribute("aria-hidden", "true");
	// Without this, IE-era SVG focus behaviour puts the drawing in the tab order
	// separately from the link that wraps it.
	svg.setAttribute("focusable", "false");

	const apple = document.createElementNS(SVG_NAMESPACE, "circle");
	apple.setAttribute("cx", String(APPLE.cx));
	apple.setAttribute("cy", String(APPLE.cy));
	apple.setAttribute("r", String(APPLE.r));
	apple.setAttribute("class", "panel__signature-apple");

	svg.append(apple);

	for (const { d, part } of PARTS) {
		const path = document.createElementNS(SVG_NAMESPACE, "path");
		path.setAttribute("d", d);
		path.setAttribute("data-part", part);
		svg.append(path);
	}

	return svg;
}
