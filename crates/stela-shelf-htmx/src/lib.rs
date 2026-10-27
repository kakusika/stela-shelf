use anyhow::Result;
use askama::Template;
use async_trait::async_trait;
use std::collections::HashMap;
use std::sync::{Arc, LazyLock};

use stela_shelf_assets::{
    STELA_CSS_VERSION, STELA_SHELL_JS_VERSION, TMT_BTN_CSS_VERSION, stela_static_assets,
};
use stela_shelf_core::{BuildContext, BuildReport, ServerContext, ShelfEngine};
use tomet_shelf_document::{DocIcon, ProcessedDoc, SectionTab};
use tomet_shelf_headless::assets::{StaticAsset, content_version};
use tomet_shelf_headless::{
    Backlink, BookConfig, EntrySummary, PageRenderer, RendererFactory, SectionSummary,
};
use tomet_shelf_icons::{IconRenderer, StandardIconRenderer};

/// Bundled HTMX JavaScript library.
pub const HTMX_JS: &str = include_str!("../assets/htmx.min.js");

pub static HTMX_JS_VERSION: LazyLock<String> = LazyLock::new(|| content_version(HTMX_JS));

pub static HTMX_STATIC_ASSETS: LazyLock<Vec<StaticAsset>> = LazyLock::new(|| {
    let mut assets = stela_static_assets();
    assets.push(StaticAsset {
        path: "htmx.min.js",
        mime: "application/javascript; charset=utf-8",
        content: HTMX_JS,
    });
    assets
});

#[derive(Clone, Debug)]
pub struct EntryView {
    pub url: String,
    pub title: String,
    pub depth: usize,
}

fn flatten_entries(items: &[EntrySummary], depth: usize, out: &mut Vec<EntryView>) {
    for e in items {
        out.push(EntryView {
            url: e.url.clone(),
            title: e.title.clone(),
            depth,
        });
        if !e.children.is_empty() {
            flatten_entries(&e.children, depth + 1, out);
        }
    }
}

#[derive(Template)]
#[template(path = "page.html")]
pub struct PageTemplate<'a> {
    pub lang: &'a str,
    pub book_title: &'a str,
    pub doc_title: &'a str,
    pub icon: Option<&'a str>,
    pub content_html: &'a str,
    pub base_path: &'a str,
    pub home_url: &'a str,
    pub page_url: &'a str,
    pub css_version: &'a str,
    pub stela_shell_js_version: &'a str,
    pub htmx_js_version: &'a str,
    pub tmt_btn_css_version: &'a str,
    pub hero_chips: &'a [(String, String)],
    pub section_tabs: &'a [SectionTab],
    pub entries: &'a [EntryView],
    pub backlinks: &'a [EntryView],
    pub rail_letters: &'a [String],
    pub strings: &'a HashMap<String, String>,
}

impl<'a> PageTemplate<'a> {
    pub fn t(&self, key: &str, default: &'a str) -> &'a str {
        self.strings.get(key).map(|s| s.as_str()).unwrap_or(default)
    }
}

#[derive(Template)]
#[template(path = "index.html")]
pub struct IndexTemplate<'a> {
    pub lang: &'a str,
    pub book_title: &'a str,
    pub base_path: &'a str,
    pub home_url: &'a str,
    pub css_version: &'a str,
    pub stela_shell_js_version: &'a str,
    pub htmx_js_version: &'a str,
    pub sections: &'a [(String, usize)],
    pub entries: &'a [EntryView],
    pub rail_letters: &'a [String],
}

/// Askama + HTMX page renderer implementing `tomet_shelf_headless::PageRenderer`.
pub struct HtmxPageRenderer {
    config: BookConfig,
    base_path: String,
    full_url_prefix: String,
    home_url: String,
    rail_letters: Vec<String>,
    link_icons: HashMap<String, String>,
}

impl HtmxPageRenderer {
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

impl PageRenderer for HtmxPageRenderer {
    fn render_page(
        &self,
        doc: &ProcessedDoc,
        backlinks: &[Backlink],
        book_index: &[EntrySummary],
    ) -> Result<String> {
        let page_url = format!("{}/{}", self.full_url_prefix, doc.slug);

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

        let hero_chips: Vec<(String, String)> = doc
            .hero_chips
            .iter()
            .map(|chip| (chip.label.clone().unwrap_or_default(), chip.value.clone()))
            .collect();

        let mut entries = Vec::new();
        flatten_entries(book_index, 0, &mut entries);

        let bl_items: Vec<EntryView> = backlinks
            .iter()
            .map(|b| EntryView {
                url: b.url.clone(),
                title: b.title.clone(),
                depth: 0,
            })
            .collect();

        let template = PageTemplate {
            lang: &self.config.book.lang,
            book_title: &self.config.book.title,
            doc_title: &doc.title,
            icon: rendered_icon.as_deref(),
            content_html: &body_html,
            base_path: &self.base_path,
            home_url: &self.home_url,
            page_url: &page_url,
            css_version: &STELA_CSS_VERSION,
            stela_shell_js_version: &STELA_SHELL_JS_VERSION,
            htmx_js_version: &HTMX_JS_VERSION,
            tmt_btn_css_version: &TMT_BTN_CSS_VERSION,
            hero_chips: &hero_chips,
            section_tabs: &doc.section_tabs,
            entries: &entries,
            backlinks: &bl_items,
            rail_letters: &self.rail_letters,
            strings: &self.config.ui.strings,
        };

        template.render().map_err(Into::into)
    }

    fn render_index(
        &self,
        sections: &[SectionSummary],
        entries: &[EntrySummary],
    ) -> Result<String> {
        let sec_items: Vec<(String, usize)> =
            sections.iter().map(|s| (s.name.clone(), s.count)).collect();

        let mut ent_items = Vec::new();
        flatten_entries(entries, 0, &mut ent_items);

        let template = IndexTemplate {
            lang: &self.config.book.lang,
            book_title: &self.config.book.title,
            base_path: &self.base_path,
            home_url: &self.home_url,
            css_version: &STELA_CSS_VERSION,
            stela_shell_js_version: &STELA_SHELL_JS_VERSION,
            htmx_js_version: &HTMX_JS_VERSION,
            sections: &sec_items,
            entries: &ent_items,
            rail_letters: &self.rail_letters,
        };

        template.render().map_err(Into::into)
    }

    fn static_assets(&self) -> &[StaticAsset] {
        &HTMX_STATIC_ASSETS
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

/// Renderer factory for HTMX shelf.
#[derive(Debug, Default, Clone, Copy)]
pub struct HtmxRendererFactory;

impl RendererFactory for HtmxRendererFactory {
    fn create(&self, config: &BookConfig, _is_dev: bool) -> Result<Box<dyn PageRenderer>> {
        Ok(Box::new(HtmxPageRenderer::new(config.clone())))
    }

    fn icon_renderer(&self) -> Option<Arc<dyn IconRenderer>> {
        Some(Arc::new(StandardIconRenderer::new()))
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
