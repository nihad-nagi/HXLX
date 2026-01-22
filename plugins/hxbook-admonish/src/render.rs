// /HXLX/plugins/hxbook-admonish/src/render.rs
//! HTML rendering for admonitions.

use crate::types::{AdmonishConfig, AdmonitionMeta};

/// Render title with optional icon
fn render_title(meta: &AdmonitionMeta) -> String {
    let icon_html = meta.icon.as_ref().map_or(String::new(), |i| {
        if i.starts_with("data:") || i.starts_with("http") {
            // URL or data URL
            format!(
                r#"<span class="admonition-icon" style="background-image:url('{}')"></span>"#,
                i
            )
        } else if i.chars().count() == 1 {
            // Single character (likely emoji)
            format!(
                r#"<span class="admonition-icon admonition-icon-emoji">{}</span>"#,
                i
            )
        } else {
            // Text or unknown format
            format!(r#"<span class="admonition-icon">{}</span>"#, i)
        }
    });

    format!(
        r#"<span class="admonition-title-text">{}{}</span>"#,
        icon_html, meta.title
    )
}

/// Render admonition as HTML
pub fn render_admonition(meta: &AdmonitionMeta, content: &str) -> String {
    let body = extract_admonition_body(content);

    // Fix: Create a String for the ID to avoid temporary value issues
    let id = meta
        .id
        .clone()
        .unwrap_or_else(|| format!("admonition-{}", meta.directive));

    // Build CSS classes
    let mut classes = vec![
        "admonition".to_string(),
        format!("admonition-{}", meta.directive),
    ];
    classes.extend(meta.classnames.iter().cloned());

    // Build style attributes for custom color
    let style = meta
        .color
        .as_ref()
        .map(|color| format!("--admonition-color: {};", color.to_css()))
        .unwrap_or_default();

    // Build title HTML
    let title_html = if !meta.title.is_empty() {
        format!(
            r#"<div class="admonition-title">{}</div>"#,
            render_title(meta)
        )
    } else {
        String::new()
    };

    // Render as collapsible details element or static div
    if meta.collapsible {
        format!(
            r#"<details id="{}" class="{}" style="{}">
<summary class="admonition-title">{}</summary>
<div class="admonition-content">

{}

</div>
</details>"#,
            id,
            classes.join(" "),
            style,
            meta.title,
            body.trim()
        )
    } else {
        format!(
            r#"<div id="{}" class="{}" style="{}">
{}
<div class="admonition-content">

{}

</div>
</div>"#,
            id,
            classes.join(" "),
            style,
            title_html,
            body.trim()
        )
    }
}

/// Extract body from code block
pub fn extract_admonition_body(content: &str) -> String {
    let mut lines = content.lines();
    lines.next(); // Skip opening fence

    let mut body_lines: Vec<&str> = lines.collect();
    if let Some(last) = body_lines.last() {
        let trimmed = last.trim_start();
        if trimmed.starts_with("```") || trimmed.starts_with("~~~") {
            body_lines.pop();
        }
    }

    body_lines.join("\n")
}

/// Generate CSS for admonitions
pub fn generate_custom_css(_config: &AdmonishConfig) -> String {
    // Fixed: removed crate::types::
    let mut css = String::from(
        r#"/* HXBook Admonition CSS - Simple and flexible */
:root {
    --admonition-border-color: rgba(0, 0, 0, 0.1);
    --admonition-background: rgba(0, 0, 0, 0.02);
}

.admonition {
    border: 1px solid var(--admonition-border-color);
    border-left: 4px solid var(--admonition-color, hsl(45, 70%, 50%));
    border-radius: 4px;
    margin: 1.5rem 0;
    background: var(--admonition-background);
    overflow: hidden;
}

.admonition-title {
    padding: 0.75rem 1rem;
    font-weight: 600;
    border-bottom: 1px solid var(--admonition-border-color);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(0, 0, 0, 0.03);
}

.admonition-title-text {
    flex: 1;
}

.admonition-icon {
    width: 1.2em;
    height: 1.2em;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    opacity: 0.8;
    display: flex;
    align-items: center;
    justify-content: center;
}

.admonition-icon-emoji {
    background: none !important;
    font-size: 1.2em;
    opacity: 1;
}

.admonition-content {
    padding: 1rem;
}

.admonition-content > *:first-child {
    margin-top: 0;
}

.admonition-content > *:last-child {
    margin-bottom: 0;
}

/* Collapsible styles */
details.admonition > summary.admonition-title {
    cursor: pointer;
    list-style: none;
    position: relative;
    padding-right: 2.5rem;
}

details.admonition > summary.admonition-title::-webkit-details-marker {
    display: none;
}

details.admonition > summary.admonition-title::after {
    content: "▼";
    position: absolute;
    right: 1rem;
    top: 50%;
    transform: translateY(-50%) rotate(0deg);
    transition: transform 0.2s;
    font-size: 0.8em;
    opacity: 0.6;
}

details.admonition[open] > summary.admonition-title::after {
    transform: translateY(-50%) rotate(180deg);
}
"#,
    );

    // Add built-in directive styles
    for (name, angle) in crate::types::BUILTIN_DIRECTIVES {
        let hue = (*angle as f32 * 9.0) % 360.0;
        let color = format!("hsl({:.0}, 70%, 50%)", hue.round());
        let bg_color = format!("hsla({:.0}, 70%, 50%, 0.1)", hue);

        css.push_str(&format!(
            r#".admonition-{} {{
    --admonition-color: {};
}}

.admonition-{} .admonition-title {{
    background: {};
}}
"#,
            name, color, name, bg_color
        ));
    }

    css
}
