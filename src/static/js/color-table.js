// ./static/js/color-table.js
class ColorSpectrumTable extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.data = [];
    this.selectedRow = null;
    this.jsonFile = null;
    this.jsonPath = null;
  }

  connectedCallback() {
    // Get JSON file path from attribute
    this.jsonFile = this.getAttribute("json-file");
    const dataAttr = this.getAttribute("data");

    // Priority: json-file attribute > data attribute
    if (this.jsonFile) {
      this.loadJsonFile();
    } else if (dataAttr) {
      this.parseInlineData(dataAttr);
    } else {
      console.warn(
        "No data source provided for color-spectrum-table. Use json-file or data attribute.",
      );
    }
  }

  async loadJsonFile() {
    try {
      // Construct the path to the JSON file
      // If it's a relative path, it will be relative to the HTML file
      this.jsonPath = this.jsonFile;

      const response = await fetch(this.jsonPath);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const json = await response.json();

      // Extract spectrumData from the JSON structure
      this.data = json.spectrumData || json;

      if (!Array.isArray(this.data)) {
        console.warn(
          "JSON data is not an array. Expected an array of objects.",
        );
        this.data = [];
      }

      this.render();
      this.initializeAlpine();
    } catch (e) {
      console.error(`Failed to load data from ${this.jsonPath}:`, e);
      // Fallback to inline data if available
      const dataAttr = this.getAttribute("data");
      if (dataAttr) {
        this.parseInlineData(dataAttr);
      }
    }
  }

  parseInlineData(dataAttr) {
    try {
      const parsedData = JSON.parse(dataAttr);
      this.data = parsedData.spectrumData || parsedData;
      this.render();
      this.initializeAlpine();
    } catch (e) {
      console.error("Failed to parse inline data:", e);
    }
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
      /* Use local Barlow Sans font */
      @font-face {
        font-family: 'Barlow Sans';
        font-style: normal;
        font-weight: 400;
        font-display: swap;
        src: local('Barlow Sans Regular'), local('BarlowSans-Regular');
      }

      @font-face {
        font-family: 'Barlow Sans';
        font-style: normal;
        font-weight: 700;
        font-display: swap;
        src: local('Barlow Sans Bold'), local('BarlowSans-Bold');
      }

      :host {
        display: block;
        --dark-bg: rgba(0,0,0,0.9);
        --light-bg: rgba(255,255,255,0.1);
        --text: rgba(255,255,255,0.9);
        --transition-speed: 0.2s;
        background: var(--dark-bg);
        font-family: 'Barlow Sans', sans-serif;
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
        border-radius: 10px;
      }

      /* lists */
      .row ul {
        margin: 0;
        padding: 0;
        display: flex;
      }

      .row ul li {
        margin: 0;
        font-size: 15px;
        font-weight: normal;
        list-style: none;
        display: inline-block;
        width: 20%;
        box-sizing: border-box;
        padding: 10px 13px; /* Reduced padding */
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
        padding: 10px 13px; /* Reduced padding */
      }

      .row ul li {
        padding: 0px 13px; /* Already at minimum */
      }

      /* rows */
      .row {
        padding: 10px 0; /* Reduced padding */
        height: 25px; /* Reduced height */
        font-size: 0;
        position: relative;
        overflow: hidden;
        transition: all var(--transition-speed) ease-out;
        border-top: 1px solid rgba(0,0,0,0.1);
        cursor: pointer;
        border-left: 3px solid transparent;
      }

      .row:hover, .row.expanded {
        background-color: rgba(0, 0, 0, 0.9);
        height: 50px; /* Reduced height */
      }

      @media only screen and (max-width: 767px) {
        .row:hover, .row.expanded {
          height: 70px; /* Reduced height */
        }
      }

      @media only screen and (max-width: 359px) {
        .row:hover, .row.expanded {
          height: 90px; /* Reduced height */
        }
      }

      .title {
        padding: 15px 0 5px 0; /* Reduced padding */
        height: 35px; /* Reduced height */
        font-size: 0;
        background-color: rgba(255,255,255,0.1);
        border-left: 3px solid rgba(255,255,255,0.1) !important;
        cursor: default;
      }

      .title:hover {
        height: 35px; /* Reduced height */
        background-color: rgba(255,255,255,0.1);
      }

      /* more content - FIXED padding */
      ul.more-content {
        margin: 0;
        padding: 0;
      }

      ul.more-content li {
        position: relative;
        top: 8px; /* Reduced from 12px */
        font-size: 13px;
        margin: 0;
        padding: 8px 13px 10px 13px; /* Reduced padding */
        display: block;
        height: auto;
        width: 100%;
        color: rgba(128, 128, 128, 0.9);
        line-height: 1.4;
      }

      @media only screen and (max-width: 767px) {
        ul.more-content li {
          font-size: 11px;
          padding: 6px 13px 8px 13px; /* Reduced padding */
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
        max-height: 150px; /* Reduced from 200px */
      }

      /* responsive */
      @media only screen and (max-width: 767px) {
        .row ul li {
          font-size: 13px;
          padding: 8px 8px; /* Reduced padding */
        }
      }

      @media only screen and (max-width: 479px) {
        .row ul li {
          font-size: 12px;
          padding: 6px 5px; /* Reduced padding */
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
        font-family: 'Barlow Sans', monospace;
        background: rgba(0,0,0,0.3);
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 14px;
        font-weight: 500;
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

    // Generate 40 color classes (hx1 to hx40) with 1=red (0°), 20=green (120°), 40=violet (300°)
    // Step calculation: from 0° to 300° in 39 steps (40-1 = 39)
    // So step = 300 / 39 ≈ 7.69
    const step = 300 / 39; // 7.6923...

    for (let i = 1; i <= 40; i++) {
      // Calculate hue: 0° for i=1 (red), 120° for i=20 (green), 300° for i=40 (violet)
      const hue = (i - 1) * step; // This gives us: i=1 → 0°, i=20 → ~146°, i=40 → ~300°
      const saturation = 65;
      const lightness = 50;

      css += `
        .hx${i} {
          border-left-color: hsl(${hue}, ${saturation}%, ${lightness}%) !important;
        }

        .hx${i} .color-preview {
          background: hsl(${hue}, ${saturation}%, ${lightness}%);
        }

        .hx${i} a {
          color: hsl(${hue}, ${saturation}%, ${lightness}%);
          font-weight: 500;
        }

        /* HOVER/EXPANDED STATE - More saturated instead of lighter */
        .hx${i}:hover, .hx${i}.expanded {
          border-left-color: hsl(${hue}, ${saturation + 20}%, ${lightness}%) !important;
        }

        .hx${i}:hover a, .hx${i}.expanded a {
          color: hsl(${hue}, ${saturation + 30}%, ${lightness}%);
        }

        .hx${i}:hover .color-preview,
        .hx${i}.expanded .color-preview {
          background: hsl(${hue}, ${saturation + 20}%, ${lightness}%);
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

    // Calculate hue based on the new mapping: 1=red (0°), 20=green (120°), 40=violet (300°)
    const step = 300 / 39; // 7.6923...
    const hue = (value - 1) * step;

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
            CID ${value}
          </li>
          <li><span class="hue-value">${Math.round(hue)}°</span></li>
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

    // Header row - updated with CID instead of Color ID
    wrapper.innerHTML = `
      <main class="row title">
        <ul>
          <li>Category</li>
          <li>Value</li>
          <li><span class="title-hide">#</span> CID</li>
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
    return ["json-file", "data"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "json-file" && oldValue !== newValue) {
      this.jsonFile = newValue;
      this.loadJsonFile();
    } else if (name === "data" && oldValue !== newValue) {
      try {
        const parsedData = JSON.parse(newValue);
        this.data = parsedData.spectrumData || parsedData;
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
