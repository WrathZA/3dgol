# Persona Review — Issue #3

**Issue:** feat: serve a deployable page at a public URL
**Branch:** `issue-3-deployable-page`
**Change type:** New feature / behaviour — all six personas apply
**Date:** 2026-07-25

## Scope note

Acceptance criteria 3 (CI runs checks) and 4 (merge deploys) were explicitly deferred by operator
decision during the plan phase — "forgo the github actions, we'll do that manually for now". They are
recorded as unmet rather than counted as satisfied, and a follow-up issue is filed for the automation.

## Product

Delivers the stated outcome — a live URL exists and serves a page, and the feedback loop the issue was
written to create now works. Later issues can be verified by looking at the deployed site rather than by
reasoning about it. Two of five acceptance criteria are undelivered by operator decision, so the issue as
originally written is not fully met.

**Grade: C**

## Technical

Configuration is coherent. The `@/` alias is declared in both `tsconfig.json` and `vite.config.ts` — the
one place the two could silently diverge — and both were verified by a passing typecheck and a passing
test that imports through the alias. Versions are pinned three ways: `packageManager` for pnpm, `.nvmrc`
for Node, and an exact-pinned Biome so formatting cannot drift between local and CI.
`noUncheckedIndexedAccess` is enabled before any array code exists, which is the cheapest possible moment
to adopt it given the simulation will be almost entirely flat-array indexing.

**Grade: A**

## QA

The smoke test is real rather than decorative: it exercises the test runner, the `@/` alias, and module
import from `src/` — the three things every later test depends on. It also exists for a concrete reason,
not ceremony: `vitest run` exits non-zero when it finds no test files, so the "test command runs
successfully" criterion is unsatisfiable on a genuinely empty project.

All three commands were run and verified passing. The deployment was verified by HTTP status on both the
page and its bundle, and by reading the served JavaScript to confirm it contains the expected content —
evidence rather than assertion.

**Grade: B**

## Security

No new attack surface. The page has no input, no network activity after load, no storage, no auth, and no
dynamic code evaluation. Text is assigned via `textContent` with a compile-time constant.

Two changes narrow the supply-chain surface: `pnpm-lock.yaml` pins every dependency with integrity hashes,
and `onlyBuiltDependencies: ["esbuild", "workerd"]` allowlists exactly two lifecycle scripts where pnpm's
default is to block all.

**Grade: A**

## Hacker

Nothing to abuse. No input surface, no state, no credentials, no requests. The only externally reachable
artifact is a static page whose entire content is a constant string, served from a fixed directory with
unknown paths failing closed via `not_found_handling: "404-page"`.

**Grade: A**

## UX

The page renders text rather than a blank body, so a visitor sees something intelligible. The mount guard
throws explicitly if `#app` is absent rather than failing silently, matching the recorded convention that
programmer errors should be loud. It is deliberately a placeholder, which is the issue's stated scope.

**Grade: B**

## Gate result

All grades C or above — **gate passes**. Product is held at C rather than higher specifically because the
two deferred criteria are not counted as met.
