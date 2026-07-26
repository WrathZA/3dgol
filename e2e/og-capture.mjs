/**
 * Captures the frame that other people see before they open the product.
 *
 * The link gets pasted into Slack, Discord, and messages, and the card those
 * platforms draw is the only thing selling a piece whose entire value is
 * visual. The image therefore has to be a frame of a real run — a mockup would
 * promise something the product does not do, and there is no shortage of good
 * frames once it is running.
 *
 * Committed as a script rather than captured by hand once, because the visuals
 * change: every issue that touches colour, fade, or geometry silently ages the
 * preview, and a recapture has to be one command rather than an archaeology
 * exercise in what viewport and what wait produced the picture in the repo.
 *
 * Local only, like `smoke.mjs`: this draws through a software rasteriser.
 *
 * Usage:
 *   pnpm build && pnpm preview &
 *   pnpm og-image                                        # writes public/og-image.png
 *   pnpm og-image 'http://localhost:4173/?pattern=gosper-glider-gun'
 *   pnpm og-image http://localhost:4173/ out.png 45000
 */
import { chromium } from "playwright";

const url = process.argv[2] ?? "http://localhost:4173/";
const out = process.argv[3] ?? "public/og-image.png";

/*
 * How long the Structure is left to build before the shutter falls.
 *
 * Long enough that the Depth Window is full — at the starting Speed of 10
 * Generations per second the default 60 Layers are laid down in six seconds —
 * and then a good deal longer, because a Stack that has only just filled is
 * still showing its own beginning. What sells the product is history that has
 * been running a while: streaks that reach the top of the window, ages spread
 * across the palette, a silhouette rather than a slab.
 */
const waitMs = Number(process.argv[4] ?? 30_000);

/*
 * 1200 × 630 is what the card generators want, and it is not negotiable
 * downward without cost: Facebook, LinkedIn, and X all render a large summary
 * card above 600 × 315 and fall back to a small square below it, so an image
 * that misses the ratio is not merely smaller — it is a different card.
 *
 * `deviceScaleFactor: 1` for the reason `smoke.mjs` uses it: this is drawn in
 * software, where doubling the scale quadruples the fragment work and the
 * screenshot stops completing.
 */
const WIDTH = 1200;
const HEIGHT = 630;

const browser = await chromium.launch({
	// Headless Chromium has no GPU here; SwiftShader draws in software.
	args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});

const page = await browser.newPage({
	viewport: { width: WIDTH, height: HEIGHT },
	deviceScaleFactor: 1,
});

const errors = [];
page.on("console", (msg) => {
	if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
});
page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));

await page.goto(url, { waitUntil: "load" });
await page.waitForTimeout(waitMs);

/*
 * One scroll back, because the arrival framing is not a card.
 *
 * The camera starts aimed at the middle of the Stack's height and angled down
 * from above, which puts the near bottom edge of the Structure well below the
 * point being looked at. That is right in a full window and wrong in a 630px
 * one: the Structure runs off the bottom of the frame while a third of the top
 * stays empty. Dollying back is the same movement a Viewer makes with a scroll
 * wheel, so the frame stays a real one rather than a staged camera the product
 * never uses.
 */
const DOLLY_BACK = 220;
await page.mouse.move(WIDTH / 2, HEIGHT / 2);
await page.mouse.wheel(0, DOLLY_BACK);
// The controls damp, so the move arrives over several frames rather than at once.
await page.waitForTimeout(1_000);

/*
 * The controls come off, and the Structure does not.
 *
 * The card is an argument for opening the page, and a stack of sliders is not
 * the argument — it is the furniture. Hiding the layer rather than capturing a
 * cropped region keeps this a frame of the run exactly as it was drawn, at the
 * full card dimensions, rather than a detail lifted out of one.
 */
await page.addStyleTag({ content: ".panel-layer { display: none !important; }" });

const drawing = await page.evaluate(() => {
	const canvas = document.querySelector("#viewport");
	return (
		canvas !== null && (canvas.getContext("webgl2") ?? canvas.getContext("webgl")) !== null
	);
});

// A card showing a blank canvas is worse than no card: it advertises that the
// product does not work. Fail loudly rather than committing an empty frame.
if (!drawing) {
	errors.push("no WebGL context — the capture would be an empty canvas");
}

await page.screenshot({ path: out, timeout: 180_000, animations: "disabled" });
await browser.close();

console.log(JSON.stringify({ out, url, waitMs, size: `${WIDTH}x${HEIGHT}`, errors }, null, 2));

if (errors.length > 0) {
	process.exitCode = 1;
}
