import type { Mesh } from "three";

import {
	createStructureMesh,
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
	/** Call after a Restart, before the next sync. */
	reset(): void;
	dispose(): void;
}

export function createStructureView(simulation: Simulation): StructureView {
	const depthWindow = simulation.stack.maxDepth;
	const structure: StructureMesh = createStructureMesh({
		width: simulation.width,
		height: simulation.height,
		depthWindow,
	});

	const writeNewest = (): void => {
		const stack = simulation.stack;
		if (stack.depth === 0) {
			return;
		}

		const generation = stack.newestGeneration;
		structure.writeLayer(
			slotForGeneration(generation, depthWindow),
			stack.layerAt(0),
			generation,
		);
	};

	// The Seed is already on the Stack by the time a Simulation is constructed,
	// so the structure has something to show before the first Generation advances.
	writeNewest();

	return {
		mesh: structure.mesh,

		syncLatestLayer: writeNewest,

		syncFrameState() {
			structure.setFrameState(simulation.generation, simulation.stack.depth);
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
