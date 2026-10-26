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

### Phase 4+: Subsequent Engines Implementation
- [ ] 10. Implement `stela-shelf-leptos` (Full-Rust: Leptos SSG + Axum SSR).
- [ ] 11. Implement `stela-shelf-htmx` (HTML-First: Askama + HTMX).
- [ ] 12. Implement `stela-shelf-islands` (Islands: Preact/Astro + Pagefind).
