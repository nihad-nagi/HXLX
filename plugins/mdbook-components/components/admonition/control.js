// /home/enzi/HXLX/plugins/mdbook-components/src/components/admonition/control.js
// components/admonition/control.js
class AdmonitionComponent {
  static meta = {
    version: "1.0.0",
    dependencies: [],
    schema: {
      required: ["type"],
      optional: ["title", "collapsible", "collapsed", "icon"],
    },
  };

  constructor(el, options = {}) {
    this.el = el;
    this.props = options.props || {};
    this.state = options.state || {};

    // If we're hydrating, preserve server HTML
    this._mode = options._mode || "mount";
    this._serverHTML = options._serverHTML;

    this.bindEvents();
  }

  bindEvents() {
    const toggleBtn = this.el.querySelector(".admonition-toggle");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", (e) => {
        this.toggleContent(e);
      });
    }
  }

  toggleContent(e) {
    const content = this.el.querySelector(".admonition-content");
    const icon = this.el.querySelector(".toggle-icon");

    if (content && icon) {
      content.classList.toggle("collapsed");
      icon.textContent = content.classList.contains("collapsed") ? "▶" : "▼";

      // Dispatch custom event
      this.el.dispatchEvent(
        new CustomEvent("admonition:toggle", {
          detail: { collapsed: content.classList.contains("collapsed") },
        }),
      );
    }
  }
}

// Auto-register if in browser
if (typeof window !== "undefined" && window.mdBookComponents) {
  window.mdBookComponents.components.admonition = AdmonitionComponent;
}
