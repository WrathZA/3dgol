/**
 * Renders the running product headlessly and saves a screenshot.
 *
 * Exists because the acceptance criteria for the structure are about what you
 * see. Tests can prove the Life rule and the ring arithmetic; nothing but a
 * picture can tell you whether Layers read as separate strata or fuse into one
 * solid mass — and the difference between those is a single constant.
 *
 * Local only, never in CI: this runs against a software rasteriser, so it is
 * slow and its timings say nothing about real hardware.
 *
 * Usage:
 *   pnpm build && pnpm preview &
 *   pnpm smoke                       # writes smoke.png
 *   pnpm smoke http://localhost:4173/ out.png 30000
 */
import { chromium } from "playwright";

const url = process.argv[2] ?? "http://localhost:4173/";
const out = process.argv[3] ?? "smoke.png";
const waitMs = Number(process.argv[4] ?? 30_000);

const browser = await chromium.launch({
	// Headless Chromium has no GPU here; SwiftShader draws in software.
	args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});

// Deliberately small. Software rasterising the whole Stack at a large viewport
// saturates the compositor and the screenshot never completes.
const page = await browser.newPage({ viewport: { width: 480, height: 360 } });

const errors = [];
page.on("console", (msg) => {
	if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
});
page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));

await page.goto(url, { waitUntil: "load" });
await page.waitForTimeout(waitMs);

const report = await page.evaluate(() => {
	const canvas = document.querySelector("#viewport");
	if (canvas === null) {
		return { error: "no canvas" };
	}
	const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
	return {
		canvasWidth: canvas.width,
		canvasHeight: canvas.height,
		hasContext: gl !== null,
		heapMB: performance.memory
			? Math.round(performance.memory.usedJSHeapSize / 1048576)
			: null,
	};
});

await page.screenshot({ path: out, timeout: 180_000, animations: "disabled" });
await browser.close();

console.log(JSON.stringify({ out, report, errors }, null, 2));

if (errors.length > 0) {
	process.exitCode = 1;
}
