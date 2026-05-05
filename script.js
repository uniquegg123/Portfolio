window.addEventListener("DOMContentLoaded", () => {

  const sections = document.querySelectorAll("section");
  const navLinks = document.querySelectorAll(".nav a");

  const intro = document.querySelector(".intro");

  if (intro) {
    const exitIntro = () => {
      intro.style.transition = "0.6s ease";
      intro.style.opacity = "0";
      setTimeout(() => intro.remove(), 600);
    };

    intro.addEventListener("click", exitIntro);
    window.addEventListener("keydown", exitIntro, { once: true });
  }

  const loader = document.querySelector(".loader");

  const showLoader = () => loader?.classList.add("show");
  const hideLoader = () => loader?.classList.remove("show");

  let current = sections[0];

  function updateChapter() {
    const chapterTitle = document.getElementById("chapterTitle");
    const chapter = current?.getAttribute("data-chapter");
    if (chapterTitle && chapter) chapterTitle.textContent = chapter;
  }

  function setActiveSection(target) {
    if (!target || target === current) return;

    showLoader();

    setTimeout(() => {
      current.classList.remove("visible");
      target.classList.add("visible");

      current = target;

      hideLoader();
      updateChapter();
      reveal();
    }, 300);
  }

  sections.forEach((sec, i) => {
    if (i === 0) sec.classList.add("visible");
  });

  navLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute("href"));
      setActiveSection(target);
    });
  });

  updateChapter();

  const faders = document.querySelectorAll(".fade-up");

  function reveal() {
    faders.forEach(el => {
      if (el.closest("section") === current) {
        el.classList.add("show");
      }
    });
  }

  reveal();

  const cursor = document.querySelector(".cursor");

  document.addEventListener("mousemove", (e) => {
    if (!cursor) return;
    cursor.style.left = e.clientX + "px";
    cursor.style.top = e.clientY + "px";
  });

  // =========================
  // 🌍 FIXED GLASS-CLEAN DRAG SYSTEM
  // =========================
  const overlay = document.getElementById("mapOverlay");
  const openMap = document.getElementById("openMap");

  let scene, camera, renderer, globe;
  let animationId;
  let running = false;

  const fadeLayer = document.querySelector(".map-fade");

  let autoSpin = 0.0005;

  // direct rotation (NO velocity system)
  let rotX = 0;
  let rotY = 0;
  let targetRotX = 0;
  let targetRotY = 0;

  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  let raycaster = new THREE.Raycaster();
  let mouse = new THREE.Vector2();

  let hoveredCountry = null;
  let selectedCountry = null;

  const countryGroups = [];

  if (openMap && overlay) {
    openMap.addEventListener("click", () => {
      overlay.classList.add("active");
      setTimeout(initGlobe, 200);
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMap();
    });

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeMap();
    });
  }

  function closeMap() {
    if (fadeLayer) fadeLayer.classList.add("active");

    setTimeout(() => {

      running = false;
      cancelAnimationFrame(animationId);

      if (renderer) {
        renderer.dispose();
        renderer.domElement.remove();
      }

      scene = null;
      camera = null;
      globe = null;
      countryGroups.length = 0;

      const container = document.getElementById("globeContainer");
      if (container) container.innerHTML = "";

      setTimeout(() => {
        overlay.classList.remove("active");
        if (fadeLayer) fadeLayer.classList.remove("active");
      }, 300);

    }, 400);
  }

  function latLonToVector3(lat, lon, radius) {
    const phi = (90 - lat) * Math.PI / 180;
    const theta = (lon + 180) * Math.PI / 180;

    return new THREE.Vector3(
      -radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }

  function drawCountryLine(coords, radius) {

    const points = [];

    for (let i = 0; i < coords.length; i += 2) {
      const [lon, lat] = coords[i];
      points.push(latLonToVector3(lat, lon, radius));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const baseMat = new THREE.LineBasicMaterial({
      color: 0xffcc88,
      transparent: true,
      opacity: 0.45
    });

    const baseLine = new THREE.Line(geometry, baseMat);

    const glowMat = new THREE.LineBasicMaterial({
      color: 0xffe6a3,
      transparent: true,
      opacity: 0
    });

    const glowLine = new THREE.Line(geometry.clone(), glowMat);
    glowLine.scale.multiplyScalar(1.01);

    const group = new THREE.Group();
    group.add(baseLine);
    group.add(glowLine);

    group.userData = { baseLine, glowLine };

    globe.add(group);
    countryGroups.push(group);
  }

  function loadCountries() {
    fetch("https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json")
      .then(res => res.json())
      .then(data => {

        const radius = 2.2;

        data.features.forEach(feature => {
          const geom = feature.geometry;
          if (!geom) return;

          if (geom.type === "Polygon") {
            geom.coordinates.forEach(ring => {
              drawCountryLine(ring, radius);
            });
          }

          if (geom.type === "MultiPolygon") {
            geom.coordinates.forEach(poly => {
              poly.forEach(ring => {
                drawCountryLine(ring, radius);
              });
            });
          }
        });
      });
  }

  function initGlobe() {

    const container = document.getElementById("globeContainer");
    if (!container) return;

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
      powerPreference: "high-performance"
    });

    renderer.setSize(window.innerWidth, window.innerHeight);

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const globeGeo = new THREE.SphereGeometry(2.2, 24, 24);
    const globeMat = new THREE.MeshBasicMaterial({
      color: 0x2d1b12,
      wireframe: true,
      opacity: 0.25,
      transparent: true
    });

    globe = new THREE.Mesh(globeGeo, globeMat);
    scene.add(globe);

    camera.position.z = 5.5;

    loadCountries();

    const dom = renderer.domElement;

    dom.style.cursor = "grab";
    dom.style.touchAction = "none";

    // =========================
    // CLEAN DRAG (NO STICKY MOTION)
    // =========================
    dom.addEventListener("pointerdown", (e) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      dom.setPointerCapture(e.pointerId);
      dom.style.cursor = "grabbing";
    });

    dom.addEventListener("pointerup", () => {
      dragging = false;
      dom.style.cursor = "grab";
    });

    dom.addEventListener("pointerleave", () => {
      dragging = false;
      dom.style.cursor = "grab";
    });

    dom.addEventListener("pointermove", (e) => {

      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      if (!dragging) return;

      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;

      targetRotY += dx * 0.003;
      targetRotX += dy * 0.003;

      lastX = e.clientX;
      lastY = e.clientY;
    });

    function animate() {
      if (!running) return;

      animationId = requestAnimationFrame(animate);

      if (globe) {

        globe.rotation.y += autoSpin;

        // smooth follow ONLY
        rotX += (targetRotX - rotX) * 0.08;
        rotY += (targetRotY - rotY) * 0.08;

        globe.rotation.x = rotX;
        globe.rotation.y = rotY;
      }

      renderer.render(scene, camera);
    }

    running = true;
    animate();
  }

  window.addEventListener("resize", () => {
    if (!renderer || !camera) return;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth / window.innerHeight);
  });

});