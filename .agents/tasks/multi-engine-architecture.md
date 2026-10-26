# Task: Multi-Engine Architecture for stela-shelf

## Context
- Transform `stela-shelf` into a multi-engine incubator/playground for `tomet-shelf`.
- Enable exploring and comparing different Web tech stacks (Leptos, Web Components, HTMX, Islands) supporting both SSG and server-based delivery.
- Architecture: Crates separation (`stela-shelf-core`, `stela-shelf-webcomponents`, `stela-shelf-leptos`, `stela-shelf-htmx`, `stela-shelf-islands`) unified via Cargo features in the CLI (`app`).

## Steps
### Phase 0: Core Abstraction (`stela-shelf-core`)
- [x] 1. Create `crates/stela-shelf-core` crate with common `ShelfEngine` trait (`build_static` for SSG, `create_router` for Server).
- [x] 2. Define shared context types (`BuildContext`, `ServerContext`, `BuildReport`).

### Phase 1: Transition Existing Web Components Engine (`stela-shelf-webcomponents`)
- [x] 3. Rename/refactor `crates/stela-shelf-assets` to `crates/stela-shelf-webcomponents`.
- [x] 4. Implement `ShelfEngine` trait for the Web Components engine.

### Phase 2: CLI Integration & Feature Flags (`app`)
- [x] 5. Add feature flags to `app/Cargo.toml` (`default = ["all"]`, `webcomponents`, `leptos`, `htmx`, `islands`).
- [x] 6. Update CLI to accept `--engine <NAME>` and read `engine` from `shelf.toml`.
- [x] 7. Implement engine dispatch logic in `app/src/main.rs`.

### Phase 3: Verification & Baseline Check
- [x] 8. Verify tests and builds (`cargo test --workspace`, `cargo check`).
- [x] 9. Verify SSG build and dev server with `tmtroot/`.

### Phase 4: Full-Rust Leptos Engine (`stela-shelf-leptos`)
- [x] 10. Create `crates/stela-shelf-leptos` crate with Leptos and Axum dependencies.
- [x] 11. Design Leptos SSR components (`App`, `Shell`, `NavPane`, `ContentPane`, `TocPane`).
- [x] 12. Implement `ShelfEngine` for `LeptosEngine`:
  - `build(&self, ctx: &BuildContext)`: Static HTML generation for vault documents.
  - `serve(&self, ctx: &ServerContext)`: Axum server with on-demand Leptos SSR.
- [x] 13. Integrate `stela-shelf-leptos` into `app` with `leptos` feature flag.
- [x] 14. Verify build and dev server with `tmtroot/` using `--engine leptos`.

### Phase 5: HTML-First HTMX Engine (`stela-shelf-htmx`)
- [x] 15. Create `crates/stela-shelf-htmx` crate with Askama and Axum dependencies.
- [x] 16. Prepare HTMX asset and modern CSS styling.
- [x] 17. Implement Askama templates (base, page, index, and HTML fragments).
- [x] 18. Implement `HtmxEngine` implementing `ShelfEngine` (SSG build + Axum server with HTMX routing).
- [x] 19. Integrate `stela-shelf-htmx` into `app` with `htmx` feature flag.
- [x] 20. Verify build and dev server with `tmtroot/` using `--engine htmx` (fixed nested page swap by utilizing `hx-boost` for seamless body navigation without embedding full pages).

### Phase 6A: Svelte Islands Engine (`stela-shelf-svelte`)
- [x] 21. Create `crates/stela-shelf-svelte` crate with Askama and core dependencies.
- [x] 22. Implement Svelte Search Island component (`ui/SearchIsland.svelte` & `ui/main.ts`) and bundle script (`build-island.ts`).
- [x] 23. Implement Askama templates (`base.html`, `page.html`, `index.html`) with `<div id="search-island">` slot and Stela CSS.
- [x] 24. Implement `SvelteEngine` implementing `ShelfEngine` (SSG build + dev server).
- [x] 25. Integrate `stela-shelf-svelte` into `app` with `svelte` feature flag.
- [x] 26. Verify build and dev server with `tmtroot/` using `--engine svelte`.

### Phase 6B: SolidJS Islands Engine (`stela-shelf-solid`)
- [x] 27. Create `crates/stela-shelf-solid` crate with Askama and core dependencies.
- [x] 28. Implement SolidJS Search Island component (`ui/SearchIsland.tsx` & `ui/main.tsx`) and bundle script (`build-island.ts`).
- [x] 29. Implement Askama templates with island slot and Stela CSS.
- [x] 30. Implement `SolidEngine` implementing `ShelfEngine` (SSG build + dev server).
- [x] 31. Integrate `stela-shelf-solid` into `app` with `solid` feature flag.
- [x] 32. Verify build and dev server with `tmtroot/` using `--engine solid`.
