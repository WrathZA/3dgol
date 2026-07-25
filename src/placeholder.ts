/**
 * Stand-in for the real product until the structure renders.
 *
 * Exists so the deployment path can be proven end to end before any simulation
 * or rendering work lands, and so there is something for the smoke test to
 * assert against.
 */
export function placeholderMessage(): string {
	return "3D Game of Life — nothing to see yet.";
}
