use leptos::prelude::*;
use stela_shelf_assets::{STELA_CSS_VERSION, STELA_SHELL_JS_VERSION};

#[component]
pub fn HtmlDocument(
    title: String,
    lang: String,
    base_path: String,
    children: Children,
) -> impl IntoView {
    let prefix = base_path.trim_end_matches('/');
    let css_path = format!("{prefix}/shelf.css?v={}", *STELA_CSS_VERSION);
    let js_path = format!("{prefix}/stela-shell.js?v={}", *STELA_SHELL_JS_VERSION);

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
                    const resolvedTheme =
                      savedTheme === 'dark' || savedTheme === 'light'
                        ? savedTheme
                        : window.matchMedia('(prefers-color-scheme: dark)').matches
                          ? 'dark'
                          : 'light';
                    document.documentElement.setAttribute('data-theme', resolvedTheme);

                    const shellColor = localStorage.getItem('shelf-shell-color');
                    const shellPattern = localStorage.getItem('shelf-shell-pattern');
                    const shellContrast = localStorage.getItem('shelf-shell-contrast');
                    if (shellColor && shellColor !== 'slate') {
                      document.documentElement.setAttribute('data-shell-color', shellColor);
                    }
                    if (shellPattern && shellPattern !== 'marble') {
                      document.documentElement.setAttribute('data-shell-pattern', shellPattern);
                    }
                    if (shellContrast === 'high') {
                      document.documentElement.setAttribute('data-shell-contrast', 'high');
                    }

                    const savedNav = localStorage.getItem('wiki-pane-nav-collapsed');
                    if (savedNav !== null ? savedNav === 'true' : window.innerWidth <= 768) {
                      document.documentElement.setAttribute('data-nav-collapsed', 'true');
                    }
                  } catch {}
                "/>
                <link rel="stylesheet" href=css_path/>
                <script src=js_path defer=""></script>
            </head>

            <body class="is-fluid">
                {children()}
            </body>
        </html>
    }
}
