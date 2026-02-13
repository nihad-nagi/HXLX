import * as THREE from "three";
import { OrbitControls } from "./addons/controls/OrbitControls.js";
import { RoomEnvironment } from "./addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "./addons/geometries/RoundedBoxGeometry.js";

// Import Lottie
import lottie from "https://cdn.jsdelivr.net/npm/lottie-web@5.13.0/+esm";

// ===== three-init.js =====
document.addEventListener("DOMContentLoaded", function () {
  console.log("🚀 Three.js Scene Initialization");

  // 1. Check dependencies
  if (typeof THREE === "undefined") {
    console.error("❌ THREE.js is not loaded!");
    return;
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
  scene.background = new THREE.Color(0x1a1a1a);

  // 5. Create camera
  const camera = new THREE.PerspectiveCamera(
    50,
    container.clientWidth / container.clientHeight,
    0.1,
    10,
  );
  camera.position.set(0, 0, 2.5);
  camera.lookAt(0, 0, 0);

  // 6. Create renderer
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });

  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  updateRendererSize();

  // 7. Setup Room Environment
  const environment = new RoomEnvironment();
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileCubemapShader();
  scene.environment = pmremGenerator.fromScene(environment).texture;

  // 8. Add OrbitControls with auto-rotate
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.autoRotate = false;
  controls.autoRotateSpeed = 1.5;
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.rotateSpeed = 1.0;
  controls.enableZoom = true;
  controls.enablePan = true;
  controls.target.set(0, 0, 0);
  controls.update();

  // 9. Add loading manager to track assets
  const loadingManager = new THREE.LoadingManager();

  loadingManager.onStart = function (url, itemsLoaded, itemsTotal) {
    console.log(`📦 Started loading: ${url} (${itemsLoaded}/${itemsTotal})`);
    showLoadingIndicator();
  };

  loadingManager.onLoad = function () {
    console.log("✅ All assets loaded successfully!");
    hideLoadingIndicator();
  };

  loadingManager.onProgress = function (url, itemsLoaded, itemsTotal) {
    console.log(`📊 Loading: ${url} (${itemsLoaded}/${itemsTotal})`);
  };

  loadingManager.onError = function (url) {
    console.error(`❌ Error loading: ${url}`);
    showErrorMessage(`Failed to load: ${url}`);
  };

  // 10. Create a placeholder cube while Lottie loads
  console.log("Creating placeholder cube...");

  const placeholderGeometry = new RoundedBoxGeometry(1, 1, 1, 7, 0.2);
  const placeholderMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a90e2,
    roughness: 0.3,
    metalness: 0.2,
    emissive: new THREE.Color(0x1a2c4a),
    emissiveIntensity: 0.2,
    transparent: true,
    opacity: 0.9,
  });

  const placeholderCube = new THREE.Mesh(
    placeholderGeometry,
    placeholderMaterial,
  );
  placeholderCube.castShadow = true;
  placeholderCube.receiveShadow = true;
  placeholderCube.position.set(0, 0, 0);
  scene.add(placeholderCube);
  console.log("✅ Placeholder cube added");

  // 11. Add grid helper
  const gridHelper = new THREE.GridHelper(5, 20, 0x888888, 0x444444);
  gridHelper.position.y = -0.5;
  scene.add(gridHelper);

  // 12. Add ambient light
  const ambientLight = new THREE.AmbientLight(0x404060);
  scene.add(ambientLight);

  // 13. Add directional lights
  const mainLight = new THREE.DirectionalLight(0xffeedd, 1.2);
  mainLight.position.set(2, 3, 4);
  mainLight.castShadow = true;
  mainLight.receiveShadow = true;
  scene.add(mainLight);

  const fillLight = new THREE.DirectionalLight(0xaaccff, 0.8);
  fillLight.position.set(-3, 1, 2);
  scene.add(fillLight);

  // 14. Load Lottie animation - CORRECTED PATHS based on your file structure
  console.log("📂 Starting Lottie file load...");

  const fileLoader = new THREE.FileLoader(loadingManager);
  fileLoader.setResponseType("json");

  // CORRECTED PATHS - based on your actual file structure
  const lottiePaths = [
    "./static/js/addons/textures/lottie-logo-animation.json", // Direct path
  ];

  let currentPathIndex = 0;

  function tryLoadLottie() {
    if (currentPathIndex >= lottiePaths.length) {
      console.error("❌ All Lottie paths failed!");
      showErrorMessage("Failed to load Lottie animation - using placeholder");
      return;
    }

    const path = lottiePaths[currentPathIndex];
    console.log(`🔄 Trying to load Lottie from: ${path}`);

    fileLoader.load(
      path,
      // Success callback
      function (data) {
        console.log(`✅ Lottie JSON loaded successfully from: ${path}`);
        createLottieCube(data);
      },
      // Progress callback
      function (xhr) {
        // Not needed for JSON
      },
      // Error callback
      function (error) {
        console.warn(`⚠️ Failed to load from ${path}, trying next...`);
        currentPathIndex++;
        tryLoadLottie();
      },
    );
  }

  function createLottieCube(data) {
    // Remove placeholder cube
    scene.remove(placeholderCube);
    console.log("✅ Placeholder cube removed");

    // Create container for Lottie animation
    const lottieContainer = document.createElement("div");
    const dpr = window.devicePixelRatio;
    lottieContainer.style.width = data.w * dpr + "px";
    lottieContainer.style.height = data.h * dpr + "px";
    lottieContainer.style.position = "absolute";
    lottieContainer.style.top = "-9999px";
    lottieContainer.style.left = "-9999px";
    document.body.appendChild(lottieContainer);

    // Load Lottie animation
    const animation = lottie.loadAnimation({
      container: lottieContainer,
      animType: "canvas",
      loop: true,
      autoplay: true,
      animationData: data,
      rendererSettings: {
        dpr: dpr,
        preserveAspectRatio: "xMidYMid slice",
      },
    });

    // Create Three.js texture from Lottie canvas
    const texture = new THREE.CanvasTexture(animation.container);
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    // Update texture on each frame
    animation.addEventListener("enterFrame", function () {
      texture.needsUpdate = true;
    });

    // Create the final rounded cube with Lottie texture
    const geometry = new RoundedBoxGeometry(1, 1, 1, 7, 0.2);
    const material = new THREE.MeshStandardMaterial({
      roughness: 0.15,
      metalness: 0.1,
      map: texture,
      emissive: new THREE.Color(0x222222),
      emissiveIntensity: 0.1,
      side: THREE.DoubleSide,
      envMapIntensity: 1.2,
    });

    const lottieCube = new THREE.Mesh(geometry, material);
    lottieCube.castShadow = true;
    lottieCube.receiveShadow = true;
    lottieCube.position.set(0, 0, 0);
    scene.add(lottieCube);

    console.log("✅ Lottie cube created and added to scene!");

    // Setup scrubber controls
    setupScrubber(animation);
  }

  // Start loading Lottie with correct paths
  tryLoadLottie();

  // 15. Setup scrubber control
  function setupScrubber(animation) {
    let scrubber = document.getElementById("scrubber");

    if (!scrubber) {
      let infoDiv = document.getElementById("info");
      if (!infoDiv) {
        infoDiv = document.createElement("div");
        infoDiv.id = "info";
        infoDiv.style.position = "absolute";
        infoDiv.style.bottom = "20px";
        infoDiv.style.left = "0";
        infoDiv.style.width = "100%";
        infoDiv.style.textAlign = "center";
        infoDiv.style.zIndex = "1000";
        infoDiv.style.pointerEvents = "none";
        document.body.appendChild(infoDiv);
      }

      scrubber = document.createElement("input");
      scrubber.id = "scrubber";
      scrubber.type = "range";
      scrubber.value = "0";
      scrubber.style.width = "300px";
      scrubber.style.pointerEvents = "auto";
      scrubber.style.cursor = "pointer";
      infoDiv.appendChild(scrubber);

      const label = document.createElement("span");
      label.textContent = "Animation Timeline ";
      label.style.color = "white";
      label.style.fontFamily = "Arial, sans-serif";
      label.style.marginRight = "10px";
      infoDiv.insertBefore(label, scrubber);
    }

    // Wait for animation to be ready
    setTimeout(() => {
      scrubber.max = animation.totalFrames || 100;

      scrubber.addEventListener("pointerdown", function () {
        animation.pause();
      });

      scrubber.addEventListener("pointerup", function () {
        animation.play();
      });

      scrubber.addEventListener("input", function () {
        animation.goToAndStop(parseFloat(scrubber.value), true);
      });

      animation.addEventListener("enterFrame", function () {
        scrubber.value = animation.currentFrame;
      });

      console.log("✅ Scrubber controls setup");
    }, 1000);
  }

  // 16. UI Helpers
  function showLoadingIndicator() {
    let loader = document.getElementById("loading-indicator");
    if (!loader) {
      loader = document.createElement("div");
      loader.id = "loading-indicator";
      loader.textContent = "Loading Lottie Animation...";
      loader.style.position = "absolute";
      loader.style.top = "50%";
      loader.style.left = "50%";
      loader.style.transform = "translate(-50%, -50%)";
      loader.style.color = "white";
      loader.style.fontFamily = "Arial, sans-serif";
      loader.style.background = "rgba(0,0,0,0.7)";
      loader.style.padding = "15px 30px";
      loader.style.borderRadius = "30px";
      loader.style.zIndex = "2000";
      document.body.appendChild(loader);
    }
  }

  function hideLoadingIndicator() {
    const loader = document.getElementById("loading-indicator");
    if (loader) {
      loader.style.opacity = "0";
      setTimeout(() => {
        if (loader.parentNode) loader.parentNode.removeChild(loader);
      }, 500);
    }
  }

  function showErrorMessage(message) {
    const error = document.createElement("div");
    error.textContent = message;
    error.style.position = "absolute";
    error.style.top = "50%";
    error.style.left = "50%";
    error.style.transform = "translate(-50%, -50%)";
    error.style.color = "white";
    error.style.background = "rgba(255,0,0,0.8)";
    error.style.padding = "15px 30px";
    error.style.borderRadius = "30px";
    error.style.zIndex = "2000";
    error.style.fontFamily = "Arial, sans-serif";
    document.body.appendChild(error);

    setTimeout(() => {
      if (error.parentNode) error.parentNode.removeChild(error);
    }, 3000);
  }

  // 17. Handle window resize
  function updateRendererSize() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  window.addEventListener("resize", updateRendererSize);

  // 18. Animation loop
  let animationId;
  function animate() {
    animationId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  animate();

  // 19. Cleanup
  window.addEventListener("beforeunload", function () {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    renderer.dispose();
    pmremGenerator.dispose();
  });

  console.log("🎉 Three.js scene initialized with proper asset loading!");
});
