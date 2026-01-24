// // Cargo.toml
// [dependencies]
// tokio = { version = "1.35", features = ["full"] }
// backoff = "0.4"  // Exponential backoff
// ratelimit = "0.1"  // Rate limiting

// src/hydration_queue.rs
use backoff::{ExponentialBackoff, Error as BackoffError};
use ratelimit::Ratelimiter;
use std::sync::atomic::{AtomicUsize, Ordering};

pub struct AdaptiveHydrationQueue {
    concurrency: AtomicUsize,
    max_concurrency: usize,
    min_concurrency: usize,
    failure_counts: DashMap<String, AtomicUsize>,
    ratelimiter: Arc<Ratelimiter>,
    backoff_config: ExponentialBackoff,
}

impl AdaptiveHydrationQueue {
    pub fn new() -> Self {
        // Start with conservative concurrency
        let initial_concurrency = 2.min(num_cpus::get());

        Self {
            concurrency: AtomicUsize::new(initial_concurrency),
            max_concurrency: 8,
            min_concurrency: 1,
            failure_counts: DashMap::new(),
            ratelimiter: Arc::new(Ratelimiter::new(5, Duration::from_secs(1))), // 5/sec
            backoff_config: ExponentialBackoff {
                initial_interval: Duration::from_millis(100),
                multiplier: 2.0,
                max_interval: Duration::from_secs(5),
                max_elapsed_time: Some(Duration::from_secs(30)),
                ..ExponentialBackoff::default()
            },
        }
    }

    pub async fn hydrate_with_retry(
        &self,
        component_name: &str,
        element: web_sys::Element,
        hydration_data: &HydrationData,
    ) -> Result<ComponentInstance, HydrationError> {
        let failure_count = self.failure_counts
            .entry(component_name.to_string())
            .or_insert_with(|| AtomicUsize::new(0))
            .clone();

        // Apply rate limiting
        self.ratelimiter.wait().await;

        // Adaptive concurrency based on failures
        let current = self.concurrency.load(Ordering::Relaxed);
        let failures = failure_count.load(Ordering::Relaxed);

        if failures > 3 {
            // Reduce concurrency for problematic components
            self.concurrency.fetch_max(self.min_concurrency, Ordering::Relaxed);
        } else if failures == 0 {
            // Gradually increase concurrency
            let new = (current + 1).min(self.max_concurrency);
            self.concurrency.store(new, Ordering::Relaxed);
        }

        // Exponential backoff for retries
        let operation = || async {
            match self.try_hydrate(component_name, &element, hydration_data).await {
                Ok(instance) => {
                    // Reset failure count on success
                    failure_count.store(0, Ordering::Relaxed);
                    Ok(instance)
                }
                Err(e) => {
                    failure_count.fetch_add(1, Ordering::Relaxed);
                    Err(BackoffError::transient(e))
                }
            }
        };

        backoff::future::retry(self.backoff_config.clone(), operation).await
            .map_err(|e| HydrationError::MaxRetriesExceeded(component_name.to_string(), e.to_string()))
    }

    pub fn should_skip_component(&self, component_name: &str) -> bool {
        self.failure_counts
            .get(component_name)
            .map(|count| count.load(Ordering::Relaxed) > 5)
            .unwrap_or(false)
    }

    pub fn get_concurrency(&self) -> usize {
        self.concurrency.load(Ordering::Relaxed)
    }
}
