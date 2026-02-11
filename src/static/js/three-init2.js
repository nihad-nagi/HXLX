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
  if (typeof THREE.CSS3DRenderer === "undefined") {
    console.warn("⚠️ CSS3DRenderer not loaded - HTML in 3D space unavailable");
  } else {
    console.log("✅ CSS3DRenderer loaded");
  }

  if (typeof THREE.CSS2DRenderer === "undefined") {
    console.warn("⚠️ CSS2DRenderer not loaded - 2D labels unavailable");
  } else {
    console.log("✅ CSS2DRenderer loaded");
  }

  // 2. Get container
  const container = document.getElementById("hx-canvas");
  if (!container) {
    console.error("❌ #hx-canvas container not found!");
    return;
  }

  // 3. Create canvas element
  const canvas = document.createElement("canvas");

  // Apply essential styles
  canvas.style.cssText = `
        display: block;
        width: 100%;
        height: 100%;
        background-color: transparent;
    `;

  // Append to container
  container.appendChild(canvas);
  console.log("✅ Canvas created and appended");

  // 4. Create Three.js scene
  const scene = new THREE.Scene();

  // Set background color (visible through transparent frame)
  scene.background = new THREE.Color(0x1a1a1a);

  // 5. Add test objects
  const cubeGeometry = new THREE.BoxGeometry(2, 2, 2);
  const cubeMaterial = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    wireframe: false,
  });
  const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
  cube.position.set(0, 1, 0);
  scene.add(cube);

  const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
  const sphereMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    wireframe: false,
  });
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.position.set(-3, 0, 0);
  scene.add(sphere);

  const torusGeometry = new THREE.TorusGeometry(1.5, 0.5, 16, 100);
  const torusMaterial = new THREE.MeshBasicMaterial({
    color: 0x0088ff,
    wireframe: false,
  });
  const torus = new THREE.Mesh(torusGeometry, torusMaterial);
  torus.position.set(3, 0, 0);
  scene.add(torus);

  const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
  gridHelper.position.y = -2;
  scene.add(gridHelper);

  // 6. Create camera
  const camera = new THREE.PerspectiveCamera(
    60,
    container.clientWidth / container.clientHeight,
    0.1,
    1000,
  );
  camera.position.set(0, 3, 10);
  camera.lookAt(0, 0, 0);

  // 7. Create WebGL renderer
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // --- CREATE CSS3D RENDERER (if available) ---
  let css3DRenderer = null;
  if (typeof THREE.CSS3DRenderer !== "undefined") {
    css3DRenderer = new THREE.CSS3DRenderer();
    css3DRenderer.domElement.style.position = "absolute";
    css3DRenderer.domElement.style.top = "0";
    css3DRenderer.domElement.style.left = "0";
    css3DRenderer.domElement.style.pointerEvents = "none";
    css3DRenderer.domElement.style.zIndex = "5";
    container.appendChild(css3DRenderer.domElement);
    console.log("✅ CSS3D renderer created");
  }

  // --- CREATE CSS2D RENDERER (if available) ---
  let css2DRenderer = null;
  if (typeof THREE.CSS2DRenderer !== "undefined") {
    css2DRenderer = new THREE.CSS2DRenderer();
    css2DRenderer.domElement.style.position = "absolute";
    css2DRenderer.domElement.style.top = "0";
    css2DRenderer.domElement.style.left = "0";
    css2DRenderer.domElement.style.pointerEvents = "none";
    css2DRenderer.domElement.style.zIndex = "10";
    container.appendChild(css2DRenderer.domElement);
    console.log("✅ CSS2D renderer created");
  }

  // --- ADD CSS3D ELEMENTS (if renderer available) ---
  if (typeof THREE.CSS3DObject !== "undefined" && css3DRenderer) {
    try {
      const div1 = document.createElement("div");
      div1.textContent = "CSS3D Element";
      div1.style.cssText = `
        width: 200px;
        height: 100px;
        background: rgba(255, 255, 0, 0.9);
        border: 2px solid black;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: Arial;
        font-size: 16px;
        color: black;
        box-shadow: 0 0 20px rgba(0,0,0,0.5);
      `;

      const css3dObject = new THREE.CSS3DObject(div1);
      css3dObject.position.set(0, 3, -2);
      scene.add(css3dObject);
      console.log("✅ CSS3D element added");
    } catch (e) {
      console.error("❌ Error adding CSS3D element:", e);
    }
  }

  // --- ADD CSS2D LABELS (if renderer available) ---
  if (typeof THREE.CSS2DObject !== "undefined" && css2DRenderer) {
    try {
      const label1 = document.createElement("div");
      label1.textContent = "Cube";
      label1.style.cssText = `
        color: white;
        background: rgba(0,0,0,0.8);
        padding: 4px 12px;
        border-radius: 4px;
        font-family: Arial;
        font-size: 14px;
        pointer-events: none;
        border: 1px solid white;
      `;

      const css2dLabel1 = new THREE.CSS2DObject(label1);
      css2dLabel1.position.set(0, 2.5, 0);
      cube.add(css2dLabel1);

      const label2 = document.createElement("div");
      label2.textContent = "Sphere";
      label2.style.cssText = `
        color: white;
        background: rgba(0,0,0,0.8);
        padding: 4px 12px;
        border-radius: 4px;
        font-family: Arial;
        font-size: 14px;
        pointer-events: none;
        border: 1px solid white;
      `;

      const css2dLabel2 = new THREE.CSS2DObject(label2);
      css2dLabel2.position.set(0, 1.5, 0);
      sphere.add(css2dLabel2);

      console.log("✅ CSS2D labels added");
    } catch (e) {
      console.error("❌ Error adding CSS2D labels:", e);
    }
  }

  // NOW set the initial size after all renderers are created
  function updateRendererSize() {
    const width = container.clientWidth;
    const height = container.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);

    if (css3DRenderer) {
      css3DRenderer.setSize(width, height);
    }

    if (css2DRenderer) {
      css2DRenderer.setSize(width, height);
    }
  }

  // Call this AFTER all renderers are defined
  updateRendererSize();
  console.log("✅ WebGL renderer created and sized");

  // 8. Handle window resize
  let resizeTimeout;
  function handleResize() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(updateRendererSize, 100);
  }

  window.addEventListener("resize", handleResize);

  // 9. Animation loop
  let animationId;
  function animate() {
    animationId = requestAnimationFrame(animate);

    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;

    sphere.rotation.x += 0.005;
    sphere.rotation.y += 0.005;

    torus.rotation.x += 0.01;
    torus.rotation.y += 0.01;

    renderer.render(scene, camera);

    if (css3DRenderer) {
      css3DRenderer.render(scene, camera);
    }

    if (css2DRenderer) {
      css2DRenderer.render(scene, camera);
    }
  }

  animate();
  console.log("✅ Animation started");

  // 10. Cleanup
  window.addEventListener("beforeunload", function () {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    if (renderer) {
      renderer.dispose();
    }
    if (css3DRenderer && css3DRenderer.domElement) {
      css3DRenderer.domElement.remove();
    }
    if (css2DRenderer && css2DRenderer.domElement) {
      css2DRenderer.domElement.remove();
    }
  });

  console.log("🎉 Three.js scene fully initialized with CSS renderers!");
});
