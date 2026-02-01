// theme/static/js/mermaid-panzoom.js
// FIXED VERSION: Vertical controls, no wrapper, proper fullscreen
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
  // SVG Controls Module - VERTICAL STACK on RIGHT
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

      // Get SVG dimensions
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
        // Try to get from bounding box
        try {
          const bbox = svgElement.getBBox();
          if (bbox.width && bbox.height) {
            width = bbox.width;
            height = bbox.height;
          }
        } catch (e) {
          console.log("Could not get SVG dimensions, using defaults");
        }
      }

      // Create controls group - VERTICAL STACK on RIGHT SIDE
      const controlsGroup = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "g",
      );
      controlsGroup.setAttribute("id", "mermaid-panzoom-controls");
      controlsGroup.setAttribute("class", "mermaid-controls");

      // Position controls on right side, centered vertically
      const padding = 15;
      const controlSize = 30;
      const spacing = 8;
      const controlsHeight = controlSize * 4 + spacing * 3; // 4 buttons with spacing

      // Calculate vertical center position
      const startY = (height - controlsHeight) / 2;

      controlsGroup.setAttribute(
        "transform",
        `translate(${width - controlSize - padding} ${Math.max(padding, startY)})`,
      );

      // Add vertical stack of buttons (top to bottom: Zoom In, Zoom Out, Reset, Fullscreen)
      controlsGroup.appendChild(
        this._createZoomIn(panZoomInstance, 0, 0, controlSize),
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
        this._createZoomReset(
          panZoomInstance,
          0,
          (controlSize + spacing) * 2,
          controlSize,
        ),
      );
      controlsGroup.appendChild(
        this._createFullscreen(
          panZoomInstance,
          svgElement,
          0,
          (controlSize + spacing) * 3,
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

      // Background circle (more elegant than rectangle)
      const bg = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle",
      );
      bg.setAttribute("cx", size / 2);
      bg.setAttribute("cy", size / 2);
      bg.setAttribute("r", size / 2);
      bg.setAttribute("class", "mermaid-control-bg");
      bg.setAttribute("style", "pointer-events: all;");
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

      // Background circle
      const bg = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle",
      );
      bg.setAttribute("cx", size / 2);
      bg.setAttribute("cy", size / 2);
      bg.setAttribute("r", size / 2);
      bg.setAttribute("class", "mermaid-control-bg");
      bg.setAttribute("style", "pointer-events: all;");
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

      // Background circle
      const bg = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle",
      );
      bg.setAttribute("cx", size / 2);
      bg.setAttribute("cy", size / 2);
      bg.setAttribute("r", size / 2);
      bg.setAttribute("class", "mermaid-control-bg");
      bg.setAttribute("style", "pointer-events: all;");
      group.appendChild(bg);

      // Reset icon (circular arrow)
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

      // Background circle
      const bg = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle",
      );
      bg.setAttribute("cx", size / 2);
      bg.setAttribute("cy", size / 2);
      bg.setAttribute("r", size / 2);
      bg.setAttribute("class", "mermaid-control-bg");
      bg.setAttribute("style", "pointer-events: all;");
      group.appendChild(bg);

      // Fullscreen icon (enter)
      const icon = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      const half = size / 2;
      const offset = size * 0.25;
      icon.setAttribute(
        "d",
        `M${half - offset},${half - offset} L${half + offset},${half - offset} M${half + offset},${half - offset} L${half + offset},${half + offset} M${half + offset},${half + offset} L${half - offset},${half + offset} M${half - offset},${half + offset} L${half - offset},${half - offset}`,
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
          // Exit fullscreen icon (arrows pointing inward)
          icon.setAttribute(
            "d",
            `M${half - offset},${half - offset} L${half},${half} M${half + offset},${half - offset} L${half},${half} M${half + offset},${half + offset} L${half},${half} M${half - offset},${half + offset} L${half},${half}`,
          );
        } else {
          // Enter fullscreen icon (arrows pointing outward)
          icon.setAttribute(
            "d",
            `M${half - offset},${half - offset} L${half + offset},${half - offset} M${half + offset},${half - offset} L${half + offset},${half + offset} M${half + offset},${half + offset} L${half - offset},${half + offset} M${half - offset},${half + offset} L${half - offset},${half - offset}`,
          );
        }
      };

      // Event listeners
      group.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this._toggleFullscreen(svgElement, panZoomInstance);
      });

      group.addEventListener("touchstart", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this._toggleFullscreen(svgElement, panZoomInstance);
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

    _toggleFullscreen: function (svgElement, panZoomInstance) {
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
        if (wrapper.requestFullscreen) {
          wrapper.requestFullscreen();
        } else if (wrapper.webkitRequestFullscreen) {
          wrapper.webkitRequestFullscreen();
        } else if (wrapper.mozRequestFullScreen) {
          wrapper.mozRequestFullScreen();
        } else if (wrapper.msRequestFullscreen) {
          wrapper.msRequestFullscreen();
        }

        // Force resize and reposition after entering fullscreen
        setTimeout(() => {
          if (panZoomInstance) {
            panZoomInstance.resize();
            panZoomInstance.fit();
            panZoomInstance.center();

            // Update controls position for fullscreen
            this._repositionControlsForFullscreen(svgElement, panZoomInstance);
          }
        }, 100);
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
          document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
          document.msExitFullscreen();
        }

        // Force resize after exiting fullscreen
        setTimeout(() => {
          if (panZoomInstance) {
            panZoomInstance.resize();
            panZoomInstance.fit();
            panZoomInstance.center();

            // Update controls position back to normal
            this._repositionControls(svgElement, panZoomInstance);
          }
        }, 100);
      }
    },

    _repositionControls: function (svgElement, panZoomInstance) {
      // Remove and re-add controls to recalculate position
      if (panZoomInstance.controlsGroup) {
        this.disable(panZoomInstance);
        this.enable(panZoomInstance, svgElement);
      }
    },

    _repositionControlsForFullscreen: function (svgElement, panZoomInstance) {
      // For fullscreen, we might want to adjust control positioning
      if (panZoomInstance.controlsGroup) {
        // Get fullscreen dimensions
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        // Calculate new position for fullscreen
        const controlsGroup = panZoomInstance.controlsGroup;
        const controlSize = 30;
        const padding = 20;

        // Position on right side, centered vertically
        controlsGroup.setAttribute(
          "transform",
          `translate(${screenWidth - controlSize - padding} ${(screenHeight - (controlSize * 4 + 8 * 3)) / 2})`,
        );
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
  // Mermaid Integration
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

  // Core function: Render Mermaid with SVG controls
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

      // Store original viewBox
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

      // Minimal wrapper styling - NO BORDERS/BACKGROUNDS
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
        controlIconsEnabled: false,
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
      // 3. SVG controls (vertical stack on right side)
      // ------------------------------------------------------------------
      SvgControls.enable(panZoomInstance, svgElement);

      // ------------------------------------------------------------------
      // 4. Resize handling
      // ------------------------------------------------------------------
      const resizeObserver = new ResizeObserver(() => {
        panZoomInstance.resize();
        panZoomInstance.fit();
        panZoomInstance.center();
      });

      resizeObserver.observe(container);

      // Handle fullscreen changes - CRITICAL for viewBox updates
      const handleFullscreenChange = () => {
        setTimeout(() => {
          // Force recalculate viewBox
          const bbox = svgElement.getBBox();
          const currentViewBox = svgElement.getAttribute("viewBox");

          if (currentViewBox) {
            const parts = currentViewBox.split(" ").map(Number);
            if (parts.length >= 4) {
              // Update viewBox if needed
              const newWidth = Math.max(parts[2], bbox.width);
              const newHeight = Math.max(parts[3], bbox.height);
              svgElement.setAttribute(
                "viewBox",
                `0 0 ${newWidth} ${newHeight}`,
              );
            }
          }

          panZoomInstance.resize();
          panZoomInstance.fit();
          panZoomInstance.center();

          // Reposition controls
          SvgControls._repositionControls(svgElement, panZoomInstance);
        }, 150);
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
