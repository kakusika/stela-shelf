use std::sync::LazyLock;
pub use tomet_shelf_headless::assets::{StaticAsset, content_version, write_if_changed};

//==============================================================================
// Core Stela Stylesheet
//==============================================================================

pub const STELA_CSS: &str = concat!(
    include_str!("../frontend/styles/00-base.css"),
    include_str!("../frontend/styles/10-shell.css"),
    include_str!("../frontend/styles/20-panes.css"),
    include_str!("../frontend/styles/30-sticky-tabs.css"),
    include_str!("../frontend/styles/35-sticky-tabs-vertical.css"),
    include_str!("../frontend/styles/40-hero.css"),
    include_str!("../frontend/styles/50-nav-infobox.css"),
    include_str!("../frontend/styles/60-content.css"),
    include_str!("../frontend/styles/70-widgets.css"),
    include_str!("../frontend/styles/71-source-viewer.css"),
    include_str!("../frontend/styles/72-center-peek.css"),
    include_str!(concat!(env!("OUT_DIR"), "/tailwind.css")),
    include_str!("../frontend/styles/90-responsive.css"),
    include_str!("../frontend/styles/98-no-js.css"),
);

pub static STELA_CSS_VERSION: LazyLock<String> = LazyLock::new(|| content_version(STELA_CSS));

// Backward compatibility alias
pub const BOOK_CSS: &str = STELA_CSS;
pub static CSS_VERSION: LazyLock<String> = LazyLock::new(|| content_version(STELA_CSS));

//==============================================================================
// Web Component Shadow DOM Stylesheets
//==============================================================================

pub const TMT_BTN_CSS: &str = include_str!("../frontend/styles/components/tmt-btn.css");
pub const TMT_BADGE_CSS: &str = include_str!("../frontend/styles/components/tmt-badge.css");
pub const TMT_ICON_CSS: &str = include_str!("../frontend/styles/components/tmt-icon.css");
pub const TMT_SWATCH_CSS: &str = include_str!("../frontend/styles/components/tmt-swatch.css");
pub const TMT_SWITCH_CSS: &str = include_str!("../frontend/styles/components/tmt-switch.css");

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

/// Get all core static assets for Stela Shelf (CSS and components).
pub fn stela_static_assets() -> Vec<StaticAsset> {
    let mut assets = Vec::with_capacity(1 + COMPONENT_ASSETS.len());
    assets.push(StaticAsset {
        path: "shelf.css",
        mime: "text/css; charset=utf-8",
        content: STELA_CSS,
    });
    assets.extend_from_slice(COMPONENT_ASSETS);
    assets
}
