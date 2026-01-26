use crate::asset_generator::AssetGenerator;
use crate::parser::ComponentParser;
use crate::registry::ComponentConfig;
use crate::templates::ComponentManager;
use mdbook::book::{Book, BookItem};
use mdbook::preprocess::{Preprocessor, PreprocessorContext};
// use std::fs;
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
                        if self.config.strict {
                            return Err(crate::errors::ComponentError::UnknownComponent(name));
                        } else {
                            // In non-strict mode, render as plain text
                            log::warn!("Unknown component '{}', rendering as text", name);
                            result.push_str(&format!("[Component: {}]", name));
                            continue;
                        }
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

                    // Add default attributes from component definition
                    if let Some(def) = self.manager.component_defs().get(&name) {
                        if let Some(default_attrs) = &def.default_attrs {
                            for (key, value) in default_attrs {
                                if !context.contains_key(key) {
                                    context.insert(key, value);
                                }
                            }
                        }
                    }

                    // Render template
                    let template_name = format!("components/{}.html", name);
                    let server_html = match self.manager.tera().render(&template_name, &context) {
                        Ok(html) => html,
                        Err(e) => {
                            if self.config.strict {
                                return Err(crate::errors::ComponentError::TemplateError(e));
                            } else {
                                log::error!("Failed to render component '{}': {}", name, e);
                                format!("<div class='component-error'>Error rendering component: {}</div>", name)
                            }
                        }
                    };

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

                // Add default attributes
                if let Some(def) = self.manager.component_defs().get(&name) {
                    if let Some(default_attrs) = &def.default_attrs {
                        for (key, value) in default_attrs {
                            if !context.contains_key(key) {
                                context.insert(key, value);
                            }
                        }
                    }
                }

                let template_name = format!("components/{}.html", name);
                let html = match self.manager.tera().render(&template_name, &context) {
                    Ok(html) => html,
                    Err(e) => {
                        if self.config.strict {
                            return Err(crate::errors::ComponentError::TemplateError(e));
                        } else {
                            log::error!("Failed to render component '{}': {}", name, e);
                            format!(
                                "<div class='component-error'>Error rendering component: {}</div>",
                                name
                            )
                        }
                    }
                };

                Ok(format!(
                    r#"<div data-component="{}" data-component-id="{}">{}</div>"#,
                    name, id, html
                ))
            }
        }
    }
}

impl Preprocessor for ComponentPreprocessor {
    fn name(&self) -> &str {
        "mdbook-components"
    }

    fn run(&self, ctx: &PreprocessorContext, mut book: Book) -> mdbook::errors::Result<Book> {
        // Generate assets in the source directory so they're available for mdbook
        let book_root = &ctx.root;
        let src_dir = book_root.join("src");

        if src_dir.exists() {
            // Generate assets in src/static
            match AssetGenerator::new(book_root) {
                Ok(generator) => {
                    if let Err(e) = generator.generate_all_assets(&src_dir) {
                        log::error!("Failed to generate assets: {}", e);
                        if self.config.strict {
                            return Err(mdbook::errors::Error::msg(format!(
                                "Failed to generate assets: {}",
                                e
                            )));
                        } else {
                            log::warn!("Continuing without generated assets");
                        }
                    } else {
                        log::debug!("Generated component assets in src/static/");
                    }
                }
                Err(e) => {
                    log::error!("Failed to create asset generator: {}", e);
                    if self.config.strict {
                        return Err(mdbook::errors::Error::msg(format!(
                            "Failed to create asset generator: {}",
                            e
                        )));
                    } else {
                        log::warn!("Continuing without asset generator");
                    }
                }
            }
        } else {
            log::warn!("Source directory 'src/' not found. Skipping asset generation.");
        }

        // Process book content
        book.for_each_mut(|item| {
            if let BookItem::Chapter(chapter) = item {
                match self.process_content(&chapter.content) {
                    Ok(content) => chapter.content = content,
                    Err(e) => {
                        let error_msg =
                            format!("Failed to process chapter {}: {}", chapter.name, e);

                        if self.config.strict {
                            log::error!("Strict mode: {}", error_msg);
                            // In strict mode, we could return an error here
                            // but we'll just log and continue for now
                        } else {
                            log::warn!("{}", error_msg);
                            // In non-strict mode, keep original content
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
