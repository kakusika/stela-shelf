use leptos::prelude::*;

#[component]
pub fn CatalogView(
    book_title: String,
    sections: Vec<(String, usize)>,
    entries: Vec<(String, String)>,
    base_path: String,
    rail_letters: Vec<String>,
) -> impl IntoView {
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
                        {entries.iter().cloned().map(|(url, title)| {
                            view! {
                                <li>
                                    <a href=url class="flex items-center px-2.5 py-1.5 text-sm rounded no-underline text-text hover:bg-surface-subtle transition-colors">
                                        {title}
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
                    <span class="text-xs font-semibold uppercase tracking-wider text-text-muted">"Index"</span>
                </header>

                <div class="pane-scroll flex-1 overflow-y-auto px-8 py-6">
                    <article class="prose max-w-4xl mx-auto">
                        <h1 class="text-3xl font-extrabold mb-4 pb-2 border-b border-border-subtle">{book_title}</h1>
                        <p class="text-text-muted mb-8">"Select a document from the catalog to start reading."</p>

                        {if !sections.is_empty() {
                            view! {
                                <section class="mb-8">
                                    <h2 class="text-xl font-bold mb-4 text-text">"Sections"</h2>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {sections.into_iter().map(|(name, count)| {
                                            view! {
                                                <div class="p-4 rounded-lg bg-surface border border-border">
                                                    <h3 class="font-bold text-base mb-1">{name}</h3>
                                                    <p class="text-xs text-text-muted">{count.to_string()}" documents"</p>
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
                            <h2 class="text-xl font-bold mb-4 text-text">"All Documents"</h2>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {entries.into_iter().map(|(url, title)| {
                                    view! {
                                        <a href=url class="p-3 rounded bg-surface hover:bg-surface-subtle border border-border no-underline text-text transition-colors">
                                            <span class="font-medium text-sm">{title}</span>
                                        </a>
                                    }
                                }).collect_view()}
                            </div>
                        </section>
                    </article>
                </div>
            </main>
        </div>
    }
}
