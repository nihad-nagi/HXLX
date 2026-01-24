// /home/enzi/HXLX/plugins/mdbook-components/src/preprocessor.rs
use crate::hydration::{HydrationData, HydrationManager};
use crate::parser::ComponentParser;
use crate::registry::ComponentMetadata;
use crate::templates::{
    register_builtin_templates, register_default_filters, register_default_functions,
};
use crate::tera::ast::Node;
use crate::ComponentConfig;
use crate::ComponentError;
use log::{error, warn};
use mdbook::book::{Book, BookItem};
use mdbook::preprocess::{Preprocessor, PreprocessorContext};
use parking_lot::Mutex;
use serde_json::json;
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use std::sync::Arc;
use tera::{Context, Tera, Value as TeraValue};

pub struct TeraComponents {
    tera: Arc<Mutex<Tera>>,
    config: ComponentConfig,
    hydration_manager: Arc<Mutex<HydrationManager>>,
}

impl TeraComponents {
    pub fn new(config: ComponentConfig) -> Result<Self, ComponentError> {
        config.validate()?;

        let mut tera = Tera::default();

        // Register built-in templates
        register_builtin_templates(&mut tera)?;

        // Register custom templates from config
        for (name, template) in &config.templates {
            tera.add_raw_template(name, template)?;
        }

        // Register component templates
        for (name, def) in &config.components {
            let template_name = format!("components/{}.html", name);
            tera.add_raw_template(&template_name, &def.template)?;
        }

        // Register filters and functions
        register_default_filters(&mut tera);
        register_default_functions(&mut tera);

        let hydration_manager = HydrationManager::new(config.strict, config.debug);

        Ok(Self {
            tera: Arc::new(Mutex::new(tera)),
            config,
            hydration_manager: Arc::new(Mutex::new(hydration_manager)),
        })
    }

    pub fn process_content(&self, content: &str) -> Result<String, Vec<ComponentError>> {
        let parser = ComponentParser::new(content);
        let nodes = match parser.parse() {
            Ok(nodes) => nodes,
            Err(e) => {
                let mut manager = self.hydration_manager.lock();
                manager.add_error(e.clone());
                return Err(vec![e]);
            }
        };

        let mut result = String::new();
        let mut errors = Vec::new();

        for node in nodes {
            match self.render_node(&node) {
                Ok(rendered) => result.push_str(&rendered),
                Err(e) => {
                    errors.push(e.clone());
                    let mut manager = self.hydration_manager.lock();
                    manager.add_error(e);

                    if self.config.strict {
                        break;
                    }
                }
            }
        }

        if errors.is_empty() {
            Ok(result)
        } else {
            Err(errors)
        }
    }

    fn render_node(&self, node: &Node) -> Result<String, ComponentError> {
        match node {
            Node::Text(text) => Ok(text.clone()),
            Node::Component {
                name,
                attrs,
                children,
                line,
                col,
                id,
            } => {
                // Get component definition
                let def = self
                    .config
                    .components
                    .get(name)
                    .ok_or_else(|| ComponentError::UnknownComponent(name.clone()))?;

                // Validate against schema
                if let Some(schema) = &def.schema {
                    self.validate_component(name, attrs, schema, *line, *col)?;
                }

                // Render children first
                let mut rendered_children = String::new();
                for child in children {
                    rendered_children.push_str(&self.render_node(child)?);
                }

                // Prepare context
                let mut context = Context::new();
                context.insert("children", &rendered_children);
                context.insert("attrs", attrs);
                context.insert("line", line);
                context.insert("col", col);
                context.insert("id", id);

                // Add individual attributes to context
                for (key, value) in attrs {
                    context.insert(key, value);
                }

                // Add default attributes
                if let Some(defaults) = &def.default_attrs {
                    for (key, value) in defaults {
                        context.entry(key).or_insert(value.clone());
                    }
                }

                // Create hydration data
                let hydration = HydrationData::new(
                    id.clone(),
                    name.clone(),
                    String::new(), // Will be filled after rendering
                    attrs.clone(),
                    def.dependencies.clone().unwrap_or_default(),
                );

                context.insert("hydration", &json!(hydration));

                // Determine template name
                let template_name = format!("components/{}.html", name);

                // Render server HTML
                let tera = self.tera.lock();
                let server_html = tera.render(&template_name, &context)?;

                // Update hydration data with actual server HTML
                let mut updated_hydration = hydration.clone();
                updated_hydration.server_html = server_html.clone();

                // Create final HTML with hydration data
                let escaped_hydration = updated_hydration.to_html_attr()?;

                let final_html = format!(
                    r#"<div data-component="{}" data-hydration="{}" data-component-id="{}">{}</div>"#,
                    name, escaped_hydration, id, server_html
                );

                Ok(final_html)
            }
        }
    }

    fn validate_component(
        &self,
        name: &str,
        attrs: &HashMap<String, TeraValue>,
        schema: &crate::registry::ComponentSchema,
        line: usize,
        col: usize,
    ) -> Result<(), ComponentError> {
        if let Some(required) = &schema.required {
            for field in required {
                if !attrs.contains_key(field) {
                    return Err(ComponentError::ValidationError(format!(
                        "Component '{}' at line {}:{} missing required attribute '{}'",
                        name, line, col, field
                    )));
                }
            }
        }

        Ok(())
    }

    pub fn generate_component_registry(&self) -> String {
        let mut registry = HashMap::new();

        for (name, def) in &self.config.components {
            let metadata = ComponentMetadata {
                name: name.clone(),
                version: def.version.clone().unwrap_or_else(|| "1.0.0".to_string()),
                dependencies: def.dependencies.clone().unwrap_or_default(),
                schema: def.schema.clone(),
                css_deps: def.css_deps.clone().unwrap_or_default(),
                js_deps: def.js_deps.clone().unwrap_or_default(),
            };
            registry.insert(name.clone(), metadata);
        }

        serde_json::to_string_pretty(&registry).unwrap_or_else(|_| "{}".to_string())
    }

    pub fn generate_client_js(&self) -> String {
        let mut js = String::new();

        // Add Component base class
        js.push_str(include_str!("../assets/Component.js"));
        js.push_str("\n\n");

        // Add ComponentRegistry
        js.push_str(include_str!("../assets/ComponentRegistry.js"));
        js.push_str("\n\n");

        // Add HydrationManager
        js.push_str(include_str!("../assets/HydrationManager.js"));
        js.push_str("\n\n");

        // Add component-specific JavaScript
        for (name, def) in &self.config.components {
            if let Some(js_code) = &def.js {
                js.push_str(&format!("// Component: {}\n", name));
                js.push_str(js_code);
                js.push_str("\n\n");
            }
        }

        // Auto-initialization
        js.push_str(&format!(
            r#"
            // Auto-initialize on page load
            document.addEventListener('DOMContentLoaded', () => {{
                const registry = new ComponentRegistry('{}', {{
                    strictHydration: {},
                    debug: {}
                }});

                // Register built-in components
                if (typeof window.mdBookComponents !== 'undefined') {{
                    Object.entries(window.mdBookComponents).forEach(([name, ComponentClass]) => {{
                        registry.register(name, ComponentClass);
                    }});
                }}

                // Hydrate all components
                registry.hydratePage();
            }});
            "#,
            self.config.namespace, self.config.strict_hydration, self.config.debug
        ));

        js
    }

    pub fn generate_css(&self) -> String {
        let mut css = String::new();

        // Add built-in CSS
        css.push_str(include_str!("../static/styles/components.css"));

        // Add component-specific CSS
        for (_, def) in &self.config.components {
            if let Some(css_code) = &def.css {
                css.push_str(css_code);
                css.push_str("\n");
            }
        }

        css
    }
}

impl Preprocessor for TeraComponents {
    fn name(&self) -> &str {
        "tera-components"
    }

    fn run(&self, ctx: &PreprocessorContext, mut book: Book) -> mdbook::errors::Result<Book> {
        let mut errors = Vec::new();

        book.for_each_mut(|item| {
            if let BookItem::Chapter(chapter) = item {
                match self.process_content(&chapter.content) {
                    Ok(content) => chapter.content = content,
                    Err(chapter_errors) => {
                        errors.extend(chapter_errors);

                        if self.config.strict {
                            error!(
                                "Strict mode enabled, component errors found in chapter: {}",
                                chapter.name
                            );
                        } else if self.config.debug {
                            warn!(
                                "Component errors in chapter {}: {:?}",
                                chapter.name, chapter_errors
                            );
                        }
                    }
                }
            }
            // Generate JavaScript and CSS
            let build_dir = Path::new(&ctx.config.build.build_dir);

            // Generate JavaScript
            let js = self.generate_client_js();
            let js_path = build_dir.join("components.js");
            fs::write(js_path, js)?;

            // Generate CSS
            let css = self.generate_css();
            let css_path = build_dir.join("components.css");
            fs::write(css_path, css)?;

            Ok(book)
        });

        // Check if we should fail the build
        if self.config.warnings_as_errors && !errors.is_empty() {
            return Err(mdbook::errors::Error::msg(format!(
                "Component preprocessor found {} errors (warnings-as-errors enabled)",
                errors.len()
            )));
        }

        Ok(book)
    }

    fn supports_renderer(&self, renderer: &str) -> bool {
        renderer == "html"
    }
}

impl Clone for TeraComponents {
    fn clone(&self) -> Self {
        Self {
            tera: Arc::clone(&self.tera),
            config: self.config.clone(),
            hydration_manager: Arc::clone(&self.hydration_manager),
        }
    }
}
