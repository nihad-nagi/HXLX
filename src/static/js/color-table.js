// ./static/js/color-table.js
class ColorSpectrumTable extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.data = [];
    this.selectedRow = null;
  }

  connectedCallback() {
    // Check if data is provided via attribute
    const dataAttr = this.getAttribute("data");
    if (dataAttr) {
      try {
        this.data = JSON.parse(dataAttr);
      } catch (e) {
        console.error("Failed to parse data attribute:", e);
      }
    } else {
      // Try to get data from slot content
      const slotContent = this.innerHTML.trim();
      if (slotContent.startsWith("```json") || slotContent.startsWith("{")) {
        try {
          const jsonString = slotContent
            .replace("```json", "")
            .replace("```", "")
            .trim();
          this.data = JSON.parse(jsonString);
        } catch (e) {
          console.error("Failed to parse slot content:", e);
        }
      }
    }

    this.render();
    this.initializeAlpine();
  }

  initializeAlpine() {
    // Ensure Alpine is available
    if (window.Alpine) {
      window.Alpine.initTree(this.shadowRoot);
    } else {
      console.warn(
        "Alpine.js is not loaded. Some interactive features may not work.",
      );
    }
  }

  generateColorCSS() {
    let css = `
      /* Google fonts - Open Sans */
      @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;700&display=swap');

      :host {
        display: block;
        --dark-bg: rgba(0,0,0,0.9);
        --light-bg: rgba(255,255,255,0.1);
        --text: rgba(255,255,255,0.9);
        --transition-speed: 0.2s;
      }

      /* wrapper */
      .wrapper {
        width: 100%;
        max-width: 1000px;
        margin: 20px auto 100px auto;
        padding: 0;
        background: var(--light-bg);
        color: var(--text);
        overflow: hidden;
        position: relative;
        font-family: 'Open Sans', sans-serif;
        border-radius: 8px;
      }

      /* lists */
      .row ul {
        margin: 0;
        padding: 0;
        display: flex;
      }

      .row ul li {
        margin: 0;
        font-size: 16px;
        font-weight: normal;
        list-style: none;
        display: inline-block;
        width: 20%;
        box-sizing: border-box;
        padding: 15px 13px;
      }

      .row ul li a {
        text-decoration: none;
        transition: color var(--transition-speed) ease-out;
      }

      /* title row */
      .title ul li {
        font-weight: bold;
        background-color: rgba(255,255,255,0.05);
      }

      /* rows */
      .row {
        padding: 20px 0;
        height: 30px;
        font-size: 0;
        position: relative;
        overflow: hidden;
        transition: all var(--transition-speed) ease-out;
        border-top: 1px solid rgba(0,0,0,0.1);
        cursor: pointer;
        border-left: 3px solid transparent;
      }

      .row:hover, .row.expanded {
        background-color: rgba(255,255,255,0.05);
        height: 65px;
      }

      .title {
        padding: 25px 0 5px 0;
        height: 45px;
        font-size: 0;
        background-color: var(--light-bg);
        border-left: 3px solid rgba(255,255,255,0.5) !important;
        cursor: default;
      }

      .title:hover {
        height: 45px;
        background-color: var(--light-bg);
      }

      /* more content */
      .more-content {
        position: absolute;
        top: 65px;
        left: 0;
        right: 0;
        padding: 15px 20px;
        background: rgba(0,0,0,0.3);
        font-size: 14px;
        opacity: 0;
        transform: translateY(-10px);
        transition: all var(--transition-speed) ease-out;
        pointer-events: none;
      }

      .row.expanded .more-content {
        opacity: 1;
        transform: translateY(0);
        pointer-events: auto;
      }

      /* responsive */
      @media only screen and (max-width: 767px) {
        .row ul li {
          font-size: 13px;
          padding: 10px 8px;
        }

        .row:hover, .row.expanded {
          height: 85px;
        }
      }

      @media only screen and (max-width: 479px) {
        .row ul li {
          font-size: 12px;
          padding: 8px 5px;
        }

        .row:hover, .row.expanded {
          height: 105px;
        }
      }

      /* title-hide for mobile */
      .title-hide {
        display: none;
      }

      @media only screen and (max-width: 767px) {
        .title-hide {
          display: inline-block;
        }
      }

      /* color preview */
      .color-preview {
        display: inline-block;
        width: 20px;
        height: 20px;
        border-radius: 4px;
        margin-right: 10px;
        vertical-align: middle;
        border: 1px solid rgba(255,255,255,0.2);
      }

      /* hue value */
      .hue-value {
        font-family: monospace;
        background: rgba(0,0,0,0.3);
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 14px;
      }
    `;

    // Generate 40 color classes (hx1 to hx40)
    for (let i = 1; i <= 40; i++) {
      const hue = (i - 1) * 9; // 0° to 351° in 9° steps
      const saturation = 85;
      const lightness = 55;

      css += `
        .hx${i} {
          border-left-color: hsl(${hue}, ${saturation}%, ${lightness}%) !important;
        }

        .hx${i}:hover, .hx${i}.expanded {
          border-left-color: hsl(${hue}, ${saturation}%, ${lightness + 10}%) !important;
        }

        .hx${i} .color-preview {
          background: hsl(${hue}, ${saturation}%, ${lightness}%);
        }

        .hx${i} a {
          color: hsl(${hue}, ${saturation}%, ${lightness}%);
        }

        .hx${i} a:hover {
          color: hsl(${hue}, ${saturation}%, ${lightness + 20}%);
        }
      `;
    }

    return css;
  }

  toggleRow(rowId) {
    const row = this.shadowRoot.querySelector(`.row[data-id="${rowId}"]`);
    if (row) {
      // Close previously expanded row
      if (this.selectedRow && this.selectedRow !== rowId) {
        const prevRow = this.shadowRoot.querySelector(
          `.row[data-id="${this.selectedRow}"]`,
        );
        if (prevRow) prevRow.classList.remove("expanded");
      }

      // Toggle current row
      row.classList.toggle("expanded");
      this.selectedRow = row.classList.contains("expanded") ? rowId : null;
    }
  }

  renderRow(item, index) {
    if (!item || !item.classification) return "";

    const value = parseInt(item.value) || 1;
    const hue = (value - 1) * 9;

    return `
      <article class="row hx${value}"
               data-id="${item.id || `row-${index}`}"
               x-on:click="toggleRow('${item.id || `row-${index}`}')"
               :class="{ 'expanded': selectedRow === '${item.id || `row-${index}`}' }">
        <ul>
          <li>${item.classification || "N/A"}</li>
          <li>${item.value || "0"}</li>
          <li>
            <span class="color-preview"></span>
            hx${value}
          </li>
          <li><span class="hue-value">${hue}°</span></li>
          <li>${item.description || ""}</li>
        </ul>
        ${
          item.moreContent
            ? `
          <div class="more-content">
            ${item.moreContent}
          </div>
        `
            : ""
        }
      </article>
    `;
  }

  render() {
    const style = document.createElement("style");
    style.textContent = this.generateColorCSS();

    const wrapper = document.createElement("div");
    wrapper.className = "wrapper";

    // Create Alpine.js data context
    wrapper.setAttribute(
      "x-data",
      `{
      selectedRow: null,
      toggleRow: function(rowId) {
        this.selectedRow = this.selectedRow === rowId ? null : rowId;
      }
    }`,
    );

    // Header row
    wrapper.innerHTML = `
      <main class="row title">
        <ul>
          <li>Category</li>
          <li>Value</li>
          <li>Color ID</li>
          <li>Hue°</li>
          <li>Description</li>
        </ul>
      </main>
      <div class="table-data">
        ${this.data.map((item, index) => this.renderRow(item, index)).join("")}
      </div>
    `;

    // Clear shadow root and append new content
    while (this.shadowRoot.firstChild) {
      this.shadowRoot.removeChild(this.shadowRoot.firstChild);
    }

    this.shadowRoot.appendChild(style);
    this.shadowRoot.appendChild(wrapper);
  }

  // Update data dynamically
  updateData(newData) {
    this.data = Array.isArray(newData) ? newData : [];
    this.render();
    this.initializeAlpine();
  }

  // Observe attribute changes
  static get observedAttributes() {
    return ["data"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "data" && oldValue !== newValue) {
      try {
        this.data = JSON.parse(newValue);
        this.render();
        this.initializeAlpine();
      } catch (e) {
        console.error("Failed to parse data attribute:", e);
      }
    }
  }
}

// Register the component
if (!customElements.get("color-spectrum-table")) {
  customElements.define("color-spectrum-table", ColorSpectrumTable);
}

// Export for module usage if needed
if (typeof module !== "undefined" && module.exports) {
  module.exports = ColorSpectrumTable;
}
