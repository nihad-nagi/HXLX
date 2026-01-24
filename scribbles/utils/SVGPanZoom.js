// SVGPanZoom.js - Optimized SVG Pan & Zoom Component
class SVGPanZoom extends Component {
  constructor(el, options = {}) {
    const defaults = {
      width: 500,
      height: 500,
      scaleFactorMin: 0.1,
      scaleFactorMax: 10,
      scaleFactor: 1.1,
      panFactor: 1,
      tool: 'auto',
      autoMount: true,
      background: '#f0f0f0',
      SVGBackground: '#ffffff',
      miniature: { position: 'right', open: true },
      toolbar: { position: 'top' },
      detectWheel: true,
      detectTouch: true,
      detectMouseMove: true,
      precision: 1e10,
      initialFit: true,
      respectLimitsOnFit: true,
      onMouseDown: null,
      onMouseMove: null,
      onMouseUp: null,
      onWheel: null,
      onChangeValue: null,
      onChangeTool: null
    };

    super(el, {
      props: { ...defaults, ...options },
      state: {
        // Pure transformation matrix only
        transform: null,
        
        // View metadata (immutable during interaction)
        meta: {
          version: 3,
          viewerWidth: options.width || 500,
          viewerHeight: options.height || 500,
          SVGMinX: 0,
          SVGMinY: 0,
          SVGWidth: 0,
          SVGHeight: 0,
          scaleFactorMin: options.scaleFactorMin || 0.1,
          scaleFactorMax: options.scaleFactorMax || 10
        },
        
        // Interaction state
        interaction: {
          mode: 'idle',
          tool: options.tool || 'auto',
          pointer: { x: null, y: null },
          startPointer: { x: null, y: null },
          selection: null,
          isTouch: false,
          pinchDistance: null,
          lastAction: null
        },
        
        // Cached computations
        cache: {
          inverse: null,
          scale: null,
          decomposition: null
        },
        
        // Animation state
        animation: {
          frameId: null,
          autoPanRunning: false
        }
      },
      autoMount: options.autoMount !== false
    });

    this._bindMethods();
    this._lastPinchDistance = null;
  }

  _bindMethods() {
    // Event handlers
    this._handleMouseDown = this._handleMouseDown.bind(this);
    this._handleMouseMove = this._handleMouseMove.bind(this);
    this._handleMouseUp = this._handleMouseUp.bind(this);
    this._handleWheel = this._handleWheel.bind(this);
    this._handleTouchStart = this._handleTouchStart.bind(this);
    this._handleTouchMove = this._handleTouchMove.bind(this);
    this._handleTouchEnd = this._handleTouchEnd.bind(this);
    
    // Core operations
    this._animationLoop = this._animationLoop.bind(this);
    this._updateCache = this._updateCache.bind(this);
    this._applyTransform = this._applyTransform.bind(this);
    this._clampTransform = this._clampTransform.bind(this);
    this._composeTransform = this._composeTransform.bind(this);
  }

  // ========== LIFECYCLE HOOKS ==========

  ['update:mount']() {
    console.log('SVGPanZoom: Mounting');
    
    this._parseSVGDimensions();
    this._initTransform();
    this._setupDOM();
    this._startAnimationLoop();
    
    if (this.props.initialFit !== false) {
      setTimeout(() => this.fitToViewer(), 0);
    }
  }

  ['update:props'](prevProps) {
    if (prevProps.width !== this.props.width || prevProps.height !== this.props.height) {
      this._updateViewerSize();
    }
    
    if (prevProps.tool !== this.props.tool) {
      this.setTool(this.props.tool);
    }
    
    if (prevProps.scaleFactorMin !== this.props.scaleFactorMin || 
        prevProps.scaleFactorMax !== this.props.scaleFactorMax) {
      this._updateMeta({
        scaleFactorMin: this.props.scaleFactorMin,
        scaleFactorMax: this.props.scaleFactorMax
      });
      this._clampAndUpdate();
    }
  }

  ['update:state'](prevState) {
    if (prevState.transform !== this.state.transform && this._transformGroup) {
      this._updateTransformation();
      this._updateCache();
      
      if (this.props.onChangeValue && 
          !Matrix.equals(prevState.transform, this.state.transform, 1e-6)) {
        this.props.onChangeValue(this._getCombinedValue(), this._getCombinedValue(prevState));
      }
    }
    
    if (prevState.interaction.tool !== this.state.interaction.tool || 
        prevState.interaction.mode !== this.state.interaction.mode) {
      this._updateCursor();
    }
    
    if (prevState.interaction.selection !== this.state.interaction.selection) {
      this._updateSelection();
    }
  }

  ['update:destroy']() {
    console.log('SVGPanZoom: Destroying');
    this._stopAnimationLoop();
    this._cleanupDOM();
  }

  // ========== CORE TRANSFORMATION METHODS ==========

  _initTransform() {
    this.state.transform = Matrix.identity();
  }

  _composeTransform(newTransform) {
    return Matrix.compose(newTransform, this.state.transform);
  }

  _applyTransform(matrix) {
    return Matrix.smoothMatrix(matrix, this.props.precision);
  }

  _clampTransform(matrix) {
    const { scaleFactorMin, scaleFactorMax } = this.state.meta;
    if (scaleFactorMin === undefined && scaleFactorMax === undefined) {
      return matrix;
    }
    
    const newScale = Matrix.decomposeTSR(matrix).scale.sx;
    const currentScale = this._getCachedScale().sx;
    
    const belowMin = scaleFactorMin !== undefined && newScale < scaleFactorMin;
    const aboveMax = scaleFactorMax !== undefined && newScale > scaleFactorMax;
    
    if (!belowMin && !aboveMax) {
      return matrix;
    }
    
    if ((belowMin && Math.abs(currentScale - scaleFactorMin) < 1e-6) ||
        (aboveMax && Math.abs(currentScale - scaleFactorMax) < 1e-6)) {
      return this.state.transform;
    }
    
    const targetScale = belowMin ? scaleFactorMin : scaleFactorMax;
    const center = this._getViewerCenter();
    const svgCenter = this._getSVGPoint(center.x, center.y);
    
    return Matrix.compose(
      Matrix.translate(svgCenter.x, svgCenter.y),
      Matrix.scale(targetScale / currentScale),
      Matrix.translate(-svgCenter.x, -svgCenter.y),
      this.state.transform
    );
  }

  _clampAndUpdate() {
    const clamped = this._clampTransform(this.state.transform);
    if (!Matrix.equals(clamped, this.state.transform, 1e-6)) {
      this.update({ transform: this._applyTransform(clamped) });
    }
  }

  _updateCache() {
    const { transform } = this.state;
    
    try {
      const decomposition = Matrix.decomposeTSR(transform);
      this.state.cache = {
        inverse: Matrix.inverse(transform),
        scale: decomposition.scale,
        decomposition: decomposition
      };
    } catch (error) {
      console.warn('Failed to cache matrix values:', error.message);
      this.state.cache = {
        inverse: null,
        scale: { sx: 1, sy: 1 },
        decomposition: null
      };
    }
  }

  _getCachedInverse() {
    if (!this.state.cache.inverse) {
      this._updateCache();
    }
    return this.state.cache.inverse || Matrix.identity();
  }

  _getCachedScale() {
    if (!this.state.cache.scale) {
      this._updateCache();
    }
    return this.state.cache.scale || { sx: 1, sy: 1 };
  }

  // ========== COORDINATE TRANSFORMATIONS ==========

  _getViewerCenter() {
    const { viewerWidth, viewerHeight } = this.state.meta;
    return { x: viewerWidth / 2, y: viewerHeight / 2 };
  }

  _getSVGPoint(viewerX, viewerY) {
    try {
      return Matrix.applyInverseToPoint(this.state.transform, { x: viewerX, y: viewerY });
    } catch (error) {
      console.warn('Cannot get SVG point:', error.message);
      return { x: viewerX, y: viewerY };
    }
  }

  _getViewerPoint(event) {
    const rect = this._viewer.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  // ========== DOM & UI METHODS ==========

  render() {
    const { transform } = this.state;
    const { viewerWidth, viewerHeight } = this.state.meta;
    const { background } = this.props;
    
    if (!transform) return '';
    
    return `
      <div class="svg-pan-zoom-container" 
           style="position: relative; width: ${viewerWidth}px; height: ${viewerHeight}px;">
        <svg class="svg-pan-zoom-viewer" 
             width="${viewerWidth}" 
             height="${viewerHeight}"
             style="display: block; overflow: hidden; user-select: none;">
          <rect fill="${background}" width="100%" height="100%"/>
          <g class="svg-content-transform"></g>
          ${this._renderSelectionRect()}
        </svg>
      </div>
    `;
  }

  _setupDOM() {
    this.el.innerHTML = this.render();
    
    this._viewer = this.el.querySelector('.svg-pan-zoom-viewer');
    this._transformGroup = this.el.querySelector('.svg-content-transform');
    
    const existingSVG = this.el.querySelector('svg:not(.svg-pan-zoom-viewer)');
    if (existingSVG) {
      while (existingSVG.firstChild) {
        this._transformGroup.appendChild(existingSVG.firstChild);
      }
      existingSVG.remove();
    }
    
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('fill', this.props.SVGBackground);
    bgRect.setAttribute('x', this.state.meta.SVGMinX);
    bgRect.setAttribute('y', this.state.meta.SVGMinY);
    bgRect.setAttribute('width', this.state.meta.SVGWidth);
    bgRect.setAttribute('height', this.state.meta.SVGHeight);
    this._transformGroup.insertBefore(bgRect, this._transformGroup.firstChild);
    
    if (this.props.toolbar && this.props.toolbar.position !== 'none') {
      this._createToolbar();
    }
    
    if (this.props.miniature && this.props.miniature.position !== 'none') {
      this._createMiniature();
    }
  }

  _updateTransformation() {
    if (!this._transformGroup || !this.state.transform) return;
    
    const { a, b, c, d, e, f } = this.state.transform;
    this._transformGroup.setAttribute('transform', 
      `matrix(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`);
    
    if (this._miniatureViewport) {
      this._updateMiniatureViewport();
    }
  }

  _updateCursor() {
    if (!this._viewer) return;
    
    let cursor = 'default';
    const { tool, mode } = this.state.interaction;
    
    switch (tool) {
      case 'pan':
        cursor = mode === 'panning' ? 'grabbing' : 'grab';
        break;
      case 'zoom-in':
        cursor = 'zoom-in';
        break;
      case 'zoom-out':
        cursor = 'zoom-out';
        break;
      case 'auto':
        cursor = mode === 'panning' ? 'grabbing' : mode === 'zooming' ? 'zoom-in' : 'move';
        break;
    }
    
    this._viewer.style.cursor = cursor;
  }

  // ========== EVENT HANDLERS ==========

  get events() {
    return {
      'mousedown .svg-pan-zoom-viewer': this._handleMouseDown,
      'mousemove .svg-pan-zoom-viewer': this._handleMouseMove,
      'mouseup .svg-pan-zoom-viewer': this._handleMouseUp,
      'mouseleave .svg-pan-zoom-viewer': this._handleMouseUp,
      'wheel .svg-pan-zoom-viewer': this._handleWheel,
      'touchstart .svg-pan-zoom-viewer': this._handleTouchStart,
      'touchmove .svg-pan-zoom-viewer': this._handleTouchMove,
      'touchend .svg-pan-zoom-viewer': this._handleTouchEnd,
      'touchcancel .svg-pan-zoom-viewer': this._handleTouchEnd
    };
  }

  _handleMouseDown(e) {
    e.preventDefault();
    const point = this._getViewerPoint(e);
    
    this.update({
      interaction: {
        ...this.state.interaction,
        mode: 'panning',
        startPointer: point,
        pointer: point,
        lastAction: 'pan-start'
      }
    });
    
    if (this.props.onMouseDown) {
      this.props.onMouseDown(e, this._getCombinedValue());
    }
  }

  _handleMouseMove(e) {
    const point = this._getViewerPoint(e);
    const { interaction } = this.state;
    
    this.update({
      interaction: {
        ...interaction,
        pointer: point
      }
    });
    
    if (interaction.mode === 'panning' && interaction.startPointer) {
      const startSVG = this._getSVGPoint(interaction.startPointer.x, interaction.startPointer.y);
      const currentSVG = this._getSVGPoint(point.x, point.y);
      
      const deltaX = currentSVG.x - startSVG.x;
      const deltaY = currentSVG.y - startSVG.y;
      
      const newMatrix = this._composeTransform(Matrix.translate(deltaX, deltaY));
      const clampedMatrix = this._clampTransform(newMatrix);
      
      this.update({ 
        transform: this._applyTransform(clampedMatrix),
        interaction: {
          ...interaction,
          lastAction: 'pan'
        }
      });
    }
    
    if (this.props.onMouseMove) {
      this.props.onMouseMove(e, this._getCombinedValue());
    }
  }

  _handleMouseUp(e) {
    this.update({
      interaction: {
        ...this.state.interaction,
        mode: 'idle',
        startPointer: null,
        selection: null,
        lastAction: 'pan-end'
      }
    });
    
    if (this.props.onMouseUp) {
      this.props.onMouseUp(e, this._getCombinedValue());
    }
  }

  _handleWheel(e) {
    e.preventDefault();
    
    const point = this._getViewerPoint(e);
    const svgPoint = this._getSVGPoint(point.x, point.y);
    
    const scaleFactor = e.deltaY > 0 ? 1 / this.props.scaleFactor : this.props.scaleFactor;
    
    const newMatrix = this._composeTransform(
      Matrix.compose(
        Matrix.translate(svgPoint.x, svgPoint.y),
        Matrix.scale(scaleFactor, scaleFactor),
        Matrix.translate(-svgPoint.x, -svgPoint.y)
      )
    );
    
    const clampedMatrix = this._clampTransform(newMatrix);
    
    this.update({ 
      transform: this._applyTransform(clampedMatrix),
      interaction: {
        ...this.state.interaction,
        lastAction: 'zoom'
      }
    });
    
    if (this.props.onWheel) {
      this.props.onWheel(e, this._getCombinedValue());
    }
  }

  _handleTouchStart(e) {
    e.preventDefault();
    const { interaction } = this.state;
    
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const point = this._getViewerPoint(touch);
      
      this.update({
        interaction: {
          ...interaction,
          mode: 'panning',
          isTouch: true,
          startPointer: point,
          pointer: point,
          pinchDistance: null,
          lastAction: 'touch-pan-start'
        }
      });
    } else if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      
      const p1 = this._getViewerPoint(touch1);
      const p2 = this._getViewerPoint(touch2);
      const distance = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      
      this.update({
        interaction: {
          ...interaction,
          mode: 'zooming',
          isTouch: true,
          pinchDistance: distance,
          lastAction: 'touch-zoom-start'
        }
      });
    }
  }

  _handleTouchMove(e) {
    e.preventDefault();
    const { interaction } = this.state;
    
    if (e.touches.length === 1 && interaction.mode === 'panning') {
      const touch = e.touches[0];
      this._handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
    } else if (e.touches.length === 2 && interaction.mode === 'zooming') {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      
      const p1 = this._getViewerPoint(touch1);
      const p2 = this._getViewerPoint(touch2);
      
      const center = {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2
      };
      
      const svgCenter = this._getSVGPoint(center.x, center.y);
      const distance = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      
      if (interaction.pinchDistance !== null && distance !== interaction.pinchDistance) {
        const scaleFactor = distance / interaction.pinchDistance;
        
        const newMatrix = this._composeTransform(
          Matrix.compose(
            Matrix.translate(svgCenter.x, svgCenter.y),
            Matrix.scale(scaleFactor, scaleFactor),
            Matrix.translate(-svgCenter.x, -svgCenter.y)
          )
        );
        
        const clampedMatrix = this._clampTransform(newMatrix);
        
        this.update({ 
          transform: this._applyTransform(clampedMatrix),
          interaction: {
            ...interaction,
            pinchDistance: distance,
            lastAction: 'touch-zoom'
          }
        });
      }
    }
  }

  _handleTouchEnd(e) {
    this.update({
      interaction: {
        ...this.state.interaction,
        mode: 'idle',
        startPointer: null,
        isTouch: false,
        pinchDistance: null,
        lastAction: 'touch-end'
      }
    });
  }

  // ========== ANIMATION LOOP ==========

  _startAnimationLoop() {
    if (this.state.animation.frameId) return;
    
    const loop = () => {
      if (!this.state.animation.frameId) return;
      
      const { interaction } = this.state;
      
      if (interaction.mode === 'panning' && interaction.pointer) {
        const { x, y } = interaction.pointer;
        const { viewerWidth, viewerHeight } = this.state.meta;
        
        if (x < 20 || x > viewerWidth - 20 || y < 20 || y > viewerHeight - 20) {
          const deltaX = x < 20 ? 5 : x > viewerWidth - 20 ? -5 : 0;
          const deltaY = y < 20 ? 5 : y > viewerHeight - 20 ? -5 : 0;
          
          const svgDelta = this._getSVGPoint(deltaX, deltaY);
          const svgOrigin = this._getSVGPoint(0, 0);
          
          const newMatrix = this._composeTransform(
            Matrix.translate(svgDelta.x - svgOrigin.x, svgDelta.y - svgOrigin.y)
          );
          
          const clampedMatrix = this._clampTransform(newMatrix);
          this.update({ transform: this._applyTransform(clampedMatrix) });
        }
      }
      
      this.state.animation.frameId = requestAnimationFrame(loop);
    };
    
    this.state.animation.frameId = requestAnimationFrame(loop);
  }

  _stopAnimationLoop() {
    if (this.state.animation.frameId) {
      cancelAnimationFrame(this.state.animation.frameId);
      this.state.animation.frameId = null;
    }
  }

  // ========== PUBLIC API ==========

  pan(dx, dy) {
    const newMatrix = this._composeTransform(Matrix.translate(dx, dy));
    const clampedMatrix = this._clampTransform(newMatrix);
    this.update({ transform: this._applyTransform(clampedMatrix) });
    return this;
  }

  zoom(factor, centerX, centerY) {
    const center = centerX !== undefined && centerY !== undefined 
      ? { x: centerX, y: centerY }
      : this._getViewerCenter();
    
    const svgCenter = this._getSVGPoint(center.x, center.y);
    
    const newMatrix = this._composeTransform(
      Matrix.compose(
        Matrix.translate(svgCenter.x, svgCenter.y),
        Matrix.scale(factor, factor),
        Matrix.translate(-svgCenter.x, -svgCenter.y)
      )
    );
    
    const clampedMatrix = this._clampTransform(newMatrix);
    this.update({ transform: this._applyTransform(clampedMatrix) });
    return this;
  }

  zoomIn(centerX, centerY) {
    return this.zoom(this.props.scaleFactor, centerX, centerY);
  }

  zoomOut(centerX, centerY) {
    return this.zoom(1 / this.props.scaleFactor, centerX, centerY);
  }

  fitToViewer(alignX = 'center', alignY = 'center') {
    const { viewerWidth, viewerHeight, SVGWidth, SVGHeight, scaleFactorMin, scaleFactorMax } = this.state.meta;
    
    const scaleX = viewerWidth / SVGWidth;
    const scaleY = viewerHeight / SVGHeight;
    let scale = Math.min(scaleX, scaleY);
    
    if (this.props.respectLimitsOnFit) {
      if (scaleFactorMin !== undefined) scale = Math.max(scale, scaleFactorMin);
      if (scaleFactorMax !== undefined) scale = Math.min(scale, scaleFactorMax);
    }
    
    let tx = -this.state.meta.SVGMinX * scale;
    let ty = -this.state.meta.SVGMinY * scale;
    
    if (alignX === 'center') {
      tx += (viewerWidth - SVGWidth * scale) / 2;
    } else if (alignX === 'right') {
      tx += viewerWidth - SVGWidth * scale;
    }
    
    if (alignY === 'center') {
      ty += (viewerHeight - SVGHeight * scale) / 2;
    } else if (alignY === 'bottom') {
      ty += viewerHeight - SVGHeight * scale;
    }
    
    const newMatrix = Matrix.compose(
      Matrix.translate(tx, ty),
      Matrix.scale(scale, scale)
    );
    
    this.update({ transform: this._applyTransform(newMatrix) });
    return this;
  }

  reset() {
    this.update({ transform: Matrix.identity() });
    return this;
  }

  setTool(tool) {
    this.update({
      interaction: {
        ...this.state.interaction,
        tool
      }
    });
    
    if (this.props.onChangeTool) {
      this.props.onChangeTool(tool);
    }
    return this;
  }

  setTransform(transform) {
    this.update({ transform: this._applyTransform(transform) });
    return this;
  }

  getTransform() {
    return Matrix.clone(this.state.transform);
  }

  getScale() {
    const scale = this._getCachedScale();
    return scale.sx;
  }

  getValue() {
    return this._getCombinedValue();
  }

  getTool() {
    return this.state.interaction.tool;
  }

  // ========== UTILITY METHODS ==========

  _getCombinedValue(state = this.state) {
    const decomposition = state.cache.decomposition || Matrix.decomposeTSR(state.transform);
    
    return {
      a: state.transform.a,
      b: state.transform.b,
      c: state.transform.c,
      d: state.transform.d,
      e: state.transform.e,
      f: state.transform.f,
      
      scale: decomposition.scale,
      translation: decomposition.translate,
      rotation: decomposition.rotation,
      
      viewerWidth: state.meta.viewerWidth,
      viewerHeight: state.meta.viewerHeight,
      SVGMinX: state.meta.SVGMinX,
      SVGMinY: state.meta.SVGMinY,
      SVGWidth: state.meta.SVGWidth,
      SVGHeight: state.meta.SVGHeight,
      scaleFactorMin: state.meta.scaleFactorMin,
      scaleFactorMax: state.meta.scaleFactorMax,
      
      mode: state.interaction.mode,
      tool: state.interaction.tool,
      lastAction: state.interaction.lastAction,
      
      version: state.meta.version
    };
  }

  _parseSVGDimensions() {
    const svg = this.el.querySelector('svg');
    if (!svg) {
      console.warn('No SVG element found');
      this._updateMeta({
        SVGMinX: 0,
        SVGMinY: 0,
        SVGWidth: this.props.width,
        SVGHeight: this.props.height
      });
      return;
    }

    const viewBox = svg.getAttribute('viewBox');
    if (viewBox) {
      const [x, y, width, height] = viewBox.trim().split(/[,\s]+/).map(Number);
      this._updateMeta({
        SVGMinX: x || 0,
        SVGMinY: y || 0,
        SVGWidth: width || this.props.width,
        SVGHeight: height || this.props.height
      });
    } else {
      const bbox = svg.getBBox();
      this._updateMeta({
        SVGMinX: bbox.x || 0,
        SVGMinY: bbox.y || 0,
        SVGWidth: bbox.width || this.props.width,
        SVGHeight: bbox.height || this.props.height
      });
    }
  }

  _updateMeta(metaPatch) {
    this.update({
      meta: {
        ...this.state.meta,
        ...metaPatch
      }
    });
  }

  _updateViewerSize() {
    this._updateMeta({
      viewerWidth: this.props.width,
      viewerHeight: this.props.height
    });
  }

  _cleanupDOM() {
    if (this._toolbar) this._toolbar.remove();
    if (this._miniature) this._miniature.remove();
    this.el.innerHTML = '';
  }

  _renderSelectionRect() {
    const { selection } = this.state.interaction;
    if (!selection) return '';
    
    return `
      <rect class="selection-rect"
            x="${selection.x}"
            y="${selection.y}"
            width="${selection.width}"
            height="${selection.height}"
            fill="rgba(0, 123, 255, 0.1)"
            stroke="#007bff"
            stroke-width="1"
            style="pointer-events: none;"/>
    `;
  }

  _updateSelection() {
    const selectionRect = this._viewer?.querySelector('.selection-rect');
    
    if (this.state.interaction.selection) {
      if (!selectionRect) {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('class', 'selection-rect');
        rect.setAttribute('fill', 'rgba(0, 123, 255, 0.1)');
        rect.setAttribute('stroke', '#007bff');
        rect.setAttribute('stroke-width', '1');
        rect.style.pointerEvents = 'none';
        this._viewer.appendChild(rect);
      }
      
      const { selection } = this.state.interaction;
      selectionRect.setAttribute('x', selection.x);
      selectionRect.setAttribute('y', selection.y);
      selectionRect.setAttribute('width', selection.width);
      selectionRect.setAttribute('height', selection.height);
    } else if (selectionRect) {
      selectionRect.remove();
    }
  }

  _createToolbar() {
    const toolbar = document.createElement('div');
    toolbar.className = 'svg-pan-zoom-toolbar';
    toolbar.style.cssText = `
      position: absolute;
      ${this.props.toolbar.position}: 10px;
      left: 10px;
      display: flex;
      gap: 5px;
      z-index: 1000;
      background: rgba(255, 255, 255, 0.8);
      padding: 5px;
      border-radius: 4px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    `;
    
    const tools = [
      { id: 'pan', icon: '↔', title: 'Pan' },
      { id: 'zoom-in', icon: '+', title: 'Zoom In' },
      { id: 'zoom-out', icon: '-', title: 'Zoom Out' },
      { id: 'auto', icon: 'A', title: 'Auto' },
      { id: 'reset', icon: '⟳', title: 'Reset' }
    ];
    
    tools.forEach(({ id, icon, title }) => {
      const button = document.createElement('button');
      button.textContent = icon;
      button.title = title;
      button.dataset.tool = id;
      button.style.cssText = `
        width: 30px;
        height: 30px;
        border: 1px solid #ccc;
        background: ${this.state.interaction.tool === id ? '#e0e0e0' : 'white'};
        cursor: pointer;
        border-radius: 3px;
        font-size: 14px;
      `;
      
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        if (id === 'reset') {
          this.reset();
        } else {
          this.setTool(id);
        }
      });
      
      toolbar.appendChild(button);
    });
    
    this.el.appendChild(toolbar);
    this._toolbar = toolbar;
  }

  _createMiniature() {
    const miniature = document.createElement('div');
    miniature.className = 'svg-pan-zoom-miniature';
    miniature.style.cssText = `
      position: absolute;
      ${this.props.miniature.position}: 10px;
      top: 10px;
      width: 150px;
      height: 150px;
      border: 1px solid #ccc;
      background: white;
      z-index: 1000;
      overflow: hidden;
      border-radius: 4px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    `;
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', `${this.state.meta.SVGMinX} ${this.state.meta.SVGMinY} ${this.state.meta.SVGWidth} ${this.state.meta.SVGHeight}`);
    
    const contentClone = this._transformGroup.cloneNode(true);
    svg.appendChild(contentClone);
    
    const viewport = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    viewport.setAttribute('fill', 'none');
    viewport.setAttribute('stroke', '#007bff');
    viewport.setAttribute('stroke-width', '2');
    viewport.style.pointerEvents = 'none';
    svg.appendChild(viewport);
    
    miniature.appendChild(svg);
    this.el.appendChild(miniature);
    this._miniature = miniature;
    this._miniatureViewport = viewport;
  }

  _updateMiniatureViewport() {
    if (!this._miniatureViewport || !this.state.transform) return;
    
    const { a, e, f } = this.state.transform;
    const { viewerWidth, viewerHeight, SVGWidth, SVGHeight } = this.state.meta;
    
    const scale = SVGWidth / this._miniature.clientWidth;
    const x = -e / a / scale;
    const y = -f / a / scale;
    const width = viewerWidth / a / scale;
    const height = viewerHeight / a / scale;
    
    this._miniatureViewport.setAttribute('x', x);
    this._miniatureViewport.setAttribute('y', y);
    this._miniatureViewport.setAttribute('width', width);
    this._miniatureViewport.setAttribute('height', height);
  }
  // MODIFICATION: Add static method for Mermaid integration
    static enhanceMermaidDiagram(container, options = {}) {
        const svg = container.querySelector('svg');
        if (!svg) return null;
        
        // Store original container state
        const originalParent = container.parentNode;
        const originalIndex = Array.from(originalParent.children).indexOf(container);
        
        // Create wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'svg-viewer-wrapper';
        
        // Insert wrapper
        originalParent.insertBefore(wrapper, container);
        
        // Move container to wrapper
        wrapper.appendChild(container);
        
        // Initialize viewer
        const viewer = new SVGPanZoom(wrapper, {
            width: '100%',
            height: '500px',
            background: 'transparent',
            SVGBackground: 'transparent',
            scaleFactor: 1.2,
            scaleFactorMin: 0.1,
            scaleFactorMax: 20,
            initialFit: true,
            toolbar: { position: 'top', open: true },
            miniature: { position: 'none' },
            ...options
        });
        
        return viewer;
    }
}

