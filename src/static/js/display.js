const regl = createREGL({
  container: document.querySelector("#display"), // Get the HTML container element for WebGL rendering
  extensions: ["ANGLE_instanced_arrays"], // Enable WebGL extension for instanced rendering
});
const { mat4 } = glMatrix; // Extract mat4 (4x4 matrix) utility from glMatrix library

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

// Create cube object with WebGL buffers
const cube = {
  position: regl.buffer(cubeVertices), // Buffer for vertex positions
  normals: regl.buffer(cubeNormals), // Buffer for vertex normals
  uvs: regl.buffer(cubeUvs), // Buffer for texture coordinates
  count: cubeVertices.length, // Number of vertices (36)
};

const SIZE = 6; // Grid size: 6x6x6 = 216 cubes
const count = Math.pow(SIZE, 3); // Total number of cubes: 216

/**
 * Calculate grid position for a cube based on its index
 * @param {number} i - Cube index (0 to 215)
 * @returns {Array<number>} - [x, y, z] position in a 6x6x6 grid centered at origin
 */
const getPos = (i) => {
  const size = SIZE;
  const x = i % size; // Column in X direction (0-5)
  const y = Math.floor(i / size) % size; // Row in Y direction (0-5)
  const z = Math.floor(i / (size * size)); // Layer in Z direction (0-5)
  return [x - 2.5, y - 2.5, z - 2.5]; // Center grid around origin
};

/**
 * Calculate random position for animation
 * @param {number} i - Cube index
 * @returns {Array<number>} - Random [x, y, z] position
 */
const getRandomPos = (i) => {
  const size = 5;
  const pos = getPos(i);
  const x = pos[0] * Math.random() * size; // Random X offset
  const y = pos[1] * Math.random() * size; // Random Y offset
  const z = pos[2] * Math.random() * size; // Random Z offset
  return [x, y, z];
};

/**
 * Generate color based on position
 * @param {Array<number>} pos - [x, y, z] position
 * @returns {Array<number>} - RGB color array
 */
const getColor = (pos) => {
  const [x, y, z] = pos;
  return [(z / 2) % 2, 1, (y / 2) % 2]; // Red based on Z, Green=1, Blue based on Y
};

// Create instances data for all cubes
const instances = Array(count)
  .fill()
  .map((_, i) => {
    const cubicPos = getPos(i); // Grid position
    const randomPos = getRandomPos(i); // Random target position for animation

    return {
      position: cubicPos, // Starting position (grid)
      randomPos: randomPos, // Target position (random)
      rotation: [0, 0, 0], // Initial rotation [x, y, z]
      color: getColor(cubicPos), // Per-cube color
      scale: 0.5, // Scale factor for cubes
    };
  });

// Create WebGL buffers for instanced attributes
const instanceBuffers = {
  position: regl.buffer(instances.map((i) => i.position)), // Buffer for grid positions
  position2: regl.buffer(instances.map((i) => i.randomPos)), // Buffer for random positions
  rotation: regl.buffer(instances.map((i) => i.rotation)), // Buffer for rotations
  color: regl.buffer(instances.map((i) => i.color)), // Buffer for colors
  scale: regl.buffer(instances.map((i) => [i.scale])), // Buffer for scales
};

// Main draw command for rendering all cubes with instancing
const drawCubes = regl({
  // Vertex shader: transforms vertices and calculates lighting
  vert: `
  precision mediump float;
  // Per-vertex attributes (from cube geometry)
  attribute vec3 position;
  attribute vec3 normal;
  attribute vec2 uv;

  // Per-instance attributes (different for each cube)
  attribute vec3 instancePosition;
  attribute vec3 instancePosition2;
  attribute vec3 instanceRotation;
  attribute vec3 instanceColor;
  attribute float instanceScale;

  // Uniforms (same for all vertices/instances)
  uniform mat4 projection, view;
  uniform float time;

  // Varyings (passed to fragment shader)
  varying vec3 vNormal, vPosition, vColor;
  varying vec2 vUv;

  // Helper function: creates rotation matrix around X axis
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

  // Helper function: creates rotation matrix around Y axis
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

  // Helper function: creates rotation matrix around Z axis
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
    // Pass instance color and UV to fragment shader
    vColor = instanceColor;
    vUv = uv;

    // Build model matrix for this instance
    mat4 model = mat4(1.0);  // Start with identity matrix

    // Animate between grid position and random position using sine wave
    float anim = pow(sin(time) * .5 + .5, 16.);  // Easing function for smooth animation
    model[3].xyz = mix(instancePosition, instancePosition2, anim);  // Interpolate position

    // Apply rotations around X, Y, Z axes
    model = model * rotationX(instanceRotation.x);
    model = model * rotationY(instanceRotation.y);
    model = model * rotationZ(instanceRotation.z);

    // Apply scaling (uniform scale in all directions)
    model[0] *= instanceScale;  // Scale X axis
    model[1] *= instanceScale;  // Scale Y axis
    model[2] *= instanceScale;  // Scale Z axis

    // Calculate normal matrix for proper lighting with scaling
    // Need to divide by scale² to account for non-uniform scaling
    mat3 normalMatrix = mat3(
      model[0].xyz / (instanceScale * instanceScale),
      model[1].xyz / (instanceScale * instanceScale),
      model[2].xyz / (instanceScale * instanceScale)
    );
    vNormal = normalMatrix * normal;  // Transform normal to world space

    // Calculate world position for lighting calculations
    vPosition = (model * vec4(position, 1.0)).xyz;

    // Final vertex position: model -> view -> projection space
    gl_Position = projection * view * model * vec4(position, 1);
  }
  `,

  // Fragment shader: calculates lighting and final color
  frag: `
  precision mediump float;
  // Inputs from vertex shader
  varying vec3 vNormal, vPosition, vColor;
  varying vec2 vUv;

  // Lighting uniforms
  uniform vec3 lightPosition;
  uniform vec3 lightColor;
  uniform float lightIntensity;
  uniform vec3 ambientColor;
  uniform float specularPower;
  uniform mat4 view;

  void main() {
    // Normalize vectors for lighting calculations
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(lightPosition - vPosition);
    vec3 viewPosition = view[0].xyz;  // Extract camera position from view matrix

    // Diffuse lighting: Lambert's cosine law
    float diff = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = lightColor * diff * lightIntensity;

    // Calculate distance from UV center for edge effect
    vec2 cuv = abs(vUv - vec2(0.5));
    float centerDist = length(cuv) * 2.;

    // Specular lighting (blinn-phong)
    vec3 viewDir = normalize(viewPosition - vPosition);
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), specularPower);
    vec3 specular = vec3(1., 0.25, 0.1) * spec * lightIntensity;

    // Combine all lighting components
    vec3 lighting = ambientColor + diffuse + specular;

    // Apply lighting to base color with center distance effect
    vec3 result = (vColor) * (lighting * (1. - centerDist + 0.5));

    // Alpha calculation for edge transparency
    float alpha = smoothstep(0.3, 0.3, max(cuv.x, cuv.y));

    // Final color with alpha transparency
    result = (vColor) * (lighting * (1. - centerDist + 0.5)) * alpha;

    gl_FragColor = vec4(result, alpha);
  }
  `,

  // Attribute definitions
  attributes: {
    // Cube geometry attributes (same for all instances)
    position: cube.position, // Vertex positions
    normal: cube.normals, // Vertex normals
    uv: cube.uvs, // Texture coordinates

    // Instanced attributes (different per cube, divisor=1 means new value per instance)
    instancePosition: {
      buffer: instanceBuffers.position, // Grid positions buffer
      divisor: 1, // Advance to next value once per instance (not per vertex)
    },
    instancePosition2: {
      buffer: instanceBuffers.position2, // Random positions buffer
      divisor: 1,
    },
    instanceRotation: {
      buffer: instanceBuffers.rotation, // Rotations buffer
      divisor: 1,
    },
    instanceColor: {
      buffer: instanceBuffers.color, // Colors buffer
      divisor: 1,
    },
    instanceScale: {
      buffer: instanceBuffers.scale, // Scales buffer
      divisor: 1,
    },
  },

  count: cube.count, // Number of vertices per cube (36)
  instances: instances.length, // Number of cubes to draw (216)

  // Uniform values (same for all vertices and instances)
  uniforms: {
    // Lighting parameters
    lightPosition: [0, 0, 0], // Light at origin
    lightColor: [1, 0, 0.5], // Pink light color
    lightIntensity: 2.0, // Light brightness
    ambientColor: [0.1, 0, 0.1], // Dark purple ambient light
    specularPower: 3.0, // Shininess factor

    // Animated time uniform
    time: () => performance.now() * 0.0001, // Current time in seconds

    // View matrix: orbiting camera
    view: ({ tick }) => {
      const t = performance.now() * 0.0001;
      const a = Math.pow(Math.sin(t) + 0.5 * 0.5, 16) * 0.1 + t; // Animated angle

      // Create lookAt matrix: camera orbits around origin
      return mat4.lookAt(
        mat4.create(), // Create new matrix
        [10 * Math.cos(a), 10 * Math.cos(a), 10 * Math.sin(a)], // Camera position
        [0, 0, 0], // Look at origin
        [0, 1, 0], // Up vector
      );
    },

    // Projection matrix: perspective projection
    projection: ({ viewportWidth, viewportHeight }) =>
      mat4.perspective(
        mat4.create(), // Create new matrix
        Math.PI / 4, // 45° field of view
        viewportWidth / viewportHeight, // Aspect ratio
        0.01, // Near clipping plane
        1000, // Far clipping plane
      ),
  },

  // Blending configuration for transparency
  blend: {
    enable: true, // Enable alpha blending
    func: {
      srcRGB: "src alpha", // Source RGB multiplier
      srcAlpha: "src alpha", // Source alpha multiplier
      dstRGB: "one minus src alpha", // Destination RGB multiplier
      dstAlpha: "one minus src alpha", // Destination alpha multiplier
    },
  },
});

// Animation loop (called every frame)
regl.frame(({ tick }) => {
  const t = performance.now() * 0.001; // Current time in seconds

  // Update rotation for all cubes
  instances.forEach((inst, i) => {
    // inst.rotation[0] = 0.01 * tick + i * 0.1  // X rotation (commented out)
    inst.rotation[1] = t; // Animate Y rotation based on time
  });

  // Update rotation buffer with new values
  instanceBuffers.rotation.subdata(instances.map((i) => i.rotation));

  // Clear screen with black color
  regl.clear({
    depth: 1, // Clear depth buffer to 1.0 (far plane)
    color: [0, 0, 0, 1], // Clear color to black with full opacity
  });

  // Draw all cubes
  drawCubes();
});
