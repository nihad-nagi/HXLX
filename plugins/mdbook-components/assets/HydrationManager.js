// /home/enzi/HXLX/plugins/mdbook-components/assets/HydrationManager.js
class HydrationManager {
  constructor(options = {}) {
    this.strict = options.strict || false;
    this.debug = options.debug || false;
    this.errors = [];
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

    dynamicElements.forEach((el, index) => {
      dynamicData[el.dataset.dynamic] = el.innerHTML;
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

  _normalizeHTML(html) {
    return html
      .trim()
      .replace(/\s+/g, " ")
      .replace(/>\s+</g, "><")
      .replace(/<!--.*?-->/g, "");
  }

  _createDiffPatches(actual, expected) {
    // Simple diff implementation - in production, use a proper diffing library
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
}
