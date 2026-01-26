// /home/enzi/HXLX/plugins/mdbook-components/src/errors.rs
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ComponentError {
    #[error("Parse error: {0}")]
    ParseError(String),

    #[error("Unknown component: {0}")]
    UnknownComponent(String),

    #[error("Validation error: {0}")]
    ValidationError(String),

    #[error("Template error: {0}")]
    TemplateError(#[from] tera::Error),

    #[error("JSON error: {0}")]
    JsonError(#[from] serde_json::Error),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("Configuration error: {0}")]
    ConfigError(String),
}
