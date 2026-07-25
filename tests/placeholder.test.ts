import { describe, expect, it } from "vitest";

import { placeholderMessage } from "@/placeholder";

/**
 * Smoke test for the toolchain, not for the product.
 *
 * `vitest run` exits non-zero when it finds no test files, so a project with no
 * tests at all cannot satisfy the "test command runs successfully" criterion.
 * This asserts that the test runner works, that the `@/` alias resolves, and
 * that a module under `src/` can be imported — the three things every later
 * test depends on.
 */
describe("toolchain", () => {
	it("resolves modules through the @/ alias", () => {
		expect(placeholderMessage()).toContain("3D Game of Life");
	});
});
