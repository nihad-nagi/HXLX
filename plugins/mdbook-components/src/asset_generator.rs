use crate::templates::ComponentManager;
use std::fs;
use std::path::Path; // Removed PathBuf since it's not used

pub struct AssetGenerator {
    manager: ComponentManager,
}

impl AssetGenerator {
    pub fn new(base_dir: &Path) -> Result<Self, anyhow::Error> {
        let manager = ComponentManager::new(base_dir)?;
        Ok(Self { manager })
    }

    pub fn generate_all_assets(&self, output_dir: &Path) -> Result<(), anyhow::Error> {
        // Create output directory structure
        let static_dir = output_dir.join("static");
        let styles_dir = static_dir.join("styles");
        let scripts_dir = static_dir.join("scripts");
        let components_dir = static_dir.join("components");

        fs::create_dir_all(&styles_dir)?;
        fs::create_dir_all(&scripts_dir)?;
        fs::create_dir_all(&components_dir)?;

        // Generate consolidated bundles
        self.generate_css_bundle(&styles_dir)?;
        self.generate_js_bundle(&scripts_dir)?;

        // Generate individual component assets (for debugging)
        self.generate_component_assets(&components_dir)?;

        Ok(())
    }

    fn generate_css_bundle(&self, styles_dir: &Path) -> Result<(), anyhow::Error> {
        let css_content = format!(
            "/* mdBook Components CSS Bundle */\n/* Generated from component view.css files */\n\n{}",
            self.manager.css_bundle()
        );

        fs::write(styles_dir.join("components.css"), css_content)?;
        log::debug!(
            "Generated CSS bundle: {}",
            styles_dir.join("components.css").display()
        );

        Ok(())
    }

    fn generate_js_bundle(&self, scripts_dir: &Path) -> Result<(), anyhow::Error> {
        let js_content = format!(
            r#"// mdBook Components JavaScript Bundle
// Generated from component control.js files

// Base Component framework
{}

// Component Registry framework
{}

// Hydration Manager framework
{}

// Component implementations
{}

// Main entry point
(function() {{
    // Export to global scope
    window.mdBookComponents = window.mdBookComponents || {{}};
    window.mdBookComponents.Component = window.Component || null;
    window.mdBookComponents.ComponentRegistry = window.ComponentRegistry || null;
    window.mdBookComponents.HydrationManager = window.HydrationManager || null;
    window.mdBookComponents.components = window.mdBookComponents.components || {{}};

    // Auto-register built-in components
    if (!window.mdBookComponents.components.admonition) {{
        window.mdBookComponents.components.admonition = AdmonitionComponent;
    }}
    if (!window.mdBookComponents.components.example) {{
        window.mdBookComponents.components.example = ExampleComponent;
    }}

    // Auto-initialize components on page load
    document.addEventListener('DOMContentLoaded', function() {{
        console.log('mdBook components loaded');

        // Initialize components
        const components = document.querySelectorAll('[data-component]');
        components.forEach(el => {{
            const name = el.dataset.component;
            if (name && window.mdBookComponents.components[name]) {{
                try {{
                    const ComponentClass = window.mdBookComponents.components[name];
                    new ComponentClass(el, {{}});
                }} catch (err) {{
                    console.error('Failed to initialize component:', name, err);
                }}
            }}
        }});
    }});
}})();"#,
            include_str!("../assets/Component.js"),
            include_str!("../assets/ComponentRegistry.js"),
            include_str!("../assets/HydrationManager.js"),
            self.manager.js_bundle()
        );

        fs::write(scripts_dir.join("components.js"), js_content)?;
        log::debug!(
            "Generated JS bundle: {}",
            scripts_dir.join("components.js").display()
        );

        Ok(())
    }

    fn generate_component_assets(&self, components_dir: &Path) -> Result<(), anyhow::Error> {
        // For debugging: also write individual component assets
        for (name, def) in self.manager.component_defs() {
            let component_dir = components_dir.join(name);
            fs::create_dir_all(&component_dir)?;

            if let crate::registry::ComponentSource::Inline { css, js, .. } = &def.source {
                if let Some(css_content) = css {
                    if !css_content.is_empty() {
                        fs::write(component_dir.join("view.css"), css_content)?;
                    }
                }
                if let Some(js_content) = js {
                    if !js_content.is_empty() {
                        fs::write(component_dir.join("control.js"), js_content)?;
                    }
                }
            }
        }

        Ok(())
    }

    pub fn get_asset_paths(&self) -> (String, String) {
        (
            "static/styles/components.css".to_string(),
            "static/scripts/components.js".to_string(),
        )
    }
}

// Standalone function for use from CLI
pub fn generate_assets(project_dir: &Path) -> Result<(), anyhow::Error> {
    let generator = AssetGenerator::new(project_dir)?;

    // Determine if we're in an mdbook project
    let src_dir = project_dir.join("src");
    let output_dir = if src_dir.exists() {
        // We're in the book root, output to src/static
        src_dir
    } else {
        // We're in src directory or elsewhere, output to current dir
        project_dir.to_path_buf()
    };

    generator.generate_all_assets(&output_dir)?;

    let (css_path, js_path) = generator.get_asset_paths();
    log::info!("✅ Generated assets:");
    log::info!("   - {}", css_path);
    log::info!("   - {}", js_path);
    log::info!("");
    log::info!("Add to your book.toml:");
    log::info!("  [output.html]");
    log::info!("  additional-css = [\"{}\"]", css_path);
    log::info!("  additional-js = [\"{}\"]", js_path);

    Ok(())
}
