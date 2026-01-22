// /HXLX/plugins/hxbook-admonish/src/config.rs
//! Configuration parsing for the admonition preprocessor.

use anyhow::Result;
use mdbook::preprocess::PreprocessorContext;
use toml::Value;

use crate::types::AdmonishConfig;

/// Parse the `[preprocessor.admonish]` config from mdBook context
pub fn parse_config(ctx: &PreprocessorContext) -> Result<AdmonishConfig> {
    let config = ctx
        .config
        .get_preprocessor("hxbook-admonish")
        .map(|table| {
            // Convert the table to TOML Value
            let value = Value::Table(table.clone());
            value.try_into()
        })
        .transpose()? // Option<Result<T>> -> Result<Option<T>>
        .unwrap_or_default(); // Use default if missing

    Ok(config)
}
