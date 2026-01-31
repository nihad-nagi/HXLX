// /home/enzi/HXLX/plugins/mdbook-mermaid-panzoom/src/lib.rs
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

        book.for_each_mut(|item| {
            if let Some(Err(_)) = res {
                return;
            }

            if let BookItem::Chapter(chapter) = item {
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
    let mut output = String::with_capacity(content.len() * 2);
    let mut replacements: Vec<(usize, usize, String)> = Vec::new();

    let mut opts = Options::empty();
    opts.insert(Options::ENABLE_TABLES);
    opts.insert(Options::ENABLE_FOOTNOTES);
    opts.insert(Options::ENABLE_STRIKETHROUGH);
    opts.insert(Options::ENABLE_TASKLISTS);

    let parser = Parser::new_ext(content, opts);

    let mut in_mermaid = false;
    let mut buffer = String::new();
    let mut block_start = 0;
    let mut diagram_index = 0;

    for (event, span) in parser.into_offset_iter() {
        match event {
            Event::Start(Tag::CodeBlock(Fenced(code))) if code.as_ref() == "mermaid" => {
                in_mermaid = true;
                buffer.clear();
                block_start = span.start;
            }

            Event::Text(text) if in_mermaid => {
                buffer.push_str(&text);
            }

            Event::End(TagEnd::CodeBlock) if in_mermaid => {
                in_mermaid = false;
                let block_end = span.end;

                let diagrams = split_mermaid_diagrams(&buffer);

                let mut html = String::new();
                for diagram in diagrams {
                    let id = format!("mermaid-{}", diagram_index);
                    diagram_index += 1;

                    html.push_str(&format!(
                        r#"<div class="mermaid-panzoom-wrapper" data-mermaid-id="{}">
<div class="mermaid-container"></div>
<div class="mermaid-code" style="display: none;">{}</div>
</div>"#,
                        id,
                        html_escape::encode_text(&diagram)
                    ));
                }

                replacements.push((block_start, block_end, html));
            }

            _ => {}
        }
    }

    let mut last = 0;
    for (start, end, html) in replacements {
        output.push_str(&content[last..start]);
        output.push_str(&html);
        last = end;
    }

    output.push_str(&content[last..]);
    Ok(output)
}

/// Split a single mermaid block into multiple diagrams
fn split_mermaid_diagrams(input: &str) -> Vec<String> {
    let starters = [
        "graph ",
        "flowchart ",
        "sequenceDiagram",
        "classDiagram",
        "stateDiagram",
        "erDiagram",
        "journey",
        "gantt",
        "pie",
        "mindmap",
        "timeline",
    ];

    let lines: Vec<&str> = input.lines().collect();
    let mut indices = Vec::new();

    for (i, line) in lines.iter().enumerate() {
        let trimmed = line.trim_start();
        if starters.iter().any(|s| trimmed.starts_with(s)) {
            indices.push(i);
        }
    }

    if indices.len() <= 1 {
        return vec![input.trim().to_string()];
    }

    let mut diagrams = Vec::new();
    for w in indices.windows(2) {
        diagrams.push(lines[w[0]..w[1]].join("\n").trim().to_string());
    }

    diagrams.push(
        lines[*indices.last().unwrap()..]
            .join("\n")
            .trim()
            .to_string(),
    );
    diagrams
}

mod html_escape {
    pub fn encode_text(s: &str) -> String {
        let mut out = String::with_capacity(s.len());
        for c in s.chars() {
            match c {
                '&' => out.push_str("&amp;"),
                '<' => out.push_str("&lt;"),
                '>' => out.push_str("&gt;"),
                '"' => out.push_str("&quot;"),
                '\'' => out.push_str("&#x27;"),
                _ => out.push(c),
            }
        }
        out
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
```mermaid
graph TD
A --> B
sequenceDiagram
Alice->>Bob: Hello
```"#;

        let chapter = Chapter::new("Test", input.to_string(), "test.md", Vec::new());
        let result = process_chapter(&chapter).unwrap();

        let count = result.matches("mermaid-panzoom-wrapper").count();
        assert_eq!(count, 2);
    }
}
