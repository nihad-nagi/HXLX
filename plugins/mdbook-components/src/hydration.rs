// /home/enzi/HXLX/plugins/mdbook-components/src/hydration.rs
use crate::errors::ComponentError;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tera::Value as TeraValue;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HydrationData {
    pub component_id: String,
    pub component_type: String,
    pub server_html: String,
    pub props: HashMap<String, TeraValue>,
    pub version: String,
    pub dependencies: Vec<String>,
}

impl HydrationData {
    pub fn new(
        component_id: String,
        component_type: String,
        server_html: String,
        props: HashMap<String, TeraValue>,
        dependencies: Vec<String>,
    ) -> Self {
        Self {
            component_id,
            component_type,
            server_html,
            props,
            version: "1.0".to_string(),
            dependencies,
        }
    }

    pub fn to_json(&self) -> Result<String, ComponentError> {
        serde_json::to_string(self).map_err(ComponentError::from)
    }

    pub fn to_html_attr(&self) -> Result<String, ComponentError> {
        let json = self.to_json()?;
        // Escape for HTML attribute
        let escaped = json
            .replace('"', "&quot;")
            .replace('\'', "&#39;")
            .replace('<', "&lt;")
            .replace('>', "&gt;");
        Ok(escaped)
    }
}

pub struct HydrationManager {
    pub strict: bool,
    pub debug: bool,
    pub errors: Vec<ComponentError>,
}

impl HydrationManager {
    pub fn new(strict: bool, debug: bool) -> Self {
        Self {
            strict,
            debug,
            errors: Vec::new(),
        }
    }

    pub fn validate_server_html(&self, actual: &str, expected: &str) -> bool {
        // Simple validation - could be enhanced with HTML parsing
        let normalized_actual = self.normalize_html(actual);
        let normalized_expected = self.normalize_html(expected);

        if normalized_actual != normalized_expected && self.debug {
            println!(
                "HTML mismatch:\nActual: {}\nExpected: {}",
                normalized_actual, normalized_expected
            );
        }

        normalized_actual == normalized_expected
    }

    fn normalize_html(&self, html: &str) -> String {
        // Remove whitespace and normalize
        html.trim()
            .replace("\n", " ")
            .replace("\r", "")
            .replace("\t", " ")
            .replace("  ", " ")
            .replace("> <", "><")
    }

    pub fn add_error(&mut self, error: ComponentError) {
        self.errors.push(error);
    }

    pub fn has_errors(&self) -> bool {
        !self.errors.is_empty()
    }
}
