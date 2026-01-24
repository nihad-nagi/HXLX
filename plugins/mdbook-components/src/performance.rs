// // Cargo.toml
// [dependencies]
// cached = { version = "0.51", features = ["async"] }
// dashmap = "5.5"  # Concurrent HashMap
// once_cell = "1.19"

// src/performance.rs
use cached::proc_macro::cached;
use dashmap::DashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

#[derive(Clone)]
pub struct ComponentCache {
    // LRU cache for component templates
    templates: Arc<DashMap<String, (String, Instant)>>,
    max_size: usize,
    ttl: Duration,
}

impl ComponentCache {
    pub fn new(max_size: usize, ttl_seconds: u64) -> Self {
        Self {
            templates: Arc::new(DashMap::new()),
            max_size,
            ttl: Duration::from_secs(ttl_seconds),
        }
    }

    #[cached(
        type = "DashMap<String, String>",
        create = "{ DashMap::new() }",
        convert = r#"{ format!("{}:{}", component_id, hash) }"#
    )]
    pub fn get_rendered_component(&self, component_id: &str, hash: u64) -> Option<String> {
        self.templates
            .get(&format!("{}:{}", component_id, hash))
            .filter(|entry| entry.1.elapsed() < self.ttl)
            .map(|entry| entry.0.clone())
    }

    pub fn store_rendered(&self, component_id: &str, hash: u64, html: String) {
        // Clean up if too large
        if self.templates.len() >= self.max_size {
            self.evict_oldest();
        }

        self.templates
            .insert(format!("{}:{}", component_id, hash), (html, Instant::now()));
    }

    fn evict_oldest(&self) {
        let mut entries: Vec<_> = self
            .templates
            .iter()
            .map(|entry| (entry.key().clone(), entry.value().1))
            .collect();

        entries.sort_by_key(|(_, time)| *time);

        // Remove oldest 10%
        let to_remove = (entries.len() as f32 * 0.1).ceil() as usize;
        for (key, _) in entries.into_iter().take(to_remove) {
            self.templates.remove(&key);
        }
    }

    // Clear cache when external DOM changes detected
    pub fn clear_if_stale(&self, root: &str) -> bool {
        // Check if root content changed (simplified)
        let current_hash = self.hash_string(root);
        let cached = self.root_hashes.get(&"root".to_string());

        match cached {
            Some((hash, time)) if time.elapsed() < self.ttl => {
                if *hash != current_hash {
                    self.clear_all();
                    true
                } else {
                    false
                }
            }
            _ => {
                self.root_hashes
                    .insert("root".to_string(), (current_hash, Instant::now()));
                false
            }
        }
    }

    fn hash_string(&self, s: &str) -> u64 {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        let mut hasher = DefaultHasher::new();
        s.hash(&mut hasher);
        hasher.finish()
    }
}

// Enhanced cycle detection with optional dependencies
pub fn detect_cycles_safe(
    components: &HashMap<String, ComponentDefinition>,
) -> Result<(), Vec<String>> {
    let mut errors = Vec::new();
    let mut visited = HashSet::new();
    let mut recursion_stack = HashSet::new();

    for component in components.keys() {
        if !visited.contains(component) {
            if has_cycle(
                component,
                components,
                &mut visited,
                &mut recursion_stack,
                &mut Vec::new(),
            ) {
                errors.push(format!("Circular dependency involving: {}", component));
            }
        }
    }

    if errors.is_empty() {
        Ok(())
    } else {
        Err(errors)
    }
}

fn has_cycle(
    component: &str,
    graph: &HashMap<String, ComponentDefinition>,
    visited: &mut HashSet<String>,
    recursion_stack: &mut HashSet<String>,
    path: &mut Vec<String>,
) -> bool {
    if recursion_stack.contains(component) {
        // Found a cycle, but check if it's all optional
        let cycle_path = path.iter().collect::<Vec<_>>();
        let all_optional = cycle_path.iter().all(|&name| {
            graph
                .get(*name)
                .and_then(|def| def.dependencies.as_ref())
                .map(|deps| deps.iter().all(|dep| dep.starts_with('?')))
                .unwrap_or(true)
        });

        if all_optional {
            return false; // Optional dependencies don't break builds
        }

        return true;
    }

    if visited.contains(component) {
        return false;
    }

    visited.insert(component.to_string());
    recursion_stack.insert(component.to_string());
    path.push(component.to_string());

    if let Some(deps) = graph.get(component).and_then(|d| d.dependencies.as_ref()) {
        for dep in deps {
            let dep_name = if dep.starts_with('?') {
                &dep[1..] // Strip optional marker
            } else {
                dep
            };

            if has_cycle(dep_name, graph, visited, recursion_stack, path) {
                return true;
            }
        }
    }

    path.pop();
    recursion_stack.remove(component);
    false
}
