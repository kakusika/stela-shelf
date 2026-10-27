use leptos::prelude::*;
use stela_shelf_assets::TMT_BTN_CSS_VERSION;
use tomet_shelf_document::SectionTab;

#[derive(Clone, Debug)]
pub struct CatalogEntry {
    pub url: String,
    pub title: String,
    pub depth: usize,
}

fn render_sticky_edge_btn(
    direction: &'static str,
    id_attr: &'static str,
    base_path: &str,
) -> impl IntoView + use<> {
    let prefix = base_path.trim_end_matches('/');
    let cls = format!("sticky-edge-btn sticky-edge-{direction}");
    let label = if direction == "top" {
        "最上部へ"
    } else {
        "最下部へ"
    };
    let path_svg = if direction == "top" {
        r#"<path d="M5 5h14"></path><path d="M12 20V10"></path><path d="m7 14 5-5 5 5"></path>"#
    } else {
        r#"<path d="M12 4v10"></path><path d="m7 10 5 5 5-5"></path><path d="M5 19h14"></path>"#
    };
    let inner = format!(
        r#"<template shadowrootmode="open"><link rel="stylesheet" href="{prefix}/components/tmt-btn.css?v={btn_ver}"><button type="button" class="tmt-btn-inner" part="button"><slot></slot></button></template><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{path_svg}</svg>"#,
        btn_ver = *TMT_BTN_CSS_VERSION,
    );

    view! {
        <tmt-btn
            variant="outline"
            shape="square"
            size="sm"
            class=cls
            id=id_attr
            data-direction=direction
            title=label
            aria-label=label
            data-pagefind-ignore=""
            inner_html=inner
        />
    }
}

fn render_sticky_tabs(tabs: Vec<SectionTab>) -> impl IntoView {
    view! {
        <div class="sticky-tabs-list">
            {tabs.into_iter().map(|h1| {
                let h1_id = h1.id.clone();
                let h1_title = format!("[H{}] {}", h1.level, h1.text);
                let h1_cls = format!("sticky-tab-node level-{}", h1.level);
                let btn_cls = format!("sticky-tab-btn level-{}", h1.level);
                let has_children = !h1.children.is_empty();
                let children = h1.children;
                let peek_levels = h1.peek_levels;
                let slot_cls = if peek_levels.len() > 1 {
                    "sticky-children-slot level-2-slot has-layered-peek"
                } else {
                    "sticky-children-slot level-2-slot"
                };

                view! {
                    <div class=h1_cls data-id=h1_id.clone() data-level=h1.level>
                        <button type="button" class=btn_cls data-target=h1_id.clone() title=h1_title>
                            <span class="sticky-tab-label">
                                <span class="sticky-tab-text">{h1.text}</span>
                            </span>
                        </button>
                        {if has_children {
                            view! {
                                <div class=slot_cls data-parent-id=h1_id.clone()>
                                    {peek_levels.into_iter().map(|lvl| {
                                        let peek_cls = format!("sticky-children-peek level-{lvl}");
                                        view! { <span class=peek_cls aria-hidden="true"></span> }
                                    }).collect_view()}
                                    {children.into_iter().map(|h2| {
                                        let h2_id = h2.id.clone();
                                        let h2_title = format!("[H{}] {}", h2.level, h2.text);
                                        let h2_cls = format!("sticky-tab-node level-{}", h2.level);
                                        let h2_btn_cls = format!("sticky-tab-btn level-{}", h2.level);
                                        let h2_has_children = !h2.children.is_empty();
                                        let h2_children = h2.children;
                                        let h2_peek_levels = h2.peek_levels;
                                        let h2_slot_cls = if h2_peek_levels.len() > 1 {
                                            "sticky-children-slot level-3-slot has-layered-peek"
                                        } else {
                                            "sticky-children-slot level-3-slot"
                                        };
                                        view! {
                                            <div class=h2_cls data-id=h2_id.clone() data-level=h2.level>
                                                <button type="button" class=h2_btn_cls data-target=h2_id.clone() title=h2_title>
                                                    <span class="sticky-tab-label">
                                                        <span class="sticky-tab-text">{h2.text}</span>
                                                    </span>
                                                </button>
                                                {if h2_has_children {
                                                    view! {
                                                        <div class=h2_slot_cls data-parent-id=h2_id.clone()>
                                                            {h2_peek_levels.into_iter().map(|lvl| {
                                                                let peek_cls = format!("sticky-children-peek level-{lvl}");
                                                                view! { <span class=peek_cls aria-hidden="true"></span> }
                                                            }).collect_view()}
                                                            {h2_children.into_iter().map(|h3| {
                                                                let h3_id = h3.id.clone();
                                                                let h3_title = format!("[H{}] {}", h3.level, h3.text);
                                                                let h3_cls = format!("sticky-tab-node level-{}", h3.level);
                                                                let h3_btn_cls = format!("sticky-tab-btn level-{}", h3.level);
                                                                view! {
                                                                    <div class=h3_cls data-id=h3_id.clone() data-level=h3.level>
                                                                        <button type="button" class=h3_btn_cls data-target=h3_id.clone() title=h3_title>
                                                                            <span class="sticky-tab-label">
                                                                                <span class="sticky-tab-text">{h3.text}</span>
                                                                            </span>
                                                                        </button>
                                                                    </div>
                                                                }
                                                            }).collect_view()}
                                                        </div>
                                                    }.into_any()
                                                } else {
                                                    ().into_any()
                                                }}
                                            </div>
                                        }
                                    }).collect_view()}
                                </div>
                            }.into_any()
                        } else {
                            ().into_any()
                        }}
                    </div>
                }
            }).collect_view()}
        </div>
    }
}

pub(crate) fn render_rail(
    home_url: String,
    book_title: String,
    rail_letters: Vec<String>,
) -> impl IntoView {
    let sun_svg = r#"<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path>"#;
    let moon_svg = r#"<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>"#;

    view! {
        <nav class="book-rail-nav w-[38px] min-w-[38px] max-w-[38px] h-full flex flex-col items-center shrink-0 box-border p-0 z-50 select-none" id="book-rail-nav" aria-label="ナビゲーション">
            <div class="rail-brand w-full flex flex-col items-center border-b border-shell-border box-border">
                <a href=home_url class="rail-tab rail-tab-title flex flex-col items-center justify-center w-full py-3.5 bg-transparent border-0 box-border text-shell-text font-bold no-underline! cursor-pointer" title=book_title>
                    <span class="rail-letters rail-letters-brand flex flex-col items-center text-[0.72rem] leading-[1.15] tracking-[0.08em] font-bold lowercase">
                        {rail_letters.into_iter().map(|ch| view! { <span>{ch}</span> }).collect_view()}
                    </span>
                </a>
            </div>
            <div class="rail-tools w-full flex flex-col items-center box-border">
                <button type="button" id="btn-rail-menu" class="rail-tab rail-tab-nav is-active flex flex-col items-center justify-center w-full py-3 bg-transparent border-0 text-shell-text hover:bg-shell-border cursor-pointer" title="目次" aria-label="目次">
                    <span class="rail-letters flex flex-col items-center text-[0.72rem] leading-[1.15] tracking-[0.08em]">
                        <span>"目"</span><span>"次"</span>
                    </span>
                </button>
            </div>
            <div class="rail-footer mt-auto w-full flex flex-col items-center border-t border-shell-border box-border">
                <button type="button" class="rail-tab rail-tab-theme theme-toggle-btn grid place-items-center w-full py-3 bg-transparent border-0 text-shell-text hover:bg-shell-border cursor-pointer" title="テーマ切替" aria-label="テーマ切替">
                    <svg class="icon-theme icon-sun" viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" inner_html=sun_svg />
                    <svg class="icon-theme icon-moon" viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" inner_html=moon_svg />
                </button>
            </div>
        </nav>
    }
}

#[component]
pub fn DocumentView(
    book_title: String,
    doc_title: String,
    icon_html: Option<String>,
    content_html: String,
    hero_chips: Vec<(String, String)>,
    section_tabs: Vec<SectionTab>,
    entries: Vec<CatalogEntry>,
    backlinks: Vec<(String, String)>,
    base_path: String,
    home_url: String,
    page_url: String,
    rail_letters: Vec<String>,
) -> impl IntoView {
    let has_tabs = !section_tabs.is_empty();

    view! {
        <div class="book-shell flex flex-row h-screen w-screen overflow-hidden bg-surface-subtle">
            {render_rail(home_url, book_title, rail_letters)}

            <div class="book-view flex-1 min-w-0 flex flex-row h-full overflow-x-auto overflow-y-hidden bg-surface-subtle" id="wiki-book-view">
                <div class="pane-backdrop" id="pane-nav-backdrop" aria-hidden="true"></div>

                // Navigation Pane
                <aside class="book-pane pane-nav" id="pane-nav">
                    <div class="pane-header pane-header-collapsible" id="header-collapse-nav" title="折りたたむ" role="button" tabindex="0">
                        <span class="pane-title text-[0.75rem] font-bold tracking-wider uppercase text-text-muted">"Document Catalog"</span>
                        <div class="flex items-center gap-2">
                            <span class="text-[0.65rem] font-semibold px-1.5 py-0.5 rounded bg-surface border border-border text-text-muted">"Leptos"</span>
                            <span class="pane-collapse-arrow">"◀"</span>
                        </div>
                    </div>
                    <div class="pane-scroll flex-1 overflow-y-auto p-3">
                        <ul class="flex flex-col gap-1 list-none p-0 m-0">
                            {entries.into_iter().map(|entry| {
                                let is_active = entry.url == page_url;
                                let cls = if is_active {
                                    "flex items-center px-2.5 py-1.5 text-sm rounded no-underline! text-text hover:bg-surface-subtle transition-colors font-bold text-link bg-surface"
                                } else {
                                    "flex items-center px-2.5 py-1.5 text-sm rounded no-underline! text-text hover:bg-surface-subtle transition-colors"
                                };
                                let indent_style = (entry.depth > 0)
                                    .then(|| format!("margin-left: {}px", entry.depth * 12));
                                let aria_current = is_active.then_some("page");

                                view! {
                                    <li style=indent_style>
                                        <a href=entry.url aria-current=aria_current class=cls>{entry.title}</a>
                                    </li>
                                }
                            }).collect_view()}
                        </ul>
                    </div>
                </aside>

                // Content Pane with Sticky Tabs
                <main class="book-pane pane-content flex-1 flex flex-col h-full bg-bg overflow-hidden" id="pane-content">
                    <header class="pane-header pane-content-header" id="pane-content-header">
                        {if has_tabs {
                            let bp_top = base_path.clone();
                            let bp_bottom = base_path.clone();
                            view! {
                                {render_sticky_edge_btn("top", "btn-sticky-top", &bp_top)}
                                <nav class="sticky-tabs-bar" id="sticky-tabs-bar" aria-label="目次タブ">
                                    {render_sticky_tabs(section_tabs)}
                                </nav>
                                {render_sticky_edge_btn("bottom", "btn-sticky-bottom", &bp_bottom)}
                            }.into_any()
                        } else {
                            ().into_any()
                        }}
                    </header>

                    <div class="pane-scroll pane-scroll-content flex-1 overflow-y-auto px-8 py-6" id="pane-article-scroll">
                        <article class="max-w-4xl mx-auto">
                            <h1 class="flex items-center gap-2.5 text-3xl font-extrabold mt-0 mb-4 pb-2 border-b border-border-subtle">
                                {if let Some(ic) = icon_html {
                                    view! { <span class="inline-flex items-center shrink-0" inner_html=ic /> }.into_any()
                                } else {
                                    ().into_any()
                                }}
                                <span>{doc_title}</span>
                            </h1>

                            {if !hero_chips.is_empty() {
                                view! {
                                    <div class="flex flex-wrap gap-2 mb-6">
                                        {hero_chips.into_iter().map(|(label, val)| {
                                            view! {
                                                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-surface-subtle border border-border text-text-muted">
                                                    {if !label.is_empty() {
                                                        view! { <span class="font-semibold">{label}":"</span> }.into_any()
                                                    } else {
                                                        ().into_any()
                                                    }}
                                                    <span>{val}</span>
                                                </span>
                                            }
                                        }).collect_view()}
                                    </div>
                                }.into_any()
                            } else {
                                ().into_any()
                            }}

                            <div class="content-body leading-relaxed text-text" inner_html=content_html />

                            {if !backlinks.is_empty() {
                                view! {
                                    <section class="mt-12 pt-6 border-t border-border-subtle">
                                        <h2 class="text-lg font-bold mb-3 text-text-muted border-0 p-0">"Backlinks"</h2>
                                        <ul class="flex flex-col gap-1 list-none p-0 m-0">
                                            {backlinks.into_iter().map(|(url, title)| {
                                                view! {
                                                    <li>
                                                        <a href=url class="text-sm text-link hover:underline">{title}</a>
                                                    </li>
                                                }
                                            }).collect_view()}
                                        </ul>
                                    </section>
                                }.into_any()
                            } else {
                                ().into_any()
                            }}
                        </article>
                    </div>
                </main>
            </div>
        </div>
    }
}
