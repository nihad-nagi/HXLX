// /HXLX/plugins/hxbook-admonish/src/main.rs
//! HXBook Admonish - CLI interface and mdBook preprocessor entry point.
//!
//! This binary serves as both a standalone preprocessor and an installation tool
//! that manages local assets and configuration.

use clap::{crate_version, Arg, ArgMatches, Command};
use hxbook_admonish::AdmonishPreprocessor;
use mdbook::{
    book::Book,
    errors::Error,
    preprocess::{Preprocessor, PreprocessorContext},
};
use std::fs;
use std::io::{self, Read, Write};
use std::path::PathBuf;
use std::process;

// 1. EMBED THE LOCAL, VENDORED CSS ASSET (No CDN)
const ADMONISH_CSS: &[u8] = include_bytes!("../assets/hxbook-admonish.css");

// 2. LIST OF STATIC ASSETS FOR THE INSTALLER
static ASSETS: &[(&str, &[u8])] = &[("hxbook-admonish.css", ADMONISH_CSS)];

// 3. CONFIGURATION FOR YOUR PREPROCESSOR
const PREPROCESSOR_NAME: &str = "hxbook-admonish"; // Key in `book.toml`
const BINARY_NAME: &str = "hxbook-admonish"; // Your binary name

/// Build the CLI application structure.
pub fn make_app() -> Command {
    Command::new(BINARY_NAME)
        .version(crate_version!())
        .about("Vendored mdBook preprocessor for Material Design admonishments. Uses local assets.")
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
                        .help("Root directory of the mdBook project (contains book.toml)"),
                )
                .about("Install local assets and update the book configuration"),
        )
}

fn main() {
    // Initialize logging from environment
    env_logger::init_from_env(env_logger::Env::default().default_filter_or("info"));
    let matches = make_app().get_matches();

    // Route to appropriate handler based on subcommand
    if let Some(sub_args) = matches.subcommand_matches("supports") {
        handle_supports(sub_args);
    } else if let Some(sub_args) = matches.subcommand_matches("install") {
        handle_install(sub_args);
    } else {
        // This branch runs for the standard `mdbook build` invocation
        if let Err(e) = handle_preprocessing() {
            eprintln!("Preprocessor Error: {}", e);
            process::exit(1);
        }
    }
}

/// Handles the main preprocessing work when invoked by `mdbook build`.
fn handle_preprocessing() -> Result<(), Error> {
    // Read the entire stdin (mdBook's JSON communication protocol)
    let mut input = String::new();
    io::stdin().read_to_string(&mut input)?;

    // Deserialize the context and book from JSON
    let (ctx, book): (PreprocessorContext, Book) = serde_json::from_str(&input)
        .map_err(|e| Error::msg(format!("Failed to parse input: {}", e)))?;

    // Create and run the preprocessor
    let processor = AdmonishPreprocessor;
    let processed_book = processor.run(&ctx, book)?;

    // Output processed book as JSON to stdout
    let output = serde_json::to_string(&processed_book)?;
    io::stdout().write_all(output.as_bytes())?;
    Ok(())
}

/// Handles the `supports <renderer>` CLI command.
fn handle_supports(sub_args: &ArgMatches) -> ! {
    let renderer = sub_args.get_one::<String>("renderer").unwrap();
    let processor = AdmonishPreprocessor;

    // Exit code 0 for supported, 1 for unsupported
    let supported = processor.supports_renderer(renderer);
    process::exit(if supported { 0 } else { 1 });
}

/// --- INSTALLER LOGIC (Idempotent and Safe) ---
/// Installs local assets and updates book.toml configuration.
fn handle_install(sub_args: &ArgMatches) -> ! {
    let proj_dir = sub_args.get_one::<String>("dir").unwrap();
    let proj_dir = PathBuf::from(proj_dir);
    let config_path = proj_dir.join("book.toml");

    // Verify book.toml exists
    if !config_path.exists() {
        log::error!("Configuration file '{}' not found.", config_path.display());
        process::exit(1);
    }

    log::info!("Reading configuration from {}", config_path.display());
    let toml_content = match fs::read_to_string(&config_path) {
        Ok(content) => content,
        Err(e) => {
            log::error!("Could not read '{}': {}", config_path.display(), e);
            process::exit(1);
        }
    };

    // Parse TOML document for editing
    let mut doc = match toml_content.parse::<toml_edit::DocumentMut>() {
        Ok(doc) => doc,
        Err(e) => {
            log::error!("Invalid TOML syntax in '{}': {}", config_path.display(), e);
            process::exit(1);
        }
    };

    // 1. Determine the source directory (default: "src")
    let src_dir = doc
        .get("book")
        .and_then(|b| b.get("src"))
        .and_then(|s| s.as_str())
        .map(|s| proj_dir.join(s))
        .unwrap_or_else(|| proj_dir.join("src"));

    // 2. Add preprocessor configuration if missing
    if !has_preprocessor(&doc, PREPROCESSOR_NAME) {
        log::info!("Adding '{}' preprocessor configuration.", PREPROCESSOR_NAME);
        add_preprocessor(&mut doc, PREPROCESSOR_NAME, BINARY_NAME);
    }

    // 3. Add CSS to `additional-css` if missing
    let config_updated = add_assets_to_config(&mut doc, ASSETS);

    // 4. Write updated config back to disk
    if config_updated {
        log::info!("Updating configuration file.");
        let updated_toml = doc.to_string();
        if let Err(e) = fs::write(&config_path, updated_toml) {
            log::error!("Failed to write configuration: {}", e);
            process::exit(1);
        }
    }

    // 5. Write embedded asset files to the source directory
    deploy_assets(&src_dir, ASSETS);

    log::info!("✅ Installation complete for '{}'.", PREPROCESSOR_NAME);
    log::info!("  -> Assets are now local in {}.", src_dir.display());
    log::info!("  -> Run `mdbook build` to use the preprocessor.");
    process::exit(0);
}

/// Deploys (writes) the embedded assets to the target directory.
fn deploy_assets(target_dir: &PathBuf, assets: &[(&str, &[u8])]) {
    // Create the target directory if it doesn't exist
    if let Err(e) = fs::create_dir_all(target_dir) {
        log::error!("Could not create directory {}: {}", target_dir.display(), e);
        process::exit(1);
    }

    for (filename, content) in assets {
        let file_path = target_dir.join(filename);

        // Check if the file already exists and is identical
        if file_path.exists() {
            if let Ok(existing_content) = fs::read(&file_path) {
                if existing_content == *content {
                    log::debug!("Asset '{}' already up-to-date.", filename);
                    continue;
                }
            }
            log::info!("Updating '{}'", filename);
        } else {
            log::info!("Creating '{}'", filename);
        }

        if let Err(e) = fs::write(&file_path, content) {
            log::error!("Failed to write '{}': {}", filename, e);
            process::exit(1);
        }
    }
}

/// --- HELPER FUNCTIONS (Boilerplate) ---

/// Check if a preprocessor is already configured in the TOML document.
fn has_preprocessor(doc: &toml_edit::DocumentMut, name: &str) -> bool {
    doc.get("preprocessor")
        .and_then(|p| p.get(name))
        .map(|entry| entry.is_table())
        .unwrap_or(false)
}

/// Add a preprocessor configuration to the TOML document.
fn add_preprocessor(doc: &mut toml_edit::DocumentMut, name: &str, command: &str) {
    use toml_edit::{value, Item, Table};
    let preprocessors = doc
        .as_table_mut()
        .entry("preprocessor")
        .or_insert(Item::Table(Table::new()))
        .as_table_mut()
        .unwrap();

    let my_preprocessor = preprocessors
        .entry(name)
        .or_insert(Item::Table(Table::new()))
        .as_table_mut()
        .unwrap();

    my_preprocessor.insert("command", value(command));
}

/// Add asset references to the book configuration.
fn add_assets_to_config(doc: &mut toml_edit::DocumentMut, assets: &[(&str, &[u8])]) -> bool {
    use toml_edit::{Array, Item, Table, Value};
    let mut config_changed = false;

    let output_section = doc
        .as_table_mut()
        .entry("output")
        .or_insert(Item::Table(Table::new()))
        .as_table_mut()
        .unwrap();

    let html_section = output_section
        .entry("html")
        .or_insert(Item::Table(Table::new()))
        .as_table_mut()
        .unwrap();

    // Add .css files to `additional-css`
    for (filename, _) in assets.iter().filter(|(f, _)| f.ends_with(".css")) {
        let css_array = html_section
            .entry("additional-css")
            .or_insert(Item::Value(Value::Array(Array::new())))
            .as_array_mut()
            .unwrap();

        // The CSS file is in the source directory, so we just need the filename
        // since additional-css is relative to the source directory.
        if !css_array
            .iter()
            .any(|item| item.as_str() == Some(*filename))
        {
            css_array.push(*filename);
            config_changed = true;
        }
    }

    // Add .js files to `additional-js` (if you have any in the future)
    for (filename, _) in assets.iter().filter(|(f, _)| f.ends_with(".js")) {
        let js_array = html_section
            .entry("additional-js")
            .or_insert(Item::Value(Value::Array(Array::new())))
            .as_array_mut()
            .unwrap();

        if !js_array.iter().any(|item| item.as_str() == Some(*filename)) {
            js_array.push(*filename);
            config_changed = true;
        }
    }
    config_changed
}
