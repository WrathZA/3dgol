import { createScene } from "@/render/scene";
import { createStructureView } from "@/render/structure";
import { DEFAULT_SETTINGS } from "@/settings";
import { Simulation } from "@/sim/simulation";

/**
 * Composition root: wires the Simulation to the renderer and runs the loop.
 *
 * Generations and frames are deliberately decoupled. The Run advances on a time
 * accumulator, so how fast the structure grows does not depend on how fast the
 * display refreshes — and the scene is redrawn every frame regardless, so
 * nothing stutters when a Generation happens to be computed.
 */

const canvas = document.querySelector<HTMLCanvasElement>("#viewport");

if (canvas === null) {
	throw new Error("Expected a canvas with id 'viewport' in index.html");
}

const settings = DEFAULT_SETTINGS;

const simulation = new Simulation({
	width: settings.gridWidth,
	height: settings.gridHeight,
	depthWindow: settings.depthWindow,
	maximumAge: settings.maximumAge,
});

const view = createStructureView(simulation);
const stage = createScene(canvas, {
	width: settings.gridWidth,
	height: settings.gridHeight,
	depthWindow: settings.depthWindow,
});

stage.scene.add(view.mesh);

window.addEventListener("resize", stage.resize);

const secondsPerGeneration = 1 / settings.generationsPerSecond;
let accumulated = 0;
let lastFrameTime = performance.now();

/**
 * Largest time step the accumulator will honour, in seconds.
 *
 * A backgrounded tab produces an enormous gap on return. Without a cap the Run
 * would try to catch up all at once, freezing the page — better to lose the
 * missing Generations than to stall.
 */
const MAX_FRAME_DELTA = 0.25;

function frame(now: number): void {
	requestAnimationFrame(frame);

	const elapsed = Math.min((now - lastFrameTime) / 1000, MAX_FRAME_DELTA);
	lastFrameTime = now;
	accumulated += elapsed;

	while (accumulated >= secondsPerGeneration) {
		accumulated -= secondsPerGeneration;
		simulation.advance();
		view.syncLatestLayer();
	}

	view.syncFrameState();
	stage.renderer.render(stage.scene, stage.camera);
}

requestAnimationFrame(frame);
