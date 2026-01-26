pub mod errors;
pub mod parser;
pub mod preprocessor;
pub mod registry;
pub mod templates;

pub use errors::ComponentError;
pub use preprocessor::ComponentPreprocessor;
pub use registry::ComponentConfig;
pub use templates::ComponentManager;

// Re-exports
pub use mdbook;
pub use tera;
