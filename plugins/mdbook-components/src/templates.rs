// src/templates.rs
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

        // Load built-in components from src/components/
        Self::load_builtin_components(
            &mut tera,
            &mut css_bundle,
            &mut js_bundle,
            &mut component_defs,
        )?;

        // Load user components from project's components/ directory
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

        // Register filters
        Self::register_default_filters(&mut tera);

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
        // Built-in components are now in src/components/
        let builtin_components = [
            (
                "admonition",
                include_str!("components/admonition/model.html"),
                include_str!("components/admonition/view.css"),
                include_str!("components/admonition/control.js"),
            ),
            (
                "example",
                include_str!("components/example/model.html"),
                include_str!("components/example/view.css"),
                include_str!("components/example/control.js"),
            ),
        ];

        for (name, template, css, js) in builtin_components.iter() {
            // Register template
            let template_name = format!("components/{}.html", name);
            tera.add_raw_template(&template_name, template)?;

            // Add CSS to bundle
            if !css.is_empty() {
                css_bundle.push_str(&format!("/* Component: {} */\n", name));
                css_bundle.push_str(css);
                css_bundle.push_str("\n\n");
            }

            // Add JS to bundle
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
                css_deps: None,
                js_deps: None,
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

        // Auto-discover components from directory
        let components = load_components_from_directory(components_dir)?;

        for (name, def) in components {
            // Load the component
            let loaded = def.source.load(components_dir)?;

            // Register template
            let template_name = format!("components/{}.html", name);
            tera.add_raw_template(&template_name, &loaded.template)?;

            // Add to bundles
            if let Some(css) = loaded.css {
                if !css.is_empty() {
                    css_bundle.push_str(&format!("/* Component: {} */\n", name));
                    css_bundle.push_str(&css);
                    css_bundle.push_str("\n\n");
                }
            }

            if let Some(js) = loaded.js {
                if !js.is_empty() {
                    js_bundle.push_str(&format!("// Component: {}\n", name));
                    js_bundle.push_str(&js);
                    js_bundle.push_str("\n\n");
                }
            }

            component_defs.insert(name, def);
        }

        Ok(())
    }

    fn register_default_filters(tera: &mut Tera) {
        // Markdown filter
        tera.register_filter(
            "markdown",
            |value: &tera::Value, _: &HashMap<String, tera::Value>| {
                use pulldown_cmark::{html, Options, Parser};

                if let Some(s) = value.as_str() {
                    let options = Options::empty();
                    let parser = Parser::new_ext(s, options);
                    let mut html_output = String::new();
                    html::push_html(&mut html_output, parser);
                    Ok(tera::Value::String(html_output))
                } else {
                    Err(tera::Error::msg(
                        "Input to markdown filter must be a string",
                    ))
                }
            },
        );

        // JSON filter
        tera.register_filter(
            "tojson",
            |value: &tera::Value, _: &HashMap<String, tera::Value>| match serde_json::to_string(
                value,
            ) {
                Ok(s) => Ok(tera::Value::String(s)),
                Err(e) => Err(tera::Error::msg(format!("JSON error: {}", e))),
            },
        );

        // Default filter
        tera.register_filter(
            "default",
            |value: &tera::Value, args: &HashMap<String, tera::Value>| {
                if value.is_null() || (value.is_string() && value.as_str().unwrap().is_empty()) {
                    if let Some(default_value) = args.get("value") {
                        Ok(default_value.clone())
                    } else {
                        Ok(tera::Value::Null)
                    }
                } else {
                    Ok(value.clone())
                }
            },
        );

        // Capitalize filter
        tera.register_filter(
            "capitalize",
            |value: &tera::Value, _: &HashMap<String, tera::Value>| {
                if let Some(s) = value.as_str() {
                    let mut chars = s.chars();
                    match chars.next() {
                        None => Ok(tera::Value::String(String::new())),
                        Some(first) => {
                            let capitalized =
                                first.to_uppercase().collect::<String>() + chars.as_str();
                            Ok(tera::Value::String(capitalized))
                        }
                    }
                } else {
                    Err(tera::Error::msg(
                        "Input to capitalize filter must be a string",
                    ))
                }
            },
        );
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

    pub fn has_component(&self, name: &str) -> bool {
        self.component_defs.contains_key(name)
    }
}
