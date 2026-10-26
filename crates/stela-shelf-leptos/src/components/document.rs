use leptos::prelude::*;
use tomet_shelf_document::SectionTab;

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

                view! {
                    <div class=h1_cls data-id=h1_id.clone() data-level=h1.level>
                        <button type="button" class=btn_cls data-target=h1_id.clone() title=h1_title>
                            <span class="sticky-tab-label">
                                <span class="sticky-tab-text">{h1.text}</span>
                            </span>
                        </button>
                        {if has_children {
                            view! {
                                <div class="sticky-children-slot level-2-slot" data-parent-id=h1_id.clone()>
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
                                        view! {
                                            <div class=h2_cls data-id=h2_id.clone() data-level=h2.level>
                                                <button type="button" class=h2_btn_cls data-target=h2_id.clone() title=h2_title>
                                                    <span class="sticky-tab-label">
                                                        <span class="sticky-tab-text">{h2.text}</span>
                                                    </span>
                                                </button>
                                                {if h2_has_children {
                                                    view! {
                                                        <div class="sticky-children-slot level-3-slot" data-parent-id=h2_id.clone()>
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

#[component]
pub fn DocumentView(
    book_title: String,
    doc_title: String,
    content_html: String,
    hero_chips: Vec<(String, String)>,
    toc_items: Vec<(String, String, u32)>,
    section_tabs: Vec<SectionTab>,
    entries: Vec<(String, String)>,
    backlinks: Vec<(String, String)>,
    base_path: String,
    rail_letters: Vec<String>,
) -> impl IntoView {
    let _ = toc_items;
    let home_url = if base_path.is_empty() || base_path == "/" {
        "/".to_string()
    } else {
        format!("{}/", base_path.trim_end_matches('/'))
    };

    view! {
        <div class="book-shell flex flex-row h-screen w-screen overflow-hidden bg-surface-subtle">
            // Permanent Left Rail
            <nav class="book-rail-nav w-[38px] min-w-[38px] max-w-[38px] h-screen flex flex-col items-center shrink-0 box-border p-0 z-50 select-none" id="book-rail-nav" aria-label="ナビゲーション">
                <div class="rail-brand w-full flex flex-col items-center border-b border-shell-border box-border">
                    <a href=home_url.clone() class="rail-tab rail-tab-title flex flex-col items-center justify-center w-full py-3.5 bg-transparent border-0 box-border text-shell-text font-bold no-underline! cursor-pointer" title=book_title.clone()>
                        <span class="rail-letters rail-letters-brand flex flex-col items-center text-[0.72rem] leading-[1.15] tracking-[0.08em] font-bold lowercase">
                            {rail_letters.into_iter().map(|ch| view! { <span>{ch}</span> }).collect_view()}
                        </span>
                    </a>
                </div>
                <div class="rail-tools w-full flex flex-col items-center box-border">
                    <a href=home_url class="rail-tab rail-tab-nav is-active flex flex-col items-center py-2.5 text-shell-text no-underline!" title="目次">
                        <span class="rail-letters flex flex-col items-center text-[0.72rem] leading-[1.15] tracking-[0.08em]">
                            <span>"目"</span><span>"次"</span>
                        </span>
                    </a>
                </div>
            </nav>

            // Navigation Pane
            <aside class="book-pane pane-nav" id="pane-nav">
                <div class="pane-header">
                    <span class="pane-title text-[0.75rem] font-bold tracking-wider uppercase text-text-muted">"Document Catalog"</span>
                    <span class="text-[0.65rem] font-semibold px-1.5 py-0.5 rounded bg-surface border border-border text-text-muted">"Leptos"</span>
                </div>
                <div class="pane-scroll flex-1 overflow-y-auto p-3">
                    <ul class="flex flex-col gap-1 list-none p-0 m-0">
                        {entries.into_iter().map(|(url, title)| {
                            let is_active = title == doc_title;
                            let cls = if is_active {
                                "flex items-center px-2.5 py-1.5 text-sm rounded no-underline text-text hover:bg-surface-subtle transition-colors font-bold text-link bg-surface"
                            } else {
                                "flex items-center px-2.5 py-1.5 text-sm rounded no-underline text-text hover:bg-surface-subtle transition-colors"
                            };
                            view! {
                                <li>
                                    <a href=url class=cls>{title}</a>
                                </li>
                            }
                        }).collect_view()}
                    </ul>
                </div>
            </aside>

            // Content Pane with Sticky Tabs
            <main class="book-pane pane-content flex-1 flex flex-col h-full bg-bg overflow-hidden" id="pane-content">
                <header class="pane-header pane-content-header" id="pane-content-header">
                    <div class="sticky-tabs-bar" id="sticky-tabs-bar">
                        {render_sticky_tabs(section_tabs)}
                    </div>
                </header>

                <div class="pane-scroll flex-1 overflow-y-auto px-8 py-6" id="pane-article-scroll">
                    <article class="prose max-w-4xl mx-auto">
                        <h1 class="text-3xl font-extrabold mb-4 pb-2 border-b border-border-subtle">{doc_title}</h1>

                        {if !hero_chips.is_empty() {
                            view! {
                                <div class="flex flex-wrap gap-2 mb-6">
                                    {hero_chips.into_iter().map(|(label, val)| {
                                        view! {
                                            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-surface-subtle border border-border text-text-muted">
                                                {if !label.is_empty() {
                                                    view! { <span class="font-semibold">{label}": "</span> }.into_any()
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
                                    <h2 class="text-lg font-bold mb-3 text-text-muted">"Backlinks"</h2>
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
    }
}
