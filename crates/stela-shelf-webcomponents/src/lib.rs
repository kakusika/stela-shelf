use anyhow::Result;
use askama::Template;
use async_trait::async_trait;
use std::collections::HashMap;
use std::path::Path;
use std::sync::{Arc, LazyLock};

use stela_shelf_core::{BuildContext, BuildReport, ServerContext, ShelfEngine};
use tomet_shelf_document::{
    DocIcon, HeroChipItem, InfoboxRowItem, ProcessedDoc, SectionTab, TocItem,
};
pub use tomet_shelf_headless::PageRenderer;
pub use tomet_shelf_headless::assets::{StaticAsset, content_version, write_if_changed};
pub use tomet_shelf_headless::config::BookConfig;
use tomet_shelf_headless::renderer::RendererFactory;
use tomet_shelf_headless::{Backlink, EntrySummary, SectionSummary};
pub use tomet_shelf_icons::{IconRenderer, StandardIconRenderer};

//==============================================================================
// HTML Helper Functions for Askama Templates
//==============================================================================

fn html_escape(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for c in s.chars() {
        match c {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            '"' => out.push_str("&quot;"),
            '\'' => out.push_str("&#x27;"),
            _ => out.push(c),
        }
    }
    out
}

fn render_book_index_items(buf: &mut String, items: &[EntrySummary], here: &str) {
    buf.push_str("<ul class=\"book-index-items\">");
    for entry in items {
        buf.push_str("<li class=\"book-index-item\">");
        let is_here = entry.url == here;
        let here_classes = if is_here { " is-here" } else { "" };
        let aria_current = if is_here {
            " aria-current=\"page\""
        } else {
            ""
        };
        buf.push_str(&format!(
            "<a href=\"{}\" class=\"book-index-link{}\"{}>\n      <span class=\"book-index-title\">{}</span>\n    </a>",
            html_escape(&entry.url),
            here_classes,
            aria_current,
            html_escape(&entry.title)
        ));
        if !entry.children.is_empty() {
            render_book_index_items(buf, &entry.children, here);
        }
        buf.push_str("</li>");
    }
    buf.push_str("</ul>");
}

fn render_catalog_entries(buf: &mut String, items: &[EntrySummary], top: bool) {
    let class_name = if top {
        "book-index-items is-shelf"
    } else {
        "book-index-items"
    };
    buf.push_str(&format!("<ul class=\"{}\">", class_name));
    for entry in items {
        buf.push_str("<li class=\"book-index-item\">");
        buf.push_str(&format!(
            "<a href=\"{}\" class=\"book-index-link\">\n      <span class=\"book-index-title\">{}</span>",
            html_escape(&entry.url),
            html_escape(&entry.title)
        ));
        if let Some(ref section) = entry.section {
            buf.push_str(&format!(
                "\n      <span class=\"book-index-meta\">{}</span>",
                html_escape(section)
            ));
        }
        buf.push_str("\n    </a>");
        if !entry.children.is_empty() {
            render_catalog_entries(buf, &entry.children, false);
        }
        buf.push_str("</li>");
    }
    buf.push_str("</ul>");
}

//==============================================================================
// Askama Template Structs
//==============================================================================

#[derive(Template)]
#[template(path = "page.html")]
pub struct PageTemplate<'a> {
    pub site_title: &'a str,
    pub description: Option<&'a str>,
    pub lang: &'a str,
    pub default_view: &'a str,
    pub custom_css: &'a [String],
    pub css_version: &'a str,
    pub js_version: &'a str,
    pub base_path: &'a str,
    pub clean_url_prefix: &'a str,
    pub full_url_prefix: &'a str,
    pub home_url: &'a str,
    pub strings: &'a HashMap<String, String>,

    pub tmt_btn_css_version: &'a str,
    pub tmt_badge_css_version: &'a str,
    pub tmt_icon_css_version: &'a str,
    pub tmt_swatch_css_version: &'a str,
    pub tmt_switch_css_version: &'a str,

    pub source_path: &'a str,
    pub rel_path: &'a str,
    pub slug: &'a str,
    pub page_title: &'a str,
    pub section: Option<&'a str>,
    pub kind: Option<&'a str>,
    pub primary_color: Option<&'a str>,
    pub icon: Option<&'a str>,
    pub icon_image_url: Option<&'a str>,
    pub banner_url: Option<&'a str>,
    pub banner_original_url: Option<&'a str>,
    pub banner_y: Option<f64>,
    pub images: &'a [String],
    pub original_images: &'a [String],
    pub hero_chips: &'a [HeroChipItem],
    pub infobox_rows: &'a [InfoboxRowItem],
    pub has_data: bool,
    pub toc: &'a [TocItem],
    pub section_tabs: &'a [SectionTab],
    pub body_html: &'a str,
    pub backlinks: &'a [Backlink],
    pub book_index: &'a [EntrySummary],
    pub page_url: &'a str,
    pub rail_letters: &'a [String],
    pub is_dev: bool,
}

impl<'a> PageTemplate<'a> {
    pub fn t(&self, key: &str, default: &'a str) -> &'a str {
        if let Some(val) = self.strings.get(key) {
            val.as_str()
        } else {
            default
        }
    }

    pub fn base_path_json(&self) -> String {
        serde_json::to_string(&self.base_path).unwrap_or_else(|_| "\"\"".to_string())
    }

    pub fn clean_url_prefix_json(&self) -> String {
        serde_json::to_string(&self.clean_url_prefix).unwrap_or_else(|_| "\"\"".to_string())
    }

    pub fn full_url_prefix_json(&self) -> String {
        serde_json::to_string(&self.full_url_prefix).unwrap_or_else(|_| "\"\"".to_string())
    }

    pub fn home_url_json(&self) -> String {
        serde_json::to_string(&self.home_url).unwrap_or_else(|_| "\"\"".to_string())
    }

    pub fn strings_json(&self) -> String {
        serde_json::to_string(&self.strings).unwrap_or_else(|_| "{}".to_string())
    }

    pub fn page_url_json(&self) -> String {
        serde_json::to_string(&self.page_url).unwrap_or_else(|_| "\"\"".to_string())
    }

    pub fn book_index_html(&self) -> String {
        let mut buf = String::new();
        render_book_index_items(&mut buf, self.book_index, self.page_url);
        buf
    }
}

#[derive(Template)]
#[template(path = "index.html")]
pub struct IndexTemplate<'a> {
    pub site_title: &'a str,
    pub description: Option<&'a str>,
    pub lang: &'a str,
    pub default_view: &'a str,
    pub custom_css: &'a [String],
    pub css_version: &'a str,
    pub js_version: &'a str,
    pub base_path: &'a str,
    pub clean_url_prefix: &'a str,
    pub full_url_prefix: &'a str,
    pub home_url: &'a str,
    pub strings: &'a HashMap<String, String>,

    pub tmt_btn_css_version: &'a str,
    pub tmt_badge_css_version: &'a str,
    pub tmt_icon_css_version: &'a str,
    pub tmt_swatch_css_version: &'a str,
    pub tmt_switch_css_version: &'a str,

    pub page_title: &'a str,
    pub sections: &'a [SectionSummary],
    pub entries: &'a [EntrySummary],
}

impl<'a> IndexTemplate<'a> {
    pub fn t(&self, key: &str, default: &'a str) -> &'a str {
        if let Some(val) = self.strings.get(key) {
            val.as_str()
        } else {
            default
        }
    }

    pub fn description_or_default(&self) -> String {
        if let Some(desc) = self.description {
            desc.to_string()
        } else {
            format!("Total notes: {}", self.entries.len())
        }
    }

    pub fn base_path_json(&self) -> String {
        serde_json::to_string(&self.base_path).unwrap_or_else(|_| "\"\"".to_string())
    }

    pub fn clean_url_prefix_json(&self) -> String {
        serde_json::to_string(&self.clean_url_prefix).unwrap_or_else(|_| "\"\"".to_string())
    }

    pub fn full_url_prefix_json(&self) -> String {
        serde_json::to_string(&self.full_url_prefix).unwrap_or_else(|_| "\"\"".to_string())
    }

    pub fn home_url_json(&self) -> String {
        serde_json::to_string(&self.home_url).unwrap_or_else(|_| "\"\"".to_string())
    }

    pub fn strings_json(&self) -> String {
        serde_json::to_string(&self.strings).unwrap_or_else(|_| "{}".to_string())
    }

    pub fn entries_html(&self) -> String {
        let mut buf = String::new();
        render_catalog_entries(&mut buf, self.entries, true);
        buf
    }
}

//==============================================================================
// Stylesheets & Static Assets (from stela-shelf-assets)
//==============================================================================

pub use stela_shelf_assets::{
    BOOK_CSS, COMPONENT_ASSETS, CSS_VERSION, STELA_CSS, STELA_CSS_VERSION, TMT_BADGE_CSS,
    TMT_BADGE_CSS_VERSION, TMT_BTN_CSS, TMT_BTN_CSS_VERSION, TMT_ICON_CSS, TMT_ICON_CSS_VERSION,
    TMT_SWATCH_CSS, TMT_SWATCH_CSS_VERSION, TMT_SWITCH_CSS, TMT_SWITCH_CSS_VERSION,
};

pub const BOOK_JS: &str = include_str!(concat!(env!("OUT_DIR"), "/shelf.js"));
pub const STELA_JS: &str = BOOK_JS;
pub static JS_VERSION: LazyLock<String> = LazyLock::new(|| content_version(BOOK_JS));

//==============================================================================
// WebComponentsRenderer
//==============================================================================

pub struct WebComponentsRenderer {
    config: BookConfig,
    clean_url_prefix: String,
    full_url_prefix: String,
    home_url: String,
    base_path: String,
    css_version: String,
    js_version: String,
    tmt_btn_css_version: String,
    tmt_badge_css_version: String,
    tmt_icon_css_version: String,
    tmt_swatch_css_version: String,
    tmt_switch_css_version: String,
    rail_letters: Vec<String>,
    static_assets: Vec<StaticAsset>,
    link_icons: HashMap<String, String>,
    is_dev: bool,
}

impl WebComponentsRenderer {
    pub fn new(config: &BookConfig, is_dev: bool) -> Result<Self> {
        let rail_title = config
            .ui
            .rail_title
            .as_deref()
            .unwrap_or(&config.book.title);

        let rail_letters: Vec<String> = rail_title.chars().map(|c| c.to_string()).collect();

        let base_path = config.build.clean_base_path().to_string();
        let full_url_prefix = config.build.full_url_prefix();
        let home_url = if full_url_prefix.is_empty() {
            if base_path.is_empty() {
                "/".to_string()
            } else {
                format!("{base_path}/")
            }
        } else {
            full_url_prefix.clone()
        };

        let mut static_assets = stela_shelf_assets::stela_static_assets();
        static_assets.push(StaticAsset {
            path: "shelf.js",
            mime: "application/javascript; charset=utf-8",
            content: BOOK_JS,
        });

        Ok(Self {
            config: config.clone(),
            clean_url_prefix: full_url_prefix.clone(),
            full_url_prefix,
            home_url,
            base_path,
            css_version: content_version(BOOK_CSS),
            js_version: content_version(BOOK_JS),
            tmt_btn_css_version: content_version(TMT_BTN_CSS),
            tmt_badge_css_version: content_version(TMT_BADGE_CSS),
            tmt_icon_css_version: content_version(TMT_ICON_CSS),
            tmt_swatch_css_version: content_version(TMT_SWATCH_CSS),
            tmt_switch_css_version: content_version(TMT_SWITCH_CSS),
            rail_letters,
            static_assets,
            link_icons: HashMap::new(),
            is_dev,
        })
    }

    pub fn render_page(
        &self,
        doc: &ProcessedDoc,
        backlinks: &[Backlink],
        book_index: &[EntrySummary],
    ) -> Result<String> {
        let page_url = format!("{}/{}", self.clean_url_prefix, doc.slug);

        let icon_renderer = StandardIconRenderer::new();
        let rendered_icon = doc.icon.as_ref().map(|ic| {
            tomet_shelf_render::render_page_icon(ic, &self.base_path, Some(&icon_renderer))
        });

        let body_html = tomet_shelf_render::enhance_body_html(
            &doc.body_html,
            &self.config,
            &self.base_path,
            Some(&icon_renderer),
        );
        let body_html = if self.config.ui.links.note_icons && !self.link_icons.is_empty() {
            tomet_shelf_render::enhance_internal_links(
                &body_html,
                &self.link_icons,
                &self.full_url_prefix,
            )
        } else {
            body_html
        };

        let template = PageTemplate {
            site_title: &self.config.book.title,
            description: self.config.book.description.as_deref(),
            lang: &self.config.book.lang,
            default_view: &self.config.ui.default_view,
            custom_css: &self.config.ui.custom_css,
            css_version: &self.css_version,
            js_version: &self.js_version,
            base_path: &self.base_path,
            clean_url_prefix: self.config.build.clean_url_prefix(),
            full_url_prefix: &self.full_url_prefix,
            home_url: &self.home_url,
            strings: &self.config.ui.strings,

            tmt_btn_css_version: &self.tmt_btn_css_version,
            tmt_badge_css_version: &self.tmt_badge_css_version,
            tmt_icon_css_version: &self.tmt_icon_css_version,
            tmt_swatch_css_version: &self.tmt_swatch_css_version,
            tmt_switch_css_version: &self.tmt_switch_css_version,

            source_path: &doc.source_path,
            rel_path: &doc.rel_path,
            slug: &doc.slug,
            page_title: &doc.title,
            section: doc.section.as_deref(),
            kind: doc.kind.as_deref(),
            primary_color: doc.primary_color.as_deref(),
            icon: rendered_icon.as_deref(),
            icon_image_url: doc.icon_image_url.as_deref(),
            banner_url: doc.banner_url.as_deref(),
            banner_original_url: doc.banner_original_url.as_deref(),
            banner_y: doc.banner_y,
            images: &doc.images,
            original_images: &doc.original_images,
            hero_chips: &doc.hero_chips,
            infobox_rows: &doc.infobox_rows,
            has_data: doc.has_data,
            toc: &doc.toc,
            section_tabs: &doc.section_tabs,
            body_html: &body_html,
            backlinks,
            book_index,
            page_url: &page_url,
            rail_letters: &self.rail_letters,
            is_dev: self.is_dev,
        };

        template.render().map_err(Into::into)
    }

    pub fn render_index(
        &self,
        sections: &[SectionSummary],
        entries: &[EntrySummary],
    ) -> Result<String> {
        let template = IndexTemplate {
            site_title: &self.config.book.title,
            description: self.config.book.description.as_deref(),
            lang: &self.config.book.lang,
            default_view: &self.config.ui.default_view,
            custom_css: &self.config.ui.custom_css,
            css_version: &self.css_version,
            js_version: &self.js_version,
            base_path: &self.base_path,
            clean_url_prefix: self.config.build.clean_url_prefix(),
            full_url_prefix: &self.full_url_prefix,
            home_url: &self.home_url,
            strings: &self.config.ui.strings,

            tmt_btn_css_version: &self.tmt_btn_css_version,
            tmt_badge_css_version: &self.tmt_badge_css_version,
            tmt_icon_css_version: &self.tmt_icon_css_version,
            tmt_swatch_css_version: &self.tmt_swatch_css_version,
            tmt_switch_css_version: &self.tmt_switch_css_version,

            page_title: "",
            sections,
            entries,
        };

        template.render().map_err(Into::into)
    }
}

impl PageRenderer for WebComponentsRenderer {
    fn render_page(
        &self,
        doc: &ProcessedDoc,
        backlinks: &[Backlink],
        book_index: &[EntrySummary],
    ) -> Result<String> {
        WebComponentsRenderer::render_page(self, doc, backlinks, book_index)
    }

    fn render_index(
        &self,
        sections: &[SectionSummary],
        entries: &[EntrySummary],
    ) -> Result<String> {
        WebComponentsRenderer::render_index(self, sections, entries)
    }

    fn static_assets(&self) -> &[StaticAsset] {
        &self.static_assets
    }

    fn icon_renderer(&self) -> Option<Arc<dyn IconRenderer>> {
        Some(Arc::new(StandardIconRenderer::new()))
    }

    fn set_doc_icons(&mut self, icons: &HashMap<String, DocIcon>) {
        let icon_renderer = StandardIconRenderer::new();
        self.link_icons = icons
            .iter()
            .map(|(slug, icon)| {
                let html = tomet_shelf_render::render_page_link_icon(
                    icon,
                    &self.base_path,
                    Some(&icon_renderer),
                );
                (slug.clone(), html)
            })
            .collect();
    }
}

#[derive(Debug, Clone, Copy, Default)]
pub struct WebComponentsRendererFactory;

impl RendererFactory for WebComponentsRendererFactory {
    fn create(&self, config: &BookConfig, is_dev: bool) -> Result<Box<dyn PageRenderer>> {
        Ok(Box::new(WebComponentsRenderer::new(config, is_dev)?))
    }

    fn icon_renderer(&self) -> Option<Arc<dyn IconRenderer>> {
        Some(Arc::new(StandardIconRenderer::new()))
    }
}

pub fn write_static_assets(out_dir: &Path, src_dir: &Path, config: &BookConfig) -> Result<()> {
    let renderer = WebComponentsRenderer::new(config, false)?;
    tomet_shelf_headless::assets::write_static_assets(
        out_dir,
        src_dir,
        config,
        renderer.static_assets(),
    )
}

/// Web Components & Tailwind CSS engine implementation for stela-shelf.
#[derive(Debug, Default, Clone, Copy)]
pub struct WebComponentsEngine;

#[async_trait]
impl ShelfEngine for WebComponentsEngine {
    fn name(&self) -> &'static str {
        "webcomponents"
    }

    fn description(&self) -> &'static str {
        "Web Components (Custom Elements) + Tailwind CSS engine"
    }

    fn build(&self, ctx: &BuildContext) -> Result<BuildReport> {
        tomet_shelf_headless::book::build_book(
            ctx.src_dir,
            ctx.out_dir,
            ctx.config,
            &WebComponentsRendererFactory,
            false,
        )
    }

    async fn serve(&self, ctx: &ServerContext) -> Result<()> {
        tomet_shelf_headless::run_dev_server(
            ctx.src_dir.to_path_buf(),
            ctx.out_dir.to_path_buf(),
            ctx.config.clone(),
            Arc::new(WebComponentsRendererFactory),
            ctx.host,
            ctx.port,
        )
        .await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn assets_versions_are_valid() {
        assert_eq!(CSS_VERSION.len(), 16);
        assert_eq!(JS_VERSION.len(), 16);
        assert_eq!(TMT_BTN_CSS_VERSION.len(), 16);
        assert_eq!(TMT_BADGE_CSS_VERSION.len(), 16);
        assert_eq!(TMT_ICON_CSS_VERSION.len(), 16);
        assert_eq!(TMT_SWATCH_CSS_VERSION.len(), 16);
        assert_eq!(TMT_SWITCH_CSS_VERSION.len(), 16);
    }

    #[test]
    fn tmt_components_are_bundled_in_book_assets() {
        assert!(
            BOOK_JS.contains("customElements.define('tmt-btn'")
                || BOOK_JS.contains("customElements.define(\"tmt-btn\""),
            "tmt-btn custom element is defined in BOOK_JS"
        );
        assert!(
            BOOK_JS.contains("customElements.define('tmt-badge'")
                || BOOK_JS.contains("customElements.define(\"tmt-badge\""),
            "tmt-badge custom element is defined in BOOK_JS"
        );
        assert!(
            BOOK_JS.contains("customElements.define('tmt-icon'")
                || BOOK_JS.contains("customElements.define(\"tmt-icon\""),
            "tmt-icon custom element is defined in BOOK_JS"
        );
        assert!(
            BOOK_CSS.contains("tmt-btn"),
            "tmt-btn light DOM base rules are in BOOK_CSS"
        );
    }

    #[test]
    fn template_bundle_renders_base_path_correctly() {
        let mut config = BookConfig::default();
        config.book.title = "Docs".into();
        config.build.base_path = Some("/sub".into());
        let renderer = WebComponentsRenderer::new(&config, false).unwrap();
        let index_html = PageRenderer::render_index(&renderer, &[], &[]).unwrap();
        assert!(index_html.contains("href=\"/sub/shelf.css?v="));
    }
}
