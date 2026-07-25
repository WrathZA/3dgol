import {
	BoxGeometry,
	Color,
	InstancedBufferAttribute,
	InstancedBufferGeometry,
	Mesh,
	ShaderMaterial,
} from "three";

import { CELL_SPACING, LAYER_SPACING } from "@/render/scene";

/**
 * The whole Stack as a single instanced draw.
 *
 * One instance exists for every Cell position in every ring slot —
 * `width × height × depthWindow` of them — and the entire structure is one draw
 * call regardless of how many Cells are alive. Draw calls, not triangles, are
 * the ceiling in practice.
 *
 * Fixed slots are what make the ring indexing work, so dead Cells are not
 * skipped: they occupy an instance and the vertex shader collapses them to zero
 * scale. Skipping them would mean compacting the buffer every Generation, which
 * is exactly the per-Cell CPU work this design exists to avoid.
 */

export interface StructureMeshOptions {
	width: number;
	height: number;
	depthWindow: number;
	/** Edge length of a drawn Cell, as a fraction of `CELL_SPACING`. */
	cellScale?: number;
}

export interface StructureMesh {
	mesh: Mesh;
	/**
	 * Writes one Layer's Cells into a ring slot.
	 *
	 * Only this slot's range is marked dirty, so the upload touches one Layer's
	 * worth of data rather than the whole Stack.
	 */
	writeLayer(slot: number, ages: Uint16Array, birthGeneration: number): void;
	/** Updates the per-frame uniforms the shader derives everything else from. */
	setFrameState(currentGeneration: number, layerCount: number): void;
	/** Marks every instance unwritten, discarding the previous Run's Layers. */
	resetLayers(): void;
	dispose(): void;
}

/** Default fraction of a Cell's spacing that the drawn box occupies. */
const DEFAULT_CELL_SCALE = 0.8;

/**
 * Instance index where a slot's Cells begin.
 *
 * Pure and exported so the ring arithmetic — the one part of this module that
 * can be verified without looking at anything — is testable in isolation.
 */
export function slotRange(
	slot: number,
	width: number,
	height: number,
	depthWindow: number,
): { start: number; count: number } {
	if (!Number.isInteger(slot) || slot < 0 || slot >= depthWindow) {
		throw new Error(`Slot ${slot} is outside a ring of ${depthWindow}`);
	}

	const count = width * height;
	return { start: slot * count, count };
}

/** Ring slot a Generation is written into. */
export function slotForGeneration(
	generation: number,
	depthWindow: number,
): number {
	if (!Number.isInteger(generation) || generation < 0) {
		throw new Error(
			`Generation must be a non-negative integer, got ${generation}`,
		);
	}
	return generation % depthWindow;
}

export function createStructureMesh(
	options: StructureMeshOptions,
): StructureMesh {
	const { width, height, depthWindow } = options;
	const cellScale = options.cellScale ?? DEFAULT_CELL_SCALE;
	const cellsPerLayer = width * height;
	const instanceCount = cellsPerLayer * depthWindow;

	const geometry = new InstancedBufferGeometry();
	const box = new BoxGeometry(
		cellScale,
		cellScale * (LAYER_SPACING / CELL_SPACING),
		cellScale,
	);
	geometry.index = box.index;
	geometry.attributes = box.attributes;
	geometry.instanceCount = instanceCount;

	// Grid position never changes: instance i of slot s is always the same Cell.
	// Written once at construction and never touched again.
	const gridPositions = new Float32Array(instanceCount * 2);
	for (let slot = 0; slot < depthWindow; slot++) {
		for (let index = 0; index < cellsPerLayer; index++) {
			const column = index % width;
			const row = Math.floor(index / width);
			const target = (slot * cellsPerLayer + index) * 2;
			gridPositions[target] = (column - (width - 1) / 2) * CELL_SPACING;
			gridPositions[target + 1] = (row - (height - 1) / 2) * CELL_SPACING;
		}
	}
	geometry.setAttribute(
		"aGridPosition",
		new InstancedBufferAttribute(gridPositions, 2),
	);

	// Rewritten one Layer at a time, as Generations arrive.
	const birthGenerations = new Float32Array(instanceCount).fill(-1);
	const ages = new Float32Array(instanceCount);
	const birthAttribute = new InstancedBufferAttribute(birthGenerations, 1);
	const ageAttribute = new InstancedBufferAttribute(ages, 1);
	birthAttribute.setUsage(35048 /* DynamicDrawUsage */);
	ageAttribute.setUsage(35048 /* DynamicDrawUsage */);
	geometry.setAttribute("aBirthGeneration", birthAttribute);
	geometry.setAttribute("aAge", ageAttribute);

	// Held directly rather than looked up per frame: an index into `uniforms` is
	// possibly-undefined under the project's strict indexing rules, and this runs
	// every frame.
	const currentGenerationUniform = { value: 0 };
	const layerCountUniform = { value: 0 };

	const material = new ShaderMaterial({
		uniforms: {
			uCurrentGeneration: currentGenerationUniform,
			uLayerCount: layerCountUniform,
			uDepthWindow: { value: depthWindow },
			uLayerSpacing: { value: LAYER_SPACING },
			uCellColor: { value: new Color(0x8fd3ff) },
		},
		vertexShader: VERTEX_SHADER,
		fragmentShader: FRAGMENT_SHADER,
	});

	const mesh = new Mesh(geometry, material);
	// Every instance is placed by the shader, so three.js cannot compute a
	// meaningful bounding volume — without this the whole structure is culled.
	mesh.frustumCulled = false;

	return {
		mesh,

		writeLayer(slot, layerAges, birthGeneration) {
			const { start, count } = slotRange(slot, width, height, depthWindow);
			if (layerAges.length !== count) {
				throw new Error(
					`Layer holds ${layerAges.length} Cells, expected ${count}`,
				);
			}

			for (let index = 0; index < count; index++) {
				ages[start + index] = layerAges[index] ?? 0;
				birthGenerations[start + index] = birthGeneration;
			}

			birthAttribute.clearUpdateRanges();
			birthAttribute.addUpdateRange(start, count);
			birthAttribute.needsUpdate = true;

			ageAttribute.clearUpdateRanges();
			ageAttribute.addUpdateRange(start, count);
			ageAttribute.needsUpdate = true;
		},

		setFrameState(currentGeneration, layerCount) {
			currentGenerationUniform.value = currentGeneration;
			layerCountUniform.value = layerCount;
		},

		/**
		 * Clears every slot on Restart.
		 *
		 * The previous Run's instances would in fact hide themselves — a Generation
		 * always lands in the same slot, so any stale slot is either already
		 * overwritten or holds a birth Generation ahead of the current one, which
		 * the shader's depth guard rejects. That reasoning is correct and fragile:
		 * it silently stops holding if slot assignment ever changes. Restart is a
		 * rare Viewer action, so the whole buffer is cleared outright instead.
		 */
		resetLayers() {
			birthGenerations.fill(-1);
			ages.fill(0);

			birthAttribute.clearUpdateRanges();
			birthAttribute.needsUpdate = true;
			ageAttribute.clearUpdateRanges();
			ageAttribute.needsUpdate = true;
		},

		dispose() {
			box.dispose();
			geometry.dispose();
			material.dispose();
		},
	};
}

/**
 * Derives every instance's placement from two uniforms.
 *
 * Nothing here is computed per-instance on the CPU. A Layer's height comes from
 * how far behind the current Generation it was born, so advancing the Run is one
 * uniform write no matter how many instances exist.
 *
 * While the Stack is filling, `uLayerCount` grows and the structure genuinely
 * rises. Once full it holds steady, the top stays put, and each Layer sinks one
 * step per Generation until it drops off the bottom.
 */
const VERTEX_SHADER = /* glsl */ `
attribute vec2 aGridPosition;
attribute float aBirthGeneration;
attribute float aAge;

uniform float uCurrentGeneration;
uniform float uLayerCount;
uniform float uDepthWindow;
uniform float uLayerSpacing;

varying vec3 vNormal;

void main() {
	float depth = uCurrentGeneration - aBirthGeneration;

	// Dead Cells, never-written slots, and Layers already retired from the ring
	// collapse to nothing rather than being skipped on the CPU.
	bool visible = aAge > 0.0 && aBirthGeneration >= 0.0 && depth >= 0.0 && depth < uDepthWindow;

	float y = (uLayerCount - 1.0 - depth) * uLayerSpacing;

	vec3 placed = position * (visible ? 1.0 : 0.0)
		+ vec3(aGridPosition.x, y, aGridPosition.y);

	vNormal = normal;

	gl_Position = projectionMatrix * modelViewMatrix * vec4(placed, 1.0);
}
`;

/**
 * One colour, shaded by which way a face points.
 *
 * Colour as meaning belongs to the next issue. What this has to do is make the
 * structure read as solid forms rather than a flat silhouette — every face the
 * same brightness would turn a field of boxes into one undifferentiated mass.
 * A fixed direction is enough; there is no light in the scene to configure.
 */
const FRAGMENT_SHADER = /* glsl */ `
uniform vec3 uCellColor;

varying vec3 vNormal;

const vec3 LIGHT_DIRECTION = normalize(vec3(0.4, 1.0, 0.7));

void main() {
	float facing = dot(normalize(vNormal), LIGHT_DIRECTION) * 0.5 + 0.5;
	// Floor well above zero so downward faces stay legible rather than reading
	// as holes in the structure.
	float shade = mix(0.45, 1.0, facing);

	gl_FragColor = vec4(uCellColor * shade, 1.0);
}
`;
