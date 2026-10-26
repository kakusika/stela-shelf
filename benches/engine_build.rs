use divan::AllocProfiler;
use std::path::PathBuf;
use stela_shelf_core::{BookConfig, BuildContext, ShelfEngine};
use stela_shelf_htmx::HtmxEngine;
use stela_shelf_leptos::LeptosEngine;
use stela_shelf_solid::SolidEngine;
use stela_shelf_svelte::SvelteEngine;
use stela_shelf_webcomponents::WebComponentsEngine;

#[global_allocator]
static ALLOC: AllocProfiler = AllocProfiler::system();

fn main() {
    divan::main();
}

/// Benchmark SSG build time and memory allocations across engines for the `tmtroot` vault.
#[divan::bench(types = [WebComponentsEngine, LeptosEngine, HtmxEngine, SvelteEngine, SolidEngine])]
fn ssg_build<E: ShelfEngine + Default>(bencher: divan::Bencher) {
    let src_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../tmtroot")
        .canonicalize()
        .expect("Failed to locate tmtroot vault");
    let config = BookConfig::load_from_dir(&src_dir).expect("Failed to load BookConfig");
    let engine = E::default();

    bencher
        .with_inputs(|| tempfile::tempdir().expect("Failed to create temporary directory"))
        .bench_values(|out_dir| {
            let ctx = BuildContext {
                src_dir: &src_dir,
                out_dir: out_dir.path(),
                config: &config,
                strict: false,
            };
            engine.build(&ctx).expect("Engine build failed");
        });
}
