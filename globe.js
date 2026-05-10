window.addEventListener("DOMContentLoaded", () => {

  let scene, camera, renderer, globe;
  let stars, constellations, countryGroup;

  let rotX = 0;
  let rotY = 0;
  let targetRotX = 0;
  let targetRotY = 0;

  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  const RADIUS = 2.2;

  // =========================
  // LAT/LON
  // =========================

  function latLonToVector3(lat, lon, radius) {
    const phi = (90 - lat) * Math.PI / 180;
    const theta = (lon + 180) * Math.PI / 180;

    return new THREE.Vector3(
      -radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }

  // =========================
  // COUNTRY LINES
  // =========================

  function drawCountryLine(coords, radius) {

    const points = coords.map(([lon, lat]) =>
      latLonToVector3(lat, lon, radius)
    );

    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const core = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({
        color: 0xff7a1a,
        transparent: true,
        opacity: 0.9
      })
    );

    const glow = new THREE.Line(
      geometry.clone(),
      new THREE.LineBasicMaterial({
        color: 0xffa45c,
        transparent: true,
        opacity: 0.25
      })
    );

    glow.scale.multiplyScalar(1.01);

    const group = new THREE.Group();
    group.add(core);
    group.add(glow);

    if (!countryGroup) {
      countryGroup = new THREE.Group();
      globe.add(countryGroup);
    }

    countryGroup.add(group);
  }

  function loadCountries() {

    fetch("https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json")
      .then(res => res.json())
      .then(data => {

        const radius = RADIUS;

        data.features.forEach(feature => {

          const geom = feature.geometry;
          if (!geom) return;

          if (geom.type === "Polygon") {
            geom.coordinates.forEach(ring => drawCountryLine(ring, radius));
          }

          if (geom.type === "MultiPolygon") {
            geom.coordinates.forEach(poly => {
              poly.forEach(ring => drawCountryLine(ring, radius));
            });
          }
        });
      });
  }

  // =========================
  // STARFIELD
  // =========================

  function createStarfield() {

    const geo = new THREE.BufferGeometry();
    const count = 1200;

    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {

      const i3 = i * 3;

      const r = 90 + Math.random() * 150;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos((Math.random() * 2) - 1);

      positions[i3] = r * Math.sin(p) * Math.cos(t);
      positions[i3 + 1] = r * Math.cos(p);
      positions[i3 + 2] = r * Math.sin(p) * Math.sin(t);
    }

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.25,
      opacity: 0.35,
      transparent: true
    });

    stars = new THREE.Points(geo, mat);
    scene.add(stars);
  }

  // =========================
  // TOP HUD
  // =========================

  const topHUD = document.createElement("div");

  Object.assign(topHUD.style, {
    position: "absolute",
    top: "18px",
    left: "50%",
    transform: "translateX(-50%)",
    color: "#f5d7ad",
    fontFamily: "serif",
    fontSize: "18px",
    letterSpacing: "2px",
    textAlign: "center",
    zIndex: "1000",
    pointerEvents: "none"
  });

  topHUD.innerHTML = "Select a figure";
  document.body.appendChild(topHUD);

  function updateTopHUD(fig) {
    topHUD.innerHTML = `
      <div style="font-size:22px;">${fig.place}</div>
      <div style="opacity:0.8; font-size:15px;">
        ${fig.start} – ${fig.end}
      </div>
    `;
  }

  // =========================
  // INFO SYSTEM (EXPANDED)
  // =========================

  let currentMarker = null;
  let currentLabel = null;

  function makeMarkerTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");

    const g = ctx.createRadialGradient(64,64,5,64,64,60);
    g.addColorStop(0,"rgba(255,235,190,1)");
    g.addColorStop(0.25,"rgba(255,170,90,0.9)");
    g.addColorStop(1,"rgba(255,120,50,0)");

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(64,64,60,0,Math.PI*2);
    ctx.fill();

    return new THREE.CanvasTexture(canvas);
  }

  function makeLabelTexture(text) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");

    ctx.font = "bold 40px serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#f5d7ad";
    ctx.shadowBlur = 10;
    ctx.shadowColor = "black";
    ctx.fillText(text, 256, 75);

    return new THREE.CanvasTexture(canvas);
  }

  function setLocationMarker(lat, lon, name) {

    if (currentMarker) globe.remove(currentMarker);
    if (currentLabel) globe.remove(currentLabel);

    const pos = latLonToVector3(lat, lon, RADIUS + 0.03);

    const marker = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: makeMarkerTexture(),
        transparent: true
      })
    );

    marker.position.copy(pos);
    marker.scale.set(0.7,0.7,1);
    globe.add(marker);
    currentMarker = marker;

    const label = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: makeLabelTexture(name),
        transparent: true
      })
    );

    label.position.copy(pos.clone().add(new THREE.Vector3(0,0.25,0)));
    label.scale.set(1.5,0.4,1);
    globe.add(label);
    currentLabel = label;
  }

  // =========================
  // FIGURES (EXPANDED LIST)
  // =========================

  const figures = [
    {
      name: "Othello",
      place: "Cyprus",
      lat: 35.1,
      lon: 33.4,
      start: 1500,
      end: 1600,
      era: "Renaissance Literature",
      background: "Fictional Moorish general in Shakespeare’s tragedy.",
      significance: "Explores race, jealousy, identity, and political power in early modern Europe.",
      achievements: "Central figure in one of the most studied works in English literature."
    },
    {
      name: "Estevanico",
      place: "Morocco / Americas",
      lat: 31.7,
      lon: -7.0,
      start: 1500,
      end: 1539,
      era: "Age of Exploration",
      background: "One of the first African explorers of North America.",
      significance: "Bridged African, Indigenous, and European encounters in early exploration.",
      achievements: "Survived multiple Spanish expeditions; explored US Southwest."
    },
    {
      name: "Mansa Musa",
      place: "Mali Empire",
      lat: 17.5,
      lon: -3.9,
      start: 1312,
      end: 1337,
      era: "Medieval Africa",
      background: "Ruler of Mali Empire during its golden age.",
      significance: "Controlled vast gold resources and major trans-Saharan trade routes.",
      achievements: "Famous pilgrimage to Mecca influencing global economy."
    },
    {
      name: "Ziryab",
      place: "Al-Andalus (Cordoba)",
      lat: 37.8,
      lon: -4.7,
      start: 820,
      end: 857,
      era: "Islamic Golden Age",
      background: "Musician, poet, and cultural innovator.",
      significance: "Transformed European music, fashion, and etiquette.",
      achievements: "Founded early music school in Cordoba."
    },
    {
      name: "Saint Maurice",
      place: "Egypt / Rome",
      lat: 26.8,
      lon: 30.8,
      start: 300,
      end: 400,
      era: "Late Roman Empire",
      background: "Commander of the Theban Legion.",
      significance: "Important African figure in early Christian Europe.",
      achievements: "Venerated as martyr and saint across Europe."
    },

    // ================= NEW ADDITIONS =================

    {
      name: "Saint Benedict the Moor",
      place: "Sicily",
      lat: 37.6,
      lon: 14.0,
      start: 1526,
      end: 1589,
      era: "Early Modern Europe",
      background: "Born to African enslaved parents in Italy.",
      significance: "Became a Franciscan friar known for humility and miracles.",
      achievements: "Canonized saint; symbol of African presence in European Christianity."
    },
    {
      name: "Sir Morien",
      place: "Arthurian Legend",
      lat: 51.5,
      lon: -0.1,
      start: 1200,
      end: 1300,
      era: "Medieval Romance Literature",
      background: "Moorish knight in Arthurian legends.",
      significance: "One of the earliest African knights in European literature.",
      achievements: "Son of a knight of the Round Table in romance texts."
    },
    {
      name: "Catalina of Motril",
      place: "Spain",
      lat: 36.8,
      lon: -3.0,
      start: 1500,
      end: 1550,
      era: "Spanish Empire",
      background: "Enslaved Moorish woman in royal Spanish household.",
      significance: "Illustrates Moorish presence in Renaissance Spain.",
      achievements: "Served in royal courts; historical figure in colonial records."
    },
    {
      name: "Barbary Corsairs",
      place: "North Africa / Mediterranean",
      lat: 36.8,
      lon: 10.2,
      start: 1500,
      end: 1800,
      era: "Early Modern Naval History",
      background: "Maritime groups operating from North African ports.",
      significance: "Controlled trade routes and influenced European naval politics.",
      achievements: "Major naval power in Mediterranean piracy and warfare."
    },
    {
      name: "Moors in Tudor England",
      place: "England",
      lat: 51.5,
      lon: -0.1,
      start: 1500,
      end: 1600,
      era: "Tudor Period",
      background: "African and Moorish individuals in Tudor courts.",
      significance: "Evidence of multicultural presence in early modern England.",
      achievements: "Worked as musicians, servants, and court attendants."
    },
    {
      name: "Coburg Moor (Court Figure)",
      place: "Germany",
      lat: 50.3,
      lon: 10.9,
      start: 1500,
      end: 1600,
      era: "Holy Roman Empire",
      background: "Documented African presence in German noble courts.",
      significance: "Shows Moorish diaspora in central Europe.",
      achievements: "Appears in court records and noble households."
    }
  ];

  // =========================
  // HUD
  // =========================

  const hud = document.createElement("div");
  hud.className = "hud";
  hud.innerHTML = `<h2>Moorish Figures</h2>`;
  document.body.appendChild(hud);

  const infoBox = document.createElement("div");
  infoBox.className = "info-box";
  document.body.appendChild(infoBox);

  function showInfo(fig) {

    infoBox.innerHTML = `
      <h2>${fig.name}</h2>
      <p><strong>Era:</strong> ${fig.era}</p>
      <p><strong>Background:</strong> ${fig.background}</p>
      <p><strong>Significance:</strong> ${fig.significance}</p>
      <p><strong>Achievements:</strong> ${fig.achievements}</p>
    `;
  }

  function buildHUD() {

    figures.forEach(fig => {

      const el = document.createElement("div");
      el.className = "country-item";

      el.innerHTML = `
        ${fig.name}
        <span>${fig.place}</span>
      `;

      el.onclick = () => {
        showInfo(fig);
        updateTopHUD(fig);
        setLocationMarker(fig.lat, fig.lon, fig.name);
      };

      hud.appendChild(el);
    });
  }

  // =========================
  // INIT
  // =========================

  function init() {

    const container = document.getElementById("globeContainer");

    scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));

    const light = new THREE.DirectionalLight(0xffffff, 0.6);
    light.position.set(5,3,5);
    scene.add(light);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 1000);

    renderer = new THREE.WebGLRenderer({ alpha:true, antialias:true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    globe = new THREE.Mesh(
      new THREE.SphereGeometry(RADIUS,64,64),
      new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 1,
        metalness: 0
      })
    );

    scene.add(globe);

    createStarfield();
    loadCountries();
    buildHUD();

    camera.position.z = 5.5;

    setupControls(renderer.domElement);
    animate();
  }

  function setupControls(dom) {

    dom.style.cursor = "grab";

    dom.addEventListener("pointerdown", e=>{
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    });

    window.addEventListener("pointerup", ()=> dragging=false);

    dom.addEventListener("pointermove", e=>{
      if(!dragging) return;
      targetRotY += (e.clientX-lastX)*0.003;
      targetRotX += (e.clientY-lastY)*0.003;
      lastX=e.clientX;
      lastY=e.clientY;
    });
  }

  function animate() {
    requestAnimationFrame(animate);

    rotX += (targetRotX-rotX)*0.08;
    rotY += (targetRotY-rotY)*0.08;

    globe.rotation.x = rotX;
    globe.rotation.y = rotY;

    renderer.render(scene,camera);
  }

  window.addEventListener("resize", ()=>{
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth,window.innerHeight);
  });

  init();
});