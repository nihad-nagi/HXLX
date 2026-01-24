// assets/CacheManager.js
class CacheManager {
    constructor(options = {}) {
        this.cache = new WeakMap();
        this.mutationObservers = new WeakMap();
        this.autoClear = options.autoClear || true;
        this.clearThreshold = options.clearThreshold || 0.8; // 80% memory usage

        if (this.autoClear) {
            this.setupMemoryMonitoring();
        }
    }

    setupMemoryMonitoring() {
        // Monitor memory usage if available
        if (performance.memory) {
            setInterval(() => {
                const used = performance.memory.usedJSHeapSize;
                const total = performance.memory.totalJSHeapSize;

                if (used / total > this.clearThreshold) {
                    console.warn('High memory usage, clearing component cache');
                    this.clearAll();
                }
            }, 30000); // Check every 30 seconds
        }

        // Watch for external DOM changes
        this.setupMutationWatcher();
    }

    setupMutationWatcher() {
        // Observe the entire document for external changes
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                // Check if mutation is outside our component system
                if (!mutation.target.closest('[data-component]')) {
                    // External change detected, clear relevant cache
                    this.clearAffectedCache(mutation.target);
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true,
        });
    }

    clearAffectedCache(element) {
        // Find all components that might be affected
        const affectedComponents = element.querySelectorAll('[data-component]');

        for (const comp of affectedComponents) {
            this.cache.delete(comp);

            // Also clear from registry
            const instance = window.mdBookComponents?.registry?.getInstance(comp);
            if (instance) {
                instance.destroy?.();
            }
        }

        // If element itself is a component
        if (element.hasAttribute('data-component')) {
            this.cache.delete(element);
        }
    }

    getOrSet(key, factory) {
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }

        const value = factory();
        this.cache.set(key, value);

        // Set up cleanup if element is removed
        if (key instanceof Element) {
            this.setupCleanupObserver(key);
        }

        return value;
    }

    setupCleanupObserver(element) {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (Array.from(mutation.removedNodes).some(node =>
                    node === element || node.contains(element)
                )) {
                    this.cache.delete(element);
                    observer.disconnect();
                }
            }
        });

        observer.observe(element.parentElement || document.body, {
            childList: true,
        });

        this.mutationObservers.set(element, observer);
    }

    clearAll() {
        // Disconnect all observers
        for (const [element, observer] of this.mutationObservers) {
            observer.disconnect();
        }

        this.mutationObservers = new WeakMap();
        this.cache = new WeakMap();

        // Dispatch event for components to clean up
        document.dispatchEvent(new CustomEvent('mdbook-cache-cleared'));
    }
}
