// /home/enzi/HXLX/plugins/mdbook-components/assets/mdbook-components.js
(function () {
  // Export to global scope
  const mdBookComponents = {
    Component: window.Component || null,
    ComponentRegistry: window.ComponentRegistry || null,
    HydrationManager: window.HydrationManager || null,

    // Built-in components registry
    components: {},

    // Configuration
    config: {
      namespace: "mdbook",
      strictHydration: false,
      debug: false,
    },

    // Initialize function
    init: function (options = {}) {
      // Merge config
      Object.assign(this.config, options);

      // Initialize registry
      const registry = new ComponentRegistry(this.config.namespace, {
        strictHydration: this.config.strictHydration,
        debug: this.config.debug,
      });

      // Initialize hydration manager
      const hydrationManager = new HydrationManager({
        strict: this.config.strictHydration,
        debug: this.config.debug,
      });

      // Register built-in components
      Object.entries(this.components).forEach(([name, ComponentClass]) => {
        const meta = ComponentClass.meta || {};
        registry.register(name, ComponentClass, {
          version: meta.version || "1.0.0",
          dependencies: meta.dependencies || [],
          schema: meta.schema || null,
        });
      });

      // Auto-hydrate on page load
      document.addEventListener("DOMContentLoaded", () => {
        // Queue all components for hydration
        const components = document.querySelectorAll("[data-component]");
        components.forEach((el) => {
          try {
            const hydrationData = el.dataset.hydration
              ? JSON.parse(el.dataset.hydration)
              : null;

            if (hydrationData) {
              hydrationManager.queueForHydration(el, hydrationData);
            }
          } catch (err) {
            console.warn("Failed to parse hydration data:", err);
          }
        });

        // Process hydration queue
        hydrationManager.processQueue({ concurrency: 2 }).catch((err) => {
          console.error("Hydration queue processing failed:", err);
        });
      });

      // Store instances for debugging
      window.mdBookComponentsRegistry = registry;
      window.mdBookHydrationManager = hydrationManager;

      return {
        registry,
        hydrationManager,
        components: this.components,
      };
    },

    // Register a component
    register: function (name, ComponentClass, options = {}) {
      this.components[name] = ComponentClass;

      if (window.mdBookComponentsRegistry) {
        window.mdBookComponentsRegistry.register(name, ComponentClass, options);
      }

      return this;
    },

    // Get component instance
    getInstance: function (el) {
      if (window.mdBookComponentsRegistry) {
        return window.mdBookComponentsRegistry.getInstance(el);
      }
      return null;
    },

    // No-conflict mode
    noConflict: function () {
      window.mdBookComponentsNoConflict = true;
      const original = window.mdBookComponents;
      window.mdBookComponents = undefined;
      return original;
    },
  };

  // Export to window
  window.mdBookComponents = mdBookComponents;

  // Auto-initialize if noConflict is not called
  if (!window.mdBookComponentsNoConflict) {
    document.addEventListener("DOMContentLoaded", () => {
      mdBookComponents.init();
    });
  }
})();
