use leptos::prelude::*;

#[component]
pub fn CatalogView(
    book_title: String,
    sections: Vec<(String, usize)>,
    entries: Vec<(String, String)>,
    base_path: String,
) -> impl IntoView {
    let home_url = if base_path.is_empty() || base_path == "/" {
        "/".to_string()
    } else {
        format!("{}/", base_path.trim_end_matches('/'))
    };

    view! {
        <div class="shelf-container">
            <aside class="shelf-sidebar">
                <div class="shelf-header">
                    <a href=home_url class="shelf-title">
                        {book_title.clone()}
                    </a>
                    <div>
                        <span class="shelf-engine-badge">"Leptos (Full-Rust)"</span>
                    </div>
                </div>
                <nav>
                    <ul class="shelf-nav-list">
                        {entries.iter().cloned().map(|(url, title)| {
                            view! {
                                <li class="shelf-nav-item">
                                    <a href=url class="shelf-nav-link">{title}</a>
                                </li>
                            }
                        }).collect_view()}
                    </ul>
                </nav>
            </aside>

            <main class="shelf-main">
                <article>
                    <h1 class="shelf-article-title">{format!("Catalog: {book_title}")}</h1>

                    {if !sections.is_empty() {
                        view! {
                            <div class="shelf-hero-chips">
                                {sections.into_iter().map(|(name, count)| {
                                    view! {
                                        <span class="shelf-chip">
                                            <strong>{name}": "</strong>{count.to_string()}" doc(s)"
                                        </span>
                                    }
                                }).collect_view()}
                            </div>
                        }.into_any()
                    } else {
                        ().into_any()
                    }}

                    <section>
                        <h2 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem;">"Documents"</h2>
                        <ul class="shelf-nav-list">
                            {entries.into_iter().map(|(url, title)| {
                                view! {
                                    <li class="shelf-nav-item" style="margin-bottom: 0.5rem;">
                                        <a href=url class="shelf-nav-link" style="font-size: 1rem; font-weight: 500;">
                                            {title}
                                        </a>
                                    </li>
                                }
                            }).collect_view()}
                        </ul>
                    </section>
                </article>
            </main>
        </div>
    }
}
