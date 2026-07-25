import type { Grid } from "@/sim/grid";

/**
 * The bounded window of history: the Layers currently visible, newest first.
 *
 * Each Generation becomes one Layer. The Depth Window caps how many Layers are
 * retained; once full, every new Layer at the top retires exactly one at the
 * bottom, so the structure reaches a constant height and stays there.
 *
 * This is the design, not a memory optimisation. History is a window that flows
 * past, never an archive — a Run going for an hour holds exactly as much as one
 * that started a minute ago. Any capability implying access to retired Layers —
 * scrubbing, seeking, replay — contradicts it.
 *
 * Storage is a single ring buffer allocated once. Retirement is not a delete:
 * the oldest slot is simply overwritten by the next push. Allocating per
 * Generation would produce garbage-collection pauses, which read as stutter in a
 * product that animates continuously.
 */
export class LayerStack {
	readonly width: number;
	readonly height: number;

	private readonly cellsPerLayer: number;
	private buffer: Uint16Array;
	private capacity: number;
	/** Slot the next push will write to. */
	private writeSlot = 0;
	/** Layers currently held, never above capacity. */
	private layerCount = 0;
	/** Generation of the newest Layer. Meaningless while the Stack is empty. */
	private newestGenerationNumber = 0;

	constructor(width: number, height: number, maxDepth: number) {
		if (
			!Number.isInteger(width) ||
			!Number.isInteger(height) ||
			width < 1 ||
			height < 1
		) {
			throw new Error(
				`Layer dimensions must be positive integers, got ${width}x${height}`,
			);
		}

		this.width = width;
		this.height = height;
		this.cellsPerLayer = width * height;
		this.capacity = validateMaxDepth(maxDepth);
		this.buffer = new Uint16Array(this.cellsPerLayer * this.capacity);
	}

	/** N — the configured number of Layers retained. */
	get maxDepth(): number {
		return this.capacity;
	}

	/** Layers currently held. Climbs to `maxDepth` and stays there. */
	get depth(): number {
		return this.layerCount;
	}

	/** Bytes held. Constant for a given Depth Window, regardless of Run length. */
	get byteLength(): number {
		return this.buffer.byteLength;
	}

	/**
	 * Freezes a Generation as the newest Layer, retiring the oldest if full.
	 *
	 * The Grid's Ages are copied, not referenced — the Simulation reuses its
	 * buffers between Generations, so holding a reference would mean every Layer
	 * silently became the current Generation.
	 */
	push(grid: Grid, generation: number): void {
		if (grid.width !== this.width || grid.height !== this.height) {
			throw new Error(
				`Grid is ${grid.width}x${grid.height}, stack holds ${this.width}x${this.height}`,
			);
		}
		if (!Number.isInteger(generation) || generation < 0) {
			throw new Error(
				`Generation must be a non-negative integer, got ${generation}`,
			);
		}

		this.buffer.set(grid.ages, this.writeSlot * this.cellsPerLayer);
		this.writeSlot = (this.writeSlot + 1) % this.capacity;
		this.layerCount = Math.min(this.layerCount + 1, this.capacity);
		this.newestGenerationNumber = generation;
	}

	/**
	 * The Generation a Layer represents — depth 0 is the newest.
	 *
	 * Derived rather than stored. Exactly one Layer is pushed per Generation, so
	 * the Layer at depth d is `newestGeneration − d` by construction. Keeping a
	 * parallel array of Generation numbers would be a second source of truth,
	 * and the two would eventually disagree.
	 */
	generationAt(depth: number): number {
		this.assertDepthHeld(depth);
		return this.newestGenerationNumber - depth;
	}

	/** Generation of the newest Layer. Throws when the Stack is empty. */
	get newestGeneration(): number {
		return this.generationAt(0);
	}

	/**
	 * The Layer at a given depth — 0 is the newest, at the top of the Stack.
	 *
	 * Returns a view into the ring, not a copy: the renderer reads every Layer
	 * whenever the window changes, and copying would allocate on each read.
	 * Callers must not mutate it.
	 */
	layerAt(depth: number): Uint16Array {
		this.assertDepthHeld(depth);

		const slot = this.slotAtDepth(depth);
		const start = slot * this.cellsPerLayer;
		return this.buffer.subarray(start, start + this.cellsPerLayer);
	}

	/** Empties the Stack. The buffer is retained and reused. */
	clear(): void {
		this.buffer.fill(0);
		this.writeSlot = 0;
		this.layerCount = 0;
		this.newestGenerationNumber = 0;
	}

	private assertDepthHeld(depth: number): void {
		if (!Number.isInteger(depth) || depth < 0 || depth >= this.layerCount) {
			throw new Error(
				`No Layer at depth ${depth}; stack holds ${this.layerCount}`,
			);
		}
	}

	/** Ring slot holding the Layer at `depth`, counting back from the newest. */
	private slotAtDepth(depth: number): number {
		const offset = this.writeSlot - 1 - depth;
		return ((offset % this.capacity) + this.capacity) % this.capacity;
	}
}

export function validateMaxDepth(value: number): number {
	if (!Number.isInteger(value) || value < 1) {
		throw new Error(`Depth Window must be a positive integer, got ${value}`);
	}
	return value;
}
