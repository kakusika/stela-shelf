use anyhow::Result;
use askama::Template;
use async_trait::async_trait;
use std::sync::Arc;

use stela_shelf_core::{BuildContext, BuildReport, ServerContext, ShelfEngine};
use tomet_shelf_document::ProcessedDoc;
use tomet_shelf_headless::assets::StaticAsset;
use tomet_shelf_headless::{
    Backlink, BookConfig, EntrySummary, PageRenderer, RendererFactory, SectionSummary,
};

/// Bundled CSS stylesheet for HTMX engine.
pub const SHELF_CSS: &str = include_str!("../assets/shelf.css");

/// Bundled HTMX JavaScript library.
pub const HTMX_JS: &str = include_str!("../assets/htmx.min.js");

pub const HTMX_STATIC_ASSETS: &[StaticAsset] = &[
    StaticAsset {
        path: "shelf.css",
        mime: "text/css; charset=utf-8",
        content: SHELF_CSS,
    },
    StaticAsset {
        path: "htmx.min.js",
        mime: "application/javascript; charset=utf-8",
        content: HTMX_JS,
    },
];

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
    pub shelf_css: &'a str,
    pub htmx_js: &'a str,
    pub hero_chips: &'a [(String, String)],
    pub toc_items: &'a [(String, String, f32)],
    pub entries: &'a [EntryView],
    pub backlinks: &'a [EntryView],
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
#[template(path = "fragments/search_results.html")]
pub struct SearchResultsTemplate<'a> {
    pub query: &'a str,
    pub results: &'a [EntryView],
}

#[derive(Template)]
#[template(path = "index.html")]
pub struct IndexTemplate<'a> {
    pub lang: &'a str,
    pub book_title: &'a str,
    pub current_title: &'a str,
    pub base_path: &'a str,
    pub shelf_css: &'a str,
    pub htmx_js: &'a str,
    pub sections: &'a [(String, usize)],
    pub entries: &'a [EntryView],
}

/// Askama + HTMX page renderer implementing `tomet_shelf_headless::PageRenderer`.
pub struct HtmxPageRenderer {
    config: BookConfig,
}

impl HtmxPageRenderer {
    pub fn new(config: BookConfig) -> Self {
        Self { config }
    }
}

impl PageRenderer for HtmxPageRenderer {
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
            shelf_css: SHELF_CSS,
            htmx_js: HTMX_JS,
            hero_chips: &hero_chips,
            toc_items: &toc_items,
            entries: &entries,
            backlinks: &bl_items,
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
            shelf_css: SHELF_CSS,
            htmx_js: HTMX_JS,
            sections: &sec_items,
            entries: &ent_items,
        };

        template.render().map_err(Into::into)
    }

    fn static_assets(&self) -> &[StaticAsset] {
        HTMX_STATIC_ASSETS
    }
}

/// Renderer factory for HTMX shelf.
#[derive(Debug, Default, Clone, Copy)]
pub struct HtmxRendererFactory;

impl RendererFactory for HtmxRendererFactory {
    fn create(&self, config: &BookConfig, _is_dev: bool) -> Result<Box<dyn PageRenderer>> {
        Ok(Box::new(HtmxPageRenderer::new(config.clone())))
    }
}

/// HTML-First HTMX engine variant for stela-shelf.
#[derive(Debug, Default, Clone, Copy)]
pub struct HtmxEngine;

#[async_trait]
impl ShelfEngine for HtmxEngine {
    fn name(&self) -> &'static str {
        "htmx"
    }

    fn description(&self) -> &'static str {
        "HTML-First Askama & HTMX server-driven engine"
    }

    fn build(&self, ctx: &BuildContext) -> Result<BuildReport> {
        tomet_shelf_headless::book::build_book(
            ctx.src_dir,
            ctx.out_dir,
            ctx.config,
            &HtmxRendererFactory,
            false,
        )
    }

    async fn serve(&self, ctx: &ServerContext) -> Result<()> {
        tomet_shelf_headless::run_dev_server(
            ctx.src_dir.to_path_buf(),
            ctx.out_dir.to_path_buf(),
            ctx.config.clone(),
            Arc::new(HtmxRendererFactory),
            ctx.host,
            ctx.port,
        )
        .await
    }
}
