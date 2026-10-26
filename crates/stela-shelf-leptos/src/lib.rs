use anyhow::Result;
use async_trait::async_trait;
use leptos::prelude::*;
use std::sync::{Arc, LazyLock};

pub mod components;
pub mod styles;

use components::{CatalogView, DocumentView, HtmlDocument};


use stela_shelf_assets::stela_static_assets;
use stela_shelf_core::{BuildContext, BuildReport, ServerContext, ShelfEngine};
use tomet_shelf_document::ProcessedDoc;
use tomet_shelf_headless::assets::StaticAsset;
use tomet_shelf_headless::{
    Backlink, BookConfig, EntrySummary, PageRenderer, RendererFactory, SectionSummary,
};

pub static LEPTOS_STATIC_ASSETS: LazyLock<Vec<StaticAsset>> = LazyLock::new(stela_static_assets);


/// Leptos-based page renderer implementing `tomet_shelf_headless::PageRenderer`.
pub struct LeptosPageRenderer {
    config: BookConfig,
    rail_letters: Vec<String>,
}

impl LeptosPageRenderer {
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

        let section_tabs = doc.section_tabs.clone();
        let rail_letters = self.rail_letters.clone();

        let html = view! {
            <HtmlDocument title=title lang=lang base_path=base_path>
                <DocumentView
                    book_title=book_title
                    doc_title=doc_title
                    content_html=content_html
                    hero_chips=hero_chips
                    toc_items=toc_items
                    section_tabs=section_tabs
                    entries=entries
                    backlinks=bl_items
                    base_path=url_prefix
                    rail_letters=rail_letters
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

        let rail_letters = self.rail_letters.clone();

        let html = view! {
            <HtmlDocument title=title lang=lang base_path=base_path>
                <CatalogView
                    book_title=book_title
                    sections=sec_items
                    entries=ent_items
                    base_path=url_prefix
                    rail_letters=rail_letters
                />
            </HtmlDocument>
        }
        .to_html();

        Ok(html)
    }

    fn static_assets(&self) -> &[StaticAsset] {
        &LEPTOS_STATIC_ASSETS
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

/// Fully reactive Full-Rust Leptos engine variant for stela-shelf.
#[derive(Debug, Default, Clone, Copy)]
pub struct LeptosEngine;

#[async_trait]
impl ShelfEngine for LeptosEngine {
    fn name(&self) -> &'static str {
        "leptos"
    }

    fn description(&self) -> &'static str {
        "Fully reactive Full-Rust Leptos engine"
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
