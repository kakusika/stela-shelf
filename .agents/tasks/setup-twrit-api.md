# Task: Setup twrit rust-api docs generation for stela-shelf

## Context
- Expand `tmtroot/` with automated Rust API documentation using `twrit`.
- Add `.writ.tmt` with rule `rust-api-docs` targeting `tmtroot/generated/crates`.
- Integrate with `just docs` (`sisho fix .`) and verify with `just docs-check` / `just check test`.

## Steps
- [x] 1. Create `.writ.tmt` at repository root.
- [x] 2. Run `twrit api` / `sisho fix .` to generate `tmtroot/generated/crates/*.tmt`.
- [x] 3. Verify documentation checks and build (`just docs-check`, `just check test`, `nix run . -- build tmtroot`).
- [x] 4. Commit changes.
