import { PerspectiveCamera, Scene, WebGLRenderer } from "three";

/**
 * Renderer, scene, and camera for the structure.
 *
 * The camera is fixed here. Moving it is a separate concern, so this module
 * only has to place it somewhere the structure reads as three-dimensional —
 * looking straight down an axis would flatten a diagonal streak into a dot.
 */

/** World units between adjacent Cells within a Layer. */
export const CELL_SPACING = 1;

/**
 * World units between adjacent Layers.
 *
 * Equal to `CELL_SPACING`, making the lattice isotropic: a Cell is a cube and
 * the gap above it matches the gap beside it. Drawn Cells occupy well under this
 * distance (see `CELL_SCALE`), which is what keeps Layers visible as separate
 * strata rather than fusing into one solid mass.
 *
 * The Stack ends up taller than it is wide at the default Depth Window. That is
 * fine — the camera frames from the structure's extent, so it follows.
 */
export const LAYER_SPACING = 1;

export interface StructureExtent {
	width: number;
	height: number;
	depthWindow: number;
}

export interface SceneHandle {
	renderer: WebGLRenderer;
	scene: Scene;
	camera: PerspectiveCamera;
	/** Re-reads the canvas size and updates the camera and drawing buffer. */
	resize(): void;
	dispose(): void;
}

/**
 * Highest device pixel ratio the renderer will honour.
 *
 * Uncapped `devicePixelRatio` on a modern phone is 3 or more, which multiplies
 * fragment work nine-fold for a difference few people can see on a structure
 * made of small blocks.
 */
const MAX_PIXEL_RATIO = 2;

export function createScene(
	canvas: HTMLCanvasElement,
	extent: StructureExtent,
): SceneHandle {
	const renderer = new WebGLRenderer({ canvas, antialias: true });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));

	const scene = new Scene();

	const camera = new PerspectiveCamera(50, 1, 0.1, 4000);
	frameStructure(camera, extent);

	const resize = (): void => {
		const width = canvas.clientWidth;
		const height = canvas.clientHeight;
		if (width === 0 || height === 0) {
			return;
		}

		renderer.setSize(width, height, false);
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
	};

	resize();

	return {
		renderer,
		scene,
		camera,
		resize,
		dispose: () => {
			renderer.dispose();
		},
	};
}

/**
 * Places the camera so the whole Stack is in frame, viewed from an angle.
 *
 * The structure is centred on the origin in x and z and rises from y = 0, so the
 * camera looks at the middle of its height rather than its base.
 */
function frameStructure(
	camera: PerspectiveCamera,
	extent: StructureExtent,
): void {
	const footprint = Math.max(extent.width, extent.height) * CELL_SPACING;
	const stackHeight = extent.depthWindow * LAYER_SPACING;
	const reach = Math.max(footprint, stackHeight);

	// Far enough back that a structure of this size fits, angled down from above
	// and offset diagonally so neither axis is viewed edge-on.
	const distance = reach * 1.6;

	camera.position.set(
		distance * 0.7,
		stackHeight * 0.5 + reach * 0.55,
		distance * 0.7,
	);
	camera.lookAt(0, stackHeight * 0.5, 0);
}
