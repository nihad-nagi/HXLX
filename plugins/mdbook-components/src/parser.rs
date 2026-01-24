// /home/enzi/HXLX/plugins/mdbook-components/src/parser.rs
use crate::errors::ComponentError;
use parking_lot::Mutex;
use serde_json::Value as JsonValue;
use std::collections::HashMap;
use std::str::Chars;
use tera::Value as TeraValue;

#[derive(Debug, Clone)]
pub enum Node {
    Text(String),
    Component {
        name: String,
        attrs: HashMap<String, TeraValue>,
        children: Vec<Node>,
        line: usize,
        col: usize,
        id: String,
    },
}

pub struct ComponentParser<'a> {
    input: &'a str,
    chars: Chars<'a>,
    pos: usize,
    line: usize,
    col: usize,
    peeked: Option<char>,
}

impl<'a> ComponentParser<'a> {
    pub fn new(input: &'a str) -> Self {
        Self {
            input,
            chars: input.chars(),
            pos: 0,
            line: 1,
            col: 1,
            peeked: None,
        }
    }

    pub fn parse(mut self) -> Result<Vec<Node>, ComponentError> {
        let mut nodes = Vec::new();

        while self.pos < self.input.len() {
            self.skip_whitespace();

            if self.peek() == Some('{') && self.peek_n(1) == Some('%') {
                if let Some(node) = self.try_parse_component()? {
                    nodes.push(node);
                } else {
                    // Not a component tag, consume as text
                    let text = self.consume_until("{%");
                    if !text.is_empty() {
                        nodes.push(Node::Text(text));
                    }
                }
            } else {
                let text = self.consume_until("{%");
                if !text.is_empty() {
                    nodes.push(Node::Text(text));
                }
            }
        }

        Ok(nodes)
    }

    fn try_parse_component(&mut self) -> Result<Option<Node>, ComponentError> {
        let start_pos = self.pos;
        let start_line = self.line;
        let start_col = self.col;

        // Check if it's a component tag
        if !self.consume_exact("{%") {
            return Ok(None);
        }

        self.skip_whitespace();

        if !self.consume_exact("component") {
            // Not a component tag, rewind
            self.pos = start_pos;
            self.line = start_line;
            self.col = start_col;
            self.chars = self.input[start_pos..].chars();
            self.peeked = None;
            return Ok(None);
        }

        self.skip_whitespace();

        // Parse component name
        let name = self.parse_identifier()?;

        // Parse attributes
        let mut attrs = HashMap::new();
        while self.peek() != Some('%') && self.peek_n(1) != Some('}') {
            self.skip_whitespace();

            let key = self.parse_identifier()?;
            self.skip_whitespace();

            if self.consume_exact("=") {
                self.skip_whitespace();
                let value = self.parse_value()?;
                attrs.insert(key, value);
            } else {
                // Boolean attribute
                attrs.insert(key, TeraValue::Bool(true));
            }
        }

        // Expect %}
        if !self.consume_exact("%}") {
            return Err(ComponentError::ParseError(format!(
                "Expected '%}}' at line {}, col {}",
                self.line, self.col
            )));
        }

        // Parse children
        let mut children = Vec::new();
        loop {
            self.skip_whitespace();

            if self.consume_exact("{% endcomponent %}") {
                break;
            }

            if self.peek() == Some('{') && self.peek_n(1) == Some('%') {
                if let Some(child) = self.try_parse_component()? {
                    children.push(child);
                } else {
                    // Could be a different template tag, consume as text
                    let text = self.consume_until("{%");
                    if !text.is_empty() {
                        children.push(Node::Text(text));
                    }
                }
            } else {
                let text = self.consume_until("{%");
                if !text.is_empty() {
                    children.push(Node::Text(text));
                }
            }

            if self.pos >= self.input.len() {
                return Err(ComponentError::ParseError("Unclosed component".to_string()));
            }
        }

        // Generate unique ID for hydration
        let id = format!("comp-{}-{}", name, uuid::Uuid::new_v4().simple());

        Ok(Some(Node::Component {
            name,
            attrs,
            children,
            line: start_line,
            col: start_col,
            id,
        }))
    }

    fn parse_identifier(&mut self) -> Result<String, ComponentError> {
        let mut ident = String::new();

        while let Some(c) = self.peek() {
            if c.is_alphanumeric() || c == '_' || c == '-' {
                ident.push(c);
                self.consume_char();
            } else {
                break;
            }
        }

        if ident.is_empty() {
            Err(ComponentError::ParseError(format!(
                "Expected identifier at line {}, col {}",
                self.line, self.col
            )))
        } else {
            Ok(ident)
        }
    }

    fn parse_value(&mut self) -> Result<TeraValue, ComponentError> {
        match self.peek() {
            Some('"') => self.parse_string(),
            Some('[') => self.parse_array(),
            Some('{') => self.parse_object(),
            Some(c) if c.is_digit(10) || c == '-' => self.parse_number(),
            _ => self.parse_bool_or_identifier(),
        }
    }

    fn parse_string(&mut self) -> Result<TeraValue, ComponentError> {
        self.consume_char(); // "
        let mut s = String::new();

        while let Some(c) = self.peek() {
            if c == '"' {
                self.consume_char(); // "
                break;
            } else if c == '\\' {
                self.consume_char(); // \
                if let Some(next) = self.peek() {
                    match next {
                        'n' => s.push('\n'),
                        't' => s.push('\t'),
                        'r' => s.push('\r'),
                        '"' => s.push('"'),
                        '\\' => s.push('\\'),
                        _ => {
                            s.push('\\');
                            s.push(next);
                        }
                    }
                    self.consume_char();
                }
            } else {
                s.push(c);
                self.consume_char();
            }
        }

        Ok(TeraValue::String(s))
    }

    fn parse_number(&mut self) -> Result<TeraValue, ComponentError> {
        let mut num_str = String::new();
        let mut has_dot = false;

        if self.peek() == Some('-') {
            num_str.push('-');
            self.consume_char();
        }

        while let Some(c) = self.peek() {
            if c.is_digit(10) {
                num_str.push(c);
                self.consume_char();
            } else if c == '.' && !has_dot {
                num_str.push('.');
                has_dot = true;
                self.consume_char();
            } else {
                break;
            }
        }

        if has_dot {
            num_str
                .parse::<f64>()
                .map(TeraValue::Number)
                .map_err(|e| ComponentError::ParseError(e.to_string()))
        } else {
            num_str
                .parse::<i64>()
                .map(|n| TeraValue::Number(n.into()))
                .map_err(|e| ComponentError::ParseError(e.to_string()))
        }
    }

    fn parse_bool_or_identifier(&mut self) -> Result<TeraValue, ComponentError> {
        let ident = self.parse_identifier()?;

        match ident.as_str() {
            "true" => Ok(TeraValue::Bool(true)),
            "false" => Ok(TeraValue::Bool(false)),
            "null" => Ok(TeraValue::Null),
            _ => Ok(TeraValue::String(ident)),
        }
    }

    fn parse_array(&mut self) -> Result<TeraValue, ComponentError> {
        self.consume_char(); // [
        self.skip_whitespace();

        let mut array = Vec::new();

        if self.peek() == Some(']') {
            self.consume_char(); // ]
            return Ok(TeraValue::Array(array));
        }

        loop {
            let value = self.parse_value()?;
            array.push(value);

            self.skip_whitespace();

            if self.peek() == Some(',') {
                self.consume_char(); // ,
                self.skip_whitespace();
            } else if self.peek() == Some(']') {
                self.consume_char(); // ]
                break;
            } else {
                return Err(ComponentError::ParseError(format!(
                    "Expected ',' or ']' at line {}, col {}",
                    self.line, self.col
                )));
            }
        }

        Ok(TeraValue::Array(array))
    }

    fn parse_object(&mut self) -> Result<TeraValue, ComponentError> {
        self.consume_char(); // {
        self.skip_whitespace();

        let mut map = serde_json::Map::new();

        if self.peek() == Some('}') {
            self.consume_char(); // }
            return Ok(TeraValue::Object(map));
        }

        loop {
            let key = if self.peek() == Some('"') {
                self.parse_string()?.as_str().unwrap().to_string()
            } else {
                self.parse_identifier()?
            };

            self.skip_whitespace();

            if !self.consume_exact(":") {
                return Err(ComponentError::ParseError(format!(
                    "Expected ':' at line {}, col {}",
                    self.line, self.col
                )));
            }

            self.skip_whitespace();

            let value = self.parse_value()?;
            map.insert(key, JsonValue::from(value));

            self.skip_whitespace();

            if self.peek() == Some(',') {
                self.consume_char(); // ,
                self.skip_whitespace();
            } else if self.peek() == Some('}') {
                self.consume_char(); // }
                break;
            } else {
                return Err(ComponentError::ParseError(format!(
                    "Expected ',' or '}}' at line {}, col {}",
                    self.line, self.col
                )));
            }
        }

        Ok(TeraValue::Object(map))
    }

    // Helper methods
    fn peek(&mut self) -> Option<char> {
        if let Some(c) = self.peeked {
            Some(c)
        } else {
            self.peeked = self.chars.next();
            self.peeked
        }
    }

    fn peek_n(&mut self, n: usize) -> Option<char> {
        let mut cloned = self.chars.clone();
        if let Some(peeked) = self.peeked {
            if n == 1 {
                return Some(peeked);
            }
            // For n > 1, we need to look ahead from the iterator
            let mut result = None;
            for i in 0..n {
                if i == 0 {
                    result = Some(peeked);
                } else {
                    result = cloned.next();
                }
            }
            result
        } else {
            let mut result = None;
            for _ in 0..n {
                result = cloned.next();
            }
            result
        }
    }

    fn consume_char(&mut self) -> Option<char> {
        let c = if let Some(peeked) = self.peeked.take() {
            peeked
        } else {
            self.chars.next()?
        };

        self.pos += c.len_utf8();
        if c == '\n' {
            self.line += 1;
            self.col = 1;
        } else {
            self.col += 1;
        }

        Some(c)
    }

    fn consume_exact(&mut self, s: &str) -> bool {
        let start_pos = self.pos;
        let start_line = self.line;
        let start_col = self.col;

        for expected in s.chars() {
            if self.consume_char() != Some(expected) {
                // Reset state
                self.pos = start_pos;
                self.line = start_line;
                self.col = start_col;
                self.chars = self.input[start_pos..].chars();
                self.peeked = None;
                return false;
            }
        }

        true
    }

    fn consume_until(&mut self, delimiter: &str) -> String {
        let start_pos = self.pos;
        let mut result = String::new();

        while self.pos < self.input.len() {
            if self.input[self.pos..].starts_with(delimiter) {
                break;
            }
            if let Some(c) = self.consume_char() {
                result.push(c);
            }
        }

        result
    }

    fn skip_whitespace(&mut self) {
        while let Some(c) = self.peek() {
            if c.is_whitespace() {
                self.consume_char();
            } else {
                break;
            }
        }
    }
}

// Cargo.toml
// [dependencies]
// regex-lite = "0.1"  # Lightweight regex without Unicode
// once_cell = "1.19"

// // src/parser.rs - Updated regex usage
// use once_cell::sync::Lazy;
// use regex_lite::Regex;

// static COMPONENT_REGEX: Lazy<Regex> = Lazy::new(|| {
//     Regex::new(r"\{\%\s*component\s+([^\s}]+)(.*?)\%\}(.*?)\{\%\s*endcomponent\s*%\}")
//         .expect("Invalid component regex")
// });

// static ATTR_REGEX: Lazy<Regex> = Lazy::new(|| {
//     // Simple, fast attribute parsing
//     Regex::new(r#"(\w+)=(?:"([^"]*)"|'([^']*)'|([^\s}]+))"#)
//         .expect("Invalid attribute regex")
// });

// static WHITESPACE_REGEX: Lazy<Regex> = Lazy::new(|| {
//     // Only matches 2+ whitespace chars (more efficient)
//     Regex::new(r"\s{2,}").expect("Invalid whitespace regex")
// });

// impl ComponentParser {
//     pub fn parse_efficient(&mut self) -> Result<Vec<Node>, ComponentError> {
//         // Use regex in chunks for large content
//         let chunk_size = 10_000; // 10KB chunks
//         let mut nodes = Vec::new();
//         let mut pos = 0;

//         while pos < self.input.len() {
//             let chunk_end = (pos + chunk_size).min(self.input.len());
//             let chunk = &self.input[pos..chunk_end];

//             // Find all components in this chunk
//             for cap in COMPONENT_REGEX.captures_iter(chunk) {
//                 // ... parsing logic
//             }

//             pos = chunk_end;
//         }

//         Ok(nodes)
//     }

//     fn strip_whitespace_efficient(html: &str) -> String {
//         // Only collapse multiple whitespace, don't remove all
//         WHITESPACE_REGEX.replace_all(html, " ").to_string()
//     }
// }
