import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

// ===== three-init.js =====
document.addEventListener("DOMContentLoaded", function () {
  console.log("🚀 Three.js Scene Initialization");

  // 1. Check if Three.js is loaded
  if (typeof THREE === "undefined") {
    console.error("❌ THREE.js is not loaded!");
    return;
  }

  console.log("✅ THREE.js loaded (v" + THREE.REVISION + ")");

  // Check if RoomEnvironment is available
  if (typeof RoomEnvironment === "undefined") {
    console.warn("⚠️ Room Environment not loaded");
  } else {
    console.log("✅ Room Environment loaded");
  }

  // Check if RoundedBoxGeometry is available
  if (typeof RoundedBoxGeometry === "undefined") {
    console.warn("⚠️ RoundedBoxGeometry not loaded");
  } else {
    console.log("✅ RoundedBoxGeometry loaded");
  }

  // 2. Get container
  const container = document.getElementById("hx-canvas");
  if (!container) {
    console.error("❌ #hx-canvas container not found!");
    return;
  }

  // 3. Create canvas element
  const canvas = document.createElement("canvas");
  container.appendChild(canvas);
  console.log("✅ Canvas created and appended");

  // 4. Create Three.js scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111); // Dark background like example

  // 5. Create camera
  const camera = new THREE.PerspectiveCamera(
    50, // FOV like example
    container.clientWidth / container.clientHeight,
    0.1,
    10, // Reduced far plane like example
  );
  camera.position.set(0, 0.5, 2.5);
  camera.lookAt(0, 0, 0);

  // 6. Create renderer
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });

  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true; // Enable shadows for better quality
  updateRendererSize();

  console.log("✅ Renderer created");

  // 7. Setup Room Environment (from example)
  const environment = new RoomEnvironment();
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  scene.environment = pmremGenerator.fromScene(environment).texture;

  // 8. Add OrbitControls with auto-rotate (from example)
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.autoRotate = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.rotateSpeed = 1.0;
  controls.enableZoom = true;
  controls.target.set(0, 0, 0);
  controls.update();

  // 9. Create Rounded Cube (like example)
  const geometry = new RoundedBoxGeometry(1, 1, 1, 7, 0.1); // width, height, depth, segments, radius
  const material = new THREE.MeshStandardMaterial({
    color: 0x4a90e2, // Nice blue color
    roughness: 0.2,
    metalness: 0.3,
    emissive: new THREE.Color(0x0),
    emissiveIntensity: 0,
    flatShading: false,
  });

  const roundedCube = new THREE.Mesh(geometry, material);
  roundedCube.castShadow = true;
  roundedCube.receiveShadow = true;
  roundedCube.position.set(0, 0, 0);
  scene.add(roundedCube);

  console.log("✅ Rounded cube created");

  // 10. Add lighting (enhanced for RoomEnvironment)
  const mainLight = new THREE.DirectionalLight(0xffeedd, 1);
  mainLight.position.set(2, 3, 4);
  mainLight.castShadow = true;
  mainLight.receiveShadow = true;
  scene.add(mainLight);

  const fillLight = new THREE.DirectionalLight(0xaaccff, 0.6);
  fillLight.position.set(-3, 1, 2);
  scene.add(fillLight);

  const backLight = new THREE.DirectionalLight(0xffaa66, 0.4);
  backLight.position.set(0, 1, -4);
  scene.add(backLight);

  // 11. Add subtle ambient light
  const ambientLight = new THREE.AmbientLight(0x404060);
  scene.add(ambientLight);

  // 12. Add grid helper (adjusted for better visibility)
  const gridHelper = new THREE.GridHelper(5, 20, 0x888888, 0x444444);
  gridHelper.position.y = -0.5;
  scene.add(gridHelper);

  // 13. Add simple axis helper for orientation
  const axesHelper = new THREE.AxesHelper(2);
  // scene.add(axesHelper); // Uncomment if needed

  // 14. Handle window resize
  function updateRendererSize() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  window.addEventListener("resize", () => {
    updateRendererSize();
  });

  // 15. Animation loop
  let animationId;
  function animate() {
    animationId = requestAnimationFrame(animate);

    // Auto-rotate is handled by OrbitControls
    controls.update();

    // Optional: Add subtle floating animation to the cube
    // roundedCube.rotation.y += 0.001;
    // roundedCube.rotation.x += 0.0005;
    // roundedCube.rotation.z += 0.0005;

    renderer.render(scene, camera);
  }

  animate();
  // renderer.render(scene, camera);
  // 16. Cleanup
  window.addEventListener("beforeunload", function () {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    renderer.dispose();
    pmremGenerator.dispose();
  });

  // 17. Debug info
  setTimeout(() => {
    console.log("=== FINAL DEBUG INFO ===");
    console.log("Scene type: Room Environment");
    console.log("Cube geometry: RoundedBox");
    console.log("Controls: OrbitControls with auto-rotate");
    console.log("Canvas dimensions:", canvas.width, "x", canvas.height);
    console.log(
      "Container dimensions:",
      container.clientWidth,
      "x",
      container.clientHeight,
    );
    console.log("Aspect ratio:", camera.aspect.toFixed(4));
    console.log("🎉 Three.js scene fully initialized with best practices!");
  }, 500);
});
