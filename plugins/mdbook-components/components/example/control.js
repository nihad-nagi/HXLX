// components/example/control.js
class ExampleComponent extends Component {
  // Lifecycle hooks
  ["update:mount"]() {
    console.log("Example component mounted:", this.props);
  }

  ["update:props"](prevProps) {
    console.log(
      "Example component props updated:",
      prevProps,
      "->",
      this.props,
    );
  }

  // Event handlers
  events = {
    "click .example-toggle": "toggleContent",
  };

  toggleContent(e) {
    const content = this.el.querySelector(".example-content");
    const icon = this.el.querySelector(".toggle-icon");

    content.classList.toggle("collapsed");
    icon.textContent = content.classList.contains("collapsed") ? "▶" : "▼";

    // Dispatch custom event
    this.el.dispatchEvent(
      new CustomEvent("example:toggle", {
        detail: { collapsed: content.classList.contains("collapsed") },
      }),
    );
  }

  // Dynamic template for updates
  render() {
    // Only render dynamic parts
    return `
      <div class="example-header" data-dynamic="header">
        <h3>${this.props.title || "Example"}</h3>
      </div>
    `;
  }
}

// Auto-register with global namespace
if (typeof window !== "undefined" && window.mdBookComponents) {
  window.mdBookComponents.components.example = ExampleComponent;
}
