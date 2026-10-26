# Task: Deduplicate Templates across Shelf Engine Crates

## Overview
Deduplicate identical template files (`macros.html`, `base.html`, `fragments/`, etc.) across shelf variants using Askama's multi-directory search paths (`askama.toml`) and template inheritance (`{% extends %}`).

## Steps
- [x] Step 1: Create dedicated Jujutsu workspace `.agents/workspaces/dedup-templates`
- [x] Step 2: Investigate Askama template search paths and multi-directory configuration
- [x] Step 3: Configure Askama to find templates in `stela-shelf-assets/templates` via `askama.toml`
- [x] Step 4: Remove redundant `macros.html` from engine crates and verify builds
- [x] Step 5: Consolidate common `base.html`, `island_base.html`, `island_page.html`, `island_index.html`, and `fragments/` into `stela-shelf-assets`
- [x] Step 6: Verify full test suite (`cargo test`, `just check`, `just ci`)
- [x] Step 7: Clean up workspace and prepare commit proposal
