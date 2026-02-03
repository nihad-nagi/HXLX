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
        background: var(--dark-bg);
        font-family: 'Open Sans', sans-serif;
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
        border-radius: 0;
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

      @media only screen and (max-width: 767px) and (min-width: 480px) {
        .row ul li {
          font-size: 13px;
        }
      }
      @media only screen and (max-width: 479px) {
        .row ul li {
          font-size: 13px;
        }
      }

      .row ul li a {
        text-decoration: none;
        transition: color var(--transition-speed) ease-out;
      }

      /* title row */
      .title ul li {
        font-weight: bold;
        padding: 15px 13px;
      }

      .row ul li {
        padding: 5px 10px;
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
        background-color: rgba(26, 26, 26, 0.9);
        height: 65px;
      }

      @media only screen and (max-width: 767px) {
        .row:hover, .row.expanded {
          height: 85px;
        }
      }

      @media only screen and (max-width: 359px) {
        .row:hover, .row.expanded {
          height: 105px;
        }
      }

      .title {
        padding: 25px 0 5px 0;
        height: 45px;
        font-size: 0;
        background-color: rgba(255,255,255,0.1);
        border-left: 3px solid rgba(255,255,255,0.1) !important;
        cursor: default;
      }

      .title:hover {
        height: 45px;
        background-color: rgba(255,255,255,0.1);
      }

      /* more content - FIXED TO MATCH ORIGINAL CSS */
      ul.more-content {
        margin: 0;
        padding: 0;
      }

      ul.more-content li {
        position: relative;
        top: 22px;
        font-size: 13px;
        margin: 0;
        padding: 10px 13px;
        display: block;
        height: 50px;
        width: 100%;
        color: rgba(128, 128, 128, 0.9);
      }

      @media only screen and (max-width: 767px) {
        ul.more-content li {
          font-size: 11px;
        }
      }

      /* Hide more content by default, show on hover/expand */
      .row ul.more-content {
        opacity: 0;
        max-height: 0;
        overflow: hidden;
        transition: opacity 0.2s ease-out, max-height 0.2s ease-out;
      }

      .row:hover ul.more-content,
      .row.expanded ul.more-content {
        opacity: 1;
        max-height: 100px;
      }

      /* responsive */
      @media only screen and (max-width: 767px) {
        .row ul li {
          font-size: 13px;
          padding: 10px 8px;
        }
      }

      @media only screen and (max-width: 479px) {
        .row ul li {
          font-size: 12px;
          padding: 8px 5px;
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

      /* small content */
      .small {
        color: rgba(102, 102, 102, 0.9);
        font-size: 10px;
        padding: 0 10px;
        margin: 0;
      }

      @media only screen and (max-width: 767px) {
        .small {
          display: none;
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

      /* update animations */
      .update1 {
        position: absolute;
        top: 25px;
        display: inline-block;
        opacity: 1;
        animation: update1 1s ease-out 12s 1 alternate;
        animation-fill-mode: forwards;
      }

      .update2 {
        position: absolute;
        top: 25px;
        display: inline-block;
        opacity: 0;
        animation: update2 4s ease-out 13s 1 alternate;
        animation-fill-mode: forwards;
      }

      @keyframes update1 {
        0% { opacity: 0; }
        0% { opacity: 1; }
        100% { opacity: 0; }
      }

      @keyframes update2 {
        0% { opacity: 0; color: rgba(255,255,255,0.9); }
        20% { opacity: 1; color: #52d29a; }
        100% { opacity: 1; color: rgba(255,255,255,0.9); }
      }
    `;

    // Generate 40 color classes (hx1 to hx40) matching original sports theme colors
    const colorMap = {
      1: { hue: 191, sat: 85, light: 55 }, // Similar to NFL blue
      2: { hue: 158, sat: 85, light: 55 }, // Similar to MLB green
      3: { hue: 45, sat: 85, light: 55 }, // Similar to NHL gold
      4: { hue: 17, sat: 85, light: 55 }, // Similar to PGA orange
    };

    for (let i = 1; i <= 40; i++) {
      // Use specific colors for first 4, then generate for rest
      let hue, saturation, lightness;

      if (i <= 4) {
        hue = colorMap[i].hue;
        saturation = colorMap[i].sat;
        lightness = colorMap[i].light;
      } else {
        hue = (i - 1) * 9; // 0° to 351° in 9° steps
        saturation = 85;
        lightness = 55;
      }

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
          <li><a href="#">${item.classification || "N/A"}</a></li>
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
          <ul class="more-content">
            <li>${item.moreContent}</li>
          </ul>
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

    // Header row - updated to match original exactly
    wrapper.innerHTML = `
      <main class="row title">
        <ul>
          <li>Category</li>
          <li>Value</li>
          <li><span class="title-hide">#</span> Color ID</li>
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
