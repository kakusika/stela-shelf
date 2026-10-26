use anyhow::Result;
use askama::Template;
use async_trait::async_trait;
use std::sync::{Arc, LazyLock};

use stela_shelf_assets::{
    COMPONENT_ASSETS, STELA_CSS, STELA_CSS_VERSION,
    TMT_BADGE_CSS_VERSION, TMT_BTN_CSS_VERSION, TMT_ICON_CSS_VERSION, TMT_SWATCH_CSS_VERSION,
    TMT_SWITCH_CSS_VERSION,
};
use stela_shelf_core::{BuildContext, BuildReport, ServerContext, ShelfEngine};
use tomet_shelf_document::{ProcessedDoc, SectionTab};
use tomet_shelf_headless::assets::StaticAsset;
use tomet_shelf_headless::{
    Backlink, BookConfig, EntrySummary, PageRenderer, RendererFactory, SectionSummary,
};

/// Bundled CSS stylesheet for SolidJS search island.
pub const ISLAND_CSS: &str = include_str!("../assets/island.css");

/// Bundled SolidJS Search Island JavaScript.
pub const ISLAND_JS: &str = include_str!("../assets/island.js");

pub static SOLID_STATIC_ASSETS: LazyLock<Vec<StaticAsset>> = LazyLock::new(|| {
    let mut assets = Vec::with_capacity(3 + COMPONENT_ASSETS.len());
    assets.push(StaticAsset {
        path: "shelf.css",
        mime: "text/css; charset=utf-8",
        content: STELA_CSS,
    });
    assets.push(StaticAsset {
        path: "island.css",
        mime: "text/css; charset=utf-8",
        content: ISLAND_CSS,
    });
    assets.push(StaticAsset {
        path: "island.js",
        mime: "application/javascript; charset=utf-8",
        content: ISLAND_JS,
    });
    assets.extend_from_slice(COMPONENT_ASSETS);
    assets
});

#[derive(Clone, Debug)]
pub struct EntryView {
    pub url: String,
    pub title: String,
}

#[derive(Template)]
#[template(path = "page.html")]
pub struct PageTemplate<'a> {
    pub lang: &'a str,
    pub book_title: &'a str,
    pub doc_title: &'a str,
    pub current_title: &'a str,
    pub content_html: &'a str,
    pub base_path: &'a str,
    pub css_version: &'a str,
    pub island_css: &'a str,
    pub island_js: &'a str,
    pub hero_chips: &'a [(String, String)],
    pub toc_items: &'a [(String, String, f32)],
    pub section_tabs: &'a [SectionTab],
    pub entries: &'a [EntryView],
    pub backlinks: &'a [EntryView],
    pub rail_letters: &'a [String],

    pub tmt_btn_css_version: &'a str,
    pub tmt_badge_css_version: &'a str,
    pub tmt_icon_css_version: &'a str,
    pub tmt_swatch_css_version: &'a str,
    pub tmt_switch_css_version: &'a str,
}

impl<'a> PageTemplate<'a> {
    pub fn t(&self, _key: &str, default: &'a str) -> &'a str {
        default
    }
}

#[derive(Template)]
#[template(path = "fragments/article.html")]
pub struct ArticleFragmentTemplate<'a> {
    pub doc_title: &'a str,
    pub content_html: &'a str,
    pub hero_chips: &'a [(String, String)],
    pub backlinks: &'a [EntryView],
}

#[derive(Template)]
#[template(path = "fragments/toc.html")]
pub struct TocFragmentTemplate<'a> {
    pub toc_items: &'a [(String, String, f32)],
}

#[derive(Template)]
#[template(path = "index.html")]
pub struct IndexTemplate<'a> {
    pub lang: &'a str,
    pub book_title: &'a str,
    pub current_title: &'a str,
    pub base_path: &'a str,
    pub css_version: &'a str,
    pub island_css: &'a str,
    pub island_js: &'a str,
    pub sections: &'a [(String, usize)],
    pub entries: &'a [EntryView],
    pub rail_letters: &'a [String],

    pub tmt_btn_css_version: &'a str,
    pub tmt_badge_css_version: &'a str,
    pub tmt_icon_css_version: &'a str,
    pub tmt_swatch_css_version: &'a str,
    pub tmt_switch_css_version: &'a str,
}

impl<'a> IndexTemplate<'a> {
    pub fn t(&self, _key: &str, default: &'a str) -> &'a str {
        default
    }
}

/// Askama + SolidJS page renderer.
pub struct SolidPageRenderer {
    config: BookConfig,
    rail_letters: Vec<String>,
}

impl SolidPageRenderer {
    pub fn new(config: BookConfig) -> Self {
        let rail_title = config
            .ui
            .rail_title
            .as_deref()
            .unwrap_or(&config.book.title);
        let rail_letters: Vec<String> = rail_title.chars().map(|c| c.to_string()).collect();
        Self { config, rail_letters }
    }
}

impl PageRenderer for SolidPageRenderer {
    fn render_page(
        &self,
        doc: &ProcessedDoc,
        backlinks: &[Backlink],
        book_index: &[EntrySummary],
    ) -> Result<String> {
        let base_path = self.config.build.clean_base_path();

        let hero_chips: Vec<(String, String)> = doc
            .hero_chips
            .iter()
            .map(|chip| (chip.label.clone().unwrap_or_default(), chip.value.clone()))
            .collect();

        let toc_items: Vec<(String, String, f32)> = doc
            .toc
            .iter()
            .map(|item| {
                let indent = (item.level.saturating_sub(1) as f32) * 0.75;
                (item.id.clone(), item.text.clone(), indent)
            })
            .collect();

        let entries: Vec<EntryView> = book_index
            .iter()
            .map(|e| EntryView {
                url: e.url.clone(),
                title: e.title.clone(),
            })
            .collect();

        let bl_items: Vec<EntryView> = backlinks
            .iter()
            .map(|b| EntryView {
                url: b.url.clone(),
                title: b.title.clone(),
            })
            .collect();

        let template = PageTemplate {
            lang: &self.config.book.lang,
            book_title: &self.config.book.title,
            doc_title: &doc.title,
            current_title: &doc.title,
            content_html: &doc.body_html,
            base_path,
            css_version: &STELA_CSS_VERSION,
            island_css: ISLAND_CSS,
            island_js: ISLAND_JS,
            hero_chips: &hero_chips,
            toc_items: &toc_items,
            section_tabs: &doc.section_tabs,
            entries: &entries,
            backlinks: &bl_items,
            rail_letters: &self.rail_letters,

            tmt_btn_css_version: &TMT_BTN_CSS_VERSION,
            tmt_badge_css_version: &TMT_BADGE_CSS_VERSION,
            tmt_icon_css_version: &TMT_ICON_CSS_VERSION,
            tmt_swatch_css_version: &TMT_SWATCH_CSS_VERSION,
            tmt_switch_css_version: &TMT_SWITCH_CSS_VERSION,
        };

        template.render().map_err(Into::into)
    }

    fn render_index(
        &self,
        sections: &[SectionSummary],
        entries: &[EntrySummary],
    ) -> Result<String> {
        let base_path = self.config.build.clean_base_path();

        let sec_items: Vec<(String, usize)> =
            sections.iter().map(|s| (s.name.clone(), s.count)).collect();

        let ent_items: Vec<EntryView> = entries
            .iter()
            .map(|e| EntryView {
                url: e.url.clone(),
                title: e.title.clone(),
            })
            .collect();

        let template = IndexTemplate {
            lang: &self.config.book.lang,
            book_title: &self.config.book.title,
            current_title: "",
            base_path,
            css_version: &STELA_CSS_VERSION,
            island_css: ISLAND_CSS,
            island_js: ISLAND_JS,
            sections: &sec_items,
            entries: &ent_items,
            rail_letters: &self.rail_letters,

            tmt_btn_css_version: &TMT_BTN_CSS_VERSION,
            tmt_badge_css_version: &TMT_BADGE_CSS_VERSION,
            tmt_icon_css_version: &TMT_ICON_CSS_VERSION,
            tmt_swatch_css_version: &TMT_SWATCH_CSS_VERSION,
            tmt_switch_css_version: &TMT_SWITCH_CSS_VERSION,
        };

        template.render().map_err(Into::into)
    }

    fn static_assets(&self) -> &[StaticAsset] {
        &SOLID_STATIC_ASSETS
    }
}

/// Renderer factory for SolidJS shelf.
#[derive(Debug, Default, Clone, Copy)]
pub struct SolidRendererFactory;

impl RendererFactory for SolidRendererFactory {
    fn create(&self, config: &BookConfig, _is_dev: bool) -> Result<Box<dyn PageRenderer>> {
        Ok(Box::new(SolidPageRenderer::new(config.clone())))
    }
}

/// Islands-architecture SolidJS engine variant for stela-shelf.
#[derive(Debug, Default, Clone, Copy)]
pub struct SolidEngine;

#[async_trait]
impl ShelfEngine for SolidEngine {
    fn name(&self) -> &'static str {
        "solid"
    }

    fn description(&self) -> &'static str {
        "Islands-architecture SolidJS engine"
    }

    fn build(&self, ctx: &BuildContext) -> Result<BuildReport> {
        tomet_shelf_headless::book::build_book(
            ctx.src_dir,
            ctx.out_dir,
            ctx.config,
            &SolidRendererFactory,
            false,
        )
    }

    async fn serve(&self, ctx: &ServerContext) -> Result<()> {
        tomet_shelf_headless::run_dev_server(
            ctx.src_dir.to_path_buf(),
            ctx.out_dir.to_path_buf(),
            ctx.config.clone(),
            Arc::new(SolidRendererFactory),
            ctx.host,
            ctx.port,
        )
        .await
    }
}
