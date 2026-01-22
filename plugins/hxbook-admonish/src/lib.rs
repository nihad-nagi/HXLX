// /HXLX/plugins/hxbook-admonish/src/lib.rs
//! HXBook Admonish - A lightweight mdBook preprocessor for Material Design-styled admonitions
//! with local assets and custom HSL color system.

// Module declarations
pub mod config;
pub mod markdown;
pub mod parse;
pub mod render;
pub mod types;

// Public exports - main preprocessor struct
pub use markdown::AdmonishPreprocessor;
