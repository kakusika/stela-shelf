# Task: Migrate tomet-shelf UI Assets to stela-shelf

## Context
- `stela-shelf` currently has placeholder/minimal UI assets (`stela.css`, minimal templates, minimal `index.ts`).
- `tomet-shelf` has the full stone/book-inspired UI assets (`00-base.css` .. `98-no-js.css`, Web Components `components/tmt-*`, full Jinja templates, and 30 TypeScript modules).
- Goal: Fully migrate these UI assets to `stela-shelf` so `stela-shelf` has the complete, rich UI experience.

## Steps
- [x] 1. Create Jujutsu workspace `.agents/workspaces/migrate-ui-assets`.
- [x] 2. Copy frontend assets from `tomet-shelf/crates/tomet-shelf-assets/frontend/` to `stela-shelf/crates/stela-shelf-assets/frontend/`.
- [x] 3. Update `stela-shelf/crates/stela-shelf-assets/src/lib.rs` to expose all bundled stylesheets, components, and templates.
- [x] 4. Align identifiers, asset references, and configurations between `stela-shelf` and the assets.
- [x] 5. Run tests and verify the build inside `nix develop` (`cargo test --workspace`, TypeScript typecheck).
- [x] 6. Test site generation / dev server with `tmtroot/` (`stela-shelf build`, `stela-shelf serve`).
- [x] 7. Merge/rebase workspace changes and clean up workspace.
