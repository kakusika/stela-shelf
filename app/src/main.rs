use anyhow::{Context, Result};
use clap::Parser;
use std::fs;
use std::path::Path;
use tracing::info;
use tracing_subscriber::{EnvFilter, fmt};

mod cli;

use cli::{Cli, Commands};
use stela_shelf_core::{BuildContext, ServerContext, ShelfEngine};
use tomet_shelf_headless::config::BookConfig;

#[tokio::main]
async fn main() -> Result<()> {
    fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")),
        )
        .init();

    let cli = Cli::parse();

    match cli.command {
        Commands::Build {
            dir,
            dest,
            strict,
            engine,
        } => {
            let (src_dir, out_dir, config) = resolve_build_paths(&dir, dest)?;
            let engine = resolve_engine(engine.as_deref(), &src_dir)?;
            info!(
                "Building static book with engine '{}' ({})",
                engine.name(),
                engine.description()
            );

            let ctx = BuildContext {
                src_dir: &src_dir,
                out_dir: &out_dir,
                config: &config,
                strict,
            };

            let report = engine.build(&ctx)?;

            if strict && !report.failures.is_empty() {
                for failure in &report.failures {
                    eprintln!("  {}: {}", failure.rel_path, failure.error);
                }
                anyhow::bail!(
                    "{} document(s) failed to build (--strict)",
                    report.failures.len()
                );
            }
        }
        Commands::Serve {
            dir,
            dest,
            host,
            port,
            engine,
        } => {
            let (src_dir, out_dir, config) = resolve_build_paths(&dir, dest)?;
            let engine = resolve_engine(engine.as_deref(), &src_dir)?;
            info!(
                "Starting server with engine '{}' ({})",
                engine.name(),
                engine.description()
            );

            let ctx = ServerContext {
                src_dir: &src_dir,
                out_dir: &out_dir,
                config: &config,
                host,
                port,
            };

            engine.serve(&ctx).await?;
        }
        Commands::Init { dir, title } => {
            let target_file = dir.join("shelf.toml");
            if target_file.exists() {
                anyhow::bail!("Configuration already exists: {}", target_file.display());
            }

            let book_title = title.unwrap_or_else(|| {
                dir.file_name()
                    .and_then(|s| s.to_str())
                    .unwrap_or("Stela Shelf")
                    .to_string()
            });

            let template = format!(
                r#"[book]
title = "{book_title}"
lang = "ja"
src = "."
dest = "dist"

[ui]
rail_title = "{book_title}"
default_view = "book"

[[ui.hero_chips]]
key = "parent"
label = "所属"

[[ui.hero_chips]]
key = "type.list-a"
label = "ファン"

[[ui.hero_chips]]
key = "type.element-a"

[[ui.hero_chips]]
key = "birth"
format = "birthday"

[build]
exclude = [
  "00-09 System/01 Apps"
]
"#
            );

            fs::write(&target_file, template)?;
            info!("Created configuration: {}", target_file.display());
        }
    }

    Ok(())
}

fn resolve_build_paths(
    dir: &std::path::Path,
    dest: Option<std::path::PathBuf>,
) -> Result<(std::path::PathBuf, std::path::PathBuf, BookConfig)> {
    let config = BookConfig::load_from_dir(dir)?;
    let src_dir = dir
        .canonicalize()
        .context("Failed to find source directory")?;
    let out_dir = dest.unwrap_or_else(|| src_dir.join(&config.book.dest));
    Ok((src_dir, out_dir, config))
}

fn resolve_engine(name: Option<&str>, src_dir: &Path) -> Result<Box<dyn ShelfEngine>> {
    let chosen = if let Some(n) = name {
        n.to_string()
    } else if let Ok(content) = fs::read_to_string(src_dir.join("shelf.toml")) {
        let val: toml::Value =
            toml::from_str(&content).unwrap_or(toml::Value::Table(Default::default()));
        val.get("engine")
            .and_then(|v| v.as_str())
            .or_else(|| {
                val.get("shelf")
                    .and_then(|s| s.get("engine"))
                    .and_then(|v| v.as_str())
            })
            .unwrap_or("webcomponents")
            .to_string()
    } else {
        "webcomponents".to_string()
    };

    match chosen.as_str() {
        "webcomponents" => {
            #[cfg(feature = "webcomponents")]
            {
                Ok(Box::new(stela_shelf_webcomponents::WebComponentsEngine))
            }
            #[cfg(not(feature = "webcomponents"))]
            {
                anyhow::bail!(
                    "Engine 'webcomponents' is disabled. Rebuild with `--features webcomponents`."
                );
            }
        }
        "leptos" => {
            #[cfg(feature = "leptos")]
            {
                Ok(Box::new(stela_shelf_leptos::LeptosEngine))
            }
            #[cfg(not(feature = "leptos"))]
            {
                anyhow::bail!("Engine 'leptos' is disabled. Rebuild with `--features leptos`.");
            }
        }
        "htmx" => {
            #[cfg(feature = "htmx")]
            {
                Ok(Box::new(stela_shelf_htmx::HtmxEngine))
            }
            #[cfg(not(feature = "htmx"))]
            {
                anyhow::bail!("Engine 'htmx' is disabled. Rebuild with `--features htmx`.");
            }
        }
        "islands" => {
            #[cfg(feature = "islands")]
            {
                anyhow::bail!("Engine 'islands' is not yet implemented.");
            }
            #[cfg(not(feature = "islands"))]
            {
                anyhow::bail!("Engine 'islands' is disabled. Rebuild with `--features islands`.");
            }
        }
        other => anyhow::bail!(
            "Unknown shelf engine: '{other}'. Available engines: webcomponents, leptos, htmx, islands"
        ),
    }
}
