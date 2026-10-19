---
status: active
---

# Every push to main publishes the fork's packages to Forgejo

## Intent

The fork's `main` is installable as a package release, without waiting for upstream to cut one. Each push to `main` publishes, from the pushed tip, every public workspace package (`@getcirrus/*` and `create-pds`) to the fork owner's npm registry on Forgejo, versioned `<package.json version>-fork.<N>`. `N` is the number of commits reachable from the fork's `main` and not from upstream's `main`. So:

- a fork build is never mistaken for an upstream release, and the base it was built from stays visible;
- `N` grows by one with every fork commit, merges from upstream included, so later builds get higher numbers (this assumes upstream never contains fork commits; see Reasoning);
- a release publishes every package fresh from one commit: if any of its versions already exists, the run fails before publishing, rather than skipping packages or pairing them with dependencies from another commit;
- packages that depend on each other are published as a set from the same commit, with exact fork versions between them;
- `latest` on the fork's registry points at the build of the newest `main`; re-running an older run never moves it back.

Pull requests never publish, not even as a dry run, and never get the publishing token. They run the fork's CI instead ([0007](0007-forgejo-ci-without-publishing.md)), whose `build` and `check` are the same gate this workflow runs before publishing.

## Reasoning

Upstream releases with changesets to npmjs.org (`.github/workflows/release.yml`). The fork cannot publish there and does not want to hand-version releases, so it publishes from Forgejo Actions to its own registry instead.

- **Version scheme.** Keeping upstream's version and adding a prerelease suffix shows which upstream release a build is based on. Counting fork-only commits needs no state, and it is stable as long as upstream never contains fork commits. Upstream squash-merges its PRs, so fork work it adopts arrives with new SHAs. If upstream ever merged fork commits with their original SHAs, `N` would drop and later releases would reuse published versions. Because a release must publish every version fresh, that shows up as failed runs, not as missing or mixed releases. To recover without changing the scheme, add empty fork commits (`git commit --allow-empty`) until `N` is above the highest number already published; each one counts as a fork commit, so `N` stays a literal count. Never add an offset to `N` in the workflow. Semver sorts `0.19.0-fork.N` below `0.19.0`, and caret ranges skip prereleases, so consumers pin the exact fork version or install `@latest` from the fork registry.
- **`.forgejo/workflows`.** Forgejo reads `.forgejo/workflows` and ignores `.github/workflows` once the former exists, so `.github/` stays byte-identical to upstream and upstream's GitHub-only workflows (changesets release, pkg.pr.new, Claude) never run on Forgejo. Upstream's `test.yml` and `e2e.yml` therefore do not run on the fork either; `.forgejo/workflows/ci.yml` replaces them ([0007](0007-forgejo-ci-without-publishing.md)). This workflow runs `build` and `check` before publishing, the same gate as upstream's release workflow.
- **Token.** Forgejo's automatic Actions token cannot write to the package registry ([forgejo#6904](https://codeberg.org/forgejo/forgejo/issues/6904)), so publishing uses a token with `write:package` scope in the `PACKAGES_TOKEN` repository secret. Only the publish step gets it, the workflow runs only on push to `main`, and `pnpm publish` runs with `--ignore-scripts`. Forgejo ignores `permissions:` and hands every step a repository write token, so the install, build and check steps and `pnpm publish` run with it unset. Only the commit-count step uses it, to read `mirror/cirrus` and the fork's `main` with git.
- **Tooling on the runner.** The instance sets `DEFAULT_ACTIONS_URL=self`, so actions are referenced by full `https://code.forgejo.org/...` URL and pinned by commit. `pnpm/action-setup` has no mirror there, and corepack's bundled signing keys lag pnpm releases, so the workflow installs the pnpm version from `packageManager` with npm.

- **Re-runs.** Runs are serialized and never cancelled, so `main` advances in push order. A run whose commit is no longer the tip of `main` (a re-run of an older push) publishes under the `previous` dist-tag, not `latest`. Re-running a run that failed before publishing works. A run that published some packages and then failed cannot be re-run, because its versions now exist; push a new commit (`git commit --allow-empty` is enough) to release under a fresh `N`.

Rejected: a release only on fork tags (like the fork's other projects use for binaries). The goal is that `main` is always consumable, and tags would add a manual step.

## Implementation

- `.forgejo/workflows/publish.yml`: runs on push to `main` only. It counts fork commits against `mirror/cirrus@main` (fetched with the job token), sets versions, builds, checks and publishes with `pnpm publish --recursive`, tagging `latest` only when the run's commit is still the tip of `main`. It publishes with `--force`, so pnpm never silently skips a version that already exists (the registry rejects it and the run fails); pnpm replaces `workspace:*` with the rewritten versions.
- `.forgejo/ci/check-unpublished.mjs`: runs before publishing and fails unless the registry definitely has none of the versions (a 404, or metadata without the version). It queries the registry itself because pnpm's own lookup treats registry errors as "not published".
- `.forgejo/ci/set-fork-versions.mjs`: rewrites the `version` of every non-private workspace package. It runs before the build because the PDS embeds its version (`/xrpc/_health`, `/status`).
- `knip.json`: ignores `.forgejo/**`. Knip finds entry files only in `.github/workflows`, so it would report the CI script as unused.
- Registry: `https://git.fryuni.dev/api/packages/Fryuni/npm/`. To install, point the `@getcirrus` scope (and `create-pds`, which is unscoped) at it in `.npmrc`, plus an `_authToken` with `read:package` scope if anonymous requests are challenged.
- Repository settings: Actions enabled on `Fryuni/cirrus`; secret `PACKAGES_TOKEN`.

Known gap: `create-pds` still asks registry.npmjs.org for the latest `@getcirrus/pds`, so a scaffolded project depends on upstream's PDS, not the fork's.
