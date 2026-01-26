// src/main.rs (Simplified version without toml_edit)
use anyhow::{Context, Result};
use clap::{crate_authors, crate_description, crate_version, Arg, ArgMatches, Command};
use mdbook::preprocess::{CmdPreprocessor, Preprocessor};
use mdbook_components::asset_generator;
use mdbook_components::preprocessor::ComponentPreprocessor;
use mdbook_components::registry::ComponentConfig;
use serde_json;
use std::fs;
use std::io::{self};
use std::path::PathBuf;
use std::process;

pub fn make_app() -> Command {
    Command::new("mdbook-components")
        .version(crate_version!())
        .author(crate_authors!())
        .about(crate_description!())
        .subcommand(
            Command::new("supports")
                .arg(Arg::new("renderer").required(true))
                .about("Check whether a renderer is supported by this preprocessor"),
        )
        .subcommand(
            Command::new("install")
                .arg(
                    Arg::new("dir")
                        .default_value(".")
                        .help("Root directory for the book (contains book.toml)"),
                )
                .about("Install required assets and update configuration"),
        )
        .subcommand(
            Command::new("generate")
                .arg(
                    Arg::new("dir")
                        .default_value(".")
                        .help("Root directory for the book (contains book.toml)"),
                )
                .about("Generate consolidated component assets (CSS/JS bundles)"),
        )
        .subcommand(Command::new("list").about("List all available built-in components"))
        .subcommand(
            Command::new("init")
                .arg(
                    Arg::new("dir")
                        .default_value(".")
                        .help("Directory to initialize with example component"),
                )
                .about("Initialize a new custom component"),
        )
}

fn main() -> Result<()> {
    env_logger::init_from_env(env_logger::Env::default().default_filter_or("info"));

    let matches = make_app().get_matches();

    match matches.subcommand() {
        Some(("supports", sub_args)) => handle_supports(sub_args),
        Some(("install", sub_args)) => handle_install(sub_args)?,
        Some(("generate", sub_args)) => handle_generate(sub_args)?,
        Some(("list", _)) => handle_list(),
        Some(("init", sub_args)) => handle_init(sub_args)?,
        _ => handle_preprocessing()?,
    }

    Ok(())
}

fn handle_preprocessing() -> Result<()> {
    let (ctx, book) = CmdPreprocessor::parse_input(io::stdin())?;

    if ctx.mdbook_version != mdbook::MDBOOK_VERSION {
        eprintln!(
            "Warning: mdbook-components was built against mdbook {}, but we're being called from version {}",
            mdbook::MDBOOK_VERSION,
            ctx.mdbook_version
        );
    }

    // Load configuration from book.toml
    let config = ComponentConfig::from_context(&ctx).unwrap_or_default();

    let processor = ComponentPreprocessor::new(config)
        .context("Failed to initialize component preprocessor")?;

    let processed_book = processor.run(&ctx, book)?;

    serde_json::to_writer(io::stdout(), &processed_book)?;

    Ok(())
}

fn handle_generate(sub_args: &ArgMatches) -> Result<()> {
    let dir = sub_args.get_one::<String>("dir").unwrap();
    let project_dir = PathBuf::from(dir);

    log::info!("Generating component assets in {}", project_dir.display());

    // Generate assets
    asset_generator::generate_assets(&project_dir)?;

    Ok(())
}

fn handle_supports(sub_args: &ArgMatches) -> ! {
    let renderer = sub_args
        .get_one::<String>("renderer")
        .expect("Required argument");
    let supports = renderer == "html";

    if supports {
        println!("Supported");
        process::exit(0);
    } else {
        println!("Unsupported");
        process::exit(1);
    }
}

fn handle_install(sub_args: &ArgMatches) -> Result<()> {
    let proj_dir = sub_args.get_one::<String>("dir").unwrap();
    let proj_dir = PathBuf::from(proj_dir);

    log::info!("Installing mdbook-components to {}", proj_dir.display());

    // Update book.toml configuration
    let config_path = proj_dir.join("book.toml");
    if config_path.exists() {
        let original_content = fs::read_to_string(&config_path)?;
        let updated_content = update_book_config(&original_content);

        if original_content != updated_content {
            log::info!("Updating book.toml configuration");
            fs::write(&config_path, updated_content)?;
        }
    } else {
        log::warn!("No book.toml found. Creating minimal configuration...");
        let config = r#"[book]
title = "My Book"
authors = ["Author"]
src = "src"

[output.html]
additional-js = ["static/scripts/components.js"]
additional-css = ["static/styles/components.css"]

[preprocessor.components]
command = "mdbook-components"
"#;
        fs::write(&config_path, config)?;
    }

    // Create components directory with example
    let components_dir = proj_dir.join("components");
    if !components_dir.exists() {
        fs::create_dir_all(&components_dir)?;

        // Copy example component - show users how to create components
        let example_dir = components_dir.join("example");
        fs::create_dir_all(&example_dir)?;

        fs::write(
            example_dir.join("model.html"),
            include_str!("components/example/model.html"),
        )?;
        fs::write(
            example_dir.join("view.css"),
            include_str!("components/example/view.css"),
        )?;
        fs::write(
            example_dir.join("control.js"),
            include_str!("components/example/control.js"),
        )?;

        log::info!("Created example component in {}", example_dir.display());

        // Also create a README explaining the structure
        fs::write(
            components_dir.join("README.md"),
            r#"# Custom Components Directory

This directory contains custom components for your mdBook.

## Component Structure
Each component should be in its own directory with:

1. `model.html` - Template (required)
2. `view.css` - Styles (optional)
3. `control.js` - JavaScript (optional)

## Example
{% component "example" title="My Title" %}
Markdown content here
{% endcomponent %}

## Creating a New Component
1. Create a new directory: `mkdir components/my-component`
2. Create the 3 files above
3. Use in markdown: `{% component "my-component" attr="value" %}...{% endcomponent %}`
"#,
        )?;
    }

    // Generate assets after installation
    log::info!("Generating component assets...");
    asset_generator::generate_assets(&proj_dir)?;

    log::info!("✅ Installation complete!");
    log::info!("");
    log::info!("Components will be auto-discovered from the 'components/' directory.");
    log::info!("");
    log::info!("Built-in components available immediately:");
    log::info!("  • admonition - Note/warning/tip/danger callouts");
    log::info!("  • example - Interactive example with toggle");
    log::info!("");
    log::info!("Usage in markdown:");
    log::info!("  {{% component \"admonition\" type=\"warning\" title=\"Alert\" %}}");
    log::info!("  This is a warning");
    log::info!("  {{% endcomponent %}}");
    log::info!("");
    log::info!("Create custom components in 'components/' directory");
    log::info!("Run 'mdbook build' to see your components in action!");

    Ok(())
}

fn update_book_config(original: &str) -> String {
    let mut content = original.to_string();

    // Simple check: if we don't have [output.html] section at all, add it
    if !content.contains("[output.html]") {
        content.push_str("\n[output.html]\n");
        content.push_str("additional-js = [\"static/scripts/components.js\"]\n");
        content.push_str("additional-css = [\"static/styles/components.css\"]\n");
    } else {
        // Check for additional-js - add if missing
        let needs_js = !content.contains("additional-js")
            || (content.contains("additional-js")
                && !content.contains("static/scripts/components.js"));

        if needs_js {
            if let Some(pos) = content.find("[output.html]") {
                let insert_pos = pos + "[output.html]".len();
                content.insert_str(
                    insert_pos,
                    "\nadditional-js = [\"static/scripts/components.js\"]",
                );
            }
        }

        // Check for additional-css - add if missing
        let needs_css = !content.contains("additional-css")
            || (content.contains("additional-css")
                && !content.contains("static/styles/components.css"));

        if needs_css {
            if let Some(pos) = content.find("[output.html]") {
                let insert_pos = pos + "[output.html]".len();
                content.insert_str(
                    insert_pos,
                    "\nadditional-css = [\"static/styles/components.css\"]",
                );
            }
        }
    }

    // Ensure [preprocessor.components] section exists
    if !content.contains("[preprocessor.components]") {
        content.push_str("\n[preprocessor.components]\n");
        content.push_str("command = \"mdbook-components\"\n");
    } else {
        // Check for command
        if !content.contains("command =") {
            if let Some(pos) = content.find("[preprocessor.components]") {
                let insert_pos = pos + "[preprocessor.components]".len();
                content.insert_str(insert_pos, "\ncommand = \"mdbook-components\"");
            }
        }
    }

    content
}

fn handle_list() -> ! {
    println!("Available built-in components:");
    println!();

    let components = [
        ("admonition", "Note/warning/tip/danger callouts"),
        ("example", "Example component with toggle functionality"),
    ];

    for (name, description) in &components {
        println!("  • {:<12} - {}", name, description);
    }

    println!();
    println!("To use a component:");
    println!(
        "  {{% component \"{}\" type=\"warning\" title=\"Alert\" %}}",
        components[0].0
    );
    println!("  This is a warning");
    println!("  {{% endcomponent %}}");

    process::exit(0)
}

fn handle_init(sub_args: &ArgMatches) -> Result<()> {
    let proj_dir = sub_args.get_one::<String>("dir").unwrap();
    let proj_dir = PathBuf::from(proj_dir);

    // Create a custom component
    let components_dir = proj_dir.join("components");
    fs::create_dir_all(&components_dir)?;

    let component_name = "mycomponent";
    let component_dir = components_dir.join(component_name);

    if component_dir.exists() {
        anyhow::bail!("Component '{}' already exists", component_name);
    }

    fs::create_dir_all(&component_dir)?;

    // Create MVC files for custom component
    let model_html = r#"<div class="mycomponent" data-component="mycomponent" data-component-id="{{ id }}">
    <h2>{{ title }}</h2>
    <div class="mycomponent-content">
        {{ children | markdown | safe }}
    </div>
    {% if footer %}
    <div class="mycomponent-footer">{{ footer }}</div>
    {% endif %}
</div>"#;

    let view_css = r#".mycomponent {
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 1rem;
    margin: 1rem 0;
    background: white;
}

.mycomponent h2 {
    margin-top: 0;
    color: #3b82f6;
}

.mycomponent-content {
    line-height: 1.6;
}

.mycomponent-footer {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #e5e7eb;
    font-size: 0.875rem;
    color: #6b7280;
}"#;

    let control_js = r#"class MyComponent {
    constructor(el, options = {}) {
        this.el = el;
        this.props = options.props || {};
        console.log(`MyComponent "${this.props.title}" initialized`);
    }
}

// Auto-register
if (typeof window !== 'undefined' && window.mdBookComponents) {
    window.mdBookComponents.components.mycomponent = MyComponent;
}"#;

    fs::write(component_dir.join("model.html"), model_html)?;
    fs::write(component_dir.join("view.css"), view_css)?;
    fs::write(component_dir.join("control.js"), control_js)?;

    log::info!("✅ Custom component '{}' created!", component_name);
    log::info!("Location: {}", component_dir.display());
    log::info!("");
    log::info!("Add to book.toml:");
    log::info!("  [preprocessor.components.components.{}]", component_name);
    log::info!("  builtin = false");
    log::info!("");
    log::info!("Use in markdown:");
    log::info!(
        "  {{% component \"{}\" title=\"My Title\" %}}",
        component_name
    );
    log::info!("  Your content here");
    log::info!("  {{% endcomponent %}}");

    Ok(())
}
