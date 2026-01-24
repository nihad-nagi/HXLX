// /home/enzi/HXLX/plugins/mdbook-components/assets/ComponentRegistry.js
class ComponentRegistry {
  constructor(namespace = "mdbook", options = {}) {
    this.namespace = namespace;
    this.strictHydration = options.strictHydration || false;
    this.debug = options.debug || false;

    this._registry = new Map();
    this._instances = new WeakMap();
    this._dependencies = new Map();
    this._pendingHydrations = new Map();
  }

  // Register a component with version and dependencies
  register(name, ComponentClass, options = {}) {
    const fullName = `${this.namespace}.${name}`;

    if (this._registry.has(fullName)) {
      const existing = this._registry.get(fullName);

      // Version check
      if (existing.version !== options.version) {
        console.warn(
          `Component "${name}" version mismatch: ${existing.version} vs ${options.version}`,
        );

        if (this._shouldUpgrade(existing.version, options.version)) {
          this._upgradeComponent(fullName, ComponentClass, options);
          return true;
        }
        return false;
      }
    }

    this._registry.set(fullName, {
      class: ComponentClass,
      version: options.version || "1.0.0",
      dependencies: options.dependencies || [],
      schema: options.schema || null,
    });

    // Register dependencies
    if (options.dependencies) {
      this._dependencies.set(fullName, options.dependencies);
    }

    // Auto-register as custom element
    if (options.registerAsElement) {
      this._registerCustomElement(name, ComponentClass, options);
    }

    return true;
  }

  // Get a component class, loading dependencies if needed
  async get(name, options = {}) {
    const fullName = `${this.namespace}.${name}`;
    const component = this._registry.get(fullName);

    if (!component) {
      if (options.autoImport) {
        await this._autoImport(name);
        return this.get(name, { ...options, autoImport: false });
      }
      throw new Error(`Component "${name}" not registered`);
    }

    // Check and load dependencies
    if (component.dependencies.length > 0) {
      for (const dep of component.dependencies) {
        if (!this._registry.has(dep)) {
          await this._loadDependency(dep);
        }
      }
    }

    return component.class;
  }

  // Hydrate all components on the page
  async hydratePage(root = document.body) {
    const components = root.querySelectorAll("[data-component]");

    for (const el of components) {
      try {
        await this.hydrateElement(el);
      } catch (err) {
        console.error(`Failed to hydrate component on element:`, el, err);

        if (this.strictHydration) {
          throw err;
        } else if (this.debug) {
          this._showErrorUI(el, err);
        }
      }
    }
  }

  // Hydrate a single element
  async hydrateElement(el) {
    const componentName = el.dataset.component;
    const hydrationData = el.dataset.hydration
      ? JSON.parse(el.dataset.hydration)
      : null;

    if (!componentName) {
      console.warn("Element has data-component but no component name:", el);
      return;
    }

    // Get component class
    const ComponentClass = await this.get(componentName, {
      autoImport: true,
    });

    // Create component instance
    const instance = new ComponentClass(el, {
      props: hydrationData?.props || {},
      _serverHTML: hydrationData?.server_html,
      _mode: "hydrate",
    });

    // Store instance
    this._instances.set(el, instance);

    return instance;
  }

  // Get component instance for an element
  getInstance(el) {
    return this._instances.get(el);
  }

  // Unregister a component
  unregister(name) {
    const fullName = `${this.namespace}.${name}`;
    this._registry.delete(fullName);
    this._dependencies.delete(fullName);
  }

  // List all registered components
  list() {
    return Array.from(this._registry.keys()).map((name) => ({
      name: name.replace(`${this.namespace}.`, ""),
      ...this._registry.get(name),
    }));
  }

  // === Private Methods ===

  _shouldUpgrade(currentVersion, newVersion) {
    // Simple semver check - in production, use proper semver parsing
    const current = currentVersion.split(".").map(Number);
    const next = newVersion.split(".").map(Number);

    // Only upgrade major versions if explicitly allowed
    return next[0] > current[0] ? false : true;
  }

  _upgradeComponent(fullName, ComponentClass, options) {
    console.log(
      `Upgrading component ${fullName} to version ${options.version}`,
    );
    this._registry.set(fullName, {
      class: ComponentClass,
      version: options.version,
      dependencies: options.dependencies || [],
      schema: options.schema || null,
    });
  }

  async _autoImport(name) {
    // In a real implementation, this would load the component from a CDN or local path
    console.warn(`Auto-import not implemented for component: ${name}`);
    throw new Error(`Cannot auto-import component: ${name}`);
  }

  async _loadDependency(dep) {
    console.warn(`Dependency loading not implemented: ${dep}`);
    throw new Error(`Cannot load dependency: ${dep}`);
  }

  _registerCustomElement(name, ComponentClass, options) {
    const tagName = options.tagName || `md-${name}`;

    if (!customElements.get(tagName)) {
      customElements.define(
        tagName,
        class extends HTMLElement {
          constructor() {
            super();
            this._component = null;
          }

          connectedCallback() {
            const props = this._getPropsFromAttributes();
            this._component = new ComponentClass(this, { props });
          }

          disconnectedCallback() {
            if (this._component) {
              this._component.destroy();
              this._component = null;
            }
          }

          _getPropsFromAttributes() {
            const props = {};
            for (const attr of this.attributes) {
              if (attr.name.startsWith("data-")) {
                const propName = attr.name.replace("data-", "");
                try {
                  props[propName] = JSON.parse(attr.value);
                } catch {
                  props[propName] = attr.value;
                }
              }
            }
            return props;
          }
        },
      );
    }
  }

  _showErrorUI(el, error) {
    const errorDiv = document.createElement("div");
    errorDiv.className = "component-error";
    errorDiv.innerHTML = `
      <div class="component-error-header">
        Component Error
      </div>
      <div class="component-error-body">
        ${error.message}
      </div>
    `;
    el.parentNode.insertBefore(errorDiv, el);
    el.style.display = "none";
  }
}
