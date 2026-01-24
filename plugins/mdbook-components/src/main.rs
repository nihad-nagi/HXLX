// src/main.rs
use anyhow::{Context, Result};
use clap::{crate_authors, crate_description, crate_version, Arg, ArgMatches, Command};
use mdbook::preprocess::{CmdPreprocessor, Preprocessor};
use mdbook_components::preprocessor::{ComponentConfig, TeraComponents};
use serde_json;
use std::fs;
use std::io::{self};
use std::path::{Path, PathBuf};
use std::process;

const CORE_JS: &[u8] = include_bytes!("../assets/core.js");
const CORE_CSS: &[u8] = include_bytes!("../assets/core.css");

const ASSETS: &[(&str, &[u8])] = &[
    ("mdbook-components.js", CORE_JS),
    ("mdbook-components.css", CORE_CSS),
];

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
        .subcommand(Command::new("list").about("List all available built-in components"))
        .subcommand(
            Command::new("init")
                .arg(
                    Arg::new("dir")
                        .default_value(".")
                        .help("Directory to initialize with example component"),
                )
                .arg(
                    Arg::new("component")
                        .short('c')
                        .long("component")
                        .help("Component name to initialize"),
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

    let processor =
        TeraComponents::new(config).context("Failed to initialize component preprocessor")?;

    let processed_book = processor.run(&ctx, book)?;

    serde_json::to_writer(io::stdout(), &processed_book)?;

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
    let config_path = proj_dir.join("book.toml");

    if !config_path.exists() {
        anyhow::bail!("Configuration file '{}' not found", config_path.display());
    }

    log::info!("Reading configuration from {}", config_path.display());
    let config_content = fs::read_to_string(&config_path).context("Failed to read book.toml")?;

    let mut doc = config_content
        .parse::<toml_edit::Document>()
        .context("Invalid TOML in configuration")?;

    // Update preprocessor configuration
    if !has_preprocessor(&doc) {
        log::info!("Adding preprocessor configuration");
        add_preprocessor(&mut doc);
    }

    // Add assets to additional-js/css
    let added = add_assets_to_config(&mut doc);

    if added {
        log::info!("Updating configuration file");
        fs::write(&config_path, doc.to_string()).context("Failed to write configuration")?;
    }

    // Extract core assets
    let mut printed = false;
    for (name, content) in ASSETS {
        let filepath = proj_dir.join(name);

        if let Some(parent) = filepath.parent() {
            fs::create_dir_all(parent).ok();
        }

        if filepath.exists() {
            log::debug!("'{}' already exists, skipping", name);
        } else {
            if !printed {
                printed = true;
                log::info!("Writing assets to {}", proj_dir.display());
            }

            log::debug!("Writing '{}'", name);
            fs::write(&filepath, content).with_context(|| format!("Failed to write '{}'", name))?;
        }
    }

    // Create components directory if it doesn't exist
    let components_dir = proj_dir.join("components");
    if !components_dir.exists() {
        log::info!(
            "Creating components directory: {}",
            components_dir.display()
        );
        fs::create_dir_all(&components_dir)?;

        // Copy example component
        let example_dir = components_dir.join("example");
        fs::create_dir_all(&example_dir)?;

        fs::write(
            example_dir.join("model.html"),
            include_str!("../components/example/model.html"),
        )?;
        fs::write(
            example_dir.join("view.css"),
            include_str!("../components/example/view.css"),
        )?;
        fs::write(
            example_dir.join("control.js"),
            include_str!("../components/example/control.js"),
        )?;

        log::info!("Created example component in {}", example_dir.display());
    }

    log::info!("✅ Installation complete!");
    log::info!("");
    log::info!("Usage:");
    log::info!("  1. Add components to your markdown:");
    log::info!("     {{% component \"admonition\" type=\"warning\" %}}");
    log::info!("     This is a warning");
    log::info!("     {{% endcomponent %}}");
    log::info!("");
    log::info!("  2. Create custom components in `components/` directory");
    log::info!("     Each component needs: model.html, view.css, control.js");
    log::info!("");
    log::info!("  3. Configure components in book.toml under [preprocessor.components]");

    Ok(())
}

fn handle_list() -> ! {
    println!("Available built-in components:");
    println!();

    let components = [
        ("admonition", "Note/warning/tip/danger callouts"),
        ("tabs", "Tabbed content navigation"),
        ("callout", "Simple highlighted content block"),
        ("card", "Card with header, content, and footer"),
        ("collapse", "Collapsible content section"),
        ("diagram", "Mermaid/Graphviz diagrams"),
        ("embed", "YouTube, Twitter, CodePen embeds"),
        ("grid", "Responsive grid layout"),
        ("carousel", "Image/content carousel"),
    ];

    for (name, description) in &components {
        println!("  • {:<12} - {}", name, description);
    }

    println!();
    println!("To use a component:");
    println!(
        "  {{% component \"{}\" %}}...{{% endcomponent %}}",
        components[0].0
    );

    process::exit(0)
}

fn handle_init(sub_args: &ArgMatches) -> Result<()> {
    let proj_dir = sub_args.get_one::<String>("dir").unwrap();
    let component_name = sub_args
        .get_one::<String>("component")
        .map(|s| s.as_str())
        .unwrap_or("mycomponent");

    let proj_dir = PathBuf::from(proj_dir);
    let component_dir = proj_dir.join("components").join(component_name);

    if component_dir.exists() {
        anyhow::bail!("Component '{}' already exists", component_name);
    }

    fs::create_dir_all(&component_dir).context("Failed to create component directory")?;

    // Create MVC files
    fs::write(
        component_dir.join("model.html"),
        include_str!("../components/example/model.html"),
    )?;
    fs::write(
        component_dir.join("view.css"),
        include_str!("../components/example/view.css"),
    )?;
    fs::write(
        component_dir.join("control.js"),
        include_str!("../components/example/control.js"),
    )?;

    // Create component.toml configuration
    let component_config = format!(
        r#"[component.{}]
template = "./components/{}/model.html"
css = "./components/{}/view.css"
js = "./components/{}/control.js"

[component.{}.schema]
required = ["title"]
optional = ["type", "icon"]

[component.{}.default_attrs]
type = "info"
icon = "ℹ️"
"#,
        component_name,
        component_name,
        component_name,
        component_name,
        component_name,
        component_name
    );

    fs::write(component_dir.join("component.toml"), &component_config)?;

    log::info!("✅ Component '{}' initialized!", component_name);
    log::info!("Location: {}", component_dir.display());
    log::info!("");
    log::info!("Next steps:");
    log::info!("1. Edit the MVC files in the component directory");
    log::info!("2. Add component configuration to book.toml:");
    log::info!("{}", component_config);
    log::info!("3. Use in your markdown:");
    log::info!(
        "   {{% component \"{}\" title=\"My Title\" %}}",
        component_name
    );
    log::info!("   Content goes here");
    log::info!("   {{% endcomponent %}}");

    Ok(())
}

fn has_preprocessor(doc: &toml_edit::Document) -> bool {
    doc.get("preprocessor")
        .and_then(|p| p.get("components"))
        .map(|m| m.is_table())
        .unwrap_or(false)
}

fn add_preprocessor(doc: &mut toml_edit::Document) {
    use toml_edit::{value, Item, Table};

    let preprocessor = doc
        .as_table_mut()
        .entry("preprocessor")
        .or_insert(Item::Table(Table::new()))
        .as_table_mut()
        .unwrap();

    let components = preprocessor
        .entry("components")
        .or_insert(Item::Table(Table::new()))
        .as_table_mut()
        .unwrap();

    components.insert("command", value("mdbook-components"));
}

fn add_assets_to_config(doc: &mut toml_edit::Document) -> bool {
    use toml_edit::{Array, Item, Value};
    let mut changed = false;

    // Ensure output.html section exists
    let output = doc
        .as_table_mut()
        .entry("output")
        .or_insert(Item::Table(toml_edit::Table::new()))
        .as_table_mut()
        .unwrap();

    let html = output
        .entry("html")
        .or_insert(Item::Table(toml_edit::Table::new()))
        .as_table_mut()
        .unwrap();

    // Add JavaScript file
    let js_array = html
        .entry("additional-js")
        .or_insert(Item::Value(Value::Array(Array::new())))
        .as_array_mut()
        .unwrap();

    if !js_array.iter().any(|item| {
        item.as_str()
            .map(|s| s.ends_with("mdbook-components.js"))
            .unwrap_or(false)
    }) {
        js_array.push("mdbook-components.js");
        changed = true;
    }

    // Add CSS file
    let css_array = html
        .entry("additional-css")
        .or_insert(Item::Value(Value::Array(Array::new())))
        .as_array_mut()
        .unwrap();

    if !css_array.iter().any(|item| {
        item.as_str()
            .map(|s| s.ends_with("mdbook-components.css"))
            .unwrap_or(false)
    }) {
        css_array.push("mdbook-components.css");
        changed = true;
    }

    changed
}
