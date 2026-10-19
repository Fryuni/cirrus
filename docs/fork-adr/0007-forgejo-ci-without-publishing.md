---
status: active
---

# Pull requests run CI on Forgejo and never publish

## Intent

Every pull request on the fork is built, checked and tested before it can reach `main`, and nothing a pull request runs publishes packages, not even as a dry run. Publishing happens only on push to `main` ([0003](0003-forgejo-package-releases.md)).

For pull requests and pushes to `main`, CI runs what upstream's `test.yml` and `e2e.yml` run: `build`, `check`, `test`, `knip`, and the PDS end-to-end tests. A pull request that would break the release build fails here, since `build` and `check` are the same gate the publish workflow runs.

## Reasoning

Forgejo ignores `.github/workflows` once `.forgejo/workflows` exists, so upstream's test workflows never run on the fork. At first the publish workflow also ran on pull requests, with a dry-run publish, and that was the only check pull requests got. It ran no tests, and a pull request should not run the publish job, even when the job skips the real publish.

The fork keeps `.github/` byte-identical to upstream and adds `.forgejo/workflows/ci.yml` as a Forgejo copy of upstream's test and e2e workflows, using the same runner conventions as the publish workflow (pinned `code.forgejo.org` actions, pnpm from `packageManager`, the job token unset in every step).

Rejected: keeping the dry-run publish in CI. `check` already packs every package through publint and attw, and the dry run needed the publish workflow's machinery on pull requests.

## Implementation

- `.forgejo/workflows/ci.yml`: a `test` job (install, build, check, test, knip) and an `e2e` job (install, build, `pnpm --filter @getcirrus/pds test:e2e`), on `pull_request` and push to `main`. Before the e2e tests, the job removes `localhost` from the `::1` line of the runner's `/etc/hosts`. The container has no IPv6 beyond loopback, so Vite listens on `::1` while Node clients (which look up with `AI_ADDRCONFIG`) connect to `127.0.0.1` and are refused. Fixing it in CI keeps upstream's e2e code unchanged. `NODE_OPTIONS=--dns-result-order=ipv4first` was tried and rejected: Vite then prints `127.0.0.1:<port>`, which the e2e setup's `localhost:<port>` match never detects.
- `.forgejo/workflows/publish.yml`: triggers on push to `main` only.

## Upstream reconciliation

When upstream changes `test.yml` or `e2e.yml`, mirror the change in `ci.yml`.
