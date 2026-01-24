class Component {
  static registry = new WeakMap();

  constructor(el, { props = {}, state = {}, autoMount = true } = {}) {
    this.el = typeof el === "string" ? document.querySelector(el) : el;
    if (!this.el) return;

    if (Component.registry.has(this.el)) {
      return Component.registry.get(this.el);
    }

    Component.registry.set(this.el, this);

    this.props = props;
    this.state = state;
    this._prevState = Object.freeze({ ...state });
    this._prevProps = Object.freeze({ ...props });
    this._listeners = [];
    this._mounted = false;

    if (autoMount) {
      this.mount();
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
    // No direct hook call here - update() is the single source of truth
  }

  update(patch = {}, { fromProps = false } = {}) {
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
    this["update:" + phase]?.(this._prevProps, this._prevState);

    const rendered = this.render?.();

    if (rendered !== undefined && this.shouldRender?.(phase) !== false) {
      this.el.innerHTML = rendered;
    }
  }

  mount() {
    if (this._mounted || !this.el) return;
    this._mounted = true;

    this["update:mount"]?.(); // Normalized mount hook
    const rendered = this.render?.();

    if (rendered !== undefined && this.shouldRender?.("mount") !== false) {
      this.el.innerHTML = rendered;
    }

    this.bindEvents();
  }

  destroy() {
    if (!this.el) return;

    this.unbindEvents();
    this["update:destroy"]?.(this.props, this.state); // Pass current state
    Component.registry.delete(this.el);
    this._mounted = false;
  }

  // === Event System (unchanged) ===
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

  // === Normalized Hooks Only ===
  render() {}
  get events() {
    return {};
  }
  shouldRender(phase) {
    return true;
  }

  // All lifecycle through normalized hooks
  ["update:mount"]() {} // Mounting phase
  ["update:props"]() {} // Props update (receives prevProps, prevState)
  ["update:state"]() {} // State update (receives prevProps, prevState)
  ["update:destroy"]() {} // Destruction (receives current props, state)
}
