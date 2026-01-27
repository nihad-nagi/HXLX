use mdbook_preprocessor::book::{Book, BookItem, Chapter};
use mdbook_preprocessor::errors::Result;
use mdbook_preprocessor::{Preprocessor, PreprocessorContext};
use pulldown_cmark::{CodeBlockKind::*, Event, Options, Parser, Tag, TagEnd};

pub struct MermaidPanZoom;

impl Preprocessor for MermaidPanZoom {
    fn name(&self) -> &str {
        "mermaid-panzoom"
    }

    fn run(&self, _ctx: &PreprocessorContext, mut book: Book) -> Result<Book> {
        let mut res = None;
        book.for_each_mut(|item: &mut BookItem| {
            if let Some(Err(_)) = res {
                return;
            }

            if let BookItem::Chapter(ref mut chapter) = *item {
                res = Some(process_chapter(chapter).map(|content| {
                    chapter.content = content;
                }));
            }
        });

        res.unwrap_or(Ok(())).map(|_| book)
    }

    fn supports_renderer(&self, renderer: &str) -> Result<bool> {
        Ok(renderer == "html")
    }
}

fn process_chapter(chapter: &Chapter) -> Result<String> {
    let content = &chapter.content;
    let mut processed_content = String::with_capacity(content.len() * 2);
    let mut mermaid_blocks = Vec::new();

    let mut opts = Options::empty();
    opts.insert(Options::ENABLE_TABLES);
    opts.insert(Options::ENABLE_FOOTNOTES);
    opts.insert(Options::ENABLE_STRIKETHROUGH);
    opts.insert(Options::ENABLE_TASKLISTS);

    let parser = Parser::new_ext(content, opts);
    let mut in_mermaid = false;
    let mut mermaid_content = String::new();
    let mut block_start = 0;
    let mut block_end;

    for (event, span) in parser.into_offset_iter() {
        match event {
            Event::Start(Tag::CodeBlock(Fenced(code))) if &*code == "mermaid" => {
                in_mermaid = true;
                mermaid_content.clear();
                block_start = span.start;
            }
            Event::Text(text) if in_mermaid => {
                mermaid_content.push_str(&text);
            }
            Event::End(TagEnd::CodeBlock) if in_mermaid => {
                in_mermaid = false;
                block_end = span.end;

                let id = format!("mermaid-{}", mermaid_blocks.len());

                // Create wrapper with unique ID and encoded content
                let wrapper = format!(
                    r#"<div class="mermaid-panzoom-wrapper" data-mermaid-id="{}">
<div class="mermaid-container"></div>
<div class="mermaid-code" style="display: none;">{}</div>
<div class="mermaid-panzoom-controls">
<button class="zoom-in" title="Zoom In">+</button>
<button class="zoom-out" title="Zoom Out">-</button>
<button class="reset-view" title="Reset View">⟳</button>
<button class="fit-view" title="Fit to View">⤢</button>
<span class="zoom-level">100%</span>
</div>
</div>"#,
                    id,
                    html_escape::encode_text(&mermaid_content)
                );

                mermaid_blocks.push((block_start, block_end, wrapper));
            }
            _ => {}
        }
    }

    // Process blocks in forward order
    let mut last_pos = 0;
    for (start, end, wrapper) in mermaid_blocks {
        // Add content BEFORE this mermaid block
        processed_content.push_str(&content[last_pos..start]);
        // Add the wrapper
        processed_content.push_str(&wrapper);
        last_pos = end;
    }

    // Add remaining content AFTER the last mermaid block
    if last_pos < content.len() {
        processed_content.push_str(&content[last_pos..]);
    }

    Ok(processed_content)
}

// Helper function to escape HTML attributes
mod html_escape {

    pub fn encode_text(s: &str) -> String {
        let mut output = String::with_capacity(s.len());
        for c in s.chars() {
            match c {
                '"' => output.push_str("&quot;"),
                '\'' => output.push_str("&#x27;"),
                '&' => output.push_str("&amp;"),
                '<' => output.push_str("&lt;"),
                '>' => output.push_str("&gt;"),
                _ => output.push(c),
            }
        }
        output
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic_mermaid() {
        let input = r#"# Chapter
```mermaid
graph TD
A --> B
```"#;

        let chapter = Chapter::new("Test", input.to_string(), "test.md", Vec::new());
        let result = process_chapter(&chapter).unwrap();

        assert!(result.contains("mermaid-panzoom-wrapper"));
        assert!(result.contains("data-mermaid-id"));
        assert!(result.contains("graph TD"));
    }

    #[test]
    fn test_multiple_mermaid() {
        let input = r#"# Test
First diagram:
```mermaid
graph TD
A --> B
sequenceDiagram
Alice->>Bob: Hello
```"#;

        let chapter = Chapter::new("Test", input.to_string(), "test.md", Vec::new());
        let result = process_chapter(&chapter).unwrap();

        // Should find two wrappers
        let wrapper_count = result.matches("mermaid-panzoom-wrapper").count();
        assert_eq!(wrapper_count, 2);
    }
}
