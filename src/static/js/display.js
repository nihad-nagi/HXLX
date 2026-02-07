// ==================== PARAMETERS SECTION ====================
// All adjustable parameters in one place for easy tuning

// Grid Parameters
const GRID_PARAMS = {
  SIZE: 6, // Grid size (cubes per dimension): 6x6x6 = 216 cubes
  SPACING: 1.0, // Distance between cubes in grid
  CENTER_OFFSET: 2.5, // How much to offset to center the grid
};

// Cube Parameters
const CUBE_PARAMS = {
  BASE_SCALE: 0.5, // Base scale of each cube
  ANIMATION_SCALE: 1.0, // Additional scale factor during animation
};

// Animation Parameters
const ANIMATION_PARAMS = {
  SPEED: 0.0001, // Overall animation speed multiplier
  ROTATION_SPEED: 0.1, // Speed of cube rotation
  MOVEMENT_RANGE: 1.0, // Range of random movement in animation
  EASING_POWER: 16, // Power of easing function (higher = more dramatic)
  EASING_MULTIPLIER: 0.5, // Easing intensity multiplier
  EASING_OFFSET: 0.5, // Easing offset for sine wave
  ORBIT_SPEED: 0.1, // Camera orbit speed
  ORBIT_AMPLITUDE: 7.0, // Camera orbit radius
};

// Lighting Parameters
const LIGHT_PARAMS = {
  POSITION: [0, 0, 0], // Light position
  COLOR: [1, 0, 0.5], // Light color [R, G, B]
  INTENSITY: 2.0, // Light brightness
  AMBIENT_COLOR: [0.1, 0, 0.1], // Ambient light color
  SPECULAR_POWER: 3.0, // Shininess factor
  SPECULAR_COLOR: [1, 0.25, 0.1], // Specular highlight color
};

// Camera Parameters
const CAMERA_PARAMS = {
  FOV: Math.PI / 4, // Field of view in radians (45 degrees)
  NEAR_PLANE: 0.01, // Near clipping plane
  FAR_PLANE: 1000, // Far clipping plane
  ORBIT_MULTIPLIER: 0.1, // Camera orbit animation multiplier
  ORBIT_POWER: 16, // Camera orbit easing power
};

// Color Parameters
const COLOR_PARAMS = {
  GREEN_FIXED: 1.0, // Fixed green component value
  RED_MODULATOR: 2, // Divisor for red component modulation
  BLUE_MODULATOR: 2, // Divisor for blue component modulation
};

// Transparency & Edge Parameters
const TRANSPARENCY_PARAMS = {
  EDGE_THRESHOLD: 0.3, // Threshold for edge transparency
  CENTER_DIST_MULTIPLIER: 2, // Multiplier for UV center distance
  CENTER_DIST_OFFSET: 0.5, // Offset for center distance effect
  ALPHA_MULTIPLIER: 1.0, // Overall alpha multiplier
};

// Camera Motion Parameters (MISSING – now explicit)
const CAMERA_MOTION_PARAMS = {
  DISTANCE: 10.0, // Base camera distance from center
  ELEVATION: 0.0, // Vertical camera offset
  LOOK_AT_OFFSET: [0, 0, 0], // Look-at point offset
  DRIFT_STRENGTH: 0.0, // Subtle forward/back drift (0 = off)
};

// Animation Time Parameters (MISSING – decouples motion types)
const TIME_PARAMS = {
  GLOBAL_TIME_SCALE: 1.0, // Master time scaler
  POSITION_TIME_SCALE: 1.0, // Position interpolation timing
  ROTATION_TIME_SCALE: 1.0, // Rotation timing
  CAMERA_TIME_SCALE: 1.0, // Camera motion timing
};

// ==================== END PARAMETERS SECTION ====================
const regl = createREGL({
  container: document.querySelector("#display"),
  extensions: ["ANGLE_instanced_arrays"],
});
const { mat4 } = glMatrix;

// Cube geometry (unchanged)
// Cube geometry with proper vertices for each face
// Each face is made of 2 triangles (6 vertices)
const cubeVertices = [
  // Front face (z = -0.5)
  [-0.5, -0.5, -0.5], // Bottom-left front
  [0.5, -0.5, -0.5], // Bottom-right front
  [0.5, 0.5, -0.5], // Top-right front
  [-0.5, -0.5, -0.5], // Bottom-left front (duplicate for second triangle)
  [0.5, 0.5, -0.5], // Top-right front (duplicate for second triangle)
  [-0.5, 0.5, -0.5], // Top-left front

  // Back face (z = 0.5)
  [0.5, -0.5, 0.5], // Bottom-right back
  [-0.5, -0.5, 0.5], // Bottom-left back
  [-0.5, 0.5, 0.5], // Top-left back
  [0.5, -0.5, 0.5], // Bottom-right back (duplicate for second triangle)
  [-0.5, 0.5, 0.5], // Top-left back (duplicate for second triangle)
  [0.5, 0.5, 0.5], // Top-right back

  // Bottom face (y = -0.5)
  [-0.5, -0.5, -0.5], // Front-left bottom
  [-0.5, -0.5, 0.5], // Back-left bottom
  [0.5, -0.5, 0.5], // Back-right bottom
  [-0.5, -0.5, -0.5], // Front-left bottom (duplicate for second triangle)
  [0.5, -0.5, 0.5], // Back-right bottom (duplicate for second triangle)
  [0.5, -0.5, -0.5], // Front-right bottom

  // Top face (y = 0.5)
  [-0.5, 0.5, 0.5], // Back-left top
  [-0.5, 0.5, -0.5], // Front-left top
  [0.5, 0.5, -0.5], // Front-right top
  [-0.5, 0.5, 0.5], // Back-left top (duplicate for second triangle)
  [0.5, 0.5, -0.5], // Front-right top (duplicate for second triangle)
  [0.5, 0.5, 0.5], // Back-right top

  // Left face (x = -0.5)
  [-0.5, -0.5, 0.5], // Bottom-back left
  [-0.5, -0.5, -0.5], // Bottom-front left
  [-0.5, 0.5, -0.5], // Top-front left
  [-0.5, -0.5, 0.5], // Bottom-back left (duplicate for second triangle)
  [-0.5, 0.5, -0.5], // Top-front left (duplicate for second triangle)
  [-0.5, 0.5, 0.5], // Top-back left

  // Right face (x = 0.5)
  [0.5, -0.5, -0.5], // Bottom-front right
  [0.5, -0.5, 0.5], // Bottom-back right
  [0.5, 0.5, 0.5], // Top-back right
  [0.5, -0.5, -0.5], // Bottom-front right (duplicate for second triangle)
  [0.5, 0.5, 0.5], // Top-back right (duplicate for second triangle)
  [0.5, 0.5, -0.5], // Top-front right
];

// Correct normals for each face (one per vertex)
const cubeNormals = [
  // Front face normals (pointing negative Z)
  [0, 0, -1],
  [0, 0, -1],
  [0, 0, -1],
  [0, 0, -1],
  [0, 0, -1],
  [0, 0, -1],

  // Back face normals (pointing positive Z)
  [0, 0, 1],
  [0, 0, 1],
  [0, 0, 1],
  [0, 0, 1],
  [0, 0, 1],
  [0, 0, 1],

  // Bottom face normals (pointing negative Y)
  [0, -1, 0],
  [0, -1, 0],
  [0, -1, 0],
  [0, -1, 0],
  [0, -1, 0],
  [0, -1, 0],

  // Top face normals (pointing positive Y)
  [0, 1, 0],
  [0, 1, 0],
  [0, 1, 0],
  [0, 1, 0],
  [0, 1, 0],
  [0, 1, 0],

  // Left face normals (pointing negative X)
  [-1, 0, 0],
  [-1, 0, 0],
  [-1, 0, 0],
  [-1, 0, 0],
  [-1, 0, 0],
  [-1, 0, 0],

  // Right face normals (pointing positive X)
  [1, 0, 0],
  [1, 0, 0],
  [1, 0, 0],
  [1, 0, 0],
  [1, 0, 0],
  [1, 0, 0],
];

// UV coordinates for texture mapping (one per vertex)
const cubeUvs = [
  // Front face UVs
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 0],
  [1, 1],
  [0, 1],

  // Back face UVs
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 0],
  [1, 1],
  [0, 1],

  // Bottom face UVs
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 0],
  [1, 1],
  [0, 1],

  // Top face UVs
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 0],
  [1, 1],
  [0, 1],

  // Left face UVs
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 0],
  [1, 1],
  [0, 1],

  // Right face UVs
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 0],
  [1, 1],
  [0, 1],
];

const cube = {
  position: regl.buffer(cubeVertices),
  normals: regl.buffer(cubeNormals),
  uvs: regl.buffer(cubeUvs),
  count: cubeVertices.length,
};

// Use parameters
const SIZE = GRID_PARAMS.SIZE;
const count = Math.pow(SIZE, 3);

const getPos = (i) => {
  const size = SIZE;
  const x = i % size;
  const y = Math.floor(i / size) % size;
  const z = Math.floor(i / (size * size));
  return [
    (x - GRID_PARAMS.CENTER_OFFSET) * GRID_PARAMS.SPACING,
    (y - GRID_PARAMS.CENTER_OFFSET) * GRID_PARAMS.SPACING,
    (z - GRID_PARAMS.CENTER_OFFSET) * GRID_PARAMS.SPACING,
  ];
};

const getRandomPos = (i) => {
  const pos = getPos(i);
  const x = pos[0] * Math.random() * ANIMATION_PARAMS.MOVEMENT_RANGE;
  const y = pos[1] * Math.random() * ANIMATION_PARAMS.MOVEMENT_RANGE;
  const z = pos[2] * Math.random() * ANIMATION_PARAMS.MOVEMENT_RANGE;
  return [x, y, z];
};

const getColor = (pos) => {
  const [x, y, z] = pos;
  return [
    (z / COLOR_PARAMS.RED_MODULATOR) % 2,
    COLOR_PARAMS.GREEN_FIXED,
    (y / COLOR_PARAMS.BLUE_MODULATOR) % 2,
  ];
};

const instances = Array(count)
  .fill()
  .map((_, i) => {
    const cubicPos = getPos(i);
    const randomPos = getRandomPos(i);

    return {
      position: cubicPos,
      randomPos: randomPos,
      rotation: [0, 0, 0],
      color: getColor(cubicPos),
      scale: CUBE_PARAMS.BASE_SCALE,
    };
  });

const instanceBuffers = {
  position: regl.buffer(instances.map((i) => i.position)),
  position2: regl.buffer(instances.map((i) => i.randomPos)),
  rotation: regl.buffer(instances.map((i) => i.rotation)),
  color: regl.buffer(instances.map((i) => i.color)),
  scale: regl.buffer(instances.map((i) => [i.scale])),
};

const drawCubes = regl({
  vert: `
  precision mediump float;
  attribute vec3 position;
  attribute vec3 normal;
  attribute vec2 uv;
  attribute vec3 instancePosition;
  attribute vec3 instancePosition2;
  attribute vec3 instanceRotation;
  attribute vec3 instanceColor;
  attribute float instanceScale;

  uniform mat4 projection, view;
  uniform float time;
  uniform float animationScale;

  varying vec3 vNormal, vPosition, vColor;
  varying vec2 vUv;

  mat4 rotationX(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat4(
      1, 0, 0, 0,
      0, c, -s, 0,
      0, s, c, 0,
      0, 0, 0, 1
    );
  }

  mat4 rotationY(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat4(
      c, 0, s, 0,
      0, 1, 0, 0,
      -s, 0, c, 0,
      0, 0, 0, 1
    );
  }

  mat4 rotationZ(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat4(
      c, -s, 0, 0,
      s, c, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    );
  }

  void main() {
    vColor = instanceColor;
    vUv = uv;

    mat4 model = mat4(1.0);

    // Animation with parameters
    float anim = pow(sin(time) * ${ANIMATION_PARAMS.EASING_MULTIPLIER} + ${ANIMATION_PARAMS.EASING_OFFSET}, ${ANIMATION_PARAMS.EASING_POWER}.);
    model[3].xyz = mix(instancePosition, instancePosition2, anim);

    model = model * rotationX(instanceRotation.x);
    model = model * rotationY(instanceRotation.y);
    model = model * rotationZ(instanceRotation.z);

    // Apply scale with animation multiplier
    float totalScale = instanceScale * animationScale;
    model[0] *= totalScale;
    model[1] *= totalScale;
    model[2] *= totalScale;

    mat3 normalMatrix = mat3(
      model[0].xyz / (totalScale * totalScale),
      model[1].xyz / (totalScale * totalScale),
      model[2].xyz / (totalScale * totalScale)
    );
    vNormal = normalMatrix * normal;
    vPosition = (model * vec4(position, 1.0)).xyz;
    gl_Position = projection * view * model * vec4(position, 1);
  }
  `,

  frag: `
  precision mediump float;
  varying vec3 vNormal, vPosition, vColor;
  varying vec2 vUv;

  uniform vec3 lightPosition;
  uniform vec3 lightColor;
  uniform float lightIntensity;
  uniform vec3 ambientColor;
  uniform float specularPower;
  uniform vec3 specularColor;
  uniform mat4 view;
  uniform float alphaMultiplier;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(lightPosition - vPosition);
    vec3 viewPosition = view[0].xyz;

    float diff = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = lightColor * diff * lightIntensity;

    vec2 cuv = abs(vUv - vec2(0.5));
    float centerDist = length(cuv) * ${TRANSPARENCY_PARAMS.CENTER_DIST_MULTIPLIER}.;

    vec3 viewDir = normalize(viewPosition - vPosition);
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), specularPower);
    vec3 specular = specularColor * spec * lightIntensity;

    vec3 lighting = ambientColor + diffuse + specular;
    vec3 result = vColor * lighting * (1. - centerDist + ${TRANSPARENCY_PARAMS.CENTER_DIST_OFFSET});

    float alpha = smoothstep(${TRANSPARENCY_PARAMS.EDGE_THRESHOLD}, ${TRANSPARENCY_PARAMS.EDGE_THRESHOLD}, max(cuv.x, cuv.y)) * alphaMultiplier;

    gl_FragColor = vec4(result, alpha);
  }
  `,

  attributes: {
    position: cube.position,
    normal: cube.normals,
    uv: cube.uvs,
    instancePosition: { buffer: instanceBuffers.position, divisor: 1 },
    instancePosition2: { buffer: instanceBuffers.position2, divisor: 1 },
    instanceRotation: { buffer: instanceBuffers.rotation, divisor: 1 },
    instanceColor: { buffer: instanceBuffers.color, divisor: 1 },
    instanceScale: { buffer: instanceBuffers.scale, divisor: 1 },
  },

  count: cube.count,
  instances: instances.length,

  uniforms: {
    lightPosition: LIGHT_PARAMS.POSITION,
    lightColor: LIGHT_PARAMS.COLOR,
    lightIntensity: LIGHT_PARAMS.INTENSITY,
    ambientColor: LIGHT_PARAMS.AMBIENT_COLOR,
    specularPower: LIGHT_PARAMS.SPECULAR_POWER,
    specularColor: LIGHT_PARAMS.SPECULAR_COLOR,
    animationScale: CUBE_PARAMS.ANIMATION_SCALE,
    alphaMultiplier: TRANSPARENCY_PARAMS.ALPHA_MULTIPLIER,

    // time: () => performance.now() * ANIMATION_PARAMS.SPEED,
    time: () =>
      performance.now() *
      ANIMATION_PARAMS.SPEED *
      TIME_PARAMS.GLOBAL_TIME_SCALE,

    // view: ({ tick }) => {
    //   const t = performance.now() * ANIMATION_PARAMS.SPEED;
    //   const a =
    //     Math.pow(Math.sin(t) + 0.5 * 0.5, CAMERA_PARAMS.ORBIT_POWER) *
    //       CAMERA_PARAMS.ORBIT_MULTIPLIER +
    //     t * ANIMATION_PARAMS.ORBIT_SPEED;

    //   return mat4.lookAt(
    //     mat4.create(),
    //     [
    //       ANIMATION_PARAMS.ORBIT_AMPLITUDE * Math.cos(a),
    //       ANIMATION_PARAMS.ORBIT_AMPLITUDE * Math.cos(a),
    //       ANIMATION_PARAMS.ORBIT_AMPLITUDE * Math.sin(a),
    //     ],
    //     [0, 0, 0],
    //     [0, 1, 0],
    //   );
    // },
    view: () => {
      const rawTime =
        performance.now() *
        ANIMATION_PARAMS.SPEED *
        TIME_PARAMS.CAMERA_TIME_SCALE;

      const orbitPhase =
        Math.pow(
          Math.sin(rawTime) + ANIMATION_PARAMS.EASING_OFFSET,
          CAMERA_PARAMS.ORBIT_POWER,
        ) *
          CAMERA_PARAMS.ORBIT_MULTIPLIER +
        rawTime * ANIMATION_PARAMS.ORBIT_SPEED;

      const drift = Math.sin(rawTime) * CAMERA_MOTION_PARAMS.DRIFT_STRENGTH;

      const distance = CAMERA_MOTION_PARAMS.DISTANCE + drift;

      return mat4.lookAt(
        mat4.create(),
        [
          distance * Math.cos(orbitPhase),
          CAMERA_MOTION_PARAMS.ELEVATION,
          distance * Math.sin(orbitPhase),
        ],
        CAMERA_MOTION_PARAMS.LOOK_AT_OFFSET,
        [0, 1, 0],
      );
    },

    projection: ({ viewportWidth, viewportHeight }) =>
      mat4.perspective(
        mat4.create(),
        CAMERA_PARAMS.FOV,
        viewportWidth / viewportHeight,
        CAMERA_PARAMS.NEAR_PLANE,
        CAMERA_PARAMS.FAR_PLANE,
      ),
  },

  blend: {
    enable: true,
    func: {
      srcRGB: "src alpha",
      srcAlpha: "src alpha",
      dstRGB: "one minus src alpha",
      dstAlpha: "one minus src alpha",
    },
  },
});

regl.frame(({ tick }) => {
  // const t = performance.now() * 0.001 * ANIMATION_PARAMS.ROTATION_SPEED;
  const t =
    performance.now() *
    0.001 *
    ANIMATION_PARAMS.ROTATION_SPEED *
    TIME_PARAMS.ROTATION_TIME_SCALE;

  instances.forEach((inst, i) => {
    inst.rotation[1] = t + i * 0.01; // Optional: add slight per-cube offset
  });

  instanceBuffers.rotation.subdata(instances.map((i) => i.rotation));

  regl.clear({
    depth: 1,
    color: [0, 0, 0, 1],
  });

  drawCubes();
});
