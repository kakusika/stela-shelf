use anyhow::Result;
use std::path::Path;
use std::sync::LazyLock;

pub use tomet_shelf_headless::PageRenderer;
pub use tomet_shelf_headless::assets::{
    ICON_ASSETS, LUCIDE_SPRITE, SIMPLE_SPRITE, StaticAsset, content_version, write_if_changed,
    write_static_assets as write_render_assets,
};
pub use tomet_shelf_headless::config::{BookConfig, i18n};
pub use tomet_shelf_template::{BookRenderer, TemplateBundle};

// Stylesheets
pub const STELA_CSS: &str = concat!(
    include_str!("../frontend/styles/stela.css"),
    include_str!(concat!(env!("OUT_DIR"), "/tailwind.css")),
);

pub const STELA_JS: &str = include_str!(concat!(env!("OUT_DIR"), "/shelf.js"));

// Templates
pub const BASE_HTML: &str = include_str!("../frontend/templates/base.html");
pub const PAGE_HTML: &str = include_str!("../frontend/templates/page.html");
pub const INDEX_HTML: &str = include_str!("../frontend/templates/index.html");
pub const MACROS_HTML: &str = include_str!("../frontend/templates/macros.html");

pub const EXTRA_ASSETS: &[StaticAsset] = &[];
pub const EXTRA_VERSIONS: &[(&str, &str)] = &[];

/// Official `stela-shelf` UI template and asset bundle.
pub const ASSETS: TemplateBundle = TemplateBundle {
    base_html: BASE_HTML,
    page_html: PAGE_HTML,
    index_html: INDEX_HTML,
    macros_html: MACROS_HTML,
    book_css: STELA_CSS,
    book_js: STELA_JS,
    extra_assets: EXTRA_ASSETS,
    extra_asset_versions: EXTRA_VERSIONS,
};

pub static CSS_VERSION: LazyLock<String> = LazyLock::new(|| content_version(STELA_CSS));
pub static JS_VERSION: LazyLock<String> = LazyLock::new(|| content_version(STELA_JS));

pub fn write_static_assets(out_dir: &Path, src_dir: &Path, config: &BookConfig) -> Result<()> {
    let renderer = BookRenderer::new(config, &ASSETS, false)?;
    write_render_assets(out_dir, src_dir, config, renderer.static_assets())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn assets_versions_are_valid() {
        assert_eq!(CSS_VERSION.len(), 16);
        assert_eq!(JS_VERSION.len(), 16);
    }

    #[test]
    fn template_bundle_renders_index() {
        let mut config = BookConfig::default();
        config.book.title = "Stela Test".into();
        let renderer = BookRenderer::new(&config, &ASSETS, false).unwrap();
        let index_html = PageRenderer::render_index(&renderer, &[], &[]).unwrap();
        assert!(index_html.contains("Stela Test"));
        assert!(index_html.contains("shelf.css?v="));
    }
}
