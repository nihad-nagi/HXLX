use anyhow::{Context, Result};
use clap::{crate_authors, crate_description, crate_version, Arg, ArgMatches, Command};
use mdbook::preprocess::{CmdPreprocessor, Preprocessor};
use mdbook_components::preprocessor::ComponentPreprocessor;
use mdbook_components::registry::ComponentConfig;
use serde_json;
use std::fs;
use std::io::{self};
use std::path::{Path, PathBuf};
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
    let _proj_dir = sub_args.get_one::<String>("dir").unwrap();
    let proj_dir = PathBuf::from(_proj_dir);

    log::info!("Installing mdbook-components to {}", proj_dir.display());

    // Create necessary directories
    let static_dir = proj_dir.join("static");
    let styles_dir = static_dir.join("styles");
    let scripts_dir = static_dir.join("scripts");

    fs::create_dir_all(&styles_dir)?;
    fs::create_dir_all(&scripts_dir)?;

    // Copy JavaScript assets
    let js_files = [
        ("Component.js", include_str!("../assets/Component.js")),
        (
            "ComponentRegistry.js",
            include_str!("../assets/ComponentRegistry.js"),
        ),
        (
            "HydrationManager.js",
            include_str!("../assets/HydrationManager.js"),
        ),
        (
            "mdbook-components.js",
            include_str!("../assets/mdbook-components.js"),
        ),
    ];

    for (filename, content) in js_files {
        let path = scripts_dir.join(filename);
        if !path.exists() {
            fs::write(&path, content)?;
            log::debug!("Created: {}", path.display());
        }
    }

    // Update book.toml configuration
    let config_path = proj_dir.join("book.toml");
    if config_path.exists() {
        let mut doc = fs::read_to_string(&config_path)?
            .parse::<toml_edit::Document>()
            .context("Invalid TOML in configuration")?;

        let added = update_book_config(&mut doc, &scripts_dir, &styles_dir);

        if added {
            log::info!("Updating configuration file");
            fs::write(&config_path, doc.to_string()).context("Failed to write configuration")?;
        }
    } else {
        log::warn!(
            "No book.toml found at {}. You'll need to manually configure.",
            config_path.display()
        );
    }

    // Create components directory with example
    let components_dir = proj_dir.join("components");
    if !components_dir.exists() {
        log::info!(
            "Creating components directory: {}",
            components_dir.display()
        );
        fs::create_dir_all(&components_dir)?;

        // Copy example component
        copy_component("example", &components_dir)?;
        log::info!("Created example component");
    }

    log::info!("✅ Installation complete!");
    log::info!("");
    log::info!("Usage:");
    log::info!("  1. Add components to your markdown:");
    log::info!("     {{% component \"admonition\" type=\"warning\" title=\"Alert\" %}}");
    log::info!("     This is a warning");
    log::info!("     {{% endcomponent %}}");
    log::info!("");
    log::info!("  2. Create custom components in `components/` directory");
    log::info!("     Each component needs: model.html, view.css, control.js");
    log::info!("");
    log::info!("  3. Add to book.toml:");
    log::info!("     [output.html]");
    log::info!("     additional-js = [\"scripts/mdbook-components.js\"]");
    log::info!("     additional-css = [\"styles/components.css\"]");

    Ok(())
}

fn copy_component(name: &str, components_dir: &Path) -> Result<()> {
    let component_dir = components_dir.join(name);
    fs::create_dir_all(&component_dir)?;

    // Copy MVC files
    let files = [
        (
            "model.html",
            include_str!("../components/example/model.html"),
        ),
        ("view.css", include_str!("../components/example/view.css")),
        (
            "control.js",
            include_str!("../components/example/control.js"),
        ),
    ];

    for (filename, content) in files {
        let path = component_dir.join(filename);
        fs::write(&path, content)?;
    }

    Ok(())
}

fn update_book_config(
    doc: &mut toml_edit::Document,
    scripts_dir: &Path,
    styles_dir: &Path,
) -> bool {
    use toml_edit::{Array, Item, Table, Value};
    let mut changed = false;

    let scripts_rel = scripts_dir
        .strip_prefix(
            doc.as_table()
                .get("book")
                .and_then(|b| b.get("src"))
                .and_then(|s| s.as_str())
                .map(Path::new)
                .unwrap_or(Path::new(".")),
        )
        .unwrap_or(scripts_dir);

    let styles_rel = styles_dir
        .strip_prefix(
            doc.as_table()
                .get("book")
                .and_then(|b| b.get("src"))
                .and_then(|s| s.as_str())
                .map(Path::new)
                .unwrap_or(Path::new(".")),
        )
        .unwrap_or(styles_dir);

    // Ensure output.html section exists
    let output = doc
        .as_table_mut()
        .entry("output")
        .or_insert(Item::Table(Table::new()))
        .as_table_mut()
        .unwrap();

    let html = output
        .entry("html")
        .or_insert(Item::Table(Table::new()))
        .as_table_mut()
        .unwrap();

    // Add JavaScript files
    let js_array = html
        .entry("additional-js")
        .or_insert(Item::Value(Value::Array(Array::new())))
        .as_array_mut()
        .unwrap();

    let js_paths = [scripts_rel
        .join("mdbook-components.js")
        .to_string_lossy()
        .to_string()];

    for js_path in &js_paths {
        if !js_array.iter().any(|item| item.as_str() == Some(js_path)) {
            js_array.push(js_path);
            changed = true;
        }
    }

    // Add CSS files
    let css_array = html
        .entry("additional-css")
        .or_insert(Item::Value(Value::Array(Array::new())))
        .as_array_mut()
        .unwrap();

    let css_path = styles_rel
        .join("components.css")
        .to_string_lossy()
        .to_string();
    if !css_array
        .iter()
        .any(|item| item.as_str() == Some(&css_path))
    {
        css_array.push(css_path);
        changed = true;
    }

    changed
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
