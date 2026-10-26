use leptos::prelude::*;

#[component]
pub fn DocumentView(
    book_title: String,
    doc_title: String,
    content_html: String,
    hero_chips: Vec<(String, String)>,
    toc_items: Vec<(String, String, u32)>,
    entries: Vec<(String, String)>,
    backlinks: Vec<(String, String)>,
    base_path: String,
) -> impl IntoView {
    let home_url = if base_path.is_empty() || base_path == "/" {
        "/".to_string()
    } else {
        format!("{}/", base_path.trim_end_matches('/'))
    };

    let has_entries = !entries.is_empty();

    view! {
        <div class="shelf-container">
            <aside class="shelf-sidebar">
                <div class="shelf-header">
                    <a href=home_url.clone() class="shelf-title">
                        {book_title}
                    </a>
                    <div>
                        <span class="shelf-engine-badge">"Leptos (Full-Rust)"</span>
                    </div>
                </div>
                <nav>
                    {if has_entries {
                        view! {
                            <ul class="shelf-nav-list">
                                {entries.into_iter().map(|(url, title)| {
                                    let is_active = title == doc_title;
                                    let active_class = if is_active { "shelf-nav-link active" } else { "shelf-nav-link" };
                                    view! {
                                        <li class="shelf-nav-item">
                                            <a href=url class=active_class>
                                                {title}
                                            </a>
                                        </li>
                                    }
                                }).collect_view()}
                            </ul>
                        }.into_any()
                    } else {
                        view! {
                            <ul class="shelf-nav-list">
                                <li class="shelf-nav-item">
                                    <a href=home_url class="shelf-nav-link">
                                        "← Catalog / Documents"
                                    </a>
                                </li>
                            </ul>
                        }.into_any()
                    }}
                </nav>
            </aside>

            <main class="shelf-main">
                <article class="shelf-article">
                    <h1 class="shelf-article-title">{doc_title}</h1>

                    {if !hero_chips.is_empty() {
                        view! {
                            <div class="shelf-hero-chips">
                                {hero_chips.into_iter().map(|(label, val)| {
                                    view! {
                                        <span class="shelf-chip">
                                            <strong>{label}": "</strong>{val}
                                        </span>
                                    }
                                }).collect_view()}
                            </div>
                        }.into_any()
                    } else {
                        ().into_any()
                    }}

                    <div class="shelf-prose" inner_html=content_html />

                    {if !backlinks.is_empty() {
                        view! {
                            <section class="shelf-backlinks">
                                <h2 class="shelf-backlinks-title">"Backlinks"</h2>
                                <ul class="shelf-nav-list">
                                    {backlinks.into_iter().map(|(url, title)| {
                                        view! {
                                            <li class="shelf-nav-item">
                                                <a href=url class="shelf-nav-link">{title}</a>
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
            </main>

            {if !toc_items.is_empty() {
                view! {
                    <aside class="shelf-toc">
                        <div class="shelf-toc-title">"On this page"</div>
                        <ul class="shelf-toc-list">
                            {toc_items.into_iter().map(|(id, text, level)| {
                                let padding_left = format!("{}rem", (level.saturating_sub(1) as f32) * 0.75);
                                view! {
                                    <li class="shelf-toc-item">
                                        <a href=format!("#{id}") class="shelf-toc-link" style=format!("padding-left: {padding_left}")>
                                            {text}
                                        </a>
                                    </li>
                                }
                            }).collect_view()}
                        </ul>
                    </aside>
                }.into_any()
            } else {
                ().into_any()
            }}
        </div>
    }
}
