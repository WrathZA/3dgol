import { createScene } from "@/render/scene";
import { createStructureView } from "@/render/structure";
import {
	clampLiveSettings,
	DEFAULT_SETTINGS,
	SETTING_BOUNDS,
} from "@/settings";
import { advanceClock, retimeAccumulator } from "@/sim/clock";
import { Simulation } from "@/sim/simulation";
import { createControlPanel } from "@/ui/panel";

/**
 * Composition root: wires the Simulation, the renderer, and the control panel,
 * then runs the loop.
 *
 * Generations and frames are deliberately decoupled. The Run advances on a time
 * accumulator, so how fast the structure grows does not depend on how fast the
 * display refreshes — and the scene is redrawn every frame regardless, so the
 * camera stays smooth while paused or running slowly.
 *
 * The panel mutates a plain settings object and knows nothing about either side.
 * This is the only module that reads it, notices what changed, and applies it —
 * which is what lets a setting be changed mid-Run without the Simulation and the
 * renderer having to agree on how.
 */

const canvas = document.querySelector<HTMLCanvasElement>("#viewport");

if (canvas === null) {
	throw new Error("Expected a canvas with id 'viewport' in index.html");
}

const settings = clampLiveSettings(DEFAULT_SETTINGS);

const simulation = new Simulation({
	width: settings.gridWidth,
	height: settings.gridHeight,
	depthWindow: settings.depthWindow,
	maximumAge: settings.maximumAge,
});

const view = createStructureView(simulation, {
	cellSize: settings.cellSize,
	// Allocated once at the largest Depth Window the panel permits, so moving that
	// slider re-lays the ring rather than reallocating it.
	ringCapacity: SETTING_BOUNDS.depthWindow.max,
});
const stage = createScene(canvas, {
	width: settings.gridWidth,
	height: settings.gridHeight,
	depthWindow: settings.depthWindow,
});

stage.scene.add(view.mesh);
createControlPanel(settings);

window.addEventListener("resize", stage.resize);

/**
 * Layers per second a Depth Window change travels toward its new value.
 *
 * Not decoration. The window drives both the fade and the cut-off, and the two
 * meet exactly, so travelling makes the Layers a narrowed window gives up
 * dissolve on their way out rather than being deleted where they stand — which
 * is what the bottom of the structure does every Generation anyway.
 *
 * A rate rather than a duration, so the distance covered is what takes time: a
 * keyboard step of one Layer lands immediately, and giving up half the Stack
 * takes long enough to watch it go. Fast enough that dragging the slider still
 * feels like the structure is following the finger.
 */
const DEPTH_WINDOW_LAYERS_PER_SECOND = 90;

/**
 * What has been applied, against which the settings object is compared.
 *
 * Comparing four numbers per frame is constant work regardless of how many
 * instances exist, which is the property the whole rendering design protects.
 * The alternative — the panel notifying whoever needs to know — would put the
 * interface in the business of knowing what a setting affects.
 */
let appliedSpeed = settings.generationsPerSecond;
let appliedMaximumAge = settings.maximumAge;
let appliedCellSize = settings.cellSize;
/** The Depth Window being drawn, which travels toward the setting. */
let drawnDepthWindow = settings.depthWindow;
/** The Depth Window the ring is laid out for, an integer by construction. */
let laidOutDepthWindow = settings.depthWindow;

let accumulated = 0;
let lastFrameTime = performance.now();

/**
 * Brings the Depth Window toward what the Viewer asked for.
 *
 * Widening takes effect on the Stack immediately: it may retain more Layers from
 * this Generation on, and there is nothing to dissolve. Narrowing waits until the
 * travel completes, so the Layers being given up stay alive long enough to fade —
 * cutting the Stack first would delete them before they could.
 */
function applyDepthWindow(elapsed: number): void {
	const target = settings.depthWindow;

	if (target > laidOutDepthWindow) {
		simulation.stack.maxDepth = target;
		laidOutDepthWindow = target;
		view.relayRing();
	}

	if (drawnDepthWindow !== target) {
		const travel = DEPTH_WINDOW_LAYERS_PER_SECOND * elapsed;
		drawnDepthWindow =
			target > drawnDepthWindow
				? Math.min(drawnDepthWindow + travel, target)
				: Math.max(drawnDepthWindow - travel, target);

		view.setDepthWindow(drawnDepthWindow);
		stage.setDepthWindow(drawnDepthWindow);
	}

	// Arrived, and narrower than the ring is laid out for: the Layers beyond the
	// new window have finished dissolving, so the Stack can let them go and the
	// ring can shrink to what is now drawn.
	if (drawnDepthWindow === target && target < laidOutDepthWindow) {
		simulation.stack.maxDepth = target;
		laidOutDepthWindow = target;
		view.relayRing();
	}
}

function frame(now: number): void {
	requestAnimationFrame(frame);

	const elapsed = (now - lastFrameTime) / 1000;
	lastFrameTime = now;

	if (settings.generationsPerSecond !== appliedSpeed) {
		// Time banked against a slower Speed can be worth several Generations at a
		// faster one, which would discharge as a burst the moment the slider moved.
		accumulated = retimeAccumulator(accumulated, settings.generationsPerSecond);
		appliedSpeed = settings.generationsPerSecond;
	}

	if (settings.maximumAge !== appliedMaximumAge) {
		// The Simulation holds Maximum Age and the rule applies it, so Cells already
		// past a lowered value die on the next Generation. Reaching into the Grid to
		// kill them here would be a second copy of the rule.
		simulation.maximumAge = settings.maximumAge;
		appliedMaximumAge = settings.maximumAge;
	}

	if (settings.cellSize !== appliedCellSize) {
		view.setCellSize(settings.cellSize);
		appliedCellSize = settings.cellSize;
	}

	applyDepthWindow(elapsed);

	const step = advanceClock(
		accumulated,
		elapsed,
		settings.generationsPerSecond,
	);
	accumulated = step.accumulated;
	for (let generation = 0; generation < step.generations; generation++) {
		simulation.advance();
		view.syncLatestLayer();
	}

	// Camera movement is entirely separate from the Run. Generations advance on
	// their own accumulator above, so orbiting, panning or zooming never slows,
	// stalls or resumes the simulation — and damping keeps the camera drifting
	// for a moment after a gesture ends.
	stage.controls.update();

	view.syncFrameState();
	stage.renderer.render(stage.scene, stage.camera);
}

requestAnimationFrame(frame);
