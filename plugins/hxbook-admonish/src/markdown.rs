// /HXLX/plugins/hxbook-admonish/src/markdown.rs
use crate::config::parse_config;
use crate::parse::parse_admonition;
use crate::render::{generate_custom_css, render_admonition};
use crate::types::AdmonishConfig;
use mdbook::{
    book::{Book, BookItem},
    errors::Result,
    preprocess::{Preprocessor, PreprocessorContext},
    utils::fs::write_file,
};
use pulldown_cmark::{CodeBlockKind, Event, Options, Parser, Tag};
use std::ops::Range;

pub struct AdmonishPreprocessor;

impl Preprocessor for AdmonishPreprocessor {
    fn name(&self) -> &str {
        "admonish"
    }

    fn supports_renderer(&self, renderer: &str) -> bool {
        renderer == "html"
    }

    fn run(&self, ctx: &PreprocessorContext, mut book: Book) -> Result<Book> {
        if ctx.renderer != "html" {
            return Ok(book);
        }

        let config = parse_config(ctx)?;

        // Write CSS to build directory
        let build_dir = &ctx.config.build.build_dir;
        let css = generate_custom_css(&config);
        write_file(build_dir, "hxbook-admonish.css", css.as_bytes())?;

        book.for_each_mut(|item| {
            if let BookItem::Chapter(chapter) = item {
                if let Ok(processed) = process_chapter(&chapter.content, &config) {
                    chapter.content = processed;
                }
            }
        });

        Ok(book)
    }
}

fn process_chapter(content: &str, config: &AdmonishConfig) -> anyhow::Result<String> {
    let mut replacements = Vec::new();
    let parser = Parser::new_ext(content, Options::all()).into_offset_iter();

    let mut admonition_start = 0;
    let mut info_string = String::new();
    let mut in_admonition = false;
    let mut depth = 0;

    for (event, range) in parser {
        match event {
            Event::Start(Tag::CodeBlock(CodeBlockKind::Fenced(ref info))) => {
                if info.as_ref().starts_with("admonish") {
                    in_admonition = true;
                    depth = 1;
                    admonition_start = range.start;
                    info_string = info.to_string();
                }
            }
            Event::End(Tag::CodeBlock(_)) if in_admonition => {
                depth -= 1;
                if depth == 0 {
                    in_admonition = false;
                    let raw_block = &content[admonition_start..range.end];
                    if let Some(Ok(meta)) = parse_admonition(&info_string, raw_block, config) {
                        let replacement = render_admonition(&meta, raw_block);
                        replacements.push(Replacement {
                            range: admonition_start..range.end,
                            replacement,
                        });
                    }
                }
            }
            Event::Start(Tag::CodeBlock(_)) if in_admonition => depth += 1,
            _ => {}
        }
    }

    apply_replacements(content, replacements)
}

#[derive(Debug)]
struct Replacement {
    range: Range<usize>,
    replacement: String,
}

fn apply_replacements(content: &str, mut replacements: Vec<Replacement>) -> anyhow::Result<String> {
    replacements.sort_by_key(|r| r.range.start);
    let mut result = String::with_capacity(content.len() * 2);
    let mut last_pos = 0;

    for r in replacements {
        result.push_str(&content[last_pos..r.range.start]);
        result.push_str(&r.replacement);
        last_pos = r.range.end;
    }

    result.push_str(&content[last_pos..]);
    Ok(result)
}
