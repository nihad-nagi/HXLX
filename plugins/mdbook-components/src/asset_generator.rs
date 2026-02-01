// /home/enzi/HXLX/plugins/mdbook-components/src/asset_generator.rs
use crate::templates::ComponentManager;
use crate::unocss_manager::UnoCSSManager;
use std::fs;
use std::path::Path;

// Embedded assets - ONLY Alpine.js
const ALPINE_JS: &[u8] = include_bytes!("../assets/alpine.min.js");
const ALPINE_INIT: &[u8] = include_bytes!("../assets/alpine-init.js");

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

        fs::create_dir_all(&styles_dir)?;
        fs::create_dir_all(&scripts_dir)?;

        // Generate CSS bundle
        self.generate_css_bundle(&styles_dir)?;

        // Generate JS bundle
        self.generate_js_bundle(&scripts_dir)?;

        Ok(())
    }

    fn generate_css_bundle(&self, styles_dir: &Path) -> Result<(), anyhow::Error> {
        // 1. Get component CSS from view.css files
        let component_css = self.manager.css_bundle();

        // 2. Generate 40×4 color system (our custom implementation)
        let color_css = UnoCSSManager::generate_color_css();

        // 3. Extract classes from all templates and generate utilities
        let all_templates = self.collect_all_templates();
        let classes = UnoCSSManager::extract_classes(&all_templates);
        let utility_css = UnoCSSManager::generate_utility_css(&classes);

        // 4. Bundle everything
        let css_content = format!(
            "/* mdBook Components CSS Bundle */
/* Generated at: {} */

/* ========== Component-Specific CSS ========== */
{}

/* ========== Color System (40 hues × 4 luminance levels) ========== */
{}

/* ========== Generated Utility Classes ========== */
{}",
            chrono::Utc::now().to_rfc3339(),
            component_css,
            color_css,
            utility_css
        );

        fs::write(styles_dir.join("components.css"), css_content)?;
        log::debug!("Generated CSS bundle ({} bytes)", css_content.len());

        Ok(())
    }

    fn collect_all_templates(&self) -> String {
        let mut all_templates = String::new();

        for (name, def) in self.manager.component_defs() {
            if let crate::registry::ComponentSource::Inline { template, .. } = &def.source {
                all_templates.push_str(template);
                all_templates.push('\n');
            }
        }

        all_templates
    }

    fn generate_js_bundle(&self, scripts_dir: &Path) -> Result<(), anyhow::Error> {
        // Bundle: Alpine.js + our initialization
        let js_content = format!(
            r#"// mdBook Components JavaScript Bundle
// Generated at: {}

// ========== Alpine.js v3.14.0 ==========
{}

// ========== mdBook Components Initialization ==========
{}
"#,
            chrono::Utc::now().to_rfc3339(),
            String::from_utf8_lossy(ALPINE_JS),
            String::from_utf8_lossy(ALPINE_INIT)
        );

        fs::write(scripts_dir.join("components.js"), js_content)?;
        log::debug!("Generated JS bundle ({} bytes)", js_content.len());

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
    log::info!("Color system includes:");
    log::info!("   • 40 hues (H0-H39, 9° increments)");
    log::info!("   • 4 luminance levels per hue (L1-L4: 25%, 50%, 75%, 100%)");
    log::info!("   • Semantic colors: primary, secondary, success, warning, danger, info");
    log::info!("");
    log::info!("Add to your book.toml:");
    log::info!("  [output.html]");
    log::info!("  additional-css = [\"{}\"]", css_path);
    log::info!("  additional-js = [\"{}\"]", js_path);

    Ok(())
}
