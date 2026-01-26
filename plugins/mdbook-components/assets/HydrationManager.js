// /home/enzi/HXLX/plugins/mdbook-components/assets/HydrationManager.js
class HydrationManager {
  constructor(options = {}) {
    this.strict = options.strict || false;
    this.debug = options.debug || false;
    this.errors = [];
    this._hydrationQueue = new Set();
  }

  // Queue a component for hydration
  queueForHydration(el, hydrationData) {
    if (!this.shouldHydrate(el)) return false;

    this._hydrationQueue.add({
      element: el,
      data: hydrationData,
      timestamp: Date.now(),
    });

    return true;
  }

  // Process hydration queue
  async processQueue(options = {}) {
    const { concurrency = 2 } = options;
    const queue = Array.from(this._hydrationQueue);

    // Process in batches
    for (let i = 0; i < queue.length; i += concurrency) {
      const batch = queue.slice(i, i + concurrency);
      await Promise.all(
        batch.map((item) => this.hydrateComponent(item.element, item.data)),
      );
    }

    this._hydrationQueue.clear();
  }

  // Hydrate a single component
  async hydrateComponent(el, hydrationData) {
    try {
      // Validate server HTML matches client expectations
      const isValid = this.validateServerHTML(el, hydrationData.server_html);

      if (!isValid) {
        await this.patchDifferences(el, hydrationData);
      }

      // Extract dynamic data
      const dynamicData = this.extractDynamicData(hydrationData.server_html);

      // Create component instance
      const componentName = el.dataset.component;
      const ComponentClass = await this._getComponentClass(componentName);

      const instance = new ComponentClass(el, {
        props: { ...hydrationData.props, ...dynamicData },
        _serverHTML: hydrationData.server_html,
        _mode: "hydrate",
      });

      return instance;
    } catch (err) {
      console.error(`Failed to hydrate component on element:`, el, err);

      if (this.strict) {
        throw err;
      } else if (this.debug) {
        this._showErrorUI(el, err);
      }

      return null;
    }
  }

  // Validate server HTML matches client expectations
  validateServerHTML(el, expectedHTML) {
    if (!expectedHTML) return true;

    const normalizedActual = this._normalizeHTML(el.innerHTML);
    const normalizedExpected = this._normalizeHTML(expectedHTML);

    const isValid = normalizedActual === normalizedExpected;

    if (!isValid && this.debug) {
      console.warn("Server/Client HTML mismatch:", {
        actual: normalizedActual,
        expected: normalizedExpected,
        element: el,
      });

      this.errors.push({
        type: "HTML_MISMATCH",
        element: el,
        actual: normalizedActual,
        expected: normalizedExpected,
      });
    }

    return isValid;
  }

  // Patch differences between server and client HTML
  async patchDifferences(el, hydrationData) {
    if (!hydrationData?.server_html) return;

    const actual = el.innerHTML;
    const expected = hydrationData.server_html;

    if (actual === expected) return;

    // Create a diff and apply patches
    const patches = this._createDiffPatches(actual, expected);

    for (const patch of patches) {
      try {
        await this._applyPatch(el, patch);
      } catch (err) {
        console.error("Failed to apply patch:", patch, err);

        if (this.strict) {
          throw new Error(`Failed to patch component: ${err.message}`);
        }
      }
    }
  }

  // Extract dynamic data from server HTML
  extractDynamicData(serverHTML) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(serverHTML, "text/html");

    const dynamicElements = doc.querySelectorAll("[data-dynamic]");
    const dynamicData = {};

    dynamicElements.forEach((el) => {
      const markerId = el.dataset.dynamic;
      if (markerId) {
        dynamicData[markerId] = el.innerHTML;
      }
    });

    return dynamicData;
  }

  // Check if component needs hydration
  shouldHydrate(el) {
    // Check for hydration data
    if (!el.dataset.hydration) return false;

    // Check version compatibility
    try {
      const hydration = JSON.parse(el.dataset.hydration);
      return hydration.version === "1.0";
    } catch {
      return false;
    }
  }

  // === Private Methods ===

  async _getComponentClass(name) {
    // In a real implementation, this would load from registry
    if (window.mdBookComponents && window.mdBookComponents.components[name]) {
      return window.mdBookComponents.components[name];
    }

    // Fallback: try to auto-load
    const module = await import(`./components/${name}/control.js`);
    return module.default || module;
  }

  _normalizeHTML(html) {
    return html
      .trim()
      .replace(/\s+/g, " ")
      .replace(/>\s+</g, "><")
      .replace(/<!--.*?-->/g, "");
  }

  _createDiffPatches(actual, expected) {
    // Simple diff implementation
    const patches = [];

    if (actual.length !== expected.length) {
      patches.push({
        type: "REPLACE",
        content: expected,
      });
    } else if (actual !== expected) {
      // Find the first differing character
      let diffStart = 0;
      while (actual[diffStart] === expected[diffStart]) {
        diffStart++;
      }

      patches.push({
        type: "UPDATE",
        start: diffStart,
        oldText: actual.slice(diffStart),
        newText: expected.slice(diffStart),
      });
    }

    return patches;
  }

  async _applyPatch(el, patch) {
    switch (patch.type) {
      case "REPLACE":
        el.innerHTML = patch.content;
        break;

      case "UPDATE":
        // This is simplified - real implementation would use DOM patching
        const range = document.createRange();
        range.selectNodeContents(el);
        range.deleteContents();
        el.innerHTML = patch.newText;
        break;
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
