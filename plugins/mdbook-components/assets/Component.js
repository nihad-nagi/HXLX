// /home/enzi/HXLX/plugins/mdbook-components/assets/Component.js
class Component {
  static registry = new WeakMap();

  constructor(
    el,
    {
      props = {},
      state = {},
      autoMount = true,
      _serverHTML = null,
      _mode = "mount",
    } = {},
  ) {
    this.el = typeof el === "string" ? document.querySelector(el) : el;
    if (!this.el) return;

    if (Component.registry.has(this.el)) {
      return Component.registry.get(this.el);
    }

    Component.registry.set(this.el, this);

    this.props = props;
    this.state = state;
    this._serverHTML = _serverHTML;
    this._mode = _mode;
    this._prevState = Object.freeze({ ...state });
    this._prevProps = Object.freeze({ ...props });
    this._listeners = [];
    this._mounted = false;
    this._dynamicMarkers = new Map();

    if (autoMount) {
      if (this._mode === "hydrate") {
        this._hydrate();
      } else {
        this.mount();
      }
    }
  }

  // === Public API ===
  get mounted() {
    return this._mounted;
  }

  setProps(nextProps = {}) {
    if (!this.el) return;

    this._prevProps = Object.freeze({ ...this.props });
    this.props = { ...this.props, ...nextProps };
    this.update({}, { fromProps: true });
  }

  update(patch = {}, { fromProps = false, silent = false } = {}) {
    if (!this.el) return;

    this._prevState = Object.freeze({ ...this.state });

    if (!fromProps) {
      this._prevProps = Object.freeze({ ...this.props });
    }

    const nextState = { ...this.state };
    Object.keys(patch).forEach((key) => {
      nextState[key] = patch[key];
    });

    this.state = nextState;

    // SINGLE SOURCE OF TRUTH: Only update() calls these hooks
    const phase = fromProps ? "props" : "state";
    if (!silent) {
      this["update:" + phase]?.(this._prevProps, this._prevState);
    }

    const rendered = this.render?.();

    if (rendered !== undefined && this.shouldRender?.(phase) !== false) {
      // In hydration mode, only update dynamic parts
      if (this._mode === "hydrate" && this._serverHTML) {
        this._updateDynamicParts(rendered);
      } else {
        this.el.innerHTML = rendered;
      }
    }
  }

  // Hydration-specific initialization
  _hydrate() {
    this._mounted = true;

    // Extract dynamic markers from server HTML
    if (this._serverHTML) {
      this._extractDynamicMarkers();
    }

    // Bind events without re-rendering
    this.bindEvents();

    // Call hydration hook if defined
    if (this.onHydrate) {
      this.onHydrate(this.props, this.state);
    }

    // Update only dynamic parts
    this.update({}, { silent: true });
  }

  mount() {
    if (this._mounted || !this.el) return;
    this._mounted = true;

    this["update:mount"]?.();
    const rendered = this.render?.();

    if (rendered !== undefined && this.shouldRender?.("mount") !== false) {
      this.el.innerHTML = rendered;
    }

    this.bindEvents();
  }

  destroy() {
    if (!this.el) return;

    this.unbindEvents();
    this["update:destroy"]?.(this.props, this.state);
    Component.registry.delete(this.el);
    this._mounted = false;
  }

  // Extract dynamic markers for hydration
  _extractDynamicMarkers() {
    const markers = this.el.querySelectorAll("[data-dynamic]");
    markers.forEach((marker) => {
      const markerId = marker.dataset.dynamic || marker.dataset.id;
      if (markerId) {
        this._dynamicMarkers.set(markerId, marker);
      }
    });
  }

  // Update only dynamic parts of the component
  _updateDynamicParts(rendered) {
    if (this._dynamicMarkers.size === 0) return;

    // Create a temporary element to parse the rendered content
    const temp = document.createElement("div");
    temp.innerHTML = rendered;

    // Update each dynamic marker
    this._dynamicMarkers.forEach((marker, markerId) => {
      const dynamicContent =
        temp.querySelector(`[data-dynamic="${markerId}"]`) ||
        temp.querySelector(`[data-id="${markerId}"]`);
      if (dynamicContent) {
        marker.innerHTML = dynamicContent.innerHTML;
      }
    });
  }

  // === Event System ===
  bindEvents() {
    if (!this.el) return;

    this.unbindEvents();
    const events = this.events || {};

    Object.entries(events).forEach(([key, handler]) => {
      const [eventName, ...selectorParts] = key.split(" ");
      const selector = selectorParts.join(" ") || null;

      const boundHandler = (e) => {
        if (!selector || e.target.closest(selector)) {
          const result = handler.call(this, e);
          if (result === false) {
            e.preventDefault();
            e.stopPropagation();
          }
        }
      };

      this.el.addEventListener(eventName, boundHandler);
      this._listeners.push({ event: eventName, handler: boundHandler });
    });
  }

  unbindEvents() {
    if (!this.el) return;

    this._listeners.forEach(({ event, handler }) =>
      this.el.removeEventListener(event, handler),
    );
    this._listeners = [];
  }

  // === Normalized Hooks ===
  render() {}
  get events() {
    return {};
  }
  shouldRender(phase) {
    return true;
  }

  // Lifecycle hooks
  ["update:mount"]() {} // Mounting phase
  ["update:props"](prevProps, prevState) {} // Props update
  ["update:state"](prevProps, prevState) {} // State update
  ["update:destroy"](props, state) {} // Destruction

  // Optional hydration hook
  onHydrate(props, state) {}
}
