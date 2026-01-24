// /home/enzi/HXLX/plugins/mdbook-components/src/lib.rs
pub mod errors;
pub mod hydration;
// pub mod hydration_queue;
pub mod parser;
pub mod preprocessor;
pub mod registry;
pub mod templates;

pub use errors::ComponentError;
pub use preprocessor::TeraComponents;
pub use registry::ComponentConfig;

// Re-exports for convenience
pub use mdbook;
pub use tera;
