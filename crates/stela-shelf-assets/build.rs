use std::env;
use std::fs;
use std::path::Path;
use std::process::Command;

use lightningcss::bundler::{Bundler, FileProvider};
use lightningcss::printer::PrinterOptions;
use lightningcss::stylesheet::{MinifyOptions, ParserOptions, StyleSheet};

fn main() {
    let manifest_dir = env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR not set");
    let root = Path::new(&manifest_dir);

    println!("cargo:rerun-if-changed={}", root.join("frontend").display());
    println!(
        "cargo:rerun-if-changed={}",
        root.join("templates").display()
    );

    let out_dir = env::var("OUT_DIR").expect("OUT_DIR not set by cargo");
    let out_path = Path::new(&out_dir);
    let tailwind_output = out_path.join("tailwind.css");

    // 1. Run Tailwind CSS CLI
    let status = Command::new("tailwindcss")
        .current_dir(root)
        .args([
            "-c",
            "frontend/tailwind.config.ts",
            "-i",
            "frontend/styles/tailwind-input.css",
            "-o",
            tailwind_output
                .to_str()
                .expect("tailwind_output path is not valid UTF-8"),
        ])
        .status();

    match status {
        Ok(s) if s.success() => {}
        Ok(s) => panic!("`tailwindcss` exited with {s}"),
        Err(e) => panic!(
            "failed to run `tailwindcss` ({e}). It's provided by the nix dev shell \
             (nix/dev.nix) -- run this build from inside `nix develop` / direnv."
        ),
    }

    // 2. Bundle core shelf CSS with Lightning CSS
    let styles_dir = root.join("frontend").join("styles");
    let bundle_entry = out_path.join("shelf-entry.css");

    let entry_content = format!(
        r#"
@import "{}/00-base.css";
@import "{}/10-shell.css";
@import "{}/20-panes.css";
@import "{}/30-sticky-tabs.css";
@import "{}/35-sticky-tabs-vertical.css";
@import "{}/40-hero.css";
@import "{}/50-nav-infobox.css";
@import "{}/60-content.css";
@import "{}/70-widgets.css";
@import "{}/71-source-viewer.css";
@import "{}/72-center-peek.css";
@import "{}";
@import "{}/90-responsive.css";
@import "{}/98-no-js.css";
"#,
        styles_dir.display(),
        styles_dir.display(),
        styles_dir.display(),
        styles_dir.display(),
        styles_dir.display(),
        styles_dir.display(),
        styles_dir.display(),
        styles_dir.display(),
        styles_dir.display(),
        styles_dir.display(),
        styles_dir.display(),
        tailwind_output.display(),
        styles_dir.display(),
        styles_dir.display(),
    );

    fs::write(&bundle_entry, entry_content).expect("failed to write shelf-entry.css");

    let fs_provider = FileProvider::new();
    let mut bundler = Bundler::new(&fs_provider, None, ParserOptions::default());
    let mut stylesheet = bundler
        .bundle(&bundle_entry)
        .expect("failed to bundle CSS with lightningcss");

    stylesheet
        .minify(MinifyOptions::default())
        .expect("failed to minify CSS bundle with lightningcss");

    let res = stylesheet
        .to_css(PrinterOptions {
            minify: true,
            ..PrinterOptions::default()
        })
        .expect("failed to print minified CSS");

    fs::write(out_path.join("shelf.min.css"), res.code).expect("failed to write shelf.min.css");

    // 3. Minify Web Component Shadow DOM styles
    let components = [
        "tmt-btn",
        "tmt-badge",
        "tmt-icon",
        "tmt-swatch",
        "tmt-switch",
    ];

    let components_dir = styles_dir.join("components");
    for name in components {
        let comp_file = components_dir.join(format!("{name}.css"));
        let content = fs::read_to_string(&comp_file)
            .unwrap_or_else(|e| panic!("failed to read {}: {e}", comp_file.display()));

        let mut comp_sheet = StyleSheet::parse(
            &content,
            ParserOptions {
                filename: format!("{name}.css"),
                ..ParserOptions::default()
            },
        )
        .unwrap_or_else(|e| panic!("failed to parse {}: {e:?}", comp_file.display()));

        comp_sheet
            .minify(MinifyOptions::default())
            .unwrap_or_else(|e| panic!("failed to minify {}: {e:?}", comp_file.display()));

        let comp_res = comp_sheet
            .to_css(PrinterOptions {
                minify: true,
                ..PrinterOptions::default()
            })
            .unwrap_or_else(|e| {
                panic!(
                    "failed to serialize minified {}: {e:?}",
                    comp_file.display()
                )
            });

        fs::write(out_path.join(format!("{name}.min.css")), comp_res.code)
            .unwrap_or_else(|e| panic!("failed to write {name}.min.css: {e}"));
    }

    // 4. Bundle core Stela shell JavaScript with esbuild
    let shell_ts_path = root.join("frontend/scripts/stela-shell.ts");
    let js_output_path = out_path.join("stela-shell.min.js");

    let esbuild_status = Command::new("esbuild")
        .current_dir(root)
        .args([
            shell_ts_path.to_str().expect("valid UTF-8 path"),
            "--bundle",
            "--minify",
            &format!(
                "--outfile={}",
                js_output_path.to_str().expect("OUT_DIR is not valid UTF-8")
            ),
        ])
        .status();

    match esbuild_status {
        Ok(s) if s.success() => {}
        Ok(s) => panic!("`esbuild` exited with {s}"),
        Err(e) => panic!(
            "failed to run `esbuild` ({e}). It's provided by the nix dev shell \
             (nix/dev.nix) -- run this build from inside `nix develop` / direnv."
        ),
    }
}
