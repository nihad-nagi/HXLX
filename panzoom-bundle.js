// ===== COMPONENT =====
class Component {
    static registry = new WeakMap();
    
    constructor(el, { props = {}, state = {}, autoMount = true } = {}) {
        this.el = typeof el === 'string' ? document.querySelector(el) : el;
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
    
    get mounted() { return this._mounted; }
    
    setProps(nextProps = {}) {
        if (!this.el) return;
        this._prevProps = Object.freeze({ ...this.props });
        this.props = { ...this.props, ...nextProps };
        this.update({}, { fromProps: true });
    }
    
    update(patch = {}, { fromProps = false } = {}) {
        if (!this.el) return;
        this._prevState = Object.freeze({ ...this.state });
        if (!fromProps) {
            this._prevProps = Object.freeze({ ...this.props });
        }
        const nextState = { ...this.state };
        Object.keys(patch).forEach(key => {
            nextState[key] = patch[key];
        });
        this.state = nextState;
        
        const phase = fromProps ? 'props' : 'state';
        if (this['update:' + phase]) this['update:' + phase]();
        
        const rendered = this.render ? this.render() : undefined;
        if (rendered !== undefined && (!this.shouldRender || this.shouldRender(phase) !== false)) {
            this.el.innerHTML = rendered;
        }
    }
    
    mount() {
        if (this._mounted || !this.el) return;
        this._mounted = true;
        if (this['update:mount']) this['update:mount']();
        const rendered = this.render ? this.render() : undefined;
        if (rendered !== undefined && (!this.shouldRender || this.shouldRender('mount') !== false)) {
            this.el.innerHTML = rendered;
        }
        this.bindEvents();
    }
    
    destroy() {
        if (!this.el) return;
        this.unbindEvents();
        if (this['update:destroy']) this['update:destroy']();
        Component.registry.delete(this.el);
        this._mounted = false;
    }
    
    bindEvents() {
        if (!this.el) return;
        this.unbindEvents();
        const events = this.events || {};
        Object.entries(events).forEach(([key, handler]) => {
            const [eventName, ...selectorParts] = key.split(' ');
            const selector = selectorParts.join(' ') || null;
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
            this.el.removeEventListener(event, handler)
        );
        this._listeners = [];
    }
}

// ===== MATRIX =====
class Matrix {
    static PI = Math.PI;
    static DEG_TO_RAD = Math.PI / 180;
    static RAD_TO_DEG = 180 / Math.PI;
    static EPSILON = 1e-10;
    static IDENTITY = Object.freeze({ a: 1, c: 0, e: 0, b: 0, d: 1, f: 0 });
    
    static identity() { return { a: 1, c: 0, e: 0, b: 0, d: 1, f: 0 }; }
    
    static translate(tx, ty = 0) { 
        return { a: 1, c: 0, e: tx, b: 0, d: 1, f: ty }; 
    }
    
    static scale(sx, sy = sx, cx, cy) {
        const m = { a: sx, c: 0, e: 0, b: 0, d: sy, f: 0 };
        if (cx !== undefined && cy !== undefined) {
            return Matrix.compose(
                Matrix.translate(cx, cy),
                m,
                Matrix.translate(-cx, -cy)
            );
        }
        return m;
    }
    
    static compose(...matrices) {
        if (matrices.length === 0) return Matrix.identity();
        if (matrices.length === 1) return { ...matrices[0] };
        
        const multiply = (m1, m2) => ({
            a: m1.a * m2.a + m1.c * m2.b,
            c: m1.a * m2.c + m1.c * m2.d,
            e: m1.a * m2.e + m1.c * m2.f + m1.e,
            b: m1.b * m2.a + m1.d * m2.b,
            d: m1.b * m2.c + m1.d * m2.d,
            f: m1.b * m2.e + m1.d * m2.f + m1.f
        });
        
        return matrices.reduceRight((result, matrix) => multiply(matrix, result), Matrix.identity());
    }
    
    static clone(m) { return { a: m.a, b: m.b, c: m.c, d: m.d, e: m.e, f: m.f }; }
    
    static equals(m1, m2, eps = Matrix.EPSILON) {
        return Math.abs(m1.a - m2.a) < eps &&
               Math.abs(m1.b - m2.b) < eps &&
               Math.abs(m1.c - m2.c) < eps &&
               Math.abs(m1.d - m2.d) < eps &&
               Math.abs(m1.e - m2.e) < eps &&
               Math.abs(m1.f - m2.f) < eps;
    }
    
    static applyToPoint(matrix, point) {
        return {
            x: matrix.a * point.x + matrix.c * point.y + matrix.e,
            y: matrix.b * point.x + matrix.d * point.y + matrix.f
        };
    }
}

// ===== SVGPANZOOM =====
class SVGPanZoom extends Component {
    constructor(el, options = {}) {
        const defaults = {
            width: 500,
            height: 500,
            scaleFactor: 1.2,
            scaleFactorMin: 0.1,
            scaleFactorMax: 20,
            background: 'transparent',
            initialFit: true
        };
        
        super(el, {
            props: { ...defaults, ...options },
            state: {
                transform: Matrix.identity(),
                viewerWidth: options.width || 500,
                viewerHeight: options.height || 500,
                isPanning: false,
                startX: 0,
                startY: 0
            },
            autoMount: true
        });
    }
    
    ['update:mount']() {
        this.renderViewer();
        if (this.props.initialFit) {
            this.fitToView();
        }
        this.setupEventListeners();
    }
    
    render() {
        const { viewerWidth, viewerHeight } = this.state;
        const { background } = this.props;
        
        return `
            <svg class="svg-panzoom-viewport" width="${viewerWidth}" height="${viewerHeight}" 
                 style="display: block; overflow: hidden; background: ${background};">
                <g class="svg-content-transform"></g>
            </svg>
        `;
    }
    
    renderViewer() {
        this.el.innerHTML = this.render();
        this._viewport = this.el.querySelector('.svg-panzoom-viewport');
        this._transformGroup = this.el.querySelector('.svg-content-transform');
        
        // Move existing SVG content into transform group
        const existingSVG = this.el.querySelector('svg:not(.svg-panzoom-viewport)');
        if (existingSVG) {
            while (existingSVG.firstChild) {
                this._transformGroup.appendChild(existingSVG.firstChild);
            }
            existingSVG.remove();
        }
    }
    
    setupEventListeners() {
        if (!this._viewport) return;
        
        this._viewport.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this._viewport.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this._viewport.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this._viewport.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
        
        // Touch events
        this._viewport.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this._viewport.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this._viewport.addEventListener('touchend', this.handleTouchEnd.bind(this));
    }
    
    handleMouseDown(e) {
        e.preventDefault();
        this.update({
            isPanning: true,
            startX: e.clientX,
            startY: e.clientY
        });
    }
    
    handleMouseMove(e) {
        if (!this.state.isPanning) return;
        
        const dx = e.clientX - this.state.startX;
        const dy = e.clientY - this.state.startY;
        
        const scale = this.getScale();
        const newTransform = Matrix.compose(
            this.state.transform,
            Matrix.translate(dx / scale, dy / scale)
        );
        
        this.update({
            transform: newTransform,
            startX: e.clientX,
            startY: e.clientY
        });
        
        this.applyTransform();
    }
    
    handleMouseUp() {
        this.update({ isPanning: false });
    }
    
    handleWheel(e) {
        e.preventDefault();
        
        const rect = this._viewport.getBoundingClientRect();
        const point = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        const scaleFactor = e.deltaY > 0 ? 1 / this.props.scaleFactor : this.props.scaleFactor;
        const currentScale = this.getScale();
        const newScale = currentScale * scaleFactor;
        
        // Apply scale limits
        const clampedScale = Math.max(
            this.props.scaleFactorMin,
            Math.min(this.props.scaleFactorMax, newScale)
        );
        
        const actualScaleFactor = clampedScale / currentScale;
        
        const newTransform = Matrix.compose(
            this.state.transform,
            Matrix.translate(point.x, point.y),
            Matrix.scale(actualScaleFactor, actualScaleFactor),
            Matrix.translate(-point.x, -point.y)
        );
        
        this.update({ transform: newTransform });
        this.applyTransform();
    }
    
    handleTouchStart(e) {
        if (e.touches.length === 1) {
            this.handleMouseDown(e.touches[0]);
        }
    }
    
    handleTouchMove(e) {
        if (e.touches.length === 1) {
            this.handleMouseMove(e.touches[0]);
        }
    }
    
    handleTouchEnd() {
        this.handleMouseUp();
    }
    
    applyTransform() {
        if (!this._transformGroup || !this.state.transform) return;
        
        const { a, b, c, d, e, f } = this.state.transform;
        this._transformGroup.setAttribute('transform', 
            `matrix(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`);
    }
    
    getScale() {
        const { a, b } = this.state.transform;
        return Math.sqrt(a * a + b * b);
    }
    
    fitToView() {
        if (!this._transformGroup) return;
        
        const bbox = this._transformGroup.getBBox();
        if (bbox.width === 0 || bbox.height === 0) return;
        
        const scaleX = this.state.viewerWidth / bbox.width;
        const scaleY = this.state.viewerHeight / bbox.height;
        const scale = Math.min(scaleX, scaleY) * 0.9; // 10% padding
        
        const tx = (this.state.viewerWidth - bbox.width * scale) / 2 - bbox.x * scale;
        const ty = (this.state.viewerHeight - bbox.height * scale) / 2 - bbox.y * scale;
        
        this.update({
            transform: Matrix.compose(
                Matrix.translate(tx, ty),
                Matrix.scale(scale, scale)
            )
        });
        this.applyTransform();
    }
    
    zoomIn() {
        this.zoom(this.props.scaleFactor);
    }
    
    zoomOut() {
        this.zoom(1 / this.props.scaleFactor);
    }
    
    zoom(factor) {
        const center = {
            x: this.state.viewerWidth / 2,
            y: this.state.viewerHeight / 2
        };
        
        const newTransform = Matrix.compose(
            this.state.transform,
            Matrix.translate(center.x, center.y),
            Matrix.scale(factor, factor),
            Matrix.translate(-center.x, -center.y)
        );
        
        this.update({ transform: newTransform });
        this.applyTransform();
    }
    
    reset() {
        this.update({ transform: Matrix.identity() });
        this.applyTransform();
    }
    
    pan(dx, dy) {
        const scale = this.getScale();
        const newTransform = Matrix.compose(
            this.state.transform,
            Matrix.translate(dx / scale, dy / scale)
        );
        this.update({ transform: newTransform });
        this.applyTransform();
    }
}

// ===== MERMAID VIEWER =====
class MermaidViewer {
    constructor() {
        this.viewers = new Map();
        this.initialized = false;
    }
    
    async init() {
        if (this.initialized) return;
        
        // Wait for mermaid
        await this.waitForMermaid();
        
        // Initialize mermaid
        mermaid.initialize({
            startOnLoad: false,
            theme: this.detectTheme(),
            securityLevel: 'loose'
        });
        
        // Process diagrams
        await this.processAllDiagrams();
        this.setupObserver();
        
        this.initialized = true;
    }
    
    waitForMermaid() {
        return new Promise((resolve) => {
            if (window.mermaid) return resolve();
            
            const check = () => {
                if (window.mermaid) resolve();
                else setTimeout(check, 100);
            };
            check();
        });
    }
    
    detectTheme() {
        const html = document.documentElement;
        if (html.classList.contains('dark') || 
            html.getAttribute('data-md-color-scheme') === 'slate') {
            return 'dark';
        }
        return 'default';
    }
    
    async processAllDiagrams() {
        const wrappers = document.querySelectorAll('.mermaid-panzoom-wrapper:not([data-processed])');
        
        for (const wrapper of wrappers) {
            try {
                await this.renderDiagram(wrapper);
                wrapper.dataset.processed = 'true';
            } catch (error) {
                console.error('Diagram render failed:', error);
                wrapper.innerHTML = `<div class="mermaid-error" style="padding: 20px; color: #ff6b6b;">Diagram failed to render: ${error.message}</div>`;
            }
        }
    }
    
    async renderDiagram(wrapper) {
        const container = wrapper.querySelector('.mermaid-container');
        const codeDiv = wrapper.querySelector('.mermaid-code');
        
        if (!container || !codeDiv) return;
        
        const mermaidCode = codeDiv.textContent;
        const id = 'mermaid-' + Math.random().toString(36).substr(2, 9);
        
        // Render mermaid
        const { svg } = await mermaid.render(id, mermaidCode);
        
        // Create SVG container
        const svgContainer = document.createElement('div');
        svgContainer.className = 'mermaid-svg-container';
        svgContainer.innerHTML = svg;
        
        // Clear and append
        container.innerHTML = '';
        container.appendChild(svgContainer);
        
        // Setup pan/zoom
        this.setupPanZoom(wrapper, container, svgContainer.querySelector('svg'));
    }
    
    setupPanZoom(wrapper, container, svg) {
        let scale = 1;
        let x = 0;
        let y = 0;
        let isPanning = false;
        let startX, startY;
        
        const updateTransform = () => {
            svg.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
            svg.style.transformOrigin = '0 0';
            
            // Update zoom level display
            const zoomLevel = wrapper.querySelector('.zoom-level');
            if (zoomLevel) {
                zoomLevel.textContent = `${Math.round(scale * 100)}%`;
            }
        };
        
        // Mouse events
        container.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Left click only
                isPanning = true;
                startX = e.clientX - x;
                startY = e.clientY - y;
                container.style.cursor = 'grabbing';
                e.preventDefault();
            }
        });
        
        container.addEventListener('mousemove', (e) => {
            if (!isPanning) return;
            x = e.clientX - startX;
            y = e.clientY - startY;
            updateTransform();
        });
        
        const stopPanning = () => {
            isPanning = false;
            container.style.cursor = 'grab';
        };
        
        container.addEventListener('mouseup', stopPanning);
        container.addEventListener('mouseleave', stopPanning);
        
        // Wheel zoom
        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const rect = container.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            const oldScale = scale;
            scale *= e.deltaY > 0 ? 0.9 : 1.1;
            scale = Math.max(0.1, Math.min(10, scale));
            
            // Adjust position to zoom towards mouse
            x = mouseX - (mouseX - x) * (scale / oldScale);
            y = mouseY - (mouseY - y) * (scale / oldScale);
            
            updateTransform();
        });
        
        // Control buttons
        const controls = wrapper.querySelector('.mermaid-panzoom-controls');
        if (controls) {
            controls.querySelector('.zoom-in')?.addEventListener('click', () => {
                scale *= 1.2;
                scale = Math.min(10, scale);
                updateTransform();
            });
            
            controls.querySelector('.zoom-out')?.addEventListener('click', () => {
                scale /= 1.2;
                scale = Math.max(0.1, scale);
                updateTransform();
            });
            
            controls.querySelector('.reset-view')?.addEventListener('click', () => {
                scale = 1;
                x = 0;
                y = 0;
                updateTransform();
            });
            
            controls.querySelector('.fit-view')?.addEventListener('click', () => {
                const svgRect = svg.getBBox();
                const containerRect = container.getBoundingClientRect();
                
                const scaleX = containerRect.width / svgRect.width;
                const scaleY = containerRect.height / svgRect.height;
                scale = Math.min(scaleX, scaleY) * 0.9;
                
                x = (containerRect.width - svgRect.width * scale) / 2;
                y = (containerRect.height - svgRect.height * scale) / 2;
                
                updateTransform();
            });
        }
        
        // Initial setup
        container.style.cursor = 'grab';
        updateTransform();
    }
    
    setupObserver() {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    this.processAllDiagrams().catch(console.error);
                }
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
}

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
    window.mermaidViewer = new MermaidViewer();
    window.mermaidViewer.init().catch(err => {
        console.warn('Mermaid viewer initialization failed:', err);
    });
});
