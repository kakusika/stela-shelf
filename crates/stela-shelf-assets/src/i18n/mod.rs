//! UI strings and internationalization dictionaries for stela-shelf-assets.

pub mod en;
pub mod ja;

use std::collections::HashMap;

/// Returns true if the given language code represents English (e.g. "en", "en-US").
pub fn is_english(lang: &str) -> bool {
    tomet_shelf_headless::config::is_english(lang)
}

/// Look up default UI strings for a given book language code.
pub fn default_ui_strings_for(lang: &str) -> HashMap<String, String> {
    if is_english(lang) {
        en::ui_strings()
    } else {
        ja::ui_strings()
    }
}

/// Populate missing UI strings in `strings` based on `lang`, preserving user overrides.
pub fn apply_ui_defaults(strings: &mut HashMap<String, String>, lang: &str) {
    for (k, v) in default_ui_strings_for(lang) {
        strings.entry(k).or_insert(v);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn english_and_japanese_ui_dictionaries_have_identical_keys() {
        let ja_strings = ja::ui_strings();
        let en_strings = en::ui_strings();
        assert_eq!(ja_strings.len(), en_strings.len());
        for key in ja_strings.keys() {
            assert!(
                en_strings.contains_key(key),
                "Missing English UI string key: {key}"
            );
        }
    }

    #[test]
    fn apply_ui_defaults_populates_and_preserves_overrides() {
        let mut strings = HashMap::new();
        strings.insert("pane.toc".to_string(), "Custom Outline".to_string());
        apply_ui_defaults(&mut strings, "en");
        assert_eq!(
            strings.get("pane.toc").map(String::as_str),
            Some("Custom Outline")
        );
        assert_eq!(strings.get("pane.links").map(String::as_str), Some("Links"));

        let mut ja_strings = HashMap::new();
        apply_ui_defaults(&mut ja_strings, "ja");
        assert_eq!(ja_strings.get("pane.toc").map(String::as_str), Some("目次"));
    }
}
