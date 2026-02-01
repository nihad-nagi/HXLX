// /home/enzi/HXLX/plugins/mdbook-components/src/main.rs
use clap::{Arg, ArgMatches, Command, crate_authors, crate_description, crate_version};
use mdbook_components::asset_generator;
use mdbook_components::preprocessor::ComponentPreprocessor;
use mdbook_components::registry::ComponentConfig;
use mdbook_preprocessor::{CmdPreprocessor, Preprocessor}; // Changed this line
use serde_json;
use std::fs;
use std::io::{self};
use std::path::PathBuf;
use std::process;

// Embedded assets
const ALPINE_JS: &[u8] = include_bytes!("../assets/alpine.min.js");
const ALPINE_INIT: &[u8] = include_bytes!("../assets/alpine-init.js");

const ASSETS: &[(&str, &[u8])] = &[
    ("alpine.min.js", ALPINE_JS),
    ("alpine-init.js", ALPINE_INIT),
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

fn main() {
    env_logger::init_from_env(env_logger::Env::default().default_filter_or("info"));

    let matches = make_app().get_matches();

    match matches.subcommand() {
        Some(("supports", sub_args)) => handle_supports(sub_args),
        Some(("install", sub_args)) => handle_install(sub_args),
        Some(("generate", sub_args)) => {
            if let Err(e) = handle_generate(sub_args) {
                eprintln!("Error: {}", e);
                process::exit(1);
            }
        }
        Some(("list", _)) => handle_list(),
        Some(("init", sub_args)) => {
            if let Err(e) = handle_init(sub_args) {
                eprintln!("Error: {}", e);
                process::exit(1);
            }
        }
        _ => {
            if let Err(e) = handle_preprocessing() {
                eprintln!("Error: {}", e);
                process::exit(1);
            }
        }
    }
}

fn handle_preprocessing() -> Result<(), anyhow::Error> {
    use anyhow::Context;

    let (ctx, book) = CmdPreprocessor::parse_input(io::stdin())?;

    if ctx.mdbook_version != mdbook_preprocessor::MDBOOK_VERSION {
        // Updated this line
        eprintln!(
            "Warning: mdbook-components was built against mdbook {}, but we're being called from version {}",
            mdbook_preprocessor::MDBOOK_VERSION, // Updated this line
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

fn handle_generate(sub_args: &ArgMatches) -> Result<(), anyhow::Error> {
    use anyhow::Context;

    let dir = sub_args.get_one::<String>("dir").unwrap();
    let project_dir = PathBuf::from(dir);

    log::info!("Generating component assets in {}", project_dir.display());
    asset_generator::generate_assets(&project_dir).context("Failed to generate assets")
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

fn handle_install(sub_args: &ArgMatches) -> ! {
    let proj_dir = sub_args.get_one::<String>("dir").unwrap();
    let proj_dir = PathBuf::from(proj_dir);
    let config_path = proj_dir.join("book.toml");

    if !config_path.exists() {
        log::error!("Configuration file '{}' missing", config_path.display());
        process::exit(1);
    }

    log::info!("Installing mdbook-components to {}", proj_dir.display());

    // Read and update book.toml
    let toml = match fs::read_to_string(&config_path) {
        Ok(content) => content,
        Err(e) => {
            log::error!("Cannot read configuration file: {}", e);
            process::exit(1);
        }
    };

    let mut doc = match toml.parse::<toml_edit::Document>() {
        Ok(doc) => doc,
        Err(e) => {
            log::error!("Invalid TOML in configuration: {}", e);
            process::exit(1);
        }
    };

    // Update preprocessor configuration
    if !has_preprocessor(&doc) {
        log::info!("Adding preprocessor configuration");
        add_preprocessor(&mut doc);
    }

    // Add assets to additional-js/css
    let added = add_assets_to_config(&mut doc);

    if added {
        log::info!("Updating configuration file");
        if let Err(e) = fs::write(&config_path, doc.to_string()) {
            log::error!("Failed to write configuration: {}", e);
            process::exit(1);
        }
    }

    // Extract assets to static/ directory
    let mut printed = false;
    for (name, content) in ASSETS {
        let static_dir = proj_dir.join("static/scripts");
        fs::create_dir_all(&static_dir).ok();
        let filepath = static_dir.join(name);

        if filepath.exists() {
            log::debug!("'{}' already exists, skipping", name);
        } else {
            if !printed {
                printed = true;
                log::info!("Writing assets to {}", static_dir.display());
            }

            log::debug!("Writing '{}'", name);
            if let Err(e) = fs::write(&filepath, content) {
                log::error!("Failed to write '{}': {}", name, e);
                process::exit(1);
            }
        }
    }

    // Also generate the CSS bundle
    let src_dir = proj_dir.join("src");
    if src_dir.exists() {
        if let Err(e) = asset_generator::generate_assets(&proj_dir) {
            log::error!("Failed to generate CSS: {}", e);
        }
    }

    log::info!("✅ Installation complete!");
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

    process::exit(0);
}

fn has_preprocessor(doc: &toml_edit::Document) -> bool {
    doc.get("preprocessor")
        .and_then(|p| p.get("components"))
        .map(|m| m.is_table())
        .unwrap_or(false)
}

fn add_preprocessor(doc: &mut toml_edit::Document) {
    use toml_edit::{Item, Table, value};

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

    // Add JavaScript files
    let js_array = html
        .entry("additional-js")
        .or_insert(Item::Value(Value::Array(Array::new())))
        .as_array_mut()
        .unwrap();

    let js_files = &["static/scripts/components.js"];
    for file in js_files {
        if !js_array
            .iter()
            .any(|item| item.as_str().map(|s| s == *file).unwrap_or(false))
        {
            js_array.push(*file);
            changed = true;
        }
    }

    // Add CSS file
    let css_array = html
        .entry("additional-css")
        .or_insert(Item::Value(Value::Array(Array::new())))
        .as_array_mut()
        .unwrap();

    let css_file = "static/styles/components.css";
    if !css_array
        .iter()
        .any(|item| item.as_str().map(|s| s == css_file).unwrap_or(false))
    {
        css_array.push(css_file);
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

fn handle_init(sub_args: &ArgMatches) -> Result<(), anyhow::Error> {
    use anyhow::Context;

    let proj_dir = sub_args.get_one::<String>("dir").unwrap();
    let proj_dir = PathBuf::from(proj_dir);

    // Create a custom component
    let components_dir = proj_dir.join("components");
    fs::create_dir_all(&components_dir).context("Failed to create components directory")?;

    let component_name = "mycomponent";
    let component_dir = components_dir.join(component_name);

    if component_dir.exists() {
        anyhow::bail!("Component '{}' already exists", component_name);
    }

    fs::create_dir_all(&component_dir)?;

    // Create MVC files for custom component with Alpine.js directives
    let model_html = r#"<div class="mycomponent bg-h1-500 text-h1-900 rounded-lg p-4"
     x-data="{
         expanded: false,
         count: 0
     }"
     data-component="mycomponent">
    <h2 x-text="title">{{ title }}</h2>
    <div class="mycomponent-content" x-show="expanded" x-transition>
        {{ children | markdown | safe }}
    </div>
    <div class="flex justify-between items-center mt-4">
        <button @click="expanded = !expanded"
                class="bg-h2-500 text-white px-4 py-2 rounded hover:bg-h2-600 transition">
            <span x-text="expanded ? 'Collapse' : 'Expand'">Toggle</span>
        </button>
        <span class="text-h3-700">Clicks: <span x-text="count">0</span></span>
    </div>
    {% if footer %}
    <div class="mycomponent-footer mt-4 pt-4 border-t border-h1-300">{{ footer }}</div>
    {% endif %}
</div>"#;

    let view_css = r#".mycomponent {
    border: 2px solid;
    margin: 1rem 0;
}

.mycomponent-content {
    line-height: 1.6;
    margin-top: 1rem;
}

.mycomponent-footer {
    font-size: 0.875rem;
}"#;

    // No control.js needed - Alpine handles everything!
    let control_js = r#"// Alpine.js handles interactivity for this component
// No additional JavaScript needed"#;

    fs::write(component_dir.join("model.html"), model_html)
        .context("Failed to write model.html")?;
    fs::write(component_dir.join("view.css"), view_css).context("Failed to write view.css")?;
    fs::write(component_dir.join("control.js"), control_js)
        .context("Failed to write control.js")?;

    log::info!("✅ Custom component '{}' created!", component_name);
    log::info!("Location: {}", component_dir.display());
    log::info!("");
    log::info!("Usage in markdown:");
    log::info!(
        "  {{% component \"{}\" title=\"My Title\" footer=\"Optional footer\" %}}",
        component_name
    );
    log::info!("  Your content here");
    log::info!("  {{% endcomponent %}}");

    Ok(())
}
