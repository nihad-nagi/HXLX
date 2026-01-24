// /home/enzi/HXLX/plugins/mdbook-components/src/errors.rs
use std::fmt;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ComponentError {
    #[error("Parse error: {0}")]
    ParseError(String),

    #[error("Render error: {0}")]
    RenderError(String),

    #[error("Unknown component: {0}")]
    UnknownComponent(String),

    #[error("Validation error: {0}")]
    ValidationError(String),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("Template error: {0}")]
    TeraError(#[from] tera::Error),

    #[error("JSON error: {0}")]
    JsonError(#[from] serde_json::Error),

    #[error("Config error: {0}")]
    ConfigError(String),

    #[error("Hydration error: {0}")]
    HydrationError(String),

    #[error("Version mismatch: {0}")]
    VersionMismatch(String),
}

impl ComponentError {
    pub fn severity(&self) -> log::Level {
        match self {
            ComponentError::ParseError(_) => log::Level::Error,
            ComponentError::ValidationError(_) => log::Level::Warn,
            ComponentError::UnknownComponent(_) => log::Level::Warn,
            ComponentError::RenderError(_) => log::Level::Error,
            _ => log::Level::Error,
        }
    }
}
