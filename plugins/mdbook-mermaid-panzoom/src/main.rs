use clap::{Arg, ArgMatches, Command, crate_version};
use mdbook_mermaid_panzoom::MermaidPanZoom;
use mdbook_preprocessor::Preprocessor;
use std::fs;
use std::io::{self};
use std::path::PathBuf;
use std::process;

const MERMAID_JS: &[u8] = include_bytes!("../assets/mermaid.min.js");
const PANZOOM_JS: &[u8] = include_bytes!("../assets/panzoom-bundle.js");
const PANZOOM_CSS: &[u8] = include_bytes!("../assets/panzoom.css");

const ASSETS: &[(&str, &[u8])] = &[
    ("mermaid.min.js", MERMAID_JS),
    ("panzoom-bundle.js", PANZOOM_JS),
    ("panzoom.css", PANZOOM_CSS),
];

pub fn make_app() -> Command {
    Command::new("mdbook-mermaid-panzoom")
        .version(crate_version!())
        .about("mdbook preprocessor with pan/zoom support for mermaid diagrams")
        .subcommand(
            Command::new("supports")
                .arg(Arg::new("renderer").required(true))
                .about("Check whether a renderer is supported"),
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
            Command::new("update")
                .arg(
                    Arg::new("dir")
                        .default_value(".")
                        .help("Root directory for the book (contains book.toml)"),
                )
                .about("Rebuild and update everything (assets + binary)"),
        )
}

fn main() {
    env_logger::init_from_env(env_logger::Env::default().default_filter_or("info"));

    let matches = make_app().get_matches();

    if let Some(sub_args) = matches.subcommand_matches("supports") {
        handle_supports(sub_args);
    } else if let Some(sub_args) = matches.subcommand_matches("install") {
        handle_install(sub_args);
    } else if let Some(sub_args) = matches.subcommand_matches("update") {
        handle_update(sub_args);
    } else if let Err(e) = handle_preprocessing() {
        eprintln!("{}", e);
        process::exit(1);
    }
}

fn handle_preprocessing() -> Result<(), mdbook_preprocessor::errors::Error> {
    let (ctx, book) = mdbook_preprocessor::parse_input(io::stdin())?;

    let processor = MermaidPanZoom;
    let processed_book = processor.run(&ctx, book)?;
    serde_json::to_writer(io::stdout(), &processed_book)?;

    Ok(())
}

fn handle_supports(sub_args: &ArgMatches) -> ! {
    let renderer = sub_args.get_one::<String>("renderer").unwrap();
    let processor = MermaidPanZoom;
    let supported = processor.supports_renderer(renderer);
    process::exit(if supported.unwrap_or(false) { 0 } else { 1 });
}

fn handle_install(sub_args: &ArgMatches) -> ! {
    let proj_dir = sub_args.get_one::<String>("dir").unwrap();
    let proj_dir = PathBuf::from(proj_dir);
    let config = proj_dir.join("book.toml");

    if !config.exists() {
        log::error!("Configuration file '{}' missing", config.display());
        process::exit(1);
    }

    log::info!("Reading configuration from {}", config.display());
    let toml = fs::read_to_string(&config).unwrap_or_else(|_| {
        log::error!("Cannot read configuration file");
        process::exit(1);
    });

    let mut doc = toml.parse::<toml_edit::Document>().unwrap_or_else(|_| {
        log::error!("Invalid TOML in configuration");
        process::exit(1);
    });

    // Update preprocessor configuration
    if !has_preprocessor(&doc) {
        log::info!("Adding preprocessor configuration");
        add_preprocessor(&mut doc);
    }

    // Update the add_assets_to_config function call
    let added = add_assets_to_config(&mut doc);

    if added {
        log::info!("Updating configuration file");
        let toml = doc.to_string();
        if let Err(e) = fs::write(&config, toml) {
            log::error!("Failed to write configuration: {}", e);
            process::exit(1);
        }
    }

    // Generate assets
    let assets_dir = proj_dir.join("src").join("assets");
    generate_assets(&assets_dir);

    log::info!("✅ Installation complete!");
    log::info!("Assets are stored in 'src/assets/' directory");
    log::info!("Add mermaid code blocks to your markdown:");
    log::info!("```mermaid");
    log::info!("graph TD");
    log::info!("  A[Start] --> B[End]");
    log::info!("```");

    process::exit(0);
}

fn handle_update(sub_args: &ArgMatches) -> ! {
    let proj_dir = sub_args.get_one::<String>("dir").unwrap();
    let proj_dir = PathBuf::from(proj_dir);

    log::info!("🔄 Updating mdbook-mermaid-panzoom...");

    // Step 1: Build and install the preprocessor
    log::info!("Building and installing preprocessor...");
    let output = std::process::Command::new("cargo")
        .args(["install", "--force", "--path", "."])
        .output();

    match output {
        Ok(output) if output.status.success() => {
            log::info!("✅ Preprocessor rebuilt and installed");
        }
        Ok(output) => {
            log::error!("Failed to build preprocessor:");
            eprintln!("{}", String::from_utf8_lossy(&output.stderr));
            process::exit(1);
        }
        Err(e) => {
            log::error!("Failed to run cargo install: {}", e);
            process::exit(1);
        }
    }

    // Step 2: Update assets in the book
    let assets_dir = proj_dir.join("src").join("assets");
    generate_assets(&assets_dir);

    log::info!("✅ Update complete!");
    log::info!("Now run: mdbook build");

    process::exit(0);
}

// Simple function to generate assets - always overwrite
fn generate_assets(assets_dir: &PathBuf) {
    // Create assets directory if it doesn't exist
    if !assets_dir.exists() {
        if let Err(e) = fs::create_dir_all(&assets_dir) {
            log::error!("Failed to create assets directory: {}", e);
            process::exit(1);
        }
        log::info!("Created assets directory: {}", assets_dir.display());
    }

    // Extract assets (always overwrite in update mode)
    log::info!("Updating assets in {}", assets_dir.display());
    for (name, content) in ASSETS {
        let filepath = assets_dir.join(name);

        log::debug!("Writing '{}'", name);
        if let Err(e) = fs::write(&filepath, content) {
            log::error!("Failed to write '{}': {}", name, e);
            process::exit(1);
        }
    }
}

fn has_preprocessor(doc: &toml_edit::Document) -> bool {
    doc.get("preprocessor")
        .and_then(|p| p.get("mermaid-panzoom"))
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

    let mermaid = preprocessor
        .entry("mermaid-panzoom")
        .or_insert(Item::Table(Table::new()))
        .as_table_mut()
        .unwrap();

    mermaid.insert("command", value("mdbook-mermaid-panzoom"));
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

    // Add JavaScript files with correct path for mdBook
    let js_array = html
        .entry("additional-js")
        .or_insert(Item::Value(Value::Array(Array::new())))
        .as_array_mut()
        .unwrap();

    for file in &["mermaid.min.js", "panzoom-bundle.js"] {
        let path = format!("assets/{}", file);
        if !js_array
            .iter()
            .any(|item| item.as_str().map(|s| s.ends_with(file)).unwrap_or(false))
        {
            js_array.push(path);
            changed = true;
        }
    }

    // Add CSS file with correct path for mdBook
    let css_array = html
        .entry("additional-css")
        .or_insert(Item::Value(Value::Array(Array::new())))
        .as_array_mut()
        .unwrap();

    let css_path = "assets/panzoom.css";
    if !css_array.iter().any(|item| {
        item.as_str()
            .map(|s| s.ends_with("panzoom.css"))
            .unwrap_or(false)
    }) {
        css_array.push(css_path);
        changed = true;
    }

    changed
}
