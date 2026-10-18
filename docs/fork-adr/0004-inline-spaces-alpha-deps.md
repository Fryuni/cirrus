---
status: active
---

# Published packages carry no spaces-alpha dependency ranges

## Intent

A project that depends on `@getcirrus/pds` installs from scratch, with no lockfile and no `overrides`/`resolutions` of its own, under npm, pnpm, Yarn 1 and Yarn 4. It also resolves the same, tested `@atproto/*` spaces-alpha code that the fork builds and tests against. A newer spaces alpha published upstream must not change or break what a fresh install of an existing fork release gets.

The rule that keeps this true: **no published `@getcirrus/*` manifest the PDS installs declares a `0.0.0-spaces-alpha-*` package.** Those packages are inlined into the build output instead.

## Reasoning

The atproto spaces alpha packages (`@atproto/space`, `common`, `common-web`, `oauth-scopes`, and alpha builds of `crypto` and `syntax`) declare each other with caret ranges such as `^0.0.0-spaces-alpha-20260818163953`. Each new alpha upstream widens what those ranges match. The 2026-10-15 alphas depend on `^0.0.0-spaces-alpha-20261015143509` ranges for `@atproto/lex-cbor`, `lex-data` and `lex-json`. By semver the highest match for those ranges is the bare `0.0.0` release, which was published with unresolved `workspace:*` specifiers and cannot install anywhere.

Upstream's fix (#255) exact-pins `@atproto/common` and `common-web` in the published manifests. That relies on the package manager reusing an exact pin for someone else's caret range. npm and pnpm do that, but Yarn 4 resolves every range to its highest match. Under Yarn, `@atproto/space`'s `^…` range on `common` floats to the newest alpha, then to the broken `0.0.0` lex builds, and the install fails with `@atproto/lex-data@workspace:*: Workspace not found`. Yarn `resolutions` set to the latest versions get past the install but mix alpha code with lex releases it was never built against.

Bundling the alpha code removes those ranges from the consumer's graph entirely, so every package manager behaves the same. The inlining rule is based on version, not on a list of names. Any `@atproto/*` import that resolves to a `-spaces-alpha-` build is bundled, so the alpha `crypto` that `@atproto/space` needs (it uses `hkdfSha256`, which the stable `0.4.x` lacks) is inlined, while our own imports of stable `@atproto/crypto@0.4.x` stay external. The stable packages that the inlined code imports (pino, zod, multiformats, the `@noble` libraries, etc.) stay external as ordinary ranged dependencies. Consumers' bundlers then handle them as before, notably the `pino` → `pino/browser.js` alias and jose's `workerd` export condition.

Rejected:

- **Bumping the pins to the newest alpha.** This breaks the same way, because the newest alpha's own caret ranges reach the poisoned `0.0.0` builds.
- **`bundleDependencies`.** Yarn 4 and pnpm don't handle it consistently.
- **Republishing the alphas under a fork scope.** That adds packages to maintain and to publish.

## Implementation

- `build/inline-spaces-alpha.ts`: the `noExternal` predicate (resolves the importer's view of the package and checks its version).
- `packages/spaces/tsdown.config.ts`, `packages/oauth-provider/tsdown.config.ts`: use it, and inline the alpha types into the `.d.ts` (`dts.resolve`).
- `packages/spaces/package.json`, `packages/oauth-provider/package.json`: the alpha pins moved to `devDependencies` (they choose what is inlined). The stable runtime dependencies of the inlined code were added at the ranges the alpha manifests declare.
- `packages/spaces/src/index.ts` re-exports `createSpaceToken` and `spaceHostAud`, so `packages/pds` no longer depends on `@atproto/space` at runtime (`pds/src/spaces.ts`). `@atproto/space` stays a `pds` devDependency for tests.
- `packages/pds/vitest.config.ts`: the jose@5 browser-build redirect also matches `@getcirrus/spaces`'s dist, which now contains the `@atproto/space` code.
- `knip.json`: ignores the dependencies that only the inlined code imports (knip reads source, not dist).
- `pnpm-workspace.yaml`: the comment on the alpha `overrides`.

To verify: pack the packages and install them in an empty project under each package manager. No installed manifest may contain `workspace:`, and no `@atproto/*` `0.0.0-spaces-alpha-*` package may be installed.

Since 0006, `@getcirrus/pds` bundles its whole dependency graph, including these two packages. So for PDS installs, 0006 covers this intent, and this ADR's mechanism now matters to consumers of `@getcirrus/spaces` or `@getcirrus/oauth-provider` on their own. It also still decides which alpha code the PDS bundle contains.

Known gap: `@getcirrus/space-conformance` still uses upstream's exact-pin approach for its own alpha dependencies (`oauth-client`, `xrpc`, `lexicon`, …), so it can still fail to install fresh under Yarn. The PDS only depends on it as a devDependency, so PDS installs are unaffected.

## Upstream reconciliation
