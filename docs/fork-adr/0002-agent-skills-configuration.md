---
status: active
---

# Agent engineering skills are configured for the fork

## Intent

Agent engineering skills (`/triage`, `/to-tickets`, `/to-spec`, `/wayfinder`, `/domain-modeling`, …) work against this fork: they file issues on the fork's Forgejo repo, never upstream; they use the default triage labels; and they read the glossary and both ADR folders before working in an area.

## Reasoning

These skills need per-repo configuration to know where issues live and where domain docs are. The fork tracks its own work on its self-hosted Forgejo (`git.rudd-agama.ts.net/Fryuni/cirrus`). Because the clone also has an `upstream` remote, the configuration pins every `fj` call to `-R origin`, so nothing gets filed on upstream by accident.

A single-context glossary was chosen even though this is a pnpm monorepo, because the packages share one AT Protocol / PDS vocabulary.

## Implementation

- `CLAUDE.md`: the `## Agent skills` section.
- `docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md`, `docs/agents/domain.md`.
