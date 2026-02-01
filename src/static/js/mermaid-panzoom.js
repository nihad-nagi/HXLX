// theme/static/js/mermaid-panzoom.js
// UPDATED VERSION with SVG-embedded controls - FIXED
(function () {
  "use strict";

  // Configuration
  const config = {
    mermaid: {
      theme: "default",
      startOnLoad: false,
      securityLevel: "loose",
    },
  };

  // ============================================
  // SVG Controls Module (embedded in SVG) - FIXED
  // ============================================
  const SvgControls = {
    enable: function (panZoomInstance, svgElement) {
      // Remove existing controls if any
      const existingControls = svgElement.querySelector(
        "#mermaid-panzoom-controls",
      );
      if (existingControls) {
        existingControls.remove();
      }

      // Get SVG dimensions from viewBox OR from bounding box
      let width = 800,
        height = 600;
      const viewBox = svgElement.getAttribute("viewBox");

      if (viewBox) {
        const parts = viewBox.split(" ").map(Number);
        if (parts.length >= 4) {
          width = parts[2];
          height = parts[3];
        }
      } else {
        // Fallback to bounding box
        const bbox = svgElement.getBBox();
        if (bbox.width && bbox.height) {
          width = bbox.width;
          height = bbox.height;
        }
      }

      // Create controls group - position at bottom right with padding
      const controlsGroup = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "g",
      );
      controlsGroup.setAttribute("id", "mermaid-panzoom-controls");
      controlsGroup.setAttribute("class", "mermaid-controls");

      // Position controls (bottom-right with padding)
      const padding = 20;
      const controlSize = 32;
      const spacing = 10;
      const controlsWidth = controlSize * 2 + spacing;
      const controlsHeight = controlSize * 2 + spacing;

      controlsGroup.setAttribute(
        "transform",
        `translate(${width - controlsWidth - padding} ${height - controlsHeight - padding})`,
      );

      // Ensure controls are on top
      controlsGroup.setAttribute("style", "pointer-events: all");

      // Add control buttons
      controlsGroup.appendChild(
        this._createZoomIn(panZoomInstance, 0, 0, controlSize),
      );
      controlsGroup.appendChild(
        this._createZoomReset(
          panZoomInstance,
          controlSize + spacing,
          0,
          controlSize,
        ),
      );
      controlsGroup.appendChild(
        this._createZoomOut(
          panZoomInstance,
          0,
          controlSize + spacing,
          controlSize,
        ),
      );
      controlsGroup.appendChild(
        this._createFullscreen(
          panZoomInstance,
          svgElement,
          controlSize + spacing,
          controlSize + spacing,
          controlSize,
        ),
      );

      svgElement.appendChild(controlsGroup);

      // Cache for cleanup
      panZoomInstance.controlsGroup = controlsGroup;

      return controlsGroup;
    },

    _createZoomIn: function (panZoomInstance, x, y, size) {
      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      group.setAttribute("class", "mermaid-control mermaid-zoom-in");
      group.setAttribute("transform", `translate(${x}, ${y})`);

      // Background rectangle
      const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      bg.setAttribute("x", "0");
      bg.setAttribute("y", "0");
      bg.setAttribute("width", size);
      bg.setAttribute("height", size);
      bg.setAttribute("rx", "4");
      bg.setAttribute("class", "mermaid-control-bg");
      bg.setAttribute("style", "pointer-events: all");
      group.appendChild(bg);

      // Plus icon
      const plus = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      const half = size / 2;
      plus.setAttribute(
        "d",
        `M${half - 5},${half} L${half + 5},${half} M${half},${half - 5} L${half},${half + 5}`,
      );
      plus.setAttribute("stroke", "currentColor");
      plus.setAttribute("stroke-width", "2");
      plus.setAttribute("stroke-linecap", "round");
      plus.setAttribute("class", "mermaid-control-icon");
      group.appendChild(plus);

      // Event listeners
      group.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        panZoomInstance.zoomIn();
      });

      group.addEventListener("touchstart", (e) => {
        e.preventDefault();
        e.stopPropagation();
        panZoomInstance.zoomIn();
      });

      return group;
    },

    _createZoomOut: function (panZoomInstance, x, y, size) {
      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      group.setAttribute("class", "mermaid-control mermaid-zoom-out");
      group.setAttribute("transform", `translate(${x}, ${y})`);

      // Background rectangle
      const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      bg.setAttribute("x", "0");
      bg.setAttribute("y", "0");
      bg.setAttribute("width", size);
      bg.setAttribute("height", size);
      bg.setAttribute("rx", "4");
      bg.setAttribute("class", "mermaid-control-bg");
      bg.setAttribute("style", "pointer-events: all");
      group.appendChild(bg);

      // Minus icon
      const minus = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      const half = size / 2;
      minus.setAttribute("d", `M${half - 5},${half} L${half + 5},${half}`);
      minus.setAttribute("stroke", "currentColor");
      minus.setAttribute("stroke-width", "2");
      minus.setAttribute("stroke-linecap", "round");
      minus.setAttribute("class", "mermaid-control-icon");
      group.appendChild(minus);

      // Event listeners
      group.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        panZoomInstance.zoomOut();
      });

      group.addEventListener("touchstart", (e) => {
        e.preventDefault();
        e.stopPropagation();
        panZoomInstance.zoomOut();
      });

      return group;
    },

    _createZoomReset: function (panZoomInstance, x, y, size) {
      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      group.setAttribute("class", "mermaid-control mermaid-reset");
      group.setAttribute("transform", `translate(${x}, ${y})`);

      // Background rectangle
      const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      bg.setAttribute("x", "0");
      bg.setAttribute("y", "0");
      bg.setAttribute("width", size);
      bg.setAttribute("height", size);
      bg.setAttribute("rx", "4");
      bg.setAttribute("class", "mermaid-control-bg");
      bg.setAttribute("style", "pointer-events: all");
      group.appendChild(bg);

      // Reset icon
      const reset = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      const half = size / 2;
      const radius = size * 0.3;
      reset.setAttribute(
        "d",
        `M${half},${half - radius} L${half},${half - radius * 1.5} L${half - radius * 0.7},${half} L${half},${half + radius * 1.5} L${half},${half + radius} A${radius},${radius} 0 1 1 ${half + radius * 0.7},${half - radius * 0.7}`,
      );
      reset.setAttribute("fill", "none");
      reset.setAttribute("stroke", "currentColor");
      reset.setAttribute("stroke-width", "1.5");
      reset.setAttribute("class", "mermaid-control-icon");
      group.appendChild(reset);

      // Event listeners
      group.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        panZoomInstance.reset();
        panZoomInstance.fit();
        panZoomInstance.center();
      });

      group.addEventListener("touchstart", (e) => {
        e.preventDefault();
        e.stopPropagation();
        panZoomInstance.reset();
        panZoomInstance.fit();
        panZoomInstance.center();
      });

      return group;
    },

    _createFullscreen: function (panZoomInstance, svgElement, x, y, size) {
      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      group.setAttribute("class", "mermaid-control mermaid-fullscreen");
      group.setAttribute("transform", `translate(${x}, ${y})`);

      // Background rectangle
      const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      bg.setAttribute("x", "0");
      bg.setAttribute("y", "0");
      bg.setAttribute("width", size);
      bg.setAttribute("height", size);
      bg.setAttribute("rx", "4");
      bg.setAttribute("class", "mermaid-control-bg");
      bg.setAttribute("style", "pointer-events: all");
      group.appendChild(bg);

      // Fullscreen icon (enter)
      const icon = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      const padding = size * 0.2;
      const innerSize = size - padding * 2;
      icon.setAttribute(
        "d",
        `M${padding},${padding} L${padding + innerSize / 3},${padding} L${padding},${padding + innerSize / 3}
        M${padding + innerSize},${padding} L${padding + (innerSize * 2) / 3},${padding} L${padding + innerSize},${padding + innerSize / 3}
        M${padding},${padding + innerSize} L${padding},${padding + (innerSize * 2) / 3} L${padding + innerSize / 3},${padding + innerSize}
        M${padding + innerSize},${padding + innerSize} L${padding + innerSize},${padding + (innerSize * 2) / 3} L${padding + (innerSize * 2) / 3},${padding + innerSize}`,
      );
      icon.setAttribute("fill", "none");
      icon.setAttribute("stroke", "currentColor");
      icon.setAttribute("stroke-width", "1.5");
      icon.setAttribute("class", "mermaid-control-icon");
      group.appendChild(icon);

      // Update icon based on fullscreen state
      const updateIcon = () => {
        const isFullscreen = !!(
          document.fullscreenElement ||
          document.webkitFullscreenElement ||
          document.mozFullScreenElement ||
          document.msFullscreenElement
        );

        if (isFullscreen) {
          // Exit fullscreen icon
          icon.setAttribute(
            "d",
            `M${padding + innerSize / 3},${padding} L${padding + innerSize / 3},${padding + innerSize / 3} L${padding},${padding + innerSize / 3}
            M${padding + (innerSize * 2) / 3},${padding} L${padding + (innerSize * 2) / 3},${padding + innerSize / 3} L${padding + innerSize},${padding + innerSize / 3}
            M${padding + innerSize / 3},${padding + innerSize} L${padding + innerSize / 3},${padding + (innerSize * 2) / 3} L${padding},${padding + (innerSize * 2) / 3}
            M${padding + (innerSize * 2) / 3},${padding + innerSize} L${padding + (innerSize * 2) / 3},${padding + (innerSize * 2) / 3} L${padding + innerSize},${padding + (innerSize * 2) / 3}`,
          );
        } else {
          // Enter fullscreen icon
          icon.setAttribute(
            "d",
            `M${padding},${padding} L${padding + innerSize / 3},${padding} L${padding},${padding + innerSize / 3}
            M${padding + innerSize},${padding} L${padding + (innerSize * 2) / 3},${padding} L${padding + innerSize},${padding + innerSize / 3}
            M${padding},${padding + innerSize} L${padding},${padding + (innerSize * 2) / 3} L${padding + innerSize / 3},${padding + innerSize}
            M${padding + innerSize},${padding + innerSize} L${padding + innerSize},${padding + (innerSize * 2) / 3} L${padding + (innerSize * 2) / 3},${padding + innerSize}`,
          );
        }
      };

      // Event listeners
      group.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this._toggleFullscreen(svgElement);
      });

      group.addEventListener("touchstart", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this._toggleFullscreen(svgElement);
      });

      // Listen for fullscreen changes
      const fullscreenEvents = [
        "fullscreenchange",
        "webkitfullscreenchange",
        "mozfullscreenchange",
        "MSFullscreenChange",
      ];
      fullscreenEvents.forEach((event) => {
        document.addEventListener(event, updateIcon);
      });

      // Store handler for cleanup
      group._fullscreenHandlers = fullscreenEvents;
      group._updateIcon = updateIcon;

      return group;
    },

    _toggleFullscreen: function (svgElement) {
      const wrapper = svgElement.closest(".mermaid-panzoom-wrapper");
      if (!wrapper) return;

      const isFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );

      if (!isFullscreen) {
        // Enter fullscreen
        wrapper.classList.add("is-fullscreen");
        const elem = wrapper;
        if (elem.requestFullscreen) {
          elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
          elem.webkitRequestFullscreen();
        } else if (elem.mozRequestFullScreen) {
          elem.mozRequestFullScreen();
        } else if (elem.msRequestFullscreen) {
          elem.msRequestFullscreen();
        }
      } else {
        // Exit fullscreen
        wrapper.classList.remove("is-fullscreen");
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
          document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
          document.msExitFullscreen();
        }
      }
    },

    disable: function (panZoomInstance) {
      if (
        panZoomInstance.controlsGroup &&
        panZoomInstance.controlsGroup.parentNode
      ) {
        // Clean up event listeners
        const fullscreenGroup = panZoomInstance.controlsGroup.querySelector(
          ".mermaid-fullscreen",
        );
        if (
          fullscreenGroup &&
          fullscreenGroup._fullscreenHandlers &&
          fullscreenGroup._updateIcon
        ) {
          fullscreenGroup._fullscreenHandlers.forEach((event) => {
            document.removeEventListener(event, fullscreenGroup._updateIcon);
          });
        }

        panZoomInstance.controlsGroup.parentNode.removeChild(
          panZoomInstance.controlsGroup,
        );
        panZoomInstance.controlsGroup = null;
      }
    },
  };

  // ============================================
  // Mermaid Integration - SIMPLIFIED
  // ============================================

  function init() {
    // Load svg-pan-zoom dynamically if not available
    if (!window.svgPanZoom) {
      loadSvgPanZoom();
      return;
    }

    if (!window.mermaid) {
      console.warn("Mermaid not loaded. Retrying...");
      setTimeout(init, 100);
      return;
    }

    // Initialize Mermaid with detected theme
    config.mermaid.theme = detectTheme();
    mermaid.initialize(config.mermaid);

    // Process all diagrams
    processAllDiagrams();

    // Set up a mutation observer to handle dynamically added content
    setupObserver();
  }

  function loadSvgPanZoom() {
    const script = document.createElement("script");
    script.src =
      "https://unpkg.com/svg-pan-zoom@3.6.1/dist/svg-pan-zoom.min.js";
    script.onload = function () {
      console.log("svg-pan-zoom loaded");
      init();
    };
    script.onerror = function () {
      console.error("Failed to load svg-pan-zoom");
      // Try local fallback
      const localScript = document.createElement("script");
      localScript.src = "static/js/svg-pan-zoom.min.js";
      localScript.onload = init;
      localScript.onerror = function () {
        console.error("Failed to load svg-pan-zoom from local as well");
      };
      document.head.appendChild(localScript);
    };
    document.head.appendChild(script);
  }

  // Detect mdBook's current theme for Mermaid
  function detectTheme() {
    const htmlEl = document.documentElement;
    if (
      htmlEl.classList.contains("dark") ||
      htmlEl.getAttribute("data-md-color-scheme") === "slate" ||
      htmlEl.classList.contains("navy") ||
      htmlEl.classList.contains("coal") ||
      htmlEl.classList.contains("ayu")
    ) {
      return "dark";
    }
    return "default";
  }

  // Find and render all unprocessed diagram wrappers
  async function processAllDiagrams() {
    const wrappers = document.querySelectorAll(
      ".mermaid-panzoom-wrapper:not([data-processed])",
    );

    for (const wrapper of wrappers) {
      await renderAndEnablePanZoom(wrapper);
      wrapper.dataset.processed = "true";
    }
  }

  // Core function: Render Mermaid, then initialize svg-pan-zoom with SVG controls
  async function renderAndEnablePanZoom(wrapper) {
    const container = wrapper.querySelector(".mermaid-container");
    const codeDiv = wrapper.querySelector(".mermaid-code");

    if (!container || !codeDiv) return;

    try {
      const mermaidCode = codeDiv.textContent;
      const uniqueId =
        "mermaid-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);

      // 1. Render Mermaid
      const { svg } = await mermaid.render(uniqueId, mermaidCode);
      container.innerHTML = svg;

      const svgElement = container.querySelector("svg");
      if (!svgElement) return;

      // Store original viewBox if it exists
      let originalViewBox = svgElement.getAttribute("viewBox");
      let originalWidth = svgElement.getAttribute("width");
      let originalHeight = svgElement.getAttribute("height");

      // If no viewBox exists but we have width/height, create a viewBox
      if (!originalViewBox && originalWidth && originalHeight) {
        const width = parseFloat(originalWidth.replace("px", "")) || 0;
        const height = parseFloat(originalHeight.replace("px", "")) || 0;
        if (width > 0 && height > 0) {
          originalViewBox = `0 0 ${width} ${height}`;
          svgElement.setAttribute("viewBox", originalViewBox);
        }
      }

      // Remove fixed width/height to make SVG responsive
      svgElement.removeAttribute("width");
      svgElement.removeAttribute("height");

      // Set SVG to be responsive
      svgElement.style.width = "100%";
      svgElement.style.height = "100%";
      svgElement.style.display = "block";

      // Preserve aspect ratio
      svgElement.setAttribute("preserveAspectRatio", "xMidYMid meet");

      // Set container to fill wrapper
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.display = "block";
      container.style.minHeight = "300px"; // Minimum height

      // Make wrapper relative for positioning
      wrapper.style.position = "relative";
      wrapper.style.width = "100%";
      wrapper.style.height = "auto";
      wrapper.style.minHeight = "300px";
      wrapper.style.overflow = "hidden";

      // ------------------------------------------------------------------
      // 2. Initialize svg-pan-zoom
      // ------------------------------------------------------------------
      const panZoomInstance = svgPanZoom(svgElement, {
        zoomEnabled: true,
        controlIconsEnabled: false, // We'll use our own
        fit: true,
        center: true,
        minZoom: 0.1,
        maxZoom: 20,
        zoomScaleSensitivity: 0.2,
        dblClickZoomEnabled: true,
        mouseWheelZoomEnabled: true,
        preventMouseEventsDefault: true,
        beforePan: function (oldPan, newPan) {
          const viewBox = svgElement.getAttribute("viewBox");
          if (viewBox) {
            const [x, y, width, height] = viewBox.split(" ").map(Number);
            const bounds = panZoomInstance.getSizes();

            const leftBound = -(width * bounds.realZoom - bounds.width);
            const topBound = -(height * bounds.realZoom - bounds.height);

            return {
              x: Math.max(leftBound, Math.min(0, newPan.x)),
              y: Math.max(topBound, Math.min(0, newPan.y)),
            };
          }
          return newPan;
        },
      });

      // ------------------------------------------------------------------
      // 3. SVG controls (embedded in SVG)
      // ------------------------------------------------------------------
      SvgControls.enable(panZoomInstance, svgElement);

      // ------------------------------------------------------------------
      // 4. Resize handling - simplified
      // ------------------------------------------------------------------
      const resizeObserver = new ResizeObserver(() => {
        panZoomInstance.resize();
        panZoomInstance.fit();
        panZoomInstance.center();
      });

      resizeObserver.observe(container);

      // Handle fullscreen resize
      const handleFullscreenChange = () => {
        setTimeout(() => {
          panZoomInstance.resize();
          panZoomInstance.fit();
          panZoomInstance.center();
        }, 100);
      };

      document.addEventListener("fullscreenchange", handleFullscreenChange);
      document.addEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange,
      );
      document.addEventListener("mozfullscreenchange", handleFullscreenChange);
      document.addEventListener("MSFullscreenChange", handleFullscreenChange);

      // Store references for cleanup
      wrapper._panZoomInstance = panZoomInstance;
      wrapper._resizeObserver = resizeObserver;
      wrapper._fullscreenHandler = handleFullscreenChange;
    } catch (error) {
      console.error("Failed to render Mermaid diagram:", error);
      showError(wrapper, error.message);
    }
  }

  // Show a user-friendly error
  function showError(wrapper, message) {
    const container = wrapper.querySelector(".mermaid-container");
    if (container) {
      container.innerHTML = `
                <div style="
                    padding: 1.5em;
                    margin: 1em 0;
                    border-left: 4px solid #e74c3c;
                    background: #fdf2f2;
                    color: #7b2a2a;
                    border-radius: 4px;
                ">
                    <strong>Diagram Error:</strong><br>
                    <code style="font-size: 0.9em;">${message}</code>
                </div>
            `;
    }
  }

  // Watch for new diagrams
  function setupObserver() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          const newWrappers = Array.from(mutation.addedNodes).flatMap(
            (node) => {
              if (node.nodeType === 1) {
                if (node.matches(".mermaid-panzoom-wrapper")) {
                  return [node];
                }
                return Array.from(
                  node.querySelectorAll(".mermaid-panzoom-wrapper"),
                );
              }
              return [];
            },
          );

          if (newWrappers.length > 0) {
            setTimeout(processAllDiagrams, 10);
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Listen for theme changes to re-render diagrams
  function watchThemeChanges() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.attributeName === "class" ||
          mutation.attributeName === "data-md-color-scheme"
        ) {
          const newTheme = detectTheme();
          if (newTheme !== config.mermaid.theme) {
            config.mermaid.theme = newTheme;
            mermaid.initialize(config.mermaid);

            // Clean up existing diagrams and re-render
            document
              .querySelectorAll(".mermaid-panzoom-wrapper[data-processed]")
              .forEach((wrapper) => {
                cleanupDiagram(wrapper);
              });
            processAllDiagrams();
          }
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-md-color-scheme"],
    });
  }

  // Cleanup function for when diagrams are removed
  function cleanupDiagram(wrapper) {
    // Remove SVG controls
    if (wrapper._panZoomInstance) {
      SvgControls.disable(wrapper._panZoomInstance);
    }

    // Cleanup panzoom instance
    if (wrapper._panZoomInstance && wrapper._panZoomInstance.destroy) {
      wrapper._panZoomInstance.destroy();
    }

    // Cleanup resize observer
    if (wrapper._resizeObserver) {
      wrapper._resizeObserver.disconnect();
    }

    // Remove fullscreen event handlers
    if (wrapper._fullscreenHandler) {
      const events = [
        "fullscreenchange",
        "webkitfullscreenchange",
        "mozfullscreenchange",
        "MSFullscreenChange",
      ];
      events.forEach((event) => {
        document.removeEventListener(event, wrapper._fullscreenHandler);
      });
    }

    // Remove all stored references
    delete wrapper._panZoomInstance;
    delete wrapper._resizeObserver;
    delete wrapper._fullscreenHandler;
    wrapper.removeAttribute("data-processed");
  }

  // Start everything when the DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      init();
      watchThemeChanges();
    });
  } else {
    init();
    watchThemeChanges();
  }
})();
