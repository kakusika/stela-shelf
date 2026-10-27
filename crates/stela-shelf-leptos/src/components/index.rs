use leptos::prelude::*;

use super::document::{CatalogEntry, render_rail};

#[component]
pub fn CatalogView(
    book_title: String,
    sections: Vec<(String, usize)>,
    entries: Vec<CatalogEntry>,
    home_url: String,
    rail_letters: Vec<String>,
) -> impl IntoView {
    view! {
        <div class="book-shell flex flex-row h-screen w-screen overflow-hidden bg-surface-subtle">
            {render_rail(home_url, book_title.clone(), rail_letters)}

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
                            {entries.iter().cloned().map(|entry| {
                                let indent_style = (entry.depth > 0)
                                    .then(|| format!("margin-left: {}px", entry.depth * 12));
                                view! {
                                    <li style=indent_style>
                                        <a href=entry.url class="flex items-center px-2.5 py-1.5 text-sm rounded no-underline! text-text hover:bg-surface-subtle transition-colors">
                                            {entry.title}
                                        </a>
                                    </li>
                                }
                            }).collect_view()}
                        </ul>
                    </div>
                </aside>

                // Content Pane
                <main class="book-pane pane-content flex-1 flex flex-col h-full bg-bg overflow-hidden" id="pane-content">
                    <header class="pane-header pane-content-header" id="pane-content-header">
                        <span class="text-xs font-semibold uppercase tracking-wider text-text-muted py-2">"Index"</span>
                    </header>

                    <div class="pane-scroll pane-scroll-content flex-1 overflow-y-auto px-8 py-6" id="pane-article-scroll">
                        <article class="max-w-4xl mx-auto">
                            <h1 class="text-3xl font-extrabold mt-0 mb-4 pb-2 border-b border-border-subtle">{book_title}</h1>
                            <p class="text-text-muted mb-8">"Select a document from the catalog to start reading."</p>

                            {if !sections.is_empty() {
                                view! {
                                    <section class="mb-8">
                                        <h2 class="text-xl font-bold mb-4 text-text border-0 p-0">"Sections"</h2>
                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {sections.into_iter().map(|(name, count)| {
                                                view! {
                                                    <div class="p-4 rounded-lg bg-surface border border-border">
                                                        <h3 class="font-bold text-base mt-0 mb-1">{name}</h3>
                                                        <p class="text-xs text-text-muted m-0">{count.to_string()}" documents"</p>
                                                    </div>
                                                }
                                            }).collect_view()}
                                        </div>
                                    </section>
                                }.into_any()
                            } else {
                                ().into_any()
                            }}

                            <section>
                                <h2 class="text-xl font-bold mb-4 text-text border-0 p-0">"All Documents"</h2>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {entries.into_iter().map(|entry| {
                                        view! {
                                            <a href=entry.url class="p-3 rounded bg-surface hover:bg-surface-subtle border border-border no-underline! text-text transition-colors">
                                                <span class="font-medium text-sm">{entry.title}</span>
                                            </a>
                                        }
                                    }).collect_view()}
                                </div>
                            </section>
                        </article>
                    </div>
                </main>
            </div>
        </div>
    }
}
