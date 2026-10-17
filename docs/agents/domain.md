# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`GLOSSARY.md`** at the repo root.
- **`docs/adr/`**: read ADRs that touch the area you're about to work in.
- **`docs/fork-adr/`**: read every `status: active` fork ADR that touches the area you're about to work in. These record what this fork deliberately does differently from upstream, and why. Don't "fix" fork behaviour back towards upstream without reading the ADR behind it.

If `GLOSSARY.md` or `docs/adr/` doesn't exist, **proceed silently**. Don't flag its absence, and don't suggest creating it upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

`docs/fork-adr/` is different: it is **mandatory**. Every change made on this fork needs a fork ADR, written in the same commit or PR. The rules and the template are in the "This Repository Is a Fork" section of `CLAUDE.md`.

## File structure

Single-context repo:

```
/
├── GLOSSARY.md
├── docs/
│   ├── adr/            ← ordinary design decisions (offered sparingly, per /domain-modeling)
│   │   └── 0001-....md
│   └── fork-adr/       ← mandatory: one per fork change, records its intent for upstream merges
│       └── 0001-....md
└── packages/
```

`docs/adr/` and `docs/fork-adr/` are numbered independently. They live in separate folders so the fork's ADRs never collide with ADRs that upstream adds itself.

`docs/` is also the Astro docs-site workspace package. The ADR folders sit beside its `src/` and aren't published by it.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `GLOSSARY.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR (in either folder), surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders), but worth reopening because…_

For fork ADRs, name the folder: _Contradicts fork ADR-0003 (…)_.
