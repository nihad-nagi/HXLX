// /home/enzi/HXLX/plugins/mdbook-components/src/parser.rs
use crate::errors::ComponentError;
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
            if self.peek() == Some('{') && self.peek_n(1) == Some('%') {
                match self.try_parse_component() {
                    Ok(Some(node)) => nodes.push(node),
                    Ok(None) => {
                        // Not a component, consume as text
                        let text = self.consume_until("{%");
                        if !text.is_empty() {
                            nodes.push(Node::Text(text));
                        }
                    }
                    Err(e) => return Err(e),
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
        let _start_pos = self.pos;
        let start_line = self.line;
        let start_col = self.col;

        // Check for component tag
        if !self.consume_exact("{%") {
            return Ok(None);
        }

        self.skip_whitespace();

        if !self.consume_exact("component") {
            // Not a component tag, rewind
            self.rewind_to(_start_pos, start_line, start_col);
            return Ok(None);
        }

        self.skip_whitespace();

        // Parse component name (in quotes)
        if self.peek() != Some('"') {
            return Err(ComponentError::ParseError(
                "Expected component name in quotes".to_string(),
            ));
        }
        self.consume_char(); // "

        let mut name = String::new();
        while let Some(c) = self.peek() {
            if c == '"' {
                self.consume_char(); // "
                break;
            }
            name.push(c);
            self.consume_char();
        }

        // Parse attributes
        let mut attrs = HashMap::new();
        while self.peek() != Some('%') {
            self.skip_whitespace();
            if self.peek() == Some('%') {
                break;
            }

            // Parse key
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

            self.skip_whitespace();
        }

        // Expect %}
        if !self.consume_exact("%}") {
            return Err(ComponentError::ParseError(
                "Expected %} after component".to_string(),
            ));
        }

        // Parse children until {% endcomponent %}
        let mut children = Vec::new();
        let end_marker = "{% endcomponent %}";

        while self.pos < self.input.len() {
            if self.input[self.pos..].starts_with(end_marker) {
                // Consume the end marker
                for _ in end_marker.chars() {
                    self.consume_char();
                }
                break;
            }

            if self.peek() == Some('{') && self.peek_n(1) == Some('%') {
                match self.try_parse_component()? {
                    Some(child) => children.push(child),
                    None => {
                        // Some other template tag, skip it
                        let text = self.consume_until("{%");
                        if !text.is_empty() {
                            children.push(Node::Text(text));
                        }
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

        // Generate ID
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

    // Helper methods
    fn rewind_to(&mut self, pos: usize, line: usize, col: usize) {
        self.pos = pos;
        self.line = line;
        self.col = col;
        self.chars = self.input[pos..].chars();
        self.peeked = None;
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
            Err(ComponentError::ParseError(
                "Expected identifier".to_string(),
            ))
        } else {
            Ok(ident)
        }
    }

    fn parse_value(&mut self) -> Result<TeraValue, ComponentError> {
        match self.peek() {
            Some('"') => {
                self.consume_char();
                let mut s = String::new();
                while let Some(c) = self.peek() {
                    if c == '"' {
                        self.consume_char();
                        break;
                    }
                    s.push(c);
                    self.consume_char();
                }
                Ok(TeraValue::String(s))
            }
            Some(c) if c.is_digit(10) => {
                let mut num = String::new();
                while let Some(c) = self.peek() {
                    if c.is_digit(10) {
                        num.push(c);
                        self.consume_char();
                    } else {
                        break;
                    }
                }
                if let Ok(n) = num.parse::<i64>() {
                    Ok(TeraValue::Number(n.into()))
                } else {
                    Ok(TeraValue::String(num))
                }
            }
            Some('t') if self.input[self.pos..].starts_with("true") => {
                self.consume_exact("true");
                Ok(TeraValue::Bool(true))
            }
            Some('f') if self.input[self.pos..].starts_with("false") => {
                self.consume_exact("false");
                Ok(TeraValue::Bool(false))
            }
            _ => {
                // Try to parse as identifier
                let ident = self.parse_identifier()?;
                Ok(TeraValue::String(ident))
            }
        }
    }

    fn peek(&mut self) -> Option<char> {
        if let Some(c) = self.peeked {
            Some(c)
        } else {
            self.peeked = self.chars.next();
            self.peeked
        }
    }

    fn peek_n(&self, n: usize) -> Option<char> {
        // Simple implementation
        if n == 1 {
            self.peeked
        } else {
            let mut cloned = self.chars.clone();
            for _ in 0..n {
                cloned.next();
            }
            cloned.next()
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
        let _start_pos = self.pos; // Already has underscore
        let start_line = self.line;
        let start_col = self.col;

        for expected in s.chars() {
            if self.consume_char() != Some(expected) {
                // Reset
                self.rewind_to(_start_pos, start_line, start_col);
                return false;
            }
        }

        true
    }

    fn consume_until(&mut self, delimiter: &str) -> String {
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
