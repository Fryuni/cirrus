---
status: active
---

# `@getcirrus/pds` is published with no dependencies

## Intent

A Cirrus instance depends on `@getcirrus/pds` and nothing else from this project. Installing it adds no `@atproto/*`, `@atcute/*` or other `@getcirrus/*` package to the instance's dependency tree. It adds no third-party runtime package at all: the only dependency left is the `wrangler` peer, which the instance already has. The instance only imports `@getcirrus/pds` (the Worker, its Durable Object classes and the `pds` CLI), so everything behind it is an implementation detail.

The code an instance runs is resolved and tested when the library is built, not at each instance install. That means which versions, which spaces alphas and which export conditions are used. An instance's own build config needs nothing specific to Cirrus's dependencies (for example the `pino` alias it used to carry).

## Reasoning

Instances bundle all of this code into their Worker anyway. Resolving it at the instance's install only adds ways for the result to differ from what was tested. That is how fresh installs broke on `workspace:*` (see 0004), and how a Yarn instance ended up with a different `@atproto` graph from npm and pnpm.

Bundling only `@atproto/*`, `@atcute/*` and `@getcirrus/*` is not enough, because their third-party dependencies can't stay external. They need conflicting majors of the same packages (`multiformats` 9 and 13, `uint8arrays` 3 and 5, `pino` 8 and 10, `cborg` 1 and 4, `jose` 5 and 6), and one package can declare only one version of each. So the whole runtime graph is bundled. Bundling just the conflicting packages was rejected: any upstream dependency bump could add a new conflict.

The bundle has to resolve modules the way the instance's build used to:

- `@cloudflare/vite-plugin`'s Worker conditions (`workerd`, `worker`, `module`, `browser`, `production`) and Vite's server-side main fields.
- `pino` resolved to `pino/browser.js`, which instances used to alias themselves.
- Node builtins stay external; workerd provides them under `nodejs_compat`. Bundled CommonJS (`@atproto/common`, `@atproto/repo`) `require()`s them at load time. Rolldown would emit a `require` shim that throws in workerd, so those calls become ESM imports, as Vite's CommonJS handling did.

The `pds` CLI is bundled for Node the same way. `wrangler` stays a peer dependency, because the CLI drives the instance's own wrangler.

Types are bundled too, so an instance never needs the bundled packages' types. The exception is `multiformats@9` and `uint8arrays@3`: their export maps have no types, so no consumer could resolve them before this change either, and they stay as imports that resolve to `any`.

Trade-offs accepted:

- Dependency updates, including security fixes, reach instances only through a new `@getcirrus/pds` release, at the versions pinned in this repo's `pnpm-lock.yaml`. Refreshing an instance's lockfile no longer updates them. Every push to `main` publishes (0003), so this is a rebuild away.
- The `production` condition is fixed at build time, so `vite dev` on an instance runs the production builds of bundled dependencies.
- `dist` is larger (the Worker entry is about 2.5 MB). The instance's final Worker is not larger.

`@getcirrus/spaces` and `@getcirrus/oauth-provider` are still published on their own. 0004 keeps them installable without the PDS. `@getcirrus/pds` no longer depends on them.

## Implementation

- `packages/pds/package.json`: every former dependency is a devDependency, which tsdown bundles. `wrangler` remains a peer dependency.
- `packages/pds/tsdown.config.ts`:
  - The Worker entry uses `platform: "neutral"` with the conditions and main fields above, plus the `pino-browser` and `node-builtins` plugins.
  - `dts.resolve` inlines the types, and `emitJs: false` is needed because the root tsconfig sets `allowJs`.
  - The `self-contained` plugin fails the build if a chunk imports anything but builtins and `cloudflare:*`, or `wrangler` for the CLI. After an upstream merge, move any new `dependencies` to `devDependencies`.
- `packages/spaces/package.json`: a `types` entry in its export map, which the dts bundler needs to resolve it.

To verify:

1. Pack `@getcirrus/pds`, install it in an empty instance with each package manager, and check that `node_modules` has no `@atproto`, `@atcute` or other `@getcirrus` package.
2. Build the instance, boot it with `vite preview`, and exercise reads, writes, sessions and space tokens.

## Upstream reconciliation
