use anyhow::Result;
use async_trait::async_trait;
use std::net::IpAddr;
use std::path::Path;

pub use tomet_shelf_headless::book::BuildReport;
pub use tomet_shelf_headless::config::BookConfig;

/// Execution context for static site generation (SSG).
#[derive(Debug)]
pub struct BuildContext<'a> {
    pub src_dir: &'a Path,
    pub out_dir: &'a Path,
    pub config: &'a BookConfig,
    pub strict: bool,
}

/// Execution context for development server or production server hosting.
#[derive(Debug)]
pub struct ServerContext<'a> {
    pub src_dir: &'a Path,
    pub out_dir: &'a Path,
    pub config: &'a BookConfig,
    pub host: IpAddr,
    pub port: u16,
}

/// Unified trait implemented by every stela-shelf engine variant.
#[async_trait]
pub trait ShelfEngine: Send + Sync {
    /// Identifier name of the engine (e.g. "webcomponents", "leptos", "htmx", "islands").
    fn name(&self) -> &'static str;

    /// Human-readable description of the engine tech stack.
    fn description(&self) -> &'static str;

    /// Build the vault into a static site (SSG mode).
    fn build(&self, ctx: &BuildContext) -> Result<BuildReport>;

    /// Run the web server (Server mode).
    async fn serve(&self, ctx: &ServerContext) -> Result<()>;
}
