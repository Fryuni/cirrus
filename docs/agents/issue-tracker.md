# Issue tracker: Forgejo

Issues and specs for this repo live as issues on the **fork's** Forgejo repo: `git.rudd-agama.ts.net/Fryuni/cirrus` (the `origin` remote). Use the `fj` CLI for all operations.

**Always pass `-R origin`.** This clone also has an `upstream` remote (`mirror/cirrus`), and fork work must never be filed against it.

## Conventions

- **Create an issue**: `fj issue create -R origin "<title>" --body "..."`. For multi-line bodies, write the body to a temp file and pass `--body-file <path>`.
- **Read an issue**: `fj issue view -R origin <number>` for the title and body, and `fj issue view -R origin <number> comments` for the discussion.
- **List issues**: `fj issue search -R origin --state open --all`, filtered with `--labels <label>` as needed.
- **Make an issue a sub-issue of a parent**: Forgejo has no native sub-issues. Put `Part of #<parent>` at the top of the child body, and add the child to a task list in the parent body.
- **Comment on an issue**: `fj issue comment -R origin <number> "<body>"`, or `--body-file <path>`.
- **Apply / remove labels**: `fj issue edit -R origin <number> labels --add "<label>"` / `--rm "<label>"`
- **Close**: `fj issue close -R origin <number> --with-msg "<comment>"`

If `fj` reports that it isn't logged in to `git.rudd-agama.ts.net`, stop and ask the user to run `fj -H git.rudd-agama.ts.net auth login`. Don't fall back to another tracker.

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature requests; `/triage` reads this flag.)_

When set to `yes`, PRs run through the same labels and states as issues, using the `fj pr` equivalents: `fj pr view -R origin <number>` (plus `comments` / `diff`), `fj pr search -R origin`, `fj pr comment`, `fj pr edit`, `fj pr close`.

Forgejo shares one number space across issues and PRs, so a bare `#42` may be either. Resolve it with `fj pr view -R origin 42`, and fall back to `fj issue view -R origin 42`.

## When a skill says "publish to the issue tracker"

Create an issue on the fork with `fj issue create -R origin`.

## When a skill says "fetch the relevant ticket"

Run `fj issue view -R origin <number>` and `fj issue view -R origin <number> comments`.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single issue with **child** issues as tickets.

- **Map**: a single issue labelled `wayfinder:map`, holding the Notes / Decisions-so-far / Fog body.
- **Child ticket**: an issue with `Part of #<map>` at the top of its body, listed in a task list in the map body. Labels: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). Once claimed, the ticket is assigned to the driving dev.
- **Blocking**: Forgejo's native dependencies: `fj issue depend add -R origin <child> <blocker>...`. List them with `fj issue depend list -R origin <child>`. A ticket is unblocked when every dependency is closed.
- **Frontier query**: list the map's open children, then drop any with an open dependency or an assignee. The first in map order wins.
- **Claim**: `fj issue assign -R origin <n> <your-username>`, as the session's first write.
- **Resolve**: `fj issue comment -R origin <n> "<answer>"`, then `fj issue close -R origin <n>`, then append a context pointer (gist + link) to the map's Decisions-so-far.
