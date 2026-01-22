use clap::{crate_version, Arg, ArgMatches, Command};
use mdbook_mermaid_panzoom::MermaidPanZoom;
use mdbook_preprocessor::errors::Error;
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
}

fn main() {
    env_logger::init_from_env(env_logger::Env::default().default_filter_or("info"));

    let matches = make_app().get_matches();

    if let Some(sub_args) = matches.subcommand_matches("supports") {
        handle_supports(sub_args);
    } else if let Some(sub_args) = matches.subcommand_matches("install") {
        handle_install(sub_args);
    } else if let Err(e) = handle_preprocessing() {
        eprintln!("{}", e);
        process::exit(1);
    }
}

fn handle_preprocessing() -> Result<(), Error> {
    let (ctx, book) = mdbook_preprocessor::parse_input(io::stdin())?;

    if ctx.mdbook_version != mdbook_preprocessor::MDBOOK_VERSION {
        eprintln!(
            "Warning: Built against mdbook {}, called from {}",
            mdbook_preprocessor::MDBOOK_VERSION,
            ctx.mdbook_version
        );
    }

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

    // Add assets to additional-js/css
    let added = add_assets_to_config(&mut doc);

    if added {
        log::info!("Updating configuration file");
        let toml = doc.to_string();
        if let Err(e) = fs::write(&config, toml) {
            log::error!("Failed to write configuration: {}", e);
            process::exit(1);
        }
    }

    // Extract assets
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
            if let Err(e) = fs::write(&filepath, content) {
                log::error!("Failed to write '{}': {}", name, e);
                process::exit(1);
            }
        }
    }

    log::info!("✅ Installation complete!");
    log::info!("Add mermaid code blocks to your markdown:");
    log::info!("```mermaid");
    log::info!("graph TD");
    log::info!("  A[Start] --> B[End]");
    log::info!("```");
    
    process::exit(0);
}

fn has_preprocessor(doc: &toml_edit::Document) -> bool {
    doc.get("preprocessor")
        .and_then(|p| p.get("mermaid-panzoom"))
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
    
    // Add JavaScript files
    let js_array = html
        .entry("additional-js")
        .or_insert(Item::Value(Value::Array(Array::new())))
        .as_array_mut()
        .unwrap();
    
    for file in &["mermaid.min.js", "panzoom-bundle.js"] {
        if !js_array.iter().any(|item| {
            item.as_str().map(|s| s.ends_with(file)).unwrap_or(false)
        }) {
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
    
    if !css_array.iter().any(|item| {
        item.as_str().map(|s| s.ends_with("panzoom.css")).unwrap_or(false)
    }) {
        css_array.push("panzoom.css");
        changed = true;
    }
    
    changed
}
