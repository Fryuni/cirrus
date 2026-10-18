---
status: active
---

# The CLI treats 400 RecordNotFound as a missing record

## Intent

CLI commands that look up a record that may not exist (for example `pds activate` checking for a profile) treat "record not found" as an expected result, not an error. In particular, `pds activate` on an account with no `app.bsky.actor.profile/self` record (any fresh, non-migrated account) finishes and offers to create the profile, instead of crashing right after activating.

## Reasoning

Upstream #189 made Cirrus's `com.atproto.repo.getRecord` return the spec's `400 RecordNotFound`, as the reference PDS does. `PDSClient.getRecord` in the CLI still treated only HTTP 404 as "missing", so the 400 was raised as an error. `pds activate` activated the account, then failed in `promptCreateProfile` with `RecordNotFound > Could not locate record …/app.bsky.actor.profile/self`. The account was active, but the command reported failure and skipped the profile and relay steps.

The check matches on the XRPC error name and still accepts a bare 404, so it works against both older and spec-conformant PDSes. Upstream still had the 404-only check when this was written.

## Implementation

- `packages/pds/src/cli/utils/pds-client.ts`: `getRecord`.
- `packages/pds/test/cli/pds-client.test.ts`.

## Upstream reconciliation
