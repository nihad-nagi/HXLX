use clap::{Arg, ArgMatches, Command, crate_version};
use mdbook_mermaid_panzoom::MermaidPanZoom;
use mdbook_preprocessor::Preprocessor;
use std::io;
use std::process;

/// Build the CLI for the plugin
pub fn make_app() -> Command {
    Command::new("mdbook-mermaid-panzoom")
        .version(crate_version!())
        .about("Preprocessor for mdBook: adds pan/zoom support for Mermaid diagrams")
        .subcommand(
            Command::new("supports")
                .about("Check whether a renderer is supported")
                .arg(Arg::new("renderer").required(true)),
        )
}

/// Entry point
fn main() {
    env_logger::init_from_env(env_logger::Env::default().default_filter_or("info"));

    let matches = make_app().get_matches();

    if let Some(sub) = matches.subcommand_matches("supports") {
        handle_supports(sub);
    } else if let Err(e) = handle_preprocessing() {
        eprintln!("Error during preprocessing: {}", e);
        process::exit(1);
    }
}

/// The actual preprocessing function: reads stdin, runs the processor, writes stdout
fn handle_preprocessing() -> Result<(), mdbook_preprocessor::errors::Error> {
    let (ctx, book) = mdbook_preprocessor::parse_input(io::stdin())?;

    let processor = MermaidPanZoom;
    let processed_book = processor.run(&ctx, book)?;

    serde_json::to_writer(io::stdout(), &processed_book)?;
    Ok(())
}

/// Handles the `supports` subcommand
fn handle_supports(sub: &ArgMatches) -> ! {
    let renderer = sub.get_one::<String>("renderer").unwrap();
    let supported = MermaidPanZoom.supports_renderer(renderer);

    process::exit(if supported.unwrap_or(false) { 0 } else { 1 });
}
