import {
	BoxGeometry,
	Color,
	DynamicDrawUsage,
	InstancedBufferAttribute,
	InstancedBufferGeometry,
	Mesh,
	ShaderMaterial,
} from "three";

import { BACKGROUND_COLOR, CELL_SPACING, LAYER_SPACING } from "@/render/scene";

/**
 * The whole Stack as a single instanced draw.
 *
 * One instance exists for every Cell position in every ring slot —
 * `width × height × ringCapacity` of them — and the entire structure is one draw
 * call regardless of how many Cells are alive. Draw calls, not triangles, are
 * the ceiling in practice.
 *
 * The ring is allocated at the largest Depth Window the interface permits, and
 * the draw range covers only the slots the current window uses. The Depth Window
 * is a Viewer control, so allocating exactly what it asks for would mean
 * reallocating the whole buffer on a slider drag.
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
	/** Age at which a Cell dies — the far end of the Colour Gradient. */
	maximumAge: number;
	/** Edge length of a drawn Cell, as a fraction of `CELL_SPACING`. */
	cellSize?: number;
	/**
	 * Ring slots to allocate, which must be at least `depthWindow`.
	 *
	 * The Depth Window is a Viewer control, so allocating exactly what it
	 * currently asks for would mean reallocating the whole instance buffer every
	 * time the slider moved. Allocating once at the largest window the interface
	 * permits means changing it costs a uniform and a draw range instead.
	 */
	ringCapacity?: number;
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
	/** Retargets the Colour Gradient when Maximum Age changes. */
	setMaximumAge(maximumAge: number): void;
	/** Resizes drawn Cells, between a porous scatter and solid sheets. */
	setCellSize(cellSize: number): void;
	/**
	 * Sets the window the shader fades and cuts off against.
	 *
	 * A fractional value is accepted and intended. Both the fade and the cut-off
	 * derive from this, and they meet exactly — a Layer is fully dissolved at the
	 * moment it is cut. Easing this rather than snapping it therefore makes a
	 * narrowing window dissolve its oldest Layers instead of deleting them.
	 *
	 * This changes what is *seen*, not what is drawn. See `setSlotCount`.
	 */
	setDepthWindow(depthWindow: number): void;
	/**
	 * Sets how many ring slots are drawn, and so how much is drawn at all.
	 *
	 * Separate from `setDepthWindow` because the two answer different questions.
	 * This one must cover every slot the ring assigns, or a Layer written to a
	 * high slot would simply not be drawn however new it is. It is what makes a
	 * lower Depth Window genuinely cheaper — the slider has to be a way out for
	 * a device that cannot afford the full Stack, not only a way to change how
	 * the structure looks — so it changes when the ring is re-laid out, not
	 * while the window is easing toward it.
	 */
	setSlotCount(slots: number): void;
	/** Marks every instance unwritten, discarding the previous Run's Layers. */
	resetLayers(): void;
	/**
	 * Marks the whole instance buffer for upload.
	 *
	 * Needed after rewriting more than one Layer in a batch. `writeLayer` narrows
	 * the upload to the single slot it touched, which is the point of it — but
	 * that means the last write in a batch would be the only one to reach the
	 * GPU, leaving the rest of the ring showing whatever it held before.
	 */
	uploadAll(): void;
	dispose(): void;
}

/**
 * Edge length of a drawn Cell, as a fraction of the lattice spacing.
 *
 * A Cell is a cube on an isotropic lattice, so this one number sets the gap in
 * every direction at once. It is the most consequential value in the codebase:
 * near 1, Cells touch and the Stack fuses into a solid mass — history becomes
 * invisible, which is the one thing this product exists to show. Around half,
 * each Generation reads as its own stratum and you can see into the structure.
 *
 * Now a Viewer control, so the Cell is built as a unit cube and this scales it
 * in the vertex shader. Rebuilding the geometry on each change would allocate
 * on a slider drag, and the whole design exists to avoid allocating while the
 * product is animating.
 */
const DEFAULT_CELL_SIZE = 0.55;

/**
 * The Colour Gradient, birth on the left, death on the right.
 *
 * A Cell traverses this exactly once over its lifetime, so the palette is a
 * countdown rather than decoration — the colour of a region tells you how long
 * it has left, and a churning area reads differently from a settled one at a
 * glance.
 *
 * Chosen to run cool-to-hot and to stay vivid against a dark background. The
 * ends are deliberately far apart in hue *and* brightness: a viewer should be
 * able to separate a newborn Cell from a dying one without having to compare
 * them side by side.
 */
const GRADIENT_STOPS = [
	0x7ef9e8, // birth — pale aqua
	0x5cc8ff, // settling in
	0x9a8cff, // middle age — indigo
	0xd873f5, // violet
	0xff6b86, // death — hot pink
] as const;

/**
 * How many stops the fragment shader is written to expect.
 *
 * GLSL uniform arrays need a compile-time size, so the count appears both here
 * and literally in the shader. Adding a stop without updating the shader would
 * otherwise fail silently — the extra colour simply never appearing. This makes
 * the mismatch throw at construction instead.
 */
const GRADIENT_STOP_COUNT = 5;

if (GRADIENT_STOPS.length !== GRADIENT_STOP_COUNT) {
	throw new Error(
		`Colour Gradient has ${GRADIENT_STOPS.length} stops; the shader declares ${GRADIENT_STOP_COUNT}`,
	);
}

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
	const ringCapacity = options.ringCapacity ?? depthWindow;
	if (ringCapacity < depthWindow) {
		throw new Error(
			`Ring capacity ${ringCapacity} cannot hold a Depth Window of ${depthWindow}`,
		);
	}

	const cellsPerLayer = width * height;
	const instanceCount = cellsPerLayer * ringCapacity;

	const geometry = new InstancedBufferGeometry();
	// A unit cube: equal on every axis, because the lattice is isotropic. Cell
	// Size scales it in the vertex shader rather than here, so changing it does
	// not rebuild geometry.
	const box = new BoxGeometry(CELL_SPACING, CELL_SPACING, CELL_SPACING);
	geometry.index = box.index;
	geometry.attributes = box.attributes;
	// Only the slots inside the Depth Window are drawn. The rest stay allocated
	// and idle, ready for the window to widen again.
	geometry.instanceCount = cellsPerLayer * depthWindow;

	// Grid position never changes: instance i of slot s is always the same Cell.
	// Written once at construction and never touched again.
	const gridPositions = new Float32Array(instanceCount * 2);
	for (let slot = 0; slot < ringCapacity; slot++) {
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
	// Rewritten every Generation, so the driver should not treat them as static.
	birthAttribute.setUsage(DynamicDrawUsage);
	ageAttribute.setUsage(DynamicDrawUsage);
	geometry.setAttribute("aBirthGeneration", birthAttribute);
	geometry.setAttribute("aAge", ageAttribute);

	// Held directly rather than looked up per frame: an index into `uniforms` is
	// possibly-undefined under the project's strict indexing rules, and this runs
	// every frame.
	const currentGenerationUniform = { value: 0 };
	const layerCountUniform = { value: 0 };
	const maximumAgeUniform = { value: options.maximumAge };
	const cellSizeUniform = { value: options.cellSize ?? DEFAULT_CELL_SIZE };
	const depthWindowUniform = { value: depthWindow };

	const material = new ShaderMaterial({
		uniforms: {
			uCurrentGeneration: currentGenerationUniform,
			uLayerCount: layerCountUniform,
			uMaximumAge: maximumAgeUniform,
			uCellSize: cellSizeUniform,
			uDepthWindow: depthWindowUniform,
			uLayerSpacing: { value: LAYER_SPACING },
			uGradient: { value: GRADIENT_STOPS.map((hex) => new Color(hex)) },
			uBackground: { value: new Color(BACKGROUND_COLOR) },
		},
		vertexShader: VERTEX_SHADER,
		fragmentShader: FRAGMENT_SHADER,
	});

	const mesh = new Mesh(geometry, material);
	// Every instance is placed by the shader, so three.js cannot compute a
	// meaningful bounding volume — without this the whole structure is culled.
	mesh.frustumCulled = false;

	// An empty set of update ranges means the whole buffer, which is what
	// three.js falls back to when none has been added.
	const uploadAll = (): void => {
		birthAttribute.clearUpdateRanges();
		birthAttribute.needsUpdate = true;
		ageAttribute.clearUpdateRanges();
		ageAttribute.needsUpdate = true;
	};

	return {
		mesh,

		writeLayer(slot, layerAges, birthGeneration) {
			const { start, count } = slotRange(slot, width, height, ringCapacity);
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

		setMaximumAge(maximumAge) {
			maximumAgeUniform.value = maximumAge;
		},

		setCellSize(cellSize) {
			cellSizeUniform.value = cellSize;
		},

		setDepthWindow(nextDepthWindow) {
			depthWindowUniform.value = nextDepthWindow;
		},

		setSlotCount(slots) {
			if (!Number.isInteger(slots) || slots < 1 || slots > ringCapacity) {
				throw new Error(
					`Slot count must be a whole number of the ${ringCapacity} allocated, got ${slots}`,
				);
			}
			geometry.instanceCount = cellsPerLayer * slots;
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
			uploadAll();
		},

		uploadAll,

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
uniform float uMaximumAge;
uniform float uCellSize;
uniform float uDepthWindow;
uniform float uLayerSpacing;

varying vec3 vNormal;
varying vec2 vUv;
varying float vAgeFraction;
varying float vSunk;

/**
 * Where the descent starts to show, as a fraction of the Depth Window.
 *
 * Below this the Stack keeps full presence, so most of the structure is read at
 * full strength and only the oldest part dissolves.
 */
const float FADE_START = 0.55;

/**
 * Shapes how Age maps onto the Colour Gradient.
 *
 * Below 1 pushes early Ages further along the palette. Exactly 1 would be a
 * linear map, which wastes most of the gradient given how Life distributes Age.
 */
const float AGE_GRADIENT_CURVE = 0.45;

void main() {
	float depth = uCurrentGeneration - aBirthGeneration;

	// Dead Cells, never-written slots, and Layers already retired from the ring
	// collapse to nothing rather than being skipped on the CPU.
	bool visible = aAge > 0.0 && aBirthGeneration >= 0.0 && depth >= 0.0 && depth < uDepthWindow;

	float y = (uLayerCount - 1.0 - depth) * uLayerSpacing;

	// How far through the Depth Window this Layer has sunk: 0 at the top, 1 as
	// it leaves the bottom.
	float sunk = clamp(depth / max(uDepthWindow - 1.0, 1.0), 0.0, 1.0);
	vSunk = sunk;

	// Shrink over the last stretch as well as fading, so a Layer dissolves
	// rather than simply dimming in place. Retirement is then never a pop —
	// by the time a slot is recycled its Cells have already shrunk away.
	float shrink = 1.0 - smoothstep(FADE_START, 1.0, sunk);

	// The Cell is a unit cube here and Cell Size scales it, so the Viewer moves
	// between a porous scatter and touching sheets without any geometry being
	// rebuilt. Dead Cells and retired Layers collapse to nothing the same way.
	vec3 placed = position * uCellSize * (visible ? shrink : 0.0)
		+ vec3(aGridPosition.x, y, aGridPosition.y);

	vNormal = normal;
	vUv = uv;

	// Age 1 is birth and uMaximumAge is death, so the gradient is traversed
	// exactly once across a lifetime with neither end left unused.
	float lifetime = clamp((aAge - 1.0) / max(uMaximumAge - 1.0, 1.0), 0.0, 1.0);

	// Life's Cell ages are heavily skewed young — most Cells die within a few
	// Generations and only settled regions grow old. Mapping age linearly leaves
	// the far end of the palette almost unused and paints nearly everything the
	// birth colour. This curve spreads the early ages across more of the
	// gradient, where most Cells actually live, without moving either endpoint.
	vAgeFraction = pow(lifetime, AGE_GRADIENT_CURVE);

	gl_Position = projectionMatrix * modelViewMatrix * vec4(placed, 1.0);
}
`;

/**
 * Face shading plus a drawn edge on every Cell.
 *
 * Two separate jobs. Directional shading separates the faces of one cube so it
 * reads as a solid form. The edge separates *adjacent* cubes — without it, two
 * neighbours sharing a colour merge into one shape and the lattice disappears.
 *
 * The rim is widened by `fwidth`, so it stays roughly a constant number of
 * pixels whether a Cell is close or far away. A fixed width in UV space would
 * turn distant Cells into solid outline and near ones into a hairline.
 */
const FRAGMENT_SHADER = /* glsl */ `
uniform vec3 uGradient[5];
uniform vec3 uBackground;

varying vec3 vNormal;
varying vec2 vUv;
varying float vAgeFraction;
varying float vSunk;

/** Matches the vertex shader — the two must dissolve together. */
const float FADE_START = 0.55;

const vec3 LIGHT_DIRECTION = normalize(vec3(0.4, 1.0, 0.7));

/** Rim width in pixels. */
const float EDGE_PIXELS = 1.2;
/** How far the rim darkens the face colour. */
const float EDGE_DARKEN = 0.35;

/**
 * Face coverage per screen pixel at which the edge starts and finishes fading
 * out. Above the second value a Cell is small enough that drawing an edge on it
 * only removes it from view.
 */
const float EDGE_FADE_START = 0.12;
const float EDGE_FADE_END = 0.35;

/** Position along the Colour Gradient, interpolated between adjacent stops. */
vec3 gradientColor(float t) {
	float scaled = clamp(t, 0.0, 1.0) * 4.0;
	int index = int(floor(scaled));
	// The last stop has no successor to blend toward.
	if (index >= 4) {
		return uGradient[4];
	}
	return mix(uGradient[index], uGradient[index + 1], scaled - float(index));
}

void main() {
	vec3 base = gradientColor(vAgeFraction);

	float facing = dot(normalize(vNormal), LIGHT_DIRECTION) * 0.5 + 0.5;
	// Floor well above zero so downward faces stay legible rather than reading
	// as holes. Kept high because face shading, the edge rim, and the depth fade
	// all darken the same pixel — compounded, a low floor turns the middle of
	// the structure to mud.
	float shade = mix(0.6, 1.0, facing);

	// Distance to the nearest border of this face, in UV space.
	float border = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
	float texelWidth = fwidth(border);
	float rim = smoothstep(0.0, texelWidth * EDGE_PIXELS, border);

	// Retire the edge as a Cell shrinks toward pixel size. Once one screen pixel
	// spans a large share of the face, no interior is left for the rim to
	// surround — every fragment reads as edge, the Cell becomes its own outline
	// and darkens to near black. Zoomed out that turned the whole structure into
	// a few faint specks.
	float edgeStrength = 1.0 - smoothstep(EDGE_FADE_START, EDGE_FADE_END, texelWidth);
	shade *= mix(1.0, mix(EDGE_DARKEN, 1.0, rim), edgeStrength);

	// Mixing toward the background rather than using alpha keeps every Cell
	// opaque, so depth sorting stays correct. Against a flat background the two
	// are indistinguishable — and 138,000 unsorted transparent instances would
	// punch holes through each other.
	float fade = smoothstep(FADE_START, 1.0, vSunk);
	vec3 lit = mix(base * shade, uBackground, fade);

	gl_FragColor = vec4(lit, 1.0);
}
`;
