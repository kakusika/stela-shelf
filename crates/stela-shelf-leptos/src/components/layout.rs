use leptos::prelude::*;

#[component]
pub fn HtmlDocument(
    title: String,
    lang: String,
    base_path: String,
    children: Children,
) -> impl IntoView {
    let css_path = if base_path.is_empty() {
        "/shelf.css".to_string()
    } else {
        format!("{}/shelf.css", base_path.trim_end_matches('/'))
    };

    view! {
        <!DOCTYPE html>
        <html lang=lang>
            <head>
                <meta charset="utf-8"/>
                <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
                <title>{title}</title>
                <link rel="stylesheet" href=css_path/>
                <style>{crate::styles::LEPTOS_SHELF_CSS}</style>
            </head>
            <body>
                {children()}
            </body>
        </html>
    }
}
