use crate::parser::ComponentParser;
use crate::registry::ComponentConfig;
use crate::templates::ComponentManager;
use mdbook::book::{Book, BookItem};
use mdbook::preprocess::{Preprocessor, PreprocessorContext};
use std::fs;
use std::path::Path;
use tera::Context;

pub struct ComponentPreprocessor {
    manager: ComponentManager,
    config: ComponentConfig,
}

impl ComponentPreprocessor {
    pub fn new(config: ComponentConfig) -> Result<Self, anyhow::Error> {
        let base_dir = Path::new(".");
        let manager = ComponentManager::new(base_dir)?;

        Ok(Self { manager, config })
    }

    pub fn process_content(&self, content: &str) -> Result<String, crate::errors::ComponentError> {
        let parser = ComponentParser::new(content);
        let nodes = parser.parse()?;

        let mut result = String::new();

        for node in nodes {
            match node {
                crate::parser::Node::Text(text) => result.push_str(&text),
                crate::parser::Node::Component {
                    name,
                    attrs,
                    children,
                    line: _,
                    col: _,
                    id,
                } => {
                    // Check if component exists
                    if !self.manager.component_defs().contains_key(&name) {
                        return Err(crate::errors::ComponentError::UnknownComponent(name));
                    }

                    // Render children
                    let mut child_content = String::new();
                    for child in children {
                        child_content.push_str(&self.render_node(child)?);
                    }

                    // Create context
                    let mut context = Context::new();
                    context.insert("children", &child_content);
                    context.insert("id", &id);

                    // Add attributes
                    for (key, value) in &attrs {
                        context.insert(key, value);
                    }

                    // Render template
                    let template_name = format!("components/{}.html", name);
                    let server_html = self.manager.tera().render(&template_name, &context)?;

                    // Create final HTML
                    let final_html = format!(
                        r#"<div data-component="{}" data-component-id="{}">{}</div>"#,
                        name, id, server_html
                    );

                    result.push_str(&final_html);
                }
            }
        }

        Ok(result)
    }

    fn render_node(
        &self,
        node: crate::parser::Node,
    ) -> Result<String, crate::errors::ComponentError> {
        match node {
            crate::parser::Node::Text(text) => Ok(text),
            crate::parser::Node::Component {
                name,
                attrs,
                children,
                line: _,
                col: _,
                id,
            } => {
                // Recursively process nested components
                let mut content = String::new();
                for child in children {
                    content.push_str(&self.render_node(child)?);
                }

                let mut context = Context::new();
                context.insert("children", &content);
                context.insert("id", &id);

                for (key, value) in &attrs {
                    context.insert(key, value);
                }

                let template_name = format!("components/{}.html", name);
                let html = self.manager.tera().render(&template_name, &context)?;

                Ok(format!(
                    r#"<div data-component="{}" data-component-id="{}">{}</div>"#,
                    name, id, html
                ))
            }
        }
    }

    pub fn generate_assets(&self, build_dir: &Path) -> Result<(), anyhow::Error> {
        // Create static directories in build output
        let static_dir = build_dir.join("static");
        let styles_dir = static_dir.join("styles");
        let scripts_dir = static_dir.join("scripts");

        fs::create_dir_all(&styles_dir)?;
        fs::create_dir_all(&scripts_dir)?;

        // Generate combined CSS bundle
        let css_bundle = format!(
            "/* mdBook Components CSS Bundle */\n{}",
            self.manager.css_bundle()
        );

        fs::write(styles_dir.join("components.css"), css_bundle)?;

        // Generate combined JS bundle
        let js_bundle = format!(
            "// mdBook Components JavaScript Bundle\n{}\n\n// Auto-initialize\ndocument.addEventListener('DOMContentLoaded', function() {{\n    console.log('mdBook components loaded');\n}});",
            self.manager.js_bundle()
        );

        fs::write(scripts_dir.join("components.js"), js_bundle)?;

        // Also copy individual component assets for development/debugging
        let components_static = static_dir.join("components");
        fs::create_dir_all(&components_static)?;

        // This is where we could copy individual component CSS/JS files
        // For now, we just generate the bundles

        Ok(())
    }
}

impl Preprocessor for ComponentPreprocessor {
    fn name(&self) -> &str {
        "mdbook-components"
    }

    fn run(&self, ctx: &PreprocessorContext, mut book: Book) -> mdbook::errors::Result<Book> {
        // Generate assets
        let build_dir = Path::new(&ctx.config.build.build_dir);
        if let Err(e) = self.generate_assets(build_dir) {
            log::error!("Failed to generate assets: {}", e);
            if self.config.strict {
                return Err(mdbook::errors::Error::msg(format!(
                    "Failed to generate assets: {}",
                    e
                )));
            }
        }

        // Process book content
        book.for_each_mut(|item| {
            if let BookItem::Chapter(chapter) = item {
                match self.process_content(&chapter.content) {
                    Ok(content) => chapter.content = content,
                    Err(e) => {
                        log::warn!("Failed to process chapter {}: {}", chapter.name, e);

                        if self.config.strict {
                            log::error!("Strict mode: component error in chapter {}", chapter.name);
                        }
                    }
                }
            }
        });

        Ok(book)
    }

    fn supports_renderer(&self, renderer: &str) -> bool {
        renderer == "html"
    }
}
