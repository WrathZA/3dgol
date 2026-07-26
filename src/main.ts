import { createScene } from "@/render/scene";
import { createStructureView, type StructureView } from "@/render/structure";
import { clampSettings, DEFAULT_SETTINGS, SETTING_BOUNDS } from "@/settings";
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

const settings = clampSettings(DEFAULT_SETTINGS);

// The stage outlives any single Run: the renderer, camera, and controls are the
// Viewer's vantage point, and Restarting the simulation should not throw away
// where they were standing.
const stage = createScene(canvas, {
	width: settings.gridWidth,
	height: settings.gridHeight,
	depthWindow: settings.depthWindow,
});

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
 * A Run in progress, and everything that has to be reset when one begins.
 *
 * Grouped into one object deliberately. Held as separate variables, starting a
 * Run means remembering to reset each of them, and the failure from forgetting
 * one is both severe and hard to trace: stale travel state re-lays a ring that
 * no longer exists, and a stale accumulator discharges the previous Run's banked
 * time into the new one. Replacing the whole object cannot half-happen.
 */
interface Run {
	readonly simulation: Simulation;
	readonly view: StructureView;
	/**
	 * The Grid dimensions this Run was started at.
	 *
	 * Recorded rather than read back from the settings, because the settings hold
	 * what the Viewer has *asked for* while these hold what is actually running.
	 * The difference between the two is what makes a staged Grid change visible
	 * instead of appearing to have done nothing.
	 */
	readonly width: number;
	readonly height: number;
	/** Live settings already pushed, against which the settings are compared. */
	appliedSpeed: number;
	appliedMaximumAge: number;
	appliedExplosion: boolean;
	appliedCellSize: number;
	/** The Depth Window being drawn, which travels toward the setting. */
	drawnDepthWindow: number;
	/** The Depth Window the ring is laid out for. An integer by construction. */
	laidOutDepthWindow: number;
	/** Time banked toward the next Generation. */
	accumulated: number;
}

/**
 * Begins a Run at the currently staged Grid dimensions.
 *
 * The only path that starts a Run — used at boot and again whenever the Viewer
 * changes dimensions — so there is no second path to drift out of step with this
 * one.
 *
 * It allocates, unlike almost everything else here: a Grid size is fixed for the
 * life of a Simulation, the Stack is sized from it, and every instance's Grid
 * position is written once at construction, so a new size means new buffers.
 * That is acceptable here and nowhere else, because it happens on a Viewer
 * action rather than per Generation or per frame.
 */
function startRun(previous: Run | undefined): Run {
	if (previous !== undefined) {
		stage.scene.remove(previous.view.mesh);
		previous.view.dispose();
	}

	const width = settings.gridWidth;
	const height = settings.gridHeight;

	const simulation = new Simulation({
		width,
		height,
		depthWindow: settings.depthWindow,
		maximumAge: settings.maximumAge,
		explosion: settings.explosion,
	});

	const view = createStructureView(simulation, {
		cellSize: settings.cellSize,
		// Allocated at the largest Depth Window the panel permits, so moving that
		// slider re-lays the ring rather than reallocating it.
		ringCapacity: SETTING_BOUNDS.depthWindow.max,
	});

	stage.scene.add(view.mesh);
	// The footprint changes with the Grid, and the retreat limit derives from it —
	// without this a larger Grid cannot be backed away from far enough to see.
	stage.setExtent({ width, height, depthWindow: settings.depthWindow });

	return {
		simulation,
		view,
		width,
		height,
		appliedSpeed: settings.generationsPerSecond,
		appliedMaximumAge: settings.maximumAge,
		appliedExplosion: settings.explosion,
		appliedCellSize: settings.cellSize,
		drawnDepthWindow: settings.depthWindow,
		laidOutDepthWindow: settings.depthWindow,
		accumulated: 0,
	};
}

let run = startRun(undefined);

/**
 * Whether the Viewer has asked for a Restart since the last frame.
 *
 * A flag the panel raises and the loop lowers, rather than a callback the panel
 * calls. Two reasons. Every change to Run state then happens in one place, at a
 * known point in the frame, instead of a Simulation being replaced part-way
 * through a frame that already holds a reference to the old one. And a Restart
 * requested while paused behaves exactly like any other, because the loop runs
 * regardless of Speed.
 */
const restart = { requested: false };

const panel = createControlPanel(settings, restart, {
	// Read on demand rather than passed by value: the panel compares the staged
	// Grid against the running one to decide whether a Restart is pending, and the
	// running one changes underneath it.
	runningGrid: () => ({ width: run.width, height: run.height }),
});

let lastFrameTime = performance.now();

/**
 * Begins a new Run, reusing the current one's buffers where it can.
 *
 * Two paths, because they cost very differently. Unchanged Grid dimensions reseed
 * in place: the Simulation's own Restart clears the Stack, resets the Generation
 * counter, and draws a fresh random Seed, all inside buffers that are already the
 * right size. Changed dimensions cannot do that — a Grid size is fixed for the
 * life of a Simulation — so the Run is rebuilt.
 *
 * Both give a genuinely different Run, because the Seed is drawn afresh either
 * way. The Viewer chooses *when* a Seed is generated, never what it holds.
 */
function restartRun(): void {
	const dimensionsChanged =
		settings.gridWidth !== run.width || settings.gridHeight !== run.height;

	if (dimensionsChanged) {
		run = startRun(run);
	} else {
		run.simulation.restart();
		run.view.reset();
		run.accumulated = 0;
	}

	// The staged dimensions are the running ones now, so the panel's pending marks
	// have to clear — including on the path where nothing about them changed, since
	// the Viewer may have moved a slider and moved it back.
	panel.refresh();
}

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

	if (target > run.laidOutDepthWindow) {
		run.simulation.stack.maxDepth = target;
		run.laidOutDepthWindow = target;
		run.view.relayRing();
	}

	if (run.drawnDepthWindow !== target) {
		const travel = DEPTH_WINDOW_LAYERS_PER_SECOND * elapsed;
		run.drawnDepthWindow =
			target > run.drawnDepthWindow
				? Math.min(run.drawnDepthWindow + travel, target)
				: Math.max(run.drawnDepthWindow - travel, target);

		run.view.setDepthWindow(run.drawnDepthWindow);
		stage.setDepthWindow(run.drawnDepthWindow);
	}

	// Arrived, and narrower than the ring is laid out for: the Layers beyond the
	// new window have finished dissolving, so the Stack can let them go and the
	// ring can shrink to what is now drawn.
	if (run.drawnDepthWindow === target && target < run.laidOutDepthWindow) {
		run.simulation.stack.maxDepth = target;
		run.laidOutDepthWindow = target;
		run.view.relayRing();
	}
}

function frame(now: number): void {
	requestAnimationFrame(frame);

	const elapsed = (now - lastFrameTime) / 1000;
	lastFrameTime = now;

	// Taken before anything else this frame, so a Restart requested while the
	// previous frame was in flight lands on a Run that is not part-way through
	// having settings applied to it.
	if (restart.requested) {
		restart.requested = false;
		restartRun();
	}

	if (settings.generationsPerSecond !== run.appliedSpeed) {
		// Time banked against a slower Speed can be worth several Generations at a
		// faster one, which would discharge as a burst the moment the slider moved.
		run.accumulated = retimeAccumulator(
			run.accumulated,
			settings.generationsPerSecond,
		);
		run.appliedSpeed = settings.generationsPerSecond;
	}

	if (settings.maximumAge !== run.appliedMaximumAge) {
		// The Simulation holds Maximum Age and the rule applies it, so Cells already
		// past a lowered value die on the next Generation. Reaching into the Grid to
		// kill them here would be a second copy of the rule.
		run.simulation.maximumAge = settings.maximumAge;
		run.appliedMaximumAge = settings.maximumAge;
	}

	if (settings.explosion !== run.appliedExplosion) {
		// Nothing already drawn changes — the Stack keeps its Layers and the Run
		// does not reseed. Switching it on leaves the Cells already at the cap to
		// detonate on the next Generation rather than retroactively.
		run.simulation.explosion = settings.explosion;
		run.appliedExplosion = settings.explosion;
	}

	if (settings.cellSize !== run.appliedCellSize) {
		run.view.setCellSize(settings.cellSize);
		run.appliedCellSize = settings.cellSize;
	}

	applyDepthWindow(elapsed);

	const step = advanceClock(
		run.accumulated,
		elapsed,
		settings.generationsPerSecond,
	);
	run.accumulated = step.accumulated;
	for (let generation = 0; generation < step.generations; generation++) {
		run.simulation.advance();
		run.view.syncLatestLayer();
	}

	// Camera movement is entirely separate from the Run. Generations advance on
	// their own accumulator above, so orbiting, panning or zooming never slows,
	// stalls or resumes the simulation — and damping keeps the camera drifting
	// for a moment after a gesture ends.
	stage.controls.update();

	run.view.syncFrameState();
	stage.renderer.render(stage.scene, stage.camera);
}

requestAnimationFrame(frame);
