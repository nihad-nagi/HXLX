// src/templates.rs - Updated for MVC loading
use crate::registry::{ComponentDefinition, ComponentSource};
use std::collections::HashMap;
use std::path::Path;
use tera::Tera;

pub struct ComponentManager {
    tera: Tera,
    css_bundle: String,
    js_bundle: String,
    component_defs: HashMap<String, ComponentDefinition>,
}

impl ComponentManager {
    pub fn new(base_dir: &Path) -> Result<Self, anyhow::Error> {
        let mut tera = Tera::default();
        let mut css_bundle = String::new();
        let mut js_bundle = String::new();
        let mut component_defs = HashMap::new();

        // Load built-in components from embedded directory
        Self::load_builtin_components(
            &mut tera,
            &mut css_bundle,
            &mut js_bundle,
            &mut component_defs,
        )?;

        // Load user components from project directory
        let user_components_dir = base_dir.join("components");
        if user_components_dir.exists() {
            Self::load_user_components(
                &user_components_dir,
                &mut tera,
                &mut css_bundle,
                &mut js_bundle,
                &mut component_defs,
            )?;
        }

        // Register filters and functions
        Self::register_default_filters(&mut tera);
        Self::register_default_functions(&mut tera);

        Ok(Self {
            tera,
            css_bundle,
            js_bundle,
            component_defs,
        })
    }

    fn load_builtin_components(
        tera: &mut Tera,
        css_bundle: &mut String,
        js_bundle: &mut String,
        component_defs: &mut HashMap<String, ComponentDefinition>,
    ) -> Result<(), anyhow::Error> {
        let builtin_components = [
            (
                "admonition",
                include_str!("../../components/admonition/model.html"),
            ),
            ("tabs", include_str!("../../components/tabs/model.html")),
            (
                "callout",
                include_str!("../../components/callout/model.html"),
            ),
        ];

        for (name, template) in builtin_components.iter() {
            // Register template
            let template_name = format!("components/{}.html", name);
            tera.add_raw_template(&template_name, template)?;

            // Load CSS
            let css = match *name {
                "admonition" => include_str!("../../components/admonition/view.css"),
                "tabs" => include_str!("../../components/tabs/view.css"),
                "callout" => include_str!("../../components/callout/view.css"),
                _ => "",
            };

            if !css.is_empty() {
                css_bundle.push_str(&format!("/* Component: {} */\n", name));
                css_bundle.push_str(css);
                css_bundle.push_str("\n\n");
            }

            // Load JS
            let js = match *name {
                "admonition" => include_str!("../../components/admonition/control.js"),
                "tabs" => include_str!("../../components/tabs/control.js"),
                "callout" => include_str!("../../components/callout/control.js"),
                _ => "",
            };

            if !js.is_empty() {
                js_bundle.push_str(&format!("// Component: {}\n", name));
                js_bundle.push_str(js);
                js_bundle.push_str("\n\n");
            }

            // Create definition
            let def = ComponentDefinition {
                source: ComponentSource::Inline {
                    template: template.to_string(),
                    css: Some(css.to_string()),
                    js: Some(js.to_string()),
                },
                schema: None,
                default_attrs: None,
                version: Some("1.0.0".to_string()),
                dependencies: None,
                builtin: true,
            };

            component_defs.insert(name.to_string(), def);
        }

        Ok(())
    }

    fn load_user_components(
        components_dir: &Path,
        tera: &mut Tera,
        css_bundle: &mut String,
        js_bundle: &mut String,
        component_defs: &mut HashMap<String, ComponentDefinition>,
    ) -> Result<(), anyhow::Error> {
        use crate::registry::load_components_from_directory;

        let components = load_components_from_directory(components_dir)?;

        for (name, def) in components {
            // Load the component
            let loaded = def.source.load(components_dir)?;

            // Register template
            let template_name = format!("components/{}.html", name);
            tera.add_raw_template(&template_name, &loaded.template)?;

            // Add to bundles
            if let Some(css) = loaded.css {
                css_bundle.push_str(&format!("/* Component: {} */\n", name));
                css_bundle.push_str(&css);
                css_bundle.push_str("\n\n");
            }

            if let Some(js) = loaded.js {
                js_bundle.push_str(&format!("// Component: {}\n", name));
                js_bundle.push_str(&js);
                js_bundle.push_str("\n\n");
            }

            component_defs.insert(name, def);
        }

        Ok(())
    }

    pub fn tera(&self) -> &Tera {
        &self.tera
    }

    pub fn css_bundle(&self) -> &str {
        &self.css_bundle
    }

    pub fn js_bundle(&self) -> &str {
        &self.js_bundle
    }

    pub fn component_defs(&self) -> &HashMap<String, ComponentDefinition> {
        &self.component_defs
    }
}
