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
        <html class="no-js" lang=lang data-view="book">
            <head>
                <meta charset="utf-8"/>
                <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
                <title>{title}</title>
                <script inner_html="
                  document.documentElement.classList.replace('no-js', 'js');
                  try {
                    const savedTheme = localStorage.getItem('shelf-theme');
                    if (savedTheme === 'dark' || savedTheme === 'light') {
                      document.documentElement.setAttribute('data-theme', savedTheme);
                    }
                    let shellColor = localStorage.getItem('shelf-shell-color');
                    let shellPattern = localStorage.getItem('shelf-shell-pattern');
                    let shellContrast = localStorage.getItem('shelf-shell-contrast');
                    if (shellColor && shellColor !== 'slate') {
                      document.documentElement.setAttribute('data-shell-color', shellColor);
                    }
                    if (shellPattern && shellPattern !== 'marble') {
                      document.documentElement.setAttribute('data-shell-pattern', shellPattern);
                    }
                    if (shellContrast === 'high') {
                      document.documentElement.setAttribute('data-shell-contrast', 'high');
                    }
                  } catch {}
                "/>
                <link rel="stylesheet" href=css_path/>
            </head>
            <body class="is-fluid">
                {children()}
            </body>
        </html>
    }
}
