use std::sync::LazyLock;
pub use tomet_shelf_headless::assets::{StaticAsset, content_version, write_if_changed};

//==============================================================================
// Core Stela Stylesheet
//==============================================================================

pub const STELA_CSS: &str = include_str!(concat!(env!("OUT_DIR"), "/shelf.min.css"));

pub static STELA_CSS_VERSION: LazyLock<String> = LazyLock::new(|| content_version(STELA_CSS));

//==============================================================================
// Core Stela Shell JavaScript
//==============================================================================

pub const STELA_SHELL_JS: &str = include_str!(concat!(env!("OUT_DIR"), "/stela-shell.min.js"));
pub static STELA_SHELL_JS_VERSION: LazyLock<String> =
    LazyLock::new(|| content_version(STELA_SHELL_JS));

// Backward compatibility alias
pub const BOOK_CSS: &str = STELA_CSS;
pub static CSS_VERSION: LazyLock<String> = LazyLock::new(|| content_version(STELA_CSS));


//==============================================================================
// Web Component Shadow DOM Stylesheets
//==============================================================================

pub const TMT_BTN_CSS: &str = include_str!(concat!(env!("OUT_DIR"), "/tmt-btn.min.css"));
pub const TMT_BADGE_CSS: &str = include_str!(concat!(env!("OUT_DIR"), "/tmt-badge.min.css"));
pub const TMT_ICON_CSS: &str = include_str!(concat!(env!("OUT_DIR"), "/tmt-icon.min.css"));
pub const TMT_SWATCH_CSS: &str = include_str!(concat!(env!("OUT_DIR"), "/tmt-swatch.min.css"));
pub const TMT_SWITCH_CSS: &str = include_str!(concat!(env!("OUT_DIR"), "/tmt-switch.min.css"));


pub static TMT_BTN_CSS_VERSION: LazyLock<String> = LazyLock::new(|| content_version(TMT_BTN_CSS));
pub static TMT_BADGE_CSS_VERSION: LazyLock<String> =
    LazyLock::new(|| content_version(TMT_BADGE_CSS));
pub static TMT_ICON_CSS_VERSION: LazyLock<String> =
    LazyLock::new(|| content_version(TMT_ICON_CSS));
pub static TMT_SWATCH_CSS_VERSION: LazyLock<String> =
    LazyLock::new(|| content_version(TMT_SWATCH_CSS));
pub static TMT_SWITCH_CSS_VERSION: LazyLock<String> =
    LazyLock::new(|| content_version(TMT_SWITCH_CSS));

pub const COMPONENT_ASSETS: &[StaticAsset] = &[
    StaticAsset {
        path: "components/tmt-btn.css",
        mime: "text/css; charset=utf-8",
        content: TMT_BTN_CSS,
    },
    StaticAsset {
        path: "components/tmt-badge.css",
        mime: "text/css; charset=utf-8",
        content: TMT_BADGE_CSS,
    },
    StaticAsset {
        path: "components/tmt-icon.css",
        mime: "text/css; charset=utf-8",
        content: TMT_ICON_CSS,
    },
    StaticAsset {
        path: "components/tmt-swatch.css",
        mime: "text/css; charset=utf-8",
        content: TMT_SWATCH_CSS,
    },
    StaticAsset {
        path: "components/tmt-switch.css",
        mime: "text/css; charset=utf-8",
        content: TMT_SWITCH_CSS,
    },
];

/// Get all core static assets for Stela Shelf (CSS, JS, and components).
pub fn stela_static_assets() -> Vec<StaticAsset> {
    let mut assets = Vec::with_capacity(2 + COMPONENT_ASSETS.len());
    assets.push(StaticAsset {
        path: "shelf.css",
        mime: "text/css; charset=utf-8",
        content: STELA_CSS,
    });
    assets.push(StaticAsset {
        path: "stela-shell.js",
        mime: "application/javascript; charset=utf-8",
        content: STELA_SHELL_JS,
    });
    assets.extend_from_slice(COMPONENT_ASSETS);
    assets
}

