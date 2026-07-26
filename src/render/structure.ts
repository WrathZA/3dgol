import type { Mesh } from "three";

import {
	createStructureMesh,
	drawnLayerCount,
	type StructureMesh,
	slotForGeneration,
} from "@/render/instances";
import type { Simulation } from "@/sim/simulation";

/**
 * Keeps the drawn structure in step with a Run.
 *
 * Owns the ring bookkeeping between the Simulation's Stack and the instance
 * buffer: which slot a Generation lands in, and when a slot needs rewriting.
 *
 * The whole point is how little happens here. One Layer is written per
 * Generation and one uniform per frame — never anything proportional to the
 * size of the Stack.
 */
export interface StructureView {
	mesh: Mesh;
	/** Call once per Generation, after the Simulation has advanced. */
	syncLatestLayer(): void;
	/** Call once per frame, before rendering. */
	syncFrameState(): void;
	/**
	 * Sets the window the shader fades and cuts off against.
	 *
	 * Fractional values are expected — easing this is what makes a narrowing
	 * window dissolve its oldest Layers rather than deleting them.
	 */
	setDepthWindow(depthWindow: number): void;
	/**
	 * Re-lays the ring after the Stack's own Depth Window has changed.
	 *
	 * A Generation's slot is `generation % maxDepth`, so a changed Depth Window
	 * moves every held Layer to a different slot. Every held Layer is therefore
	 * rewritten — the one operation here proportional to the size of the Stack.
	 * That is acceptable precisely because it happens on a Viewer action and
	 * nowhere else: not per frame, not per Generation. It allocates nothing.
	 *
	 * Call after setting `simulation.stack.maxDepth`, never before.
	 */
	relayRing(): void;
	/** Call after a Restart, before the next sync. */
	reset(): void;
	dispose(): void;
}

export interface StructureViewOptions {
	/**
	 * Ring slots to allocate — the largest Depth Window the interface permits.
	 *
	 * Allocated once at this size so the Viewer can move the Depth Window without
	 * the instance buffer being rebuilt underneath them.
	 */
	ringCapacity?: number;
}

export function createStructureView(
	simulation: Simulation,
	options: StructureViewOptions = {},
): StructureView {
	const structure: StructureMesh = createStructureMesh({
		width: simulation.width,
		height: simulation.height,
		depthWindow: simulation.stack.maxDepth,
		maximumAge: simulation.maximumAge,
		...(options.ringCapacity === undefined
			? {}
			: { ringCapacity: options.ringCapacity }),
	});

	/** Ring modulus in force — the Stack's Depth Window as last laid out. */
	let slotCount = simulation.stack.maxDepth;
	/** The window being drawn, which the Viewer's changes travel toward. */
	let drawnDepthWindow = simulation.stack.maxDepth;

	const writeLayerAtDepth = (depth: number): void => {
		const generation = simulation.stack.generationAt(depth);
		structure.writeLayer(
			slotForGeneration(generation, slotCount),
			simulation.stack.layerAt(depth),
			generation,
		);
	};

	const writeNewest = (): void => {
		if (simulation.stack.depth === 0) {
			return;
		}
		writeLayerAtDepth(0);
	};

	// The Seed is already on the Stack by the time a Simulation is constructed,
	// so the structure has something to show before the first Generation advances.
	writeNewest();

	return {
		mesh: structure.mesh,

		syncLatestLayer: writeNewest,

		syncFrameState() {
			structure.setFrameState(
				simulation.generation,
				drawnLayerCount(simulation.stack.depth, drawnDepthWindow),
			);
			// Maximum Age is read every frame rather than pushed on change: the
			// gradient then retargets the moment the Viewer moves the slider, with
			// no separate notification to keep in step.
			structure.setMaximumAge(simulation.maximumAge);
		},

		setDepthWindow(depthWindow) {
			drawnDepthWindow = depthWindow;
			structure.setDepthWindow(depthWindow);
		},

		relayRing() {
			slotCount = simulation.stack.maxDepth;
			// Cleared first, and in full. Slots outside the new window still hold
			// the previous layout, and a later widening would otherwise draw them
			// as Layers of a Run that has moved on.
			structure.resetLayers();
			structure.setSlotCount(slotCount);

			for (let depth = simulation.stack.depth - 1; depth >= 0; depth--) {
				writeLayerAtDepth(depth);
			}

			// Each write narrows the upload to its own slot, so without this only
			// the last Layer written would reach the GPU.
			structure.uploadAll();
		},

		reset() {
			structure.resetLayers();
			writeNewest();
		},

		dispose() {
			structure.dispose();
		},
	};
}
