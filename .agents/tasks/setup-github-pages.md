# Task: Setup GitHub Pages for stela-shelf

## Context
- Enable automated building and publishing of `stela-shelf docs` (`tmtroot/`) to GitHub Pages (`https://kakusika.github.io/stela-shelf/`).
- Build is powered by `nix run . -- build tmtroot` and published via GitHub Actions.

## Steps
- [x] 1. Create `.github/workflows/pages.yml`.
- [x] 2. Verify workflow syntax and local build command (`nix run . -- build tmtroot`).
- [x] 3. Stage changes and prepare commit.
