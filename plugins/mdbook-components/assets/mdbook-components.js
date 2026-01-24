// /home/enzi/HXLX/plugins/mdbook-components/assets/mdbook-components.js
(function () {
  // Export to global scope
  window.mdBookComponents = {
    Component: window.Component || null,
    ComponentRegistry: window.ComponentRegistry || null,
    HydrationManager: window.HydrationManager || null,

    // Built-in components will be added here
    components: {},

    // Initialize function
    init: function (options = {}) {
      const namespace = options.namespace || "mdbook";
      const registry = new ComponentRegistry(namespace, options);

      // Register built-in components
      Object.entries(this.components).forEach(([name, ComponentClass]) => {
        registry.register(name, ComponentClass);
      });

      // Auto-hydrate on page load
      document.addEventListener("DOMContentLoaded", () => {
        registry.hydratePage();
      });

      return registry;
    },
  };

  // Auto-initialize if noConflict is not called
  if (!window.mdBookComponentsNoConflict) {
    document.addEventListener("DOMContentLoaded", () => {
      window.mdBookComponents.init();
    });
  }
})();
