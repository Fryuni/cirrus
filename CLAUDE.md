This file provides guidance to agentic coding tools when working with code in this repository.

## CRITICAL: This Repository Is a Fork, and Every Change Needs a Fork ADR

This repo is a fork. `origin` is the fork (`Fryuni/cirrus`); `upstream` is the original project (`mirror/cirrus`). Upstream is merged in periodically.

**EVERY change made on the fork MUST have an ADR in `docs/fork-adr/` explaining the reasoning and intention behind it.** That covers features, bug fixes, refactors, dependency or config changes, tooling, and edits to docs and this file. The only exceptions are commits that come from upstream unchanged.

- Write or update the ADR **in the same commit or PR as the change**. A fork change without an ADR is incomplete.
- Record the **intention**, not just the diff: the problem, what must stay true afterwards, and why the fork diverges from upstream. Name the files and commits involved, but treat them as pointers. The intention is what the ADR protects.
- One ADR per intention. If a later change serves an intention that already has an ADR, update that ADR instead of creating a new one.
- These ADRs are mandatory. The "offer ADRs sparingly" guidance in `/domain-modeling` applies only to ordinary design decisions in `docs/adr/`, not to `docs/fork-adr/`.

**Why:** when merging upstream, the fork's code may be thrown away in favour of upstream's. For example, upstream may ship the same feature with a different implementation. The ADR is how you tell whether the fork's _intention_ still holds after the merge, even when its exact code is gone.

**When merging from upstream:**

1. Read every `docs/fork-adr/` ADR whose status is `active`.
2. For each one touched by the merge (conflicts, or upstream now covering the same ground), choose one: keep the fork implementation, adopt upstream's if it satisfies the stated intention, or adapt upstream's until it does.
3. Record the outcome in that ADR. If upstream now fully covers it, set its status to `upstream` and note the upstream commit or PR. Never drop a fork intention silently.

**Fork ADR format:** `docs/fork-adr/NNNN-slug.md`, numbered sequentially (scan for the highest number and add one):

```md
---
status: active # active | upstream (now covered by upstream) | withdrawn
---

# {Short title}

## Intent

{What the fork needs to be true, and why. This must survive any re-implementation.}

## Reasoning

{Why this approach, and why it diverges from upstream. Note rejected alternatives if they're non-obvious.}

## Implementation

{Pointers: files, commits, PRs. Expected to go stale. The intent is authoritative.}

## Upstream reconciliation

{Optional, appended during upstream merges: date, upstream ref, what was decided.}
```

## CRITICAL: Working Directory and Plan Document

**ALWAYS verify your current working directory before operating on files:**

- Repository root is `cirrus` not `packages/pds/`
- Use `pwd` or check `process.cwd()` to confirm location
- Many project files (CLAUDE.md, plans/) are at repository root
- Package-specific files are in `packages/pds/`

**ALWAYS read and update implementation plans:**

- Plans are organized in the `plans/` directory at repository root:
  - `plans/complete/` - Completed features with full documentation
  - `plans/in-progress/` - Active development work
  - `plans/todo/` - Planned future features and improvements
- **Read** relevant plan documents before starting work to understand project status and prior decisions
- **Update** plan documents when you complete features, discover important implementation details, or change priorities
- Key plan documents:
  - `plans/complete/core-pds.md` - Core PDS implementation (all completed features)
  - `plans/todo/endpoint-implementation.md` - Endpoint implementation status and priorities
  - `plans/todo/oauth-provider.md` - OAuth 2.1 implementation plan
  - `plans/todo/migration-wizard.md` - Account migration UX specification

## Repository Structure

This is a monorepo using pnpm workspaces with the following structure:

- **Root** (`cirrus`): Workspace configuration, shared tooling, plan documents
- **packages/pds**: The main PDS library (`@getcirrus/pds`)
- **packages/oauth-provider**: OAuth 2.1 Provider (`@getcirrus/oauth-provider`)
- **packages/create-pds**: CLI scaffolding tool (`create-pds`)
- **demos/pds**: Demo PDS deployment

## Commands

### Root-level commands (run from repository root):

- `pnpm build` - Build all packages
- `pnpm test` - Run tests for all packages
- `pnpm check` - Run type checking and linting for all packages
- `pnpm format` - Format code using Prettier

### Package-level commands (run within individual packages):

- `pnpm build` - Build the package using tsdown (ESM + DTS output)
- `pnpm dev` - Watch mode for development
- `pnpm test` - Run vitest tests
- `pnpm check` - Run publint and @arethetypeswrong/cli checks

## Development Workflow

- Uses **pnpm** as package manager
- **tsdown** for building TypeScript packages with ESM output and declaration files
- **vitest** for testing
- **publint** and **@arethetypeswrong/cli** for package validation
- **Prettier** for code formatting (configured to use tabs in `.prettierrc`)

## Package Architecture

Each package in `packages/` follows this structure:

- `src/index.ts` - Main entry point
- `test/` - Test files
- `dist/` - Built output (ESM + .d.ts files)
- Package exports configured for ESM-only with proper TypeScript declarations

## TypeScript Configuration

Uses strict TypeScript configuration with:

- Target: ES2022
- Module: preserve (for bundler compatibility)
- Strict mode with additional safety checks (`noUncheckedIndexedAccess`, `noImplicitOverride`)
- Library-focused settings (declaration files, declaration maps)

## PDS Package Specifics

### Testing with Cloudflare Workers

The PDS package uses **vitest 4** with `@cloudflare/vitest-pool-workers` PR build (#11632):

- Test configuration in `vitest.config.ts` using `cloudflareTest` plugin
- Pool options: `maxWorkers: 1` and `isolate: false` for Durable Object testing
- Test environment bindings configured in `.dev.vars` (not checked into git)
- Use `cloudflare:test` module for `env` and `runInDurableObject` helpers
- Use `cloudflare:workers` module for type imports like `DurableObject`, `Env`

### TypeScript Module Resolution

The PDS package TypeScript configuration:

1. **Module Resolution**: Uses `moduleResolution: "bundler"` in tsconfig.json
2. **Test Types**: `test/tsconfig.json` includes `@cloudflare/vitest-pool-workers/types` for cloudflare:test module
3. **Import Style**: Use named imports (not namespace imports) for `verbatimModuleSyntax` compatibility

### Durable Objects Architecture

- **Worker** (stateless): Routing, authentication, DID document serving
- **AccountDurableObject** (stateful): Repository operations, SQLite storage
- **RPC Pattern**: Use DO RPC methods (compatibility date >= 2024-04-03), not fetch handlers
- **RPC Types**: Return types must use `Rpc.Serializable<T>` for proper type inference
- **Error Handling**: Let errors propagate naturally, create fresh DO stubs per request
- **Initialization**: Use lazy initialization with `blockConcurrencyWhile` for storage and repo setup

### Environment Variables

Required environment variables (validated at module load using `cloudflare:workers` env import):

- `DID` - The account's DID (did:web:...) - validated with `isDid()`
- `HANDLE` - The account's handle - validated with `isHandle()`
- `PDS_HOSTNAME` - Public hostname
- `AUTH_TOKEN` - Bearer token for write operations (simple auth)
- `SIGNING_KEY` - Private key for signing commits
- `SIGNING_KEY_PUBLIC` - Public key multibase for DID document

**Optional (for session-based auth):**

- `JWT_SECRET` - Secret for signing session JWTs
- `PASSWORD_HASH` - Bcrypt hash of account password

**Optional (for blob storage):**

- `BLOBS` - R2 bucket binding for blob storage

**Note**: Environment validation happens at module scope. Worker fails fast at startup if any required variables are missing or invalid.

### Protocol Helpers and Dependencies

**CRITICAL: Prefer @atcute packages over @atproto where available.**

The codebase uses @atcute packages for most protocol operations, with @atproto packages only where no equivalent exists.

**@atcute packages (preferred):**

- `@atcute/cbor` - CBOR encoding/decoding (via `src/cbor-compat.ts` compatibility layer)
- `@atcute/cid` - CID creation with `create()`, `toString()`, `CODEC_RAW`
- `@atcute/tid` - TID generation with `now()`
- `@atcute/lexicons/syntax` - `isDid()`, `isHandle()`, `parseResourceUri()`, `Did` type
- `@atcute/lexicons/validations` - `parse()`, `ValidationError` for schema validation
- `@atcute/bluesky` - Pre-compiled Bluesky lexicon schemas (e.g., `AppBskyFeedPost.mainSchema`)
- `@atcute/identity` - `defs.didDocument` validator, `DidDocument` type, `getAtprotoServiceEndpoint()`
- `@atcute/identity-resolver` - DID resolution (`CompositeDidDocumentResolver`, `PlcDidDocumentResolver`, `WebDidDocumentResolver`), handle resolution (`DohJsonHandleResolver`)
- `@atcute/client` - Type-safe XRPC client with `get()`, `post()`, `ok()` helper
- `@atcute/atproto` - Type definitions for `com.atproto.*` endpoints

**@atproto packages (required for repo operations):**

- `@atproto/repo` - Repository operations, `BlockMap`, `blocksToCarFile()`, `readCarWithRoot()` - no atcute equivalent for write operations
- `@atproto/crypto` - `Secp256k1Keypair` for signing - required by @atproto/repo
- `@atproto/lex-data` - `CID`, `asCid()`, `isBlobRef()` - required for @atproto/repo interop

**Important Notes:**

- Construct AT URIs with template strings: `` `at://${did}/${collection}/${rkey}` ``
- Generate record keys with `now()` from `@atcute/tid`
- Validate DIDs/handles with `isDid()` / `isHandle()` (return boolean, don't throw)
- Parse AT URIs with `parseResourceUri()` which returns a Result object
- Use `create(CODEC_RAW, bytes)` from `@atcute/cid` for blob CID generation
- CBOR encoding uses `src/cbor-compat.ts` which wraps @atcute/cbor for @atproto interop
- CAR file export uses `blocksToCarFile()` from `@atproto/repo`

### Vitest Configuration Notes

- **Module Shimming**: Uses `resolve: { conditions: ["node", "require"] }` to force CJS builds for multiformats
- **BlockMap/CidSet**: Access internal Map/Set via `(blocks as unknown as { map: Map<...> }).map` when iterating
- **Test Count**: 170 unit tests across 13 test files, 31 CLI tests across 3 test files

### Firehose Implementation

The PDS implements the WebSocket-based firehose for real-time federation:

- **Sequencer**: Manages commit event log in `firehose_events` SQLite table
- **WebSocket Hibernation API**: DurableObject WebSocket handlers (message, close, error)
- **Frame Encoding**: DAG-CBOR frame encoding (header + body concatenation)
- **Event Broadcasting**: Automatic sequencing and broadcast on write operations
- **Cursor-based Backfill**: Replay events from sequence number with validation

**Event Flow:**

1. `createRecord`/`deleteRecord` → sequence commit to SQLite
2. Broadcast CBOR-encoded frame to all connected WebSocket clients
3. Update client cursor positions in WebSocket attachments

**Endpoint:**

- `GET /xrpc/com.atproto.sync.subscribeRepos?cursor={seq}` - WebSocket upgrade for commit stream

### Lexicon Validation

Records are validated against official Bluesky lexicon schemas from `@atcute/bluesky`:

- **RecordValidator**: Class in `src/validation.ts` for record validation
- **Pre-compiled Schemas**: Uses `@atcute/bluesky` package (e.g., `AppBskyFeedPost.mainSchema`)
- **Optimistic Validation**: Fail-open for unknown schemas - records with no loaded schema are accepted
- **Schema Validation**: Uses `parse()` from `@atcute/lexicons/validations`

**Usage:**

```ts
import { validator } from "./validation";
validator.validateRecord("app.bsky.feed.post", record); // throws on invalid
```

**Adding New Record Types:**

Import the schema from `@atcute/bluesky` and add to `recordSchemas` map in `validation.ts`.

### Session Authentication

JWT-based session authentication for Bluesky app compatibility:

- **Access Tokens**: Short-lived JWTs for API requests (60 min expiry)
- **Refresh Tokens**: Long-lived JWTs for session refresh (90 day expiry)
- **Password Auth**: `verifyPassword()` using bcrypt-compatible hashing
- **Static Token**: `AUTH_TOKEN` env var still supported for simple auth

**Required Environment Variables:**

- `JWT_SECRET` - Secret for signing JWTs
- `PASSWORD_HASH` - Bcrypt hash of account password (for app login)

### Service Auth for AppView Proxy

The PDS proxies unknown XRPC methods to the Bluesky AppView:

- **Service JWT**: `createServiceJwt()` in `src/service-auth.ts`
- **Audience**: `did:web:api.bsky.app` (the AppView)
- **Issuer**: User's DID (the PDS vouches for the user)
- **LXM Claim**: Lexicon method being called (for authorization scoping)

**Flow:**

1. Client requests unknown XRPC method
2. PDS creates service JWT asserting user identity
3. Request proxied to AppView with `Authorization: Bearer <service-jwt>`
4. AppView trusts the PDS's assertion

### Account Migration

Support for importing repositories via CAR file:

- **Import Endpoint**: `com.atproto.repo.importRepo` accepts CAR file upload
- **Account Status**: `com.atproto.server.getAccountStatus` returns migration state
- **CAR Parsing**: Uses `readCarWithRoot()` from `@atproto/repo`
- **Validation**: Verifies root CID and block integrity during import

**Import Flow:**

1. Export CAR from source PDS
2. POST CAR bytes to `/xrpc/com.atproto.repo.importRepo`
3. PDS validates and imports all blocks
4. Repository initialized with imported state

## Agent skills

### Issue tracker

Issues live in the fork's Forgejo repo (`origin`, `git.rudd-agama.ts.net/Fryuni/cirrus`), managed with the `fj` CLI. Never file them on upstream. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses the five default triage labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one root `GLOSSARY.md` and `docs/adr/`, plus the mandatory fork ADRs in `docs/fork-adr/`. See `docs/agents/domain.md`.
