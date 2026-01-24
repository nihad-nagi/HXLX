// Matrix.js - Complete 2D Transformation Matrix Library
// Consistent with SVG/CSS matrix notation and transformation order
class Matrix {
  // Constants
  static PI = Math.PI;
  static DEG_TO_RAD = Math.PI / 180;
  static RAD_TO_DEG = 180 / Math.PI;
  static EPSILON = 1e-10;
  static IDENTITY = Object.freeze({ a: 1, c: 0, e: 0, b: 0, d: 1, f: 0 });

  // ========== FACTORY METHODS ==========

  static identity() {
    return { a: 1, c: 0, e: 0, b: 0, d: 1, f: 0 };
  }

  static translate(tx, ty = 0) {
    return { a: 1, c: 0, e: tx, b: 0, d: 1, f: ty };
  }

  static scale(sx, sy = sx, cx, cy) {
    const scaleMatrix = { a: sx, c: 0, e: 0, b: 0, d: sy, f: 0 };
    
    if (cx !== undefined && cy !== undefined) {
      return Matrix.compose([
        Matrix.translate(cx, cy),
        scaleMatrix,
        Matrix.translate(-cx, -cy)
      ]);
    }
    return scaleMatrix;
  }

  static rotate(angle, cx, cy) {
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const rotationMatrix = {
      a: cosA, c: -sinA, e: 0,
      b: sinA, d: cosA, f: 0
    };
    
    if (cx !== undefined && cy !== undefined) {
      return Matrix.compose([
        Matrix.translate(cx, cy),
        rotationMatrix,
        Matrix.translate(-cx, -cy)
      ]);
    }
    return rotationMatrix;
  }

  static rotateDEG(angle, cx, cy) {
    return Matrix.rotate(angle * Matrix.DEG_TO_RAD, cx, cy);
  }

  static shear(shx, shy) {
    return { a: 1, c: shx, e: 0, b: shy, d: 1, f: 0 };
  }

  static skew(ax, ay) {
    return {
      a: 1,
      c: Math.tan(ax),
      e: 0,
      b: Math.tan(ay),
      d: 1,
      f: 0
    };
  }

  static skewDEG(ax, ay) {
    return Matrix.skew(ax * Matrix.DEG_TO_RAD, ay * Matrix.DEG_TO_RAD);
  }

  static flipX(cx = 0, cy = 0) {
    return Matrix.scale(-1, 1, cx, cy);
  }

  static flipY(cx = 0, cy = 0) {
    return Matrix.scale(1, -1, cx, cy);
  }

  static flipOrigin(cx = 0, cy = 0) {
    return Matrix.scale(-1, -1, cx, cy);
  }

  // ========== MATRIX ALGEBRA ==========

  static determinant(matrix) {
    return matrix.a * matrix.d - matrix.b * matrix.c;
  }

  static inverse(matrix) {
    const { a, b, c, d, e, f } = matrix;
    const det = a * d - b * c;
    
    if (Math.abs(det) < Matrix.EPSILON) {
      throw new Error('Matrix is not invertible (determinant = 0)');
    }
    
    return {
      a: d / det,
      b: -b / det,
      c: -c / det,
      d: a / det,
      e: (c * f - d * e) / det,
      f: (b * e - a * f) / det
    };
  }

  static applyInverseToPoint(matrix, point) {
    const { a, b, c, d, e, f } = matrix;
    const det = a * d - b * c;
    
    if (Math.abs(det) < Matrix.EPSILON) {
      throw new Error('Matrix is not invertible (determinant = 0)');
    }
    
    if (Array.isArray(point)) {
      const x = point[0], y = point[1];
      return [
        (d * x - c * y - (d * e - c * f)) / det,
        (-b * x + a * y - (-b * e + a * f)) / det
      ];
    }
    
    const x = point.x, y = point.y;
    return {
      x: (d * x - c * y - (d * e - c * f)) / det,
      y: (-b * x + a * y - (-b * e + a * f)) / det
    };
  }

  static compose(...matrices) {
    matrices = Array.isArray(matrices[0]) ? matrices[0] : matrices;
    
    if (matrices.length === 0) {
      return Matrix.identity();
    }
    
    if (matrices.length === 1) {
      return Matrix.clone(matrices[0]);
    }
    
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

  static transform(...matrices) {
    return Matrix.compose(...matrices);
  }

  // ========== POINT & GEOMETRY TRANSFORMATIONS ==========

  static applyToPoint(matrix, point) {
    if (Array.isArray(point)) {
      return [
        matrix.a * point[0] + matrix.c * point[1] + matrix.e,
        matrix.b * point[0] + matrix.d * point[1] + matrix.f
      ];
    }
    
    return {
      x: matrix.a * point.x + matrix.c * point.y + matrix.e,
      y: matrix.b * point.x + matrix.d * point.y + matrix.f
    };
  }

  static applyToPoints(matrix, points) {
    return points.map(point => Matrix.applyToPoint(matrix, point));
  }

  static applyToBox(matrix, box) {
    const points = [
      { x: box.x, y: box.y },
      { x: box.x + box.width, y: box.y },
      { x: box.x + box.width, y: box.y + box.height },
      { x: box.x, y: box.y + box.height }
    ];

    const transformed = Matrix.applyToPoints(matrix, points);
    const xs = transformed.map(p => p.x);
    const ys = transformed.map(p => p.y);

    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys)
    };
  }

  static applyToDistance(matrix, dx, dy) {
    return {
      dx: matrix.a * dx + matrix.c * dy,
      dy: matrix.b * dx + matrix.d * dy
    };
  }

  // ========== MATRIX ANALYSIS ==========

  static decomposeTSR(matrix, flipX = false, flipY = false) {
    let m = Matrix.clone(matrix);
    
    if (flipX) m = Matrix.compose(m, Matrix.scale(1, -1));
    if (flipY) m = Matrix.compose(m, Matrix.scale(-1, 1));
    
    const { a, b, c, d } = m;
    let scaleX, scaleY, rotation;
    
    if (a !== 0 || c !== 0) {
      const hypotAc = Math.hypot(a, c);
      scaleX = hypotAc;
      scaleY = (a * d - b * c) / hypotAc;
      rotation = Math.atan2(b, a);
    } else if (b !== 0 || d !== 0) {
      const hypotBd = Math.hypot(b, d);
      scaleX = (a * d - b * c) / hypotBd;
      scaleY = hypotBd;
      rotation = Math.atan2(d, b) - Math.PI / 2;
    } else {
      scaleX = 0;
      scaleY = 0;
      rotation = 0;
    }
    
    if (flipY) scaleX = -scaleX;
    if (flipX) scaleY = -scaleY;
    
    return {
      translate: { tx: m.e, ty: m.f },
      scale: { sx: scaleX, sy: scaleY },
      rotation: { angle: rotation }
    };
  }

  static getTranslation(matrix) {
    return { tx: matrix.e, ty: matrix.f };
  }

  static getTranslationFast = Matrix.getTranslation;

  static getScale(matrix) {
    const decomposition = Matrix.decomposeTSR(matrix);
    return decomposition.scale;
  }

  static getUniformScaleFast(matrix) {
    return Math.hypot(matrix.a, matrix.b);
  }

  static getRotation(matrix) {
    const decomposition = Matrix.decomposeTSR(matrix);
    return decomposition.rotation.angle;
  }

  static getRotationDEG(matrix) {
    return Matrix.getRotation(matrix) * Matrix.RAD_TO_DEG;
  }

  static isIdentity(matrix, eps = Matrix.EPSILON) {
    return Matrix.equals(matrix, Matrix.IDENTITY, eps);
  }

  static isTranslationOnly(matrix, eps = Matrix.EPSILON) {
    return Math.abs(matrix.a - 1) < eps &&
           Math.abs(matrix.b) < eps &&
           Math.abs(matrix.c) < eps &&
           Math.abs(matrix.d - 1) < eps;
  }

  static isUniformScale(matrix, eps = Matrix.EPSILON) {
    const scale = Matrix.getScale(matrix);
    return Math.abs(scale.sx - scale.sy) < eps;
  }

  static preservesOrientation(matrix) {
    return Matrix.determinant(matrix) > 0;
  }

  // ========== UTILITY METHODS ==========

  static clone(matrix) {
    return {
      a: matrix.a,
      b: matrix.b,
      c: matrix.c,
      d: matrix.d,
      e: matrix.e,
      f: matrix.f
    };
  }

  static equals(m1, m2, eps = Matrix.EPSILON) {
    return (
      Math.abs(m1.a - m2.a) < eps &&
      Math.abs(m1.b - m2.b) < eps &&
      Math.abs(m1.c - m2.c) < eps &&
      Math.abs(m1.d - m2.d) < eps &&
      Math.abs(m1.e - m2.e) < eps &&
      Math.abs(m1.f - m2.f) < eps
    );
  }

  static isAffineMatrix(obj) {
    return obj &&
      typeof obj === 'object' &&
      typeof obj.a === 'number' && !isNaN(obj.a) &&
      typeof obj.b === 'number' && !isNaN(obj.b) &&
      typeof obj.c === 'number' && !isNaN(obj.c) &&
      typeof obj.d === 'number' && !isNaN(obj.d) &&
      typeof obj.e === 'number' && !isNaN(obj.e) &&
      typeof obj.f === 'number' && !isNaN(obj.f);
  }

  static smoothMatrix(matrix, precision = 1e10) {
    const round = (x) => Math.round(x * precision) / precision;
    return {
      a: round(matrix.a),
      b: round(matrix.b),
      c: round(matrix.c),
      d: round(matrix.d),
      e: matrix.e,
      f: matrix.f
    };
  }

  static interpolate(m1, m2, t) {
    return {
      a: m1.a + (m2.a - m1.a) * t,
      b: m1.b + (m2.b - m1.b) * t,
      c: m1.c + (m2.c - m1.c) * t,
      d: m1.d + (m2.d - m1.d) * t,
      e: m1.e + (m2.e - m1.e) * t,
      f: m1.f + (m2.f - m1.f) * t
    };
  }

  static getLinearPart(matrix) {
    return {
      a: matrix.a, c: matrix.c, e: 0,
      b: matrix.b, d: matrix.d, f: 0
    };
  }

  // ========== SERIALIZATION & PARSING ==========

  static toString(matrix) {
    return `matrix(${matrix.a},${matrix.b},${matrix.c},${matrix.d},${matrix.e},${matrix.f})`;
  }

  static toCSS = Matrix.toString;
  static toSVG = Matrix.toString;

  static fromObject(obj) {
    return {
      a: parseFloat(obj.a) || 0,
      b: parseFloat(obj.b) || 0,
      c: parseFloat(obj.c) || 0,
      d: parseFloat(obj.d) || 0,
      e: parseFloat(obj.e) || 0,
      f: parseFloat(obj.f) || 0
    };
  }

  static fromString(str) {
    const match = str.match(/matrix\(\s*([^\s,]+)[,\s]+([^\s,]+)[,\s]+([^\s,]+)[,\s]+([^\s,]+)[,\s]+([^\s,]+)[,\s]+([^\s,)]+)\s*\)/);
    
    if (!match) {
      const fallbackMatch = str.match(/matrix\(([^,]+),([^,]+),([^,]+),([^,]+),([^,]+),([^)]+)\)/);
      if (!fallbackMatch) {
        throw new Error('Invalid matrix string format');
      }
      return {
        a: parseFloat(fallbackMatch[1]),
        b: parseFloat(fallbackMatch[2]),
        c: parseFloat(fallbackMatch[3]),
        d: parseFloat(fallbackMatch[4]),
        e: parseFloat(fallbackMatch[5]),
        f: parseFloat(fallbackMatch[6])
      };
    }
    
    return {
      a: parseFloat(match[1]),
      b: parseFloat(match[2]),
      c: parseFloat(match[3]),
      d: parseFloat(match[4]),
      e: parseFloat(match[5]),
      f: parseFloat(match[6])
    };
  }

  static parseTransform(transformString = '') {
    const transforms = [];
    const regex = /(\w+)\(([^)]+)\)/g;
    let match;
    
    transformString = transformString.trim();
    if (!transformString) return transforms;
    
    while ((match = regex.exec(transformString)) !== null) {
      const [, type, value] = match;
      const nums = value.split(/[,\s]+/).map(Number).filter(n => !isNaN(n));
      
      switch (type.toLowerCase()) {
        case 'matrix':
          if (nums.length === 6) {
            transforms.push({
              type: 'matrix',
              a: nums[0], b: nums[1], c: nums[2],
              d: nums[3], e: nums[4], f: nums[5]
            });
          }
          break;
          
        case 'translate':
          if (nums.length >= 1) {
            transforms.push({
              type: 'translate',
              tx: nums[0],
              ty: nums[1] || 0
            });
          }
          break;
          
        case 'scale':
          if (nums.length >= 1) {
            transforms.push({
              type: 'scale',
              sx: nums[0],
              sy: nums[1] || nums[0]
            });
          }
          break;
          
        case 'rotate':
          if (nums.length >= 1) {
            const transform = { type: 'rotate', angle: nums[0] };
            if (nums.length >= 3) {
              transform.cx = nums[1];
              transform.cy = nums[2];
            }
            transforms.push(transform);
          }
          break;
          
        case 'skewx':
          if (nums.length >= 1) {
            transforms.push({ type: 'skewX', angle: nums[0] });
          }
          break;
          
        case 'skewy':
          if (nums.length >= 1) {
            transforms.push({ type: 'skewY', angle: nums[0] });
          }
          break;
          
        case 'shear':
          if (nums.length >= 2) {
            transforms.push({ type: 'shear', shx: nums[0], shy: nums[1] });
          }
          break;
      }
    }
    
    return transforms;
  }

  static fromDefinition(definitions) {
    const defs = Array.isArray(definitions) ? definitions : [definitions];
    const matrices = defs.map(def => {
      switch (def.type) {
        case 'matrix':
          return Matrix.fromObject(def);
        case 'translate':
          return Matrix.translate(def.tx, def.ty);
        case 'scale':
          return Matrix.scale(def.sx, def.sy);
        case 'rotate':
          return def.cx !== undefined && def.cy !== undefined
            ? Matrix.rotateDEG(def.angle, def.cx, def.cy)
            : Matrix.rotateDEG(def.angle);
        case 'skewX':
          return Matrix.skewDEG(def.angle, 0);
        case 'skewY':
          return Matrix.skewDEG(0, def.angle);
        case 'shear':
          return Matrix.shear(def.shx, def.shy);
        default:
          throw new Error(`Unsupported transform type: ${def.type}`);
      }
    });
    
    return Matrix.compose(matrices);
  }

  static fromTransformAttribute(transformString) {
    const definitions = Matrix.parseTransform(transformString);
    return Matrix.fromDefinition(definitions);
  }

  static fromMovingPoints(start1, end1, start2, end2) {
    const translation = Matrix.translate(end1.x - start1.x, end1.y - start1.y);
    const pointA = Matrix.applyToPoint(translation, start2);
    const center = end1;
    const pointB = end2;
    
    const angle = Math.atan2(pointB.y - center.y, pointB.x - center.x) - 
                  Math.atan2(pointA.y - center.y, pointA.x - center.x);
    
    const d1 = Math.hypot(pointA.x - center.x, pointA.y - center.y);
    const d2 = Math.hypot(pointB.x - center.x, pointB.y - center.y);
    
    if (d1 < Matrix.EPSILON) {
      return translation;
    }
    
    const scaleFactor = d2 / d1;
    
    return Matrix.compose([
      translation,
      Matrix.scale(scaleFactor, scaleFactor, center.x, center.y),
      Matrix.rotate(angle, center.x, center.y)
    ]);
  }

  static fromTwoPointCorrespondence = Matrix.fromMovingPoints;

  static fromTriangles(t1, t2) {
    const [p1, q1, r1] = t1;
    const [p2, q2, r2] = t2;
    
    const r1Matrix = {
      a: p1.x - r1.x, b: p1.y - r1.y,
      c: q1.x - r1.x, d: q1.y - r1.y,
      e: r1.x, f: r1.y
    };
    
    const r2Matrix = {
      a: p2.x - r2.x, b: p2.y - r2.y,
      c: q2.x - r2.x, d: q2.y - r2.y,
      e: r2.x, f: r2.y
    };
    
    try {
      const inverseR1 = Matrix.inverse(r1Matrix);
      return Matrix.smoothMatrix(Matrix.compose(r2Matrix, inverseR1));
    } catch (error) {
      throw new Error('Triangles are degenerate or not invertible');
    }
  }

  static centerAt(matrix, bbox, point) {
    const transformedBox = Matrix.applyToBox(matrix, bbox);
    const currentCenter = {
      x: transformedBox.x + transformedBox.width / 2,
      y: transformedBox.y + transformedBox.height / 2
    };
    
    return Matrix.translate(
      point.x - currentCenter.x,
      point.y - currentCenter.y
    );
  }

  static fitRect(source, target, alignX = 'center', alignY = 'center', fit = 'contain') {
    let scaleX = target.width / source.width;
    let scaleY = target.height / source.height;
    let scale;
    
    switch (fit) {
      case 'cover':
        scale = Math.max(scaleX, scaleY);
        break;
      case 'fill':
        scale = 1;
        break;
      case 'contain':
      default:
        scale = Math.min(scaleX, scaleY);
        break;
    }
    
    const scaledWidth = source.width * scale;
    const scaledHeight = source.height * scale;
    
    let tx = target.x - source.x * scale;
    let ty = target.y - source.y * scale;
    
    switch (alignX) {
      case 'left':
        break;
      case 'right':
        tx += target.width - scaledWidth;
        break;
      case 'center':
      default:
        tx += (target.width - scaledWidth) / 2;
        break;
    }
    
    switch (alignY) {
      case 'top':
        break;
      case 'bottom':
        ty += target.height - scaledHeight;
        break;
      case 'center':
      default:
        ty += (target.height - scaledHeight) / 2;
        break;
    }
    
    return Matrix.compose(
      Matrix.translate(tx, ty),
      Matrix.scale(scale, scale)
    );
  }
}

