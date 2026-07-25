## Issue #3 — feat: serve a deployable page at a public URL (DONE, closed)
https://github.com/WrathZA/3dgol/issues/3

Closed: 2026-07-25
Commit: e519ccd
Security: clean
Skill-judge: not applicable
PRD sections: Constraints (public browser website, mobile support, TypeScript preference)

- Rode #3 rather than #4 after discovering mid-session that #4 could not be implemented: its first
  acceptance criterion requires verifying against known patterns, and the repository had no test runner.
  The backlog had described #4 as independent, which was true of the rendering work but wrong about the
  toolchain. Offered building a minimal toolchain inside #4 versus stopping and riding #3 first; operator
  chose #3. No commits existed on the #4 branch, so it was deleted cleanly.

- Deferred CI and deploy-on-merge by operator decision ("we'll do that manually for now"). Acceptance
  criteria 3 and 4 are recorded as unmet rather than counted as satisfied, and a follow-up issue tracks
  the automation. Deploying currently requires `pnpm exec wrangler deploy` locally.

- Automated deploy additionally needs a Cloudflare API token as a repository secret. The local OAuth
  token wrangler holds is short-lived and machine-bound, so it cannot serve as a CI credential — this is
  an action in the account owner's control that no branch could complete.

- Added a real smoke test rather than treating tests as optional at this stage. `vitest run` exits
  non-zero when it finds no test files, so the "test command runs successfully" criterion is
  unsatisfiable on a genuinely empty project. The test exercises the runner, the `@/` alias, and module
  import from `src/` — the three things every later test depends on.

- Declared the `@/` alias in both `tsconfig.json` and `vite.config.ts`. They are the one pair that can
  silently diverge, so both are verified: a passing typecheck plus a test that imports through the alias.

- Enabled `noUncheckedIndexedAccess` before any array code exists. The simulation will be almost entirely
  flat-array index arithmetic, and adopting the flag later would mean fixing every call site at once.

- Scoped Biome to source and config paths instead of the whole repository, so it cannot reformat the
  `.zalwa/` workflow documents or apply experimental HTML formatting to `index.html`.

- Declared `onlyBuiltDependencies: ["esbuild", "workerd"]` in `package.json` rather than approving install
  scripts interactively, so a fresh clone resolves identically. pnpm blocks all lifecycle scripts by
  default; this narrows rather than widens the supply-chain surface.

- Chose `not_found_handling: "404-page"` for the assets binding. The product is a single page with no
  client-side routing, so an unknown path should read as broken rather than silently serving the app.

- Verified the deployment by evidence rather than assertion: HTTP 200 on both the page and its bundle,
  and read the served JavaScript back to confirm it contains the expected content.

- Three of five acceptance criteria met; two deferred by operator decision with a follow-up filed.
