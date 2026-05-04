window.addEventListener("DOMContentLoaded", () => {

  const sections = document.querySelectorAll("section");
  const navLinks = document.querySelectorAll(".nav a");

  // =========================
  // INTRO
  // =========================
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

  // =========================
  // LOADER
  // =========================
  const loader = document.querySelector(".loader");
  const showLoader = () => loader?.classList.add("show");
  const hideLoader = () => loader?.classList.remove("show");

  // =========================
  // SECTION SYSTEM
  // =========================
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
    }, 350);
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

  // =========================
  // FADE IN
  // =========================
  const faders = document.querySelectorAll(".fade-up");

  function reveal() {
    faders.forEach(el => {
      if (el.closest("section") === current) {
        el.classList.add("show");
      }
    });
  }

  reveal();

  // =========================
  // CURSOR
  // =========================
  const cursor = document.querySelector(".cursor");

  document.addEventListener("mousemove", (e) => {
    if (!cursor) return;
    cursor.style.left = e.clientX + "px";
    cursor.style.top = e.clientY + "px";
  });

  // =========================
  // 🌍 GLOBE SYSTEM
  // =========================
  const overlay = document.getElementById("mapOverlay");
  const openMap = document.getElementById("openMap");

  let scene, camera, renderer, globe;
  let animationId;

  let isDragging = false;
  let prevX = 0;
  let prevY = 0;

  let rotX = 0;
  let rotY = 0;

  let running = false;

  const fadeLayer = document.querySelector(".map-fade");
  const mapLoading = document.querySelector(".map-loading");

  if (openMap && overlay) {

    openMap.addEventListener("click", () => {
      overlay.classList.add("active");

      if (mapLoading) mapLoading.style.display = "block";

      setTimeout(() => {
        initGlobe();

        if (mapLoading) mapLoading.style.display = "none";
      }, 250);
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMap();
    });

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeMap();
    });
  }

  // =========================
  // CLOSE (FADE TO BLACK FIXED)
  // =========================
  function closeMap() {
    if (fadeLayer) fadeLayer.classList.add("active");

    setTimeout(() => {

      overlay.classList.add("closing");

      running = false;
      cancelAnimationFrame(animationId);

      if (renderer) {
        renderer.dispose();
        renderer.domElement.remove();
      }

      globe = null;
      scene = null;
      camera = null;

      const container = document.getElementById("globeContainer");
      if (container) container.innerHTML = "";

      setTimeout(() => {
        overlay.classList.remove("active", "closing");
        if (fadeLayer) fadeLayer.classList.remove("active");
      }, 300);

    }, 600);
  }

  function initGlobe() {
    const container = document.getElementById("globeContainer");
    if (!container) return;

    rotX = 0;
    rotY = 0;
    isDragging = false;

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false
    });

    renderer.setPixelRatio(1);
    renderer.setSize(window.innerWidth, window.innerHeight);

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const geometry = new THREE.SphereGeometry(2.2, 18, 18);

    const material = new THREE.MeshBasicMaterial({
      color: 0x8a5a3c,
      wireframe: true
    });

    globe = new THREE.Mesh(geometry, material);
    scene.add(globe);

    camera.position.z = 5.5;

    const dom = renderer.domElement;
    dom.style.pointerEvents = "auto";
    dom.style.cursor = "grab";

    dom.addEventListener("pointerdown", (e) => {
      isDragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
      dom.setPointerCapture(e.pointerId);
    });

    dom.addEventListener("pointerup", (e) => {
      isDragging = false;
      dom.releasePointerCapture(e.pointerId);
    });

    dom.addEventListener("pointermove", (e) => {
      if (!isDragging) return;

      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;

      rotY += dx * 0.004;
      rotX += dy * 0.004;

      prevX = e.clientX;
      prevY = e.clientY;
    });

    running = true;
    animate();
  }

  function animate() {
    if (!running) return;

    animationId = requestAnimationFrame(animate);

    if (globe) {
      globe.rotation.y += 0.001;

      globe.rotation.y += rotY;
      globe.rotation.x += rotX;

      rotY *= 0.92;
      rotX *= 0.92;
    }

    renderer.render(scene, camera);
  }

  window.addEventListener("resize", () => {
    if (!renderer || !camera) return;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
  });

});