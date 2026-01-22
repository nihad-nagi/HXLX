// /HXLX/plugins/hxbook-admonish/src/parse.rs
//! Parsing logic for admonition code blocks with simple configuration.

use crate::render::extract_admonition_body;
use crate::types::AdmonishConfig;
use crate::types::{AdmonitionMeta, DirectiveColor, BUILTIN_DIRECTIVES};
use anyhow::Result;

/// Parse an admonition code block
pub fn parse_admonition(
    info_string: &str,
    raw_block: &str,
    config: &AdmonishConfig,
) -> Option<Result<AdmonitionMeta>> {
    if !info_string.starts_with("admonish") {
        return None;
    }

    let directive_part = info_string.trim_start_matches("admonish").trim();
    let parsed = parse_directive_config(directive_part).ok()?;
    let body = extract_admonition_body(raw_block);
    Some(resolve_metadata(parsed, &body, config))
}

#[derive(Debug, Default)]
struct ParsedConfig {
    directive: Option<String>,
    title: Option<String>,
    id: Option<String>,
    classnames: Vec<String>,
    collapsible: Option<bool>,
    color: Option<DirectiveColor>,
    icon: Option<String>,
}

fn parse_directive_config(info_str: &str) -> Result<ParsedConfig> {
    let mut config = ParsedConfig::default();
    if info_str.is_empty() {
        return Ok(config);
    }

    let parts: Vec<&str> = info_str.split_whitespace().collect();
    let mut i = 0;
    if !parts.is_empty() {
        config.directive = Some(parts[0].to_string());
        i += 1;
    }

    while i < parts.len() {
        let part = parts[i];
        if let Some((key, value)) = part.split_once('=') {
            let value = value.trim_matches('"');
            match key {
                "title" => config.title = Some(value.to_string()),
                "id" => config.id = Some(value.to_string()),
                "color" => {
                    if let Ok(angle) = value.parse::<u8>() {
                        config.color = Some(if (1..=40).contains(&angle) {
                            DirectiveColor::Angle(angle)
                        } else {
                            DirectiveColor::Hex(value.to_string())
                        });
                    } else {
                        config.color = Some(DirectiveColor::Hex(value.to_string()));
                    }
                }
                "icon" => config.icon = Some(value.to_string()),
                "collapsible" => config.collapsible = Some(matches!(value, "true" | "yes" | "1")),
                "class" => config
                    .classnames
                    .extend(value.split_whitespace().map(|s| s.to_string())),
                _ => {}
            }
        } else if part.starts_with('.') {
            config.classnames.push(part[1..].to_string());
        }
        i += 1;
    }

    Ok(config)
}

fn resolve_metadata(
    parsed: ParsedConfig,
    _content: &str, // Add underscore to suppress warning
    config: &AdmonishConfig,
) -> Result<AdmonitionMeta> {
    let directive_name = parsed.directive.unwrap_or_else(|| "note".to_string());

    let builtin_color = BUILTIN_DIRECTIVES
        .iter()
        .find(|(name, _)| *name == directive_name)
        .map(|(_, angle)| DirectiveColor::Angle(*angle));

    let color = parsed.color.or(builtin_color);

    let icon = parsed
        .icon
        .and_then(|i| Some(config.icons.get(&i).cloned().unwrap_or(i)));

    let title = parsed
        .title
        .or_else(|| config.default_title.clone())
        .unwrap_or_else(|| {
            let mut chars = directive_name.chars();
            match chars.next() {
                None => String::new(),
                Some(f) => f.to_uppercase().collect::<String>() + chars.as_str(),
            }
        });

    let collapsible = parsed.collapsible.unwrap_or(config.default_collapsible);

    let id = parsed.id.or_else(|| {
        let slug = title
            .to_lowercase()
            .chars()
            .map(|c| if c.is_alphanumeric() { c } else { '-' })
            .collect::<String>()
            .replace(' ', "-");
        Some(format!("{}{}", config.css_id_prefix, slug))
    });

    Ok(AdmonitionMeta {
        directive: directive_name,
        title,
        id,
        classnames: parsed.classnames,
        collapsible,
        color,
        icon,
    })
}
