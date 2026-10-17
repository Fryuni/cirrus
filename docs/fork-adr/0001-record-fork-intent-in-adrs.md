---
status: active
---

# Every fork change is recorded as an ADR of intent

## Intent

Every change this fork makes on top of upstream has a written record of _why_ it was made and _what must stay true_. With that record, an upstream merge can keep the fork's intentions even when it throws away the fork's code, for example when upstream ships the same feature with a different implementation.

## Reasoning

A fork's diff against upstream shows _what_ changed but not _why_. When upstream later touches the same area, the diff alone can't say whether the fork change is still needed, is now redundant, or must be re-applied to upstream's new shape. Recording intent separately from implementation makes that call possible during each merge.

The ADRs live in `docs/fork-adr/` rather than `docs/adr/`, so that ADRs upstream adds itself never collide with the fork's on numbering or filenames. They are mandatory for every change. They are not "offered sparingly" like ordinary design ADRs, because the goal is completeness: a fork change with no record is exactly the one that gets lost in a merge.

## Implementation

- `CLAUDE.md` (`AGENTS.md` symlinks to it): the "This Repository Is a Fork" section holds the rule, the merge procedure, and the ADR template.
- `docs/agents/domain.md`: tells the engineering skills to read `docs/fork-adr/` before working in an area.
