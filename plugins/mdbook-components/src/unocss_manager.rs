// /home/enzi/HXLX/plugins/mdbook-components/src/unocss_manager.rs
use chrono::Utc;
use regex::Regex;

pub struct UnoCSSManager;

impl UnoCSSManager {
    pub fn generate_color_css() -> String {
        let mut css =
            String::from("/* Color System: 40 hues (H0-H39), 4 luminance levels (L1-L4) */\n");
        css.push_str("/* Generated at: ");
        css.push_str(&Utc::now().to_rfc3339());
        css.push_str(" */\n\n");

        // Generate CSS variables
        css.push_str(":root {\n");

        for hue_num in 0..40 {
            let hue = 9 + (hue_num * 9); // H0=9°, H1=18°, ... H39=360°

            // Base luminance levels
            css.push_str(&format!("  --h{}-l1: hsl({}, 100%, 25%);\n", hue_num, hue));
            css.push_str(&format!("  --h{}-l2: hsl({}, 100%, 50%);\n", hue_num, hue));
            css.push_str(&format!("  --h{}-l3: hsl({}, 100%, 75%);\n", hue_num, hue));
            css.push_str(&format!("  --h{}-l4: hsl({}, 100%, 100%);\n", hue_num, hue));

            // Extended scale
            css.push_str(&format!("  --h{}-50: hsl({}, 100%, 95%);\n", hue_num, hue));
            css.push_str(&format!("  --h{}-100: hsl({}, 100%, 90%);\n", hue_num, hue));
            css.push_str(&format!("  --h{}-200: hsl({}, 100%, 80%);\n", hue_num, hue));
            css.push_str(&format!("  --h{}-300: hsl({}, 100%, 70%);\n", hue_num, hue));
            css.push_str(&format!("  --h{}-400: hsl({}, 100%, 60%);\n", hue_num, hue));
            css.push_str(&format!("  --h{}-500: hsl({}, 100%, 50%);\n", hue_num, hue));
            css.push_str(&format!("  --h{}-600: hsl({}, 100%, 40%);\n", hue_num, hue));
            css.push_str(&format!("  --h{}-700: hsl({}, 100%, 30%);\n", hue_num, hue));
            css.push_str(&format!("  --h{}-800: hsl({}, 100%, 20%);\n", hue_num, hue));
            css.push_str(&format!("  --h{}-900: hsl({}, 100%, 10%);\n", hue_num, hue));
        }

        // Semantic color variables
        css.push_str("  --primary: var(--h0-l2);\n");
        css.push_str("  --primary-light: var(--h0-l3);\n");
        css.push_str("  --primary-dark: var(--h0-l1);\n");
        css.push_str("  --secondary: var(--h1-l2);\n");
        css.push_str("  --secondary-light: var(--h1-l3);\n");
        css.push_str("  --secondary-dark: var(--h1-l1);\n");
        css.push_str("  --accent: var(--h2-l2);\n");
        css.push_str("  --success: var(--h14-l2);\n");
        css.push_str("  --warning: var(--h4-l2);\n");
        css.push_str("  --danger: var(--h0-l2);\n");
        css.push_str("  --info: var(--h21-l2);\n");
        css.push_str("}\n\n");

        // Generate utility classes for colors
        for hue_num in 0..40 {
            // Background colors
            css.push_str(&format!(".bg-h{} {{\n", hue_num));
            css.push_str(&format!("  background-color: var(--h{}-l2);\n", hue_num));
            css.push_str("}\n");

            css.push_str(&format!(".bg-h{}-l1 {{\n", hue_num));
            css.push_str(&format!("  background-color: var(--h{}-l1);\n", hue_num));
            css.push_str("}\n");

            css.push_str(&format!(".bg-h{}-l2 {{\n", hue_num));
            css.push_str(&format!("  background-color: var(--h{}-l2);\n", hue_num));
            css.push_str("}\n");

            css.push_str(&format!(".bg-h{}-l3 {{\n", hue_num));
            css.push_str(&format!("  background-color: var(--h{}-l3);\n", hue_num));
            css.push_str("}\n");

            css.push_str(&format!(".bg-h{}-l4 {{\n", hue_num));
            css.push_str(&format!("  background-color: var(--h{}-l4);\n", hue_num));
            css.push_str("}\n");

            // Text colors
            css.push_str(&format!(".text-h{} {{\n", hue_num));
            css.push_str(&format!("  color: var(--h{}-l2);\n", hue_num));
            css.push_str("}\n");

            css.push_str(&format!(".text-h{}-l1 {{\n", hue_num));
            css.push_str(&format!("  color: var(--h{}-l1);\n", hue_num));
            css.push_str("}\n");

            css.push_str(&format!(".text-h{}-l3 {{\n", hue_num));
            css.push_str(&format!("  color: var(--h{}-l3);\n", hue_num));
            css.push_str("}\n");

            // Border colors
            css.push_str(&format!(".border-h{} {{\n", hue_num));
            css.push_str(&format!("  border-color: var(--h{}-l2);\n", hue_num));
            css.push_str("}\n");
        }

        // Semantic utility classes
        css.push_str("\n/* Semantic color utilities */\n");
        css.push_str(".bg-primary { background-color: var(--primary); }\n");
        css.push_str(".bg-primary-light { background-color: var(--primary-light); }\n");
        css.push_str(".bg-primary-dark { background-color: var(--primary-dark); }\n");
        css.push_str(".text-primary { color: var(--primary); }\n");
        css.push_str(".border-primary { border-color: var(--primary); }\n");

        css.push_str(".bg-secondary { background-color: var(--secondary); }\n");
        css.push_str(".bg-secondary-light { background-color: var(--secondary-light); }\n");
        css.push_str(".bg-secondary-dark { background-color: var(--secondary-dark); }\n");
        css.push_str(".text-secondary { color: var(--secondary); }\n");
        css.push_str(".border-secondary { border-color: var(--secondary); }\n");

        css.push_str(".bg-success { background-color: var(--success); }\n");
        css.push_str(".text-success { color: var(--success); }\n");
        css.push_str(".bg-warning { background-color: var(--warning); }\n");
        css.push_str(".text-warning { color: var(--warning); }\n");
        css.push_str(".bg-danger { background-color: var(--danger); }\n");
        css.push_str(".text-danger { color: var(--danger); }\n");
        css.push_str(".bg-info { background-color: var(--info); }\n");
        css.push_str(".text-info { color: var(--info); }\n");

        css
    }

    pub fn extract_classes(content: &str) -> Vec<String> {
        let mut classes = Vec::new();

        // Match class="..." or :class="..." or x-bind:class="..."
        let re = Regex::new(r#"(?:class|x-bind:class|:class)=["']([^"']+)["']"#).unwrap();

        for cap in re.captures_iter(content) {
            if let Some(class_list) = cap.get(1) {
                for class in class_list.as_str().split_whitespace() {
                    if !class.is_empty() && !classes.contains(&class.to_string()) {
                        classes.push(class.to_string());
                    }
                }
            }
        }

        classes
    }

    pub fn generate_utility_css(classes: &[String]) -> String {
        let mut css = String::from("/* Generated utility classes from component templates */\n");

        for class in classes {
            match class.as_str() {
                // Layout
                "flex" => css.push_str(".flex { display: flex; }\n"),
                "inline-flex" => css.push_str(".inline-flex { display: inline-flex; }\n"),
                "grid" => css.push_str(".grid { display: grid; }\n"),
                "inline-grid" => css.push_str(".inline-grid { display: inline-grid; }\n"),
                "hidden" => css.push_str(".hidden { display: none; }\n"),
                "block" => css.push_str(".block { display: block; }\n"),
                "inline-block" => css.push_str(".inline-block { display: inline-block; }\n"),
                "inline" => css.push_str(".inline { display: inline; }\n"),

                // Flexbox
                "flex-col" => css.push_str(".flex-col { flex-direction: column; }\n"),
                "flex-row" => css.push_str(".flex-row { flex-direction: row; }\n"),
                "flex-wrap" => css.push_str(".flex-wrap { flex-wrap: wrap; }\n"),
                "items-center" => css.push_str(".items-center { align-items: center; }\n"),
                "justify-center" => css.push_str(".justify-center { justify-content: center; }\n"),
                "justify-between" => css.push_str(".justify-between { justify-content: space-between; }\n"),
                "justify-around" => css.push_str(".justify-around { justify-content: space-around; }\n"),
                "justify-end" => css.push_str(".justify-end { justify-content: flex-end; }\n"),

                // Spacing
                "p-2" => css.push_str(".p-2 { padding: 0.5rem; }\n"),
                "p-4" => css.push_str(".p-4 { padding: 1rem; }\n"),
                "p-6" => css.push_str(".p-6 { padding: 1.5rem; }\n"),
                "m-2" => css.push_str(".m-2 { margin: 0.5rem; }\n"),
                "m-4" => css.push_str(".m-4 { margin: 1rem; }\n"),
                "m-6" => css.push_str(".m-6 { margin: 1.5rem; }\n"),
                "mx-auto" => css.push_str(".mx-auto { margin-left: auto; margin-right: auto; }\n"),
                "my-2" => css.push_str(".my-2 { margin-top: 0.5rem; margin-bottom: 0.5rem; }\n"),
                "my-4" => css.push_str(".my-4 { margin-top: 1rem; margin-bottom: 1rem; }\n"),
                "mt-2" => css.push_str(".mt-2 { margin-top: 0.5rem; }\n"),
                "mt-4" => css.push_str(".mt-4 { margin-top: 1rem; }\n"),
                "mb-2" => css.push_str(".mb-2 { margin-bottom: 0.5rem; }\n"),
                "mb-4" => css.push_str(".mb-4 { margin-bottom: 1rem; }\n"),

                // Text
                "text-center" => css.push_str(".text-center { text-align: center; }\n"),
                "text-left" => css.push_str(".text-left { text-align: left; }\n"),
                "text-right" => css.push_str(".text-right { text-align: right; }\n"),
                "font-bold" => css.push_str(".font-bold { font-weight: 700; }\n"),
                "font-semibold" => css.push_str(".font-semibold { font-weight: 600; }\n"),
                "font-medium" => css.push_str(".font-medium { font-weight: 500; }\n"),
                "font-normal" => css.push_str(".font-normal { font-weight: 400; }\n"),
                "text-sm" => css.push_str(".text-sm { font-size: 0.875rem; line-height: 1.25rem; }\n"),
                "text-base" => css.push_str(".text-base { font-size: 1rem; line-height: 1.5rem; }\n"),
                "text-lg" => css.push_str(".text-lg { font-size: 1.125rem; line-height: 1.75rem; }\n"),
                "text-xl" => css.push_str(".text-xl { font-size: 1.25rem; line-height: 1.75rem; }\n"),
                "text-2xl" => css.push_str(".text-2xl { font-size: 1.5rem; line-height: 2rem; }\n"),

                // Borders
                "border" => css.push_str(".border { border-width: 1px; border-style: solid; }\n"),
                "border-2" => css.push_str(".border-2 { border-width: 2px; border-style: solid; }\n"),
                "rounded" => css.push_str(".rounded { border-radius: 0.25rem; }\n"),
                "rounded-lg" => css.push_str(".rounded-lg { border-radius: 0.5rem; }\n"),
                "rounded-xl" => css.push_str(".rounded-xl { border-radius: 0.75rem; }\n"),
                "rounded-full" => css.push_str(".rounded-full { border-radius: 9999px; }\n"),

                // Interactive
                "cursor-pointer" => css.push_str(".cursor-pointer { cursor: pointer; }\n"),
                "cursor-default" => css.push_str(".cursor-default { cursor: default; }\n"),
                "select-none" => css.push_str(".select-none { user-select: none; }\n"),

                // Transitions
                "transition" => css.push_str(".transition { transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }\n"),
                "transition-all" => css.push_str(".transition-all { transition-property: all; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }\n"),

                // Effects
                "shadow" => css.push_str(".shadow { box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06); }\n"),
                "shadow-md" => css.push_str(".shadow-md { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }\n"),
                "shadow-lg" => css.push_str(".shadow-lg { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }\n"),

                // Display
                "sr-only" => css.push_str(".sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border-width: 0; }\n"),

                // Prose (for markdown content)
                "prose" => css.push_str(".prose { color: var(--h0-900); max-width: 65ch; line-height: 1.75; }\n"),
                "prose-custom" => css.push_str(".prose-custom { color: var(--h0-900); max-width: 65ch; line-height: 1.75; }\n"),

                _ => {
                    // Check if it's a color class we haven't handled
                    if class.starts_with("bg-") || class.starts_with("text-") || class.starts_with("border-") {
                        // These are handled by the color system
                        continue;
                    }
                    // Don't generate CSS for unknown classes - just ignore them
                    // This prevents CSS bloat
                }
            }
        }

        css
    }
}
