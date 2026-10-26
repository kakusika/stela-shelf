use anyhow::Result;
use async_trait::async_trait;
use leptos::prelude::*;
use std::sync::Arc;

pub mod components;
pub mod styles;

use components::{CatalogView, DocumentView, HtmlDocument};
use styles::LEPTOS_SHELF_CSS;

use stela_shelf_core::{BuildContext, BuildReport, ServerContext, ShelfEngine};
use tomet_shelf_headless::BookConfig;
use tomet_shelf_headless::assets::StaticAsset;
use tomet_shelf_headless::render::{
    Backlink, EntrySummary, PageRenderer, ProcessedDoc, RendererFactory, SectionSummary,
};

/// Static CSS asset for Leptos shelf.
pub const LEPTOS_SHELF_ASSET: StaticAsset = StaticAsset {
    path: "shelf.css",
    mime: "text/css; charset=utf-8",
    content: LEPTOS_SHELF_CSS,
};

/// Leptos-based page renderer implementing `tomet_shelf_headless::PageRenderer`.
pub struct LeptosPageRenderer {
    config: BookConfig,
}

impl LeptosPageRenderer {
    pub fn new(config: BookConfig) -> Self {
        Self { config }
    }
}

impl PageRenderer for LeptosPageRenderer {
    fn render_page(
        &self,
        doc: &ProcessedDoc,
        backlinks: &[Backlink],
        book_index: &[EntrySummary],
    ) -> Result<String> {
        let title = format!("{} — {}", doc.title, self.config.book.title);
        let book_title = self.config.book.title.clone();
        let doc_title = doc.title.clone();
        let content_html = doc.body_html.clone();
        let lang = self.config.book.lang.clone();
        let base_path = self.config.build.clean_base_path().to_string();
        let url_prefix = self.config.build.full_url_prefix();

        let hero_chips: Vec<(String, String)> = doc
            .hero_chips
            .iter()
            .map(|chip| (chip.label.clone().unwrap_or_default(), chip.value.clone()))
            .collect();

        let toc_items: Vec<(String, String, u32)> = doc
            .toc
            .iter()
            .map(|item| (item.id.clone(), item.text.clone(), item.level))
            .collect();

        let entries: Vec<(String, String)> = book_index
            .iter()
            .map(|e| (e.url.clone(), e.title.clone()))
            .collect();

        let bl_items: Vec<(String, String)> = backlinks
            .iter()
            .map(|b| (b.url.clone(), b.title.clone()))
            .collect();

        let html = view! {
            <HtmlDocument title=title lang=lang base_path=base_path>
                <DocumentView
                    book_title=book_title
                    doc_title=doc_title
                    content_html=content_html
                    hero_chips=hero_chips
                    toc_items=toc_items
                    entries=entries
                    backlinks=bl_items
                    base_path=url_prefix
                />
            </HtmlDocument>
        }
        .to_html();

        Ok(html)
    }

    fn render_index(
        &self,
        sections: &[SectionSummary],
        entries: &[EntrySummary],
    ) -> Result<String> {
        let title = self.config.book.title.clone();
        let book_title = self.config.book.title.clone();
        let lang = self.config.book.lang.clone();
        let base_path = self.config.build.clean_base_path().to_string();
        let url_prefix = self.config.build.full_url_prefix();

        let sec_items: Vec<(String, usize)> =
            sections.iter().map(|s| (s.name.clone(), s.count)).collect();

        let ent_items: Vec<(String, String)> = entries
            .iter()
            .map(|e| (e.url.clone(), e.title.clone()))
            .collect();

        let html = view! {
            <HtmlDocument title=title lang=lang base_path=base_path>
                <CatalogView
                    book_title=book_title
                    sections=sec_items
                    entries=ent_items
                    base_path=url_prefix
                />
            </HtmlDocument>
        }
        .to_html();

        Ok(html)
    }

    fn static_assets(&self) -> &[StaticAsset] {
        std::slice::from_ref(&LEPTOS_SHELF_ASSET)
    }
}

/// Renderer factory for Leptos shelf.
#[derive(Debug, Default, Clone, Copy)]
pub struct LeptosRendererFactory;

impl RendererFactory for LeptosRendererFactory {
    fn create(&self, config: &BookConfig, _is_dev: bool) -> Result<Box<dyn PageRenderer>> {
        Ok(Box::new(LeptosPageRenderer::new(config.clone())))
    }
}

/// Full-Rust Leptos engine variant for stela-shelf.
#[derive(Debug, Default, Clone, Copy)]
pub struct LeptosEngine;

#[async_trait]
impl ShelfEngine for LeptosEngine {
    fn name(&self) -> &'static str {
        "leptos"
    }

    fn description(&self) -> &'static str {
        "Full-Rust Leptos SSR & static site engine"
    }

    fn build(&self, ctx: &BuildContext) -> Result<BuildReport> {
        tomet_shelf_headless::book::build_book(
            ctx.src_dir,
            ctx.out_dir,
            ctx.config,
            &LeptosRendererFactory,
            false,
        )
    }

    async fn serve(&self, ctx: &ServerContext) -> Result<()> {
        tomet_shelf_headless::run_dev_server(
            ctx.src_dir.to_path_buf(),
            ctx.out_dir.to_path_buf(),
            ctx.config.clone(),
            Arc::new(LeptosRendererFactory),
            ctx.host,
            ctx.port,
        )
        .await
    }
}
