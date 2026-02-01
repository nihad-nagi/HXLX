// /home/enzi/HXLX/plugins/mdbook-components/src/lib.rs
pub mod asset_generator;
pub mod errors;
pub mod parser;
pub mod preprocessor;
pub mod registry;
pub mod templates;
pub mod unocss_manager;

pub use asset_generator::{AssetGenerator, generate_assets};
pub use errors::ComponentError;
pub use preprocessor::ComponentPreprocessor;
pub use registry::ComponentConfig;
pub use templates::ComponentManager;
