<!-- Generated from tmtroot/contributing.tmt. Edit that, then `tomet export .`. -->

# Contributing to StelaShelf

## Documentation Policy

- All Markdown files (`README.md`, `AGENTS.md`, `CONTRIBUTING.md`, etc.) are generated build artifacts.
Never edit `.md` files directly.
- Always edit the source `.tmt` files under `tmtroot/`.
- Run `just docs` (or `tomet export .`) to regenerate Markdown files, and verify with `just docs-check`.

## Commit Convention

All commits must follow the Conventional Commits format: `type(scope): description`.

## Clean Commits Policy

Do not include AI session metadata or trailers (e.g. `Claude-Session:`, `Co-Authored-By:`) in commit messages.
Keep commit logs clean and focused on technical changes.

