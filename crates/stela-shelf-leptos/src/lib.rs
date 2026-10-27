#![recursion_limit = "512"]

use anyhow::Result;
use async_trait::async_trait;
use leptos::prelude::*;
use std::collections::HashMap;
use std::sync::{Arc, LazyLock};

pub mod components;

use components::{CatalogEntry, CatalogView, DocumentView, HtmlDocument};

use stela_shelf_assets::stela_static_assets;
use stela_shelf_core::{BuildContext, BuildReport, ServerContext, ShelfEngine};
use tomet_shelf_document::{DocIcon, ProcessedDoc};
use tomet_shelf_headless::assets::StaticAsset;
use tomet_shelf_headless::{
    Backlink, BookConfig, EntrySummary, PageRenderer, RendererFactory, SectionSummary,
};
use tomet_shelf_icons::{IconRenderer, StandardIconRenderer};

pub static LEPTOS_STATIC_ASSETS: LazyLock<Vec<StaticAsset>> = LazyLock::new(stela_static_assets);

fn flatten_entries(items: &[EntrySummary], depth: usize, out: &mut Vec<CatalogEntry>) {
    for e in items {
        out.push(CatalogEntry {
            url: e.url.clone(),
            title: e.title.clone(),
            depth,
        });
        if !e.children.is_empty() {
            flatten_entries(&e.children, depth + 1, out);
        }
    }
}

/// Leptos-based page renderer implementing `tomet_shelf_headless::PageRenderer`.
pub struct LeptosPageRenderer {
    config: BookConfig,
    base_path: String,
    full_url_prefix: String,
    home_url: String,
    rail_letters: Vec<String>,
    link_icons: HashMap<String, String>,
}

impl LeptosPageRenderer {
    pub fn new(config: BookConfig) -> Self {
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
            format!("{}/", full_url_prefix.trim_end_matches('/'))
        };

        Self {
            config,
            base_path,
            full_url_prefix,
            home_url,
            rail_letters,
            link_icons: HashMap::new(),
        }
    }
}

impl PageRenderer for LeptosPageRenderer {
    fn render_page(
        &self,
        doc: &ProcessedDoc,
        backlinks: &[Backlink],
        book_index: &[EntrySummary],
    ) -> Result<String> {
        let title = format!("{} | {}", doc.title, self.config.book.title);
        let book_title = self.config.book.title.clone();
        let doc_title = doc.title.clone();
        let lang = self.config.book.lang.clone();
        let base_path = self.base_path.clone();
        let home_url = self.home_url.clone();
        let page_url = format!("{}/{}", self.full_url_prefix, doc.slug);

        let icon_renderer = StandardIconRenderer::new();
        let icon_html = doc.icon.as_ref().map(|ic| {
            tomet_shelf_render::render_page_icon(ic, &self.base_path, Some(&icon_renderer))
        });

        let body_html = tomet_shelf_render::enhance_body_html(
            &doc.body_html,
            &self.config,
            &self.base_path,
            Some(&icon_renderer),
        );
        let content_html = if self.config.ui.links.note_icons && !self.link_icons.is_empty() {
            tomet_shelf_render::enhance_internal_links(
                &body_html,
                &self.link_icons,
                &self.full_url_prefix,
            )
        } else {
            body_html
        };

        let hero_chips: Vec<(String, String)> = doc
            .hero_chips
            .iter()
            .map(|chip| (chip.label.clone().unwrap_or_default(), chip.value.clone()))
            .collect();

        let mut entries = Vec::new();
        flatten_entries(book_index, 0, &mut entries);

        let bl_items: Vec<(String, String)> = backlinks
            .iter()
            .map(|b| (b.url.clone(), b.title.clone()))
            .collect();

        let section_tabs = doc.section_tabs.clone();
        let rail_letters = self.rail_letters.clone();

        let html = view! {
            <HtmlDocument title=title lang=lang base_path=base_path.clone()>
                <DocumentView
                    book_title=book_title
                    doc_title=doc_title
                    icon_html=icon_html
                    content_html=content_html
                    hero_chips=hero_chips
                    section_tabs=section_tabs
                    entries=entries
                    backlinks=bl_items
                    base_path=base_path
                    home_url=home_url
                    page_url=page_url
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
        let base_path = self.base_path.clone();
        let home_url = self.home_url.clone();

        let sec_items: Vec<(String, usize)> =
            sections.iter().map(|s| (s.name.clone(), s.count)).collect();

        let mut ent_items = Vec::new();
        flatten_entries(entries, 0, &mut ent_items);

        let rail_letters = self.rail_letters.clone();

        let html = view! {
            <HtmlDocument title=title lang=lang base_path=base_path>
                <CatalogView
                    book_title=book_title
                    sections=sec_items
                    entries=ent_items
                    home_url=home_url
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

/// Renderer factory for Leptos shelf.
#[derive(Debug, Default, Clone, Copy)]
pub struct LeptosRendererFactory;

impl RendererFactory for LeptosRendererFactory {
    fn create(&self, config: &BookConfig, _is_dev: bool) -> Result<Box<dyn PageRenderer>> {
        Ok(Box::new(LeptosPageRenderer::new(config.clone())))
    }

    fn icon_renderer(&self) -> Option<Arc<dyn IconRenderer>> {
        Some(Arc::new(StandardIconRenderer::new()))
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
