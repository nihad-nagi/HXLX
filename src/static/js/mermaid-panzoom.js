// theme/static/js/mermaid-panzoom.js
// UPDATED VERSION with properly positioned controls and fullscreen button
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
  // UPDATED CONTROL ICONS - Positioned absolutely over the container
  // ============================================
  const ControlIcons = {
    enable: function (instance, container, svgElement) {
      // Remove existing controls from HTML (the ones on the left)
      const existingControls = container.querySelector(
        ".mermaid-panzoom-controls",
      );
      if (existingControls) {
        existingControls.remove();
      }

      // Get container dimensions for positioning
      const containerRect = container.getBoundingClientRect();

      // Create controls wrapper - positioned absolutely over the container
      const controlsWrapper = document.createElement("div");
      controlsWrapper.className = "svg-pan-zoom-controls-wrapper";
      controlsWrapper.style.cssText = `
        position: absolute;
        bottom: 15px;
        right: 15px;
        z-index: 1000;
        display: flex;
        gap: 8px;
        background: rgba(255, 255, 255, 0.9);
        border-radius: 6px;
        padding: 4px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
        border: 1px solid rgba(0, 0, 0, 0.1);
      `;

      // Dark theme adjustments
      const isDarkTheme = this._isDarkTheme();

      if (isDarkTheme) {
        controlsWrapper.style.background = "rgba(30, 41, 59, 0.9)";
        controlsWrapper.style.borderColor = "rgba(255, 255, 255, 0.15)";
      }

      // Create control buttons
      controlsWrapper.appendChild(this._createZoomInButton(instance));
      controlsWrapper.appendChild(this._createResetButton(instance));
      controlsWrapper.appendChild(this._createZoomOutButton(instance));
      controlsWrapper.appendChild(
        this._createFullscreenButton(instance, container),
      );

      // Add wrapper to container
      container.appendChild(controlsWrapper);

      // Cache control instance
      instance.controlsWrapper = controlsWrapper;
    },

    _isDarkTheme: function () {
      const htmlEl = document.documentElement;
      return (
        htmlEl.classList.contains("dark") ||
        htmlEl.getAttribute("data-md-color-scheme") === "slate" ||
        htmlEl.classList.contains("navy") ||
        htmlEl.classList.contains("coal") ||
        htmlEl.classList.contains("ayu")
      );
    },

    _createZoomInButton: function (instance) {
      const button = document.createElement("button");
      button.className = "svg-pan-zoom-control zoom-in";
      button.setAttribute("aria-label", "Zoom in");
      button.setAttribute("title", "Zoom in");
      button.style.cssText = `
        width: 32px;
        height: 32px;
        border: none;
        border-radius: 4px;
        background: transparent;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        transition: all 0.2s ease;
      `;

      button.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </svg>
      `;

      button.addEventListener("click", (e) => {
        e.stopPropagation();
        instance.zoomIn();
      });

      button.addEventListener("touchstart", (e) => {
        e.stopPropagation();
        instance.zoomIn();
      });

      // Hover effects
      button.addEventListener("mouseenter", () => {
        button.style.background = "rgba(0, 0, 0, 0.1)";
      });
      button.addEventListener("mouseleave", () => {
        button.style.background = "transparent";
      });

      return button;
    },

    _createResetButton: function (instance) {
      const button = document.createElement("button");
      button.className = "svg-pan-zoom-control reset-view";
      button.setAttribute("aria-label", "Reset zoom");
      button.setAttribute("title", "Reset zoom");
      button.style.cssText = `
        width: 32px;
        height: 32px;
        border: none;
        border-radius: 4px;
        background: transparent;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        transition: all 0.2s ease;
      `;

      button.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
        </svg>
      `;

      button.addEventListener("click", (e) => {
        e.stopPropagation();
        instance.reset();
      });

      button.addEventListener("touchstart", (e) => {
        e.stopPropagation();
        instance.reset();
      });

      // Hover effects
      button.addEventListener("mouseenter", () => {
        button.style.background = "rgba(0, 0, 0, 0.1)";
      });
      button.addEventListener("mouseleave", () => {
        button.style.background = "transparent";
      });

      return button;
    },

    _createZoomOutButton: function (instance) {
      const button = document.createElement("button");
      button.className = "svg-pan-zoom-control zoom-out";
      button.setAttribute("aria-label", "Zoom out");
      button.setAttribute("title", "Zoom out");
      button.style.cssText = `
        width: 32px;
        height: 32px;
        border: none;
        border-radius: 4px;
        background: transparent;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        transition: all 0.2s ease;
      `;

      button.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 13H5v-2h14v2z"/>
        </svg>
      `;

      button.addEventListener("click", (e) => {
        e.stopPropagation();
        instance.zoomOut();
      });

      button.addEventListener("touchstart", (e) => {
        e.stopPropagation();
        instance.zoomOut();
      });

      // Hover effects
      button.addEventListener("mouseenter", () => {
        button.style.background = "rgba(0, 0, 0, 0.1)";
      });
      button.addEventListener("mouseleave", () => {
        button.style.background = "transparent";
      });

      return button;
    },

    _createFullscreenButton: function (instance, container) {
      const button = document.createElement("button");
      button.className = "svg-pan-zoom-control fullscreen-toggle";
      button.setAttribute("aria-label", "Toggle fullscreen");
      button.setAttribute("title", "Toggle fullscreen");
      button.style.cssText = `
        width: 32px;
        height: 32px;
        border: none;
        border-radius: 4px;
        background: transparent;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        transition: all 0.2s ease;
      `;

      // Enter fullscreen icon
      button.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
        </svg>
      `;

      let isFullscreen = false;

      button.addEventListener("click", (e) => {
        e.stopPropagation();
        this._toggleFullscreen(container, button);
      });

      button.addEventListener("touchstart", (e) => {
        e.stopPropagation();
        this._toggleFullscreen(container, button);
      });

      // Hover effects
      button.addEventListener("mouseenter", () => {
        button.style.background = "rgba(0, 0, 0, 0.1)";
      });
      button.addEventListener("mouseleave", () => {
        button.style.background = "transparent";
      });

      // Listen for fullscreen change events
      document.addEventListener("fullscreenchange", () => {
        isFullscreen = !!document.fullscreenElement;
        this._updateFullscreenIcon(button, isFullscreen);
      });

      document.addEventListener("webkitfullscreenchange", () => {
        isFullscreen = !!document.webkitFullscreenElement;
        this._updateFullscreenIcon(button, isFullscreen);
      });

      document.addEventListener("mozfullscreenchange", () => {
        isFullscreen = !!document.mozFullScreenElement;
        this._updateFullscreenIcon(button, isFullscreen);
      });

      document.addEventListener("MSFullscreenChange", () => {
        isFullscreen = !!document.msFullscreenElement;
        this._updateFullscreenIcon(button, isFullscreen);
      });

      return button;
    },

    _toggleFullscreen: function (element, button) {
      if (
        !document.fullscreenElement &&
        !document.webkitFullscreenElement &&
        !document.mozFullScreenElement &&
        !document.msFullscreenElement
      ) {
        // Enter fullscreen
        if (element.requestFullscreen) {
          element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) {
          element.webkitRequestFullscreen();
        } else if (element.mozRequestFullScreen) {
          element.mozRequestFullScreen();
        } else if (element.msRequestFullscreen) {
          element.msRequestFullscreen();
        }
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
      }
    },

    _updateFullscreenIcon: function (button, isFullscreen) {
      if (isFullscreen) {
        // Exit fullscreen icon
        button.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
          </svg>
        `;
        button.setAttribute("title", "Exit fullscreen");
      } else {
        // Enter fullscreen icon
        button.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
          </svg>
        `;
        button.setAttribute("title", "Enter fullscreen");
      }
    },

    disable: function (instance, container) {
      if (
        instance.controlsWrapper &&
        instance.controlsWrapper.parentNode === container
      ) {
        container.removeChild(instance.controlsWrapper);
        instance.controlsWrapper = null;
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

  // Core function: Render Mermaid, then initialize svg-pan-zoom with our custom controls
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

      // Store original viewBox if it exists, or create one from width/height
      let originalViewBox = svgElement.getAttribute("viewBox");
      let originalWidth = svgElement.getAttribute("width");
      let originalHeight = svgElement.getAttribute("height");

      // If no viewBox exists but we have width/height, create a viewBox
      if (!originalViewBox && originalWidth && originalHeight) {
        // Remove 'px' if present and convert to numbers
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

      // Set container to have a reasonable aspect ratio
      container.style.width = "100%";
      container.style.height = "auto";
      container.style.minHeight = "200px"; // Minimum height for visibility
      container.style.display = "block";

      // Wrapper must be positioning context for controls
      wrapper.style.position = "relative";
      wrapper.style.width = "100%";
      wrapper.style.overflow = "hidden"; // Prevent scrollbars during pan

      // Create a wrapper div for the SVG with fixed dimensions
      const svgWrapper = document.createElement("div");
      svgWrapper.style.width = "100%";
      svgWrapper.style.height = "400px"; // Default height, can adjust
      svgWrapper.style.position = "relative";
      svgWrapper.style.backgroundColor = "transparent";

      // Move SVG into the wrapper
      container.insertBefore(svgWrapper, svgElement);
      svgWrapper.appendChild(svgElement);

      // ------------------------------------------------------------------
      // 2. Initialize svg-pan-zoom
      // ------------------------------------------------------------------
      const panZoomInstance = svgPanZoom(svgElement, {
        zoomEnabled: true,
        controlIconsEnabled: false,
        fit: true, // Fit to container initially
        center: true,
        minZoom: 0.1,
        maxZoom: 20,
        zoomScaleSensitivity: 0.2,
        dblClickZoomEnabled: true,
        mouseWheelZoomEnabled: true,
        preventMouseEventsDefault: true,
        beforePan: function (oldPan, newPan) {
          // Get SVG dimensions
          const svgRect = svgElement.getBoundingClientRect();
          const viewBox = svgElement.getAttribute("viewBox");

          if (viewBox) {
            const [x, y, width, height] = viewBox.split(" ").map(Number);
            const bounds = panZoomInstance.getSizes();

            // Calculate bounds to prevent panning outside the SVG
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
      // 3. Custom controls
      // ------------------------------------------------------------------
      const controlInstance = {
        zoomIn() {
          panZoomInstance.zoomIn();
        },
        zoomOut() {
          panZoomInstance.zoomOut();
        },
        reset() {
          panZoomInstance.reset();
          panZoomInstance.fit();
          panZoomInstance.center();
        },
        fit() {
          panZoomInstance.fit();
          panZoomInstance.center();
        },
        controlsWrapper: null,
      };

      // Create custom controls wrapper (different from default)
      const controlsWrapper = document.createElement("div");
      controlsWrapper.className = "mermaid-panzoom-controls";
      controlsWrapper.style.cssText = `
        position: absolute;
        bottom: 15px;
        right: 15px;
        z-index: 1000;
        display: flex;
        gap: 5px;
        background: rgba(255, 255, 255, 0.9);
        border-radius: 6px;
        padding: 5px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
        border: 1px solid rgba(0, 0, 0, 0.1);
      `;

      // Dark theme adjustments
      const isDarkTheme = ControlIcons._isDarkTheme();
      if (isDarkTheme) {
        controlsWrapper.style.background = "rgba(30, 41, 59, 0.9)";
        controlsWrapper.style.borderColor = "rgba(255, 255, 255, 0.15)";
      }

      // Add control buttons
      controlsWrapper.appendChild(
        createControlButton("+", "Zoom In", () => controlInstance.zoomIn()),
      );
      controlsWrapper.appendChild(
        createControlButton("-", "Zoom Out", () => controlInstance.zoomOut()),
      );
      controlsWrapper.appendChild(
        createControlButton("⟳", "Reset View", () => controlInstance.reset()),
      );
      controlsWrapper.appendChild(
        createControlButton("⤢", "Fit to View", () => controlInstance.fit()),
      );

      wrapper.appendChild(controlsWrapper);
      controlInstance.controlsWrapper = controlsWrapper;

      // Helper function to create control buttons
      function createControlButton(text, title, onClick) {
        const button = document.createElement("button");
        button.textContent = text;
        button.title = title;
        button.style.cssText = `
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 4px;
          background: transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: bold;
          transition: all 0.2s ease;
        `;

        button.addEventListener("click", (e) => {
          e.stopPropagation();
          onClick();
        });

        button.addEventListener("mouseenter", () => {
          button.style.background = "rgba(0, 0, 0, 0.1)";
        });
        button.addEventListener("mouseleave", () => {
          button.style.background = "transparent";
        });

        return button;
      }

      // ------------------------------------------------------------------
      // 4. Resize handling
      // ------------------------------------------------------------------
      const resizeObserver = new ResizeObserver(() => {
        panZoomInstance.resize();
        panZoomInstance.fit();
        panZoomInstance.center();
      });

      resizeObserver.observe(svgWrapper);

      // Store references for cleanup
      wrapper._panZoomInstance = panZoomInstance;
      wrapper._controlInstance = controlInstance;
      wrapper._resizeObserver = resizeObserver;
      wrapper._svgWrapper = svgWrapper;
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

            // Clean up existing controls and re-render
            document
              .querySelectorAll(".mermaid-panzoom-wrapper[data-processed]")
              .forEach((wrapper) => {
                // Clean up our controls
                if (wrapper._controlInstance) {
                  ControlIcons.disable(wrapper._controlInstance, wrapper);
                }
                if (wrapper._resizeObserver) {
                  wrapper._resizeObserver.disconnect();
                  delete wrapper._resizeObserver;
                }
                wrapper.removeAttribute("data-processed");
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
  // Cleanup function for when diagrams are removed
  function cleanupDiagram(wrapper) {
    if (wrapper._controlInstance && wrapper._controlInstance.controlsWrapper) {
      wrapper._controlInstance.controlsWrapper.remove();
    }
    if (wrapper._panZoomInstance && wrapper._panZoomInstance.destroy) {
      wrapper._panZoomInstance.destroy();
    }
    if (wrapper._resizeObserver) {
      wrapper._resizeObserver.disconnect();
    }
    if (wrapper._svgWrapper) {
      wrapper._svgWrapper.remove();
    }

    // Remove all stored references
    delete wrapper._panZoomInstance;
    delete wrapper._controlInstance;
    delete wrapper._resizeObserver;
    delete wrapper._svgWrapper;
    delete wrapper._handleContainerResize;
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
