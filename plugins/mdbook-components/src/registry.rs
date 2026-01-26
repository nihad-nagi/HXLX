// src/registry.rs
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use tera::Value as TeraValue;

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(untagged)]
pub enum ComponentSource {
    /// Inline MVC components (all in one)
    Inline {
        template: String,
        css: Option<String>,
        js: Option<String>,
    },
    /// File-based MVC components
    Files {
        template: PathBuf,
        css: Option<PathBuf>,
        js: Option<PathBuf>,
    },
    /// Directory-based (auto-discovers model.html, view.css, control.js)
    Directory(PathBuf),
}

impl ComponentSource {
    pub fn load(&self, base_dir: &Path) -> Result<LoadedComponent, std::io::Error> {
        match self {
            ComponentSource::Inline { template, css, js } => Ok(LoadedComponent {
                template: template.clone(),
                css: css.clone(),
                js: js.clone(),
            }),
            ComponentSource::Files { template, css, js } => {
                let template_path = base_dir.join(template);
                let template_content = std::fs::read_to_string(&template_path)?;

                let css_content = css
                    .as_ref()
                    .map(|p| std::fs::read_to_string(base_dir.join(p)))
                    .transpose()?;

                let js_content = js
                    .as_ref()
                    .map(|p| std::fs::read_to_string(base_dir.join(p)))
                    .transpose()?;

                Ok(LoadedComponent {
                    template: template_content,
                    css: css_content,
                    js: js_content,
                })
            }
            ComponentSource::Directory(dir) => {
                let dir_path = base_dir.join(dir);

                let template_path = dir_path.join("model.html");
                let css_path = dir_path.join("view.css");
                let js_path = dir_path.join("control.js");

                let template = std::fs::read_to_string(&template_path)?;
                let css = std::fs::read_to_string(&css_path).ok();
                let js = std::fs::read_to_string(&js_path).ok();

                Ok(LoadedComponent { template, css, js })
            }
        }
    }
}

#[derive(Debug, Clone)]
pub struct LoadedComponent {
    pub template: String,
    pub css: Option<String>,
    pub js: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ComponentSchema {
    #[serde(default)]
    pub required: Option<Vec<String>>,

    #[serde(default)]
    pub optional: Option<Vec<String>>,

    #[serde(default)]
    pub props: Option<HashMap<String, PropSchema>>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct PropSchema {
    #[serde(rename = "type")]
    pub type_: String,
    #[serde(default)]
    pub default: Option<TeraValue>,
    #[serde(default)]
    pub description: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ComponentDefinition {
    /// Source of the component (inline, files, or directory)
    #[serde(flatten)]
    pub source: ComponentSource,

    /// Schema for validation
    #[serde(default)]
    pub schema: Option<ComponentSchema>,

    /// Default attributes
    #[serde(default)]
    pub default_attrs: Option<HashMap<String, TeraValue>>,

    /// Version for dependency management
    #[serde(default)]
    pub version: Option<String>,

    /// Dependencies on other components
    #[serde(default)]
    pub dependencies: Option<Vec<String>>,

    /// Whether this is a built-in component
    #[serde(default)]
    pub builtin: bool,

    /// CSS dependencies
    #[serde(default)]
    pub css_deps: Option<Vec<String>>,

    /// JavaScript dependencies
    #[serde(default)]
    pub js_deps: Option<Vec<String>>,
}

impl ComponentDefinition {
    pub fn from_directory<P: AsRef<Path>>(dir: P) -> Result<Self, anyhow::Error> {
        let dir = dir.as_ref();

        // Check if component.toml exists
        let config_path = dir.join("component.toml");
        if config_path.exists() {
            let config_content = std::fs::read_to_string(&config_path)?;
            let mut def: Self = toml::from_str(&config_content)
                .map_err(|e| anyhow::anyhow!("Failed to parse component.toml: {}", e))?;

            // Ensure source is set to directory
            def.source = ComponentSource::Directory(dir.to_path_buf());

            Ok(def)
        } else {
            // Auto-discover MVC files - this is the main path!
            Ok(Self {
                source: ComponentSource::Directory(dir.to_path_buf()),
                schema: None,
                default_attrs: None,
                version: None,
                dependencies: None,
                builtin: false,
                css_deps: None,
                js_deps: None,
            })
        }
    }
}

// Helper to load all components from a directory
pub fn load_components_from_directory<P: AsRef<Path>>(
    dir: P,
) -> Result<HashMap<String, ComponentDefinition>, anyhow::Error> {
    let mut components = HashMap::new();

    let entries = std::fs::read_dir(dir.as_ref())?;

    for entry in entries {
        let entry = entry?;
        let path = entry.path();

        if path.is_dir() {
            // Check if it's a component directory (has model.html)
            let model_path = path.join("model.html");
            if model_path.exists() {
                let component_name = path
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("unknown")
                    .to_string();

                match ComponentDefinition::from_directory(&path) {
                    Ok(def) => {
                        components.insert(component_name, def);
                    }
                    Err(e) => {
                        log::warn!("Failed to load component from {:?}: {}", path, e);
                    }
                }
            }
        }
    }

    Ok(components)
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
pub struct ComponentConfig {
    #[serde(default)]
    pub namespace: String,

    #[serde(default)]
    pub strict: bool,

    #[serde(default)]
    pub strict_hydration: bool,

    #[serde(default)]
    pub debug: bool,

    #[serde(default)]
    pub warnings_as_errors: bool,

    #[serde(default)]
    pub templates: HashMap<String, String>,

    // This field is optional in the TOML - users don't define components here!
    #[serde(default)]
    pub components: HashMap<String, ComponentDefinition>,
}

impl ComponentConfig {
    pub fn from_context(
        ctx: &mdbook::preprocess::PreprocessorContext,
    ) -> Result<Self, anyhow::Error> {
        // Try to get the preprocessor.components section
        let config_value = if let Some(config) = ctx.config.get("preprocessor.components") {
            config.clone()
        } else {
            return Ok(Self::default());
        };

        // Convert to string
        let config_str = config_value.to_string();

        // Parse the TOML - components field will be empty (which is what we want!)
        let config: Self = toml::from_str(&config_str)
            .map_err(|e| anyhow::anyhow!("Failed to parse component config: {}", e))?;

        // Set defaults
        let mut config = config;
        if config.namespace.is_empty() {
            config.namespace = "mdbook".to_string();
        }

        Ok(config)
    }

    pub fn validate(&self) -> Result<(), crate::errors::ComponentError> {
        // No validation needed for auto-discovered components
        Ok(())
    }
}
