import * as THREE from "three"; // Changed from "./three.module.js"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"; // Changed from "./addons/..."
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { CSS3DRenderer } from "three/addons/renderers/CSS3DRenderer.js";
// ===== three-init.js =====
document.addEventListener("DOMContentLoaded", function () {
  console.log("🚀 Three.js Scene Initialization");

  // 1. Check if Three.js is loaded
  if (typeof THREE === "undefined") {
    console.error("❌ THREE.js is not loaded!");
    return;
  }

  console.log("✅ THREE.js loaded (v" + THREE.REVISION + ")");

  // Check if CSS3DRenderer is available
  if (typeof CSS3DRenderer === "undefined") {
    console.warn("⚠️ CSS3DRenderer not loaded - HTML in 3D space unavailable");
  } else {
    console.log("✅ CSS3DRenderer loaded");
  }

  // 2. Get container
  const container = document.getElementById("hx-canvas");
  if (!container) {
    console.error("❌ #hx-canvas container not found!");
    return;
  }

  // 3. Create canvas element
  const canvas = document.createElement("canvas");

  // // Apply essential styles
  // canvas.style.cssText = `
  //       display: block;
  //       width: 93.3%;
  //       height: 85.2%;
  //       background-color: red;
  //   `;

  // Append to container
  container.appendChild(canvas);
  console.log("✅ Canvas created and appended");

  // 4. Create Three.js scene
  const scene = new THREE.Scene();

  // Set background color (visible through transparent frame)
  scene.background = new THREE.Color(0x202020); // Dark blue

  // 5. Add test objects (visible through frame)

  // Red cube
  const cubeGeometry = new THREE.BoxGeometry(2, 2, 2);
  const cubeMaterial = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    wireframe: false,
  });
  // Create the glass material
  const matGlass = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0.1,
    transparent: true,
    opacity: 0.5,
    envMapIntensity: 1.5,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
    side: THREE.DoubleSide,
  });
  const glassMaterial = {
    roughness: 0.08, // Smooth like glass
    metalness: 0, // Non-metallic
    envMapIntensity: 1.2, // Strong reflections
    color: 0xffffff, // White base
    emissive: 0x000000, // No emission
    emissiveIntensity: 0,
    flatShading: false,
    side: THREE.DoubleSide, // See through edges
  };

  const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
  cube.position.set(0, 1, 0);
  scene.add(cube);

  // Green sphere
  const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
  const sphereMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    wireframe: false,
  });
  const sphere = new THREE.Mesh(sphereGeometry, matGlass);
  sphere.position.set(-3, 0, 0);
  scene.add(sphere);

  // Blue torus
  const torusGeometry = new THREE.TorusGeometry(1.5, 0.5, 16, 100);
  const torusMaterial = new THREE.MeshBasicMaterial({
    color: 0x0088ff,
    wireframe: false,
  });
  const torus = new THREE.Mesh(torusGeometry, torusMaterial);
  torus.position.set(3, 0, 0);
  scene.add(torus);

  // 2. Main directional light - bright white from top right
  const directionalLight = new THREE.DirectionalLight(0xffeedd, 1);
  directionalLight.position.set(2, 7, 4);
  directionalLight.lookAt(0, 0, 0);
  directionalLight.castShadow = true;
  directionalLight.receiveShadow = true;

  // 3. Fill directional light - cool blue from left
  const fillLight = new THREE.DirectionalLight(0xaaccff, 0.8);
  fillLight.position.set(-3, 1, 2);
  fillLight.lookAt(0, 0, 0);
  scene.add(fillLight);

  const backLight = new THREE.DirectionalLight(0xffaa66, 0.6);
  backLight.position.set(-1, 3, -4);
  backLight.lookAt(0, 0, 0);
  scene.add(backLight);

  // Grid helper for orientation
  const gridHelper = new THREE.GridHelper(20, 20, 0x101010, 0x1a1a1a);
  gridHelper.position.y = -2;
  scene.add(gridHelper);

  console.log("✅ Scene created with 3D objects");

  // 6. Create camera
  const camera = new THREE.PerspectiveCamera(
    60, // Field of view
    container.clientWidth / container.clientHeight, // Aspect ratio
    0.1, // Near clipping plane
    1000, // Far clipping plane
  );

  // Position camera
  camera.position.set(0, 3, 10);
  camera.lookAt(0, 0, 0);

  // 7. Create renderer
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true, // Smooth edges
    alpha: false, // No transparency (we want solid background)
    powerPreference: "high-performance",
  });

  // Set pixel ratio for high-DPI displays
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Set initial size
  updateRendererSize();

  console.log("✅ Renderer created");
  console.log(
    "📐 Initial size:",
    container.clientWidth,
    "x",
    container.clientHeight,
  );

  // 8. Handle window resize
  let resizeTimeout;
  function handleResize() {
    // Debounce resize events
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(updateRendererSize, 100);
  }

  function updateRendererSize() {
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Update camera aspect ratio
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    // Update renderer size
    renderer.setSize(width, height);

    console.log(
      "🔄 Resized to:",
      width,
      "x",
      height,
      "Aspect:",
      camera.aspect.toFixed(2),
    );
  }

  window.addEventListener("resize", handleResize);

  // 9. Animation loop
  let animationId;
  function animate() {
    animationId = requestAnimationFrame(animate);

    // Rotate objects
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;

    sphere.rotation.x += 0.005;
    sphere.rotation.y += 0.005;

    torus.rotation.x += 0.01;
    torus.rotation.y += 0.01;
    // Render scene
    renderer.render(scene, camera);
  }

  // Start animation
  animate();

  // Render scene
  renderer.render(scene, camera);
  console.log("✅ Animation started");

  // 10. Cleanup on page unload
  window.addEventListener("beforeunload", function () {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    if (renderer) {
      renderer.dispose();
    }
  });

  // 11. Debug info
  setTimeout(() => {
    console.log("=== FINAL DEBUG INFO ===");
    console.log("Canvas dimensions:", canvas.width, "x", canvas.height);
    console.log(
      "Container dimensions:",
      container.clientWidth,
      "x",
      container.clientHeight,
    );
    console.log(
      "Frame dimensions:",
      document.getElementById("frame")?.clientWidth,
      "x",
      document.getElementById("frame")?.clientHeight,
    );
    console.log(
      "Viewport dimensions:",
      window.innerWidth,
      "x",
      window.innerHeight,
    );
    console.log("Aspect ratio:", camera.aspect.toFixed(4));

    // Check if WebGL is working
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    console.log("WebGL context:", gl ? "✅ Available" : "❌ Not available");
  }, 500);

  console.log("🎉 Three.js scene fully initialized!");
  console.log("👉 HALLELUJAH");
});
