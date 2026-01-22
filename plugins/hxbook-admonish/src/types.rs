// /HXLX/plugins/hxbook-admonish/src/types.rs
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Global configuration for the admonition preprocessor.
#[derive(Debug, Clone, Default, Deserialize, Serialize)]
pub struct AdmonishConfig {
    /// Default title to use when no title is specified
    #[serde(default)]
    pub default_title: Option<String>,

    /// Whether admonitions should be collapsible by default
    #[serde(default)]
    pub default_collapsible: bool,

    /// Prefix to prepend to generated CSS IDs
    #[serde(default)]
    pub css_id_prefix: String,

    /// Map of icon aliases to icon definitions
    #[serde(default)]
    pub icons: HashMap<String, String>,
}

/// Color specification - supports HSL angle (1-40) or hex colors
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(untagged)]
pub enum DirectiveColor {
    Angle(u8),
    Hex(String),
}

impl Default for DirectiveColor {
    fn default() -> Self {
        Self::Angle(5)
    }
}

impl DirectiveColor {
    pub fn to_css(&self) -> String {
        match self {
            Self::Angle(angle) => {
                let hue = (*angle).clamp(1, 40) as f32 * 9.0 % 360.0;
                format!("hsl({:.0}, 70%, 50%)", hue)
            }
            Self::Hex(hex) => {
                if hex.starts_with('#') {
                    hex.clone()
                } else {
                    format!("#{}", hex)
                }
            }
        }
    }

    pub fn to_bg_css(&self) -> String {
        match self {
            Self::Angle(angle) => {
                let hue = (*angle).clamp(1, 40) as f32 * 9.0 % 360.0;
                format!("hsla({:.0}, 70%, 50%, 0.1)", hue)
            }
            Self::Hex(hex) => {
                let hex = hex.trim_start_matches('#');
                if hex.len() == 6 {
                    let r = u8::from_str_radix(&hex[0..2], 16).unwrap_or(0);
                    let g = u8::from_str_radix(&hex[2..4], 16).unwrap_or(0);
                    let b = u8::from_str_radix(&hex[4..6], 16).unwrap_or(0);
                    format!("rgba({}, {}, {}, 0.1)", r, g, b)
                } else {
                    "rgba(0, 0, 0, 0.03)".to_string()
                }
            }
        }
    }
}

/// Built-in directives with default HSL mapping
pub const BUILTIN_DIRECTIVES: &[(&str, u8)] = &[
    ("note", 5),
    ("info", 6),
    ("tip", 22),
    ("warning", 10),
    ("danger", 1),
    ("success", 22),
    ("question", 30),
    ("bug", 35),
    ("example", 33),
];

/// Metadata for a single admonition block
#[derive(Debug)]
pub struct AdmonitionMeta {
    pub directive: String,
    pub title: String,
    pub id: Option<String>,
    pub classnames: Vec<String>,
    pub collapsible: bool,
    pub color: Option<DirectiveColor>,
    pub icon: Option<String>,
}
