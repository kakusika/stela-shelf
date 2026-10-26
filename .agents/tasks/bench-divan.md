# Task: Setup Divan Benchmarks

## Goal
Set up a benchmark suite using Divan to measure and compare SSG build performance (latency and memory allocations) across all shelf engines (`webcomponents`, `leptos`, `htmx`, `svelte`).

## Steps
- [x] 1. Create dedicated workspace and task tracking
- [x] 2. Investigate dependency requirements and crate architecture for benchmarks
- [x] 3. Configure `divan` dependency and benchmark target
- [/] 4. Implement engine build benchmark using Divan
- [ ] 5. Add `bench` recipe to `justfile`
- [ ] 6. Run and verify `cargo bench` / `just bench`
- [ ] 7. Clean up workspace and finalize
