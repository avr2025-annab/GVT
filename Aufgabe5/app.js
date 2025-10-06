// Globale Variablen für Szene, Kamera und Renderer
let szene, kamera, renderer;
let kugel, wuerfel, rekursiveKugel;
let animationsId;

// Materialmodus: true = Drahtgitter, false = Verlauf
let drahtgitterModus = true;

// Materialien für Kugel und Würfel
let kugelMaterialDrahtgitter, kugelMaterialVerlauf;
let wuerfelMaterialDrahtgitter, wuerfelMaterialVerlauf;

// Rotationstempo der Kamera um das Ziel (Aufgabe Teil 1: Kamera-Bewegung)
const rotationSpeed = 0.02;
// Zoomgeschwindigkeit (Aufgabe Teil 1: Kamera-Bewegung)
const zoomSpeed = 0.5;

// Tastenzustände für Steuerung (Aufgabe Teil 1: Interaktion mit der Kamera)
const keysPressed = { w: false, a: false, s: false, d: false, q: false, e: false };

// Kameraposition und Zielpunkt (Aufgabe Teil 1: View-Transformation mit lookAt)
let cameraPosition = new THREE.Vector3(0, 0, 10);
const cameraTarget = new THREE.Vector3(0, 0, 0);
const upVector = new THREE.Vector3(0, 1, 0);

// Aktuelle Rekursionstiefe für rekursive Kugel (Aufgabe Teil 2: Interaktive Tiefe der Rekursion)
let recursionDepth = 1;

// Initialisierung der 3D-Szene und Steuerung (Setup der Szene mit Grundkörpern, rekursiver Kugel, Kamera und Licht)
function initialisieren() {
  if (typeof THREE === 'undefined') { // Sicherheit: Three.js muss geladen sein
    console.error('Three.js wurde nicht geladen');
    document.getElementById('loading').innerHTML = 'Fehler: Three.js wurde nicht geladen';
    return;
  }

  szene = new THREE.Scene();
  szene.background = new THREE.Color(0x222222); // dunkler Hintergrund

  const canvas = document.getElementById('canvas');
  kamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

  kamera.position.copy(cameraPosition);
  kamera.up.copy(upVector);
  kamera.lookAt(cameraTarget);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Beleuchtung hinzufügen (Grundbeleuchtung für 3D-Modelle)
  szene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 5, 5);
  szene.add(directionalLight);

  // Teil 1: Grundkörper Kugel und Würfel erstellen
  erstelleObjekte();

  // Teil 2: Rekursive Kugel mit aktueller Rekursionstiefe erzeugen
  createRecursiveSphere(recursionDepth);

  // Eventhandler für Fenstergrößenänderung (responsive Design)
  window.addEventListener('resize', fensterGroesseAendern);
  // Eventhandler für Tastatur-Interaktion (Kamera-Steuerung)
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  // Slider für dynamische Einstellung der Rekursionstiefe (Teil 2 interaktiv)
  const slider = document.getElementById('recursionDepth');
  const depthLabel = document.getElementById('depthValue');
  slider.addEventListener('input', e => {
    let neu = Number(e.target.value);
    if (neu !== recursionDepth) {
      recursionDepth = neu;
      depthLabel.textContent = recursionDepth;
      if (rekursiveKugel) {
        szene.remove(rekursiveKugel);
        rekursiveKugel.geometry.dispose();
        rekursiveKugel.material.dispose();
      }
      createRecursiveSphere(recursionDepth);
    }
  });

  // Button zum Umschalten zwischen Drahtgitter- und Verlaufsmodus (Teil 1 Material)
  const toggleBtn = document.getElementById('toggleMode');
  toggleBtn.addEventListener('click', moduswechsel);

  // Verstecke Ladeanzeige, sobald Initialisierung abgeschlossen ist
  document.getElementById('loading').classList.add('hidden');

  // Start der Animationsschleife
  animieren();
}

// Teil 1: Erstellen der Grundkörper Kugel und Würfel mit Drahtgitter- und Verlaufsmaterial
function erstelleObjekte() {
  // Kugel
  const kugelGeometrie = new THREE.SphereGeometry(1.5, 32, 32);
  kugelMaterialDrahtgitter = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true, transparent: true, opacity: 0.8 });
  kugelMaterialVerlauf = erstelleVerlaufsMaterial(kugelGeometrie, [0xff0000, 0xff8800, 0xffff00, 0x88ff00, 0x00ff00]);
  kugel = new THREE.Mesh(kugelGeometrie, kugelMaterialDrahtgitter);
  kugel.position.set(-3, 0, 0);
  szene.add(kugel);

  // Würfel
  const wuerfelGeometrie = new THREE.BoxGeometry(2, 2, 2);
  wuerfelMaterialDrahtgitter = new THREE.MeshBasicMaterial({ color: 0x0000ff, wireframe: true, transparent: true, opacity: 0.8 });
  wuerfelMaterialVerlauf = erstelleVerlaufsMaterial(wuerfelGeometrie, [0x0000ff, 0x8800ff, 0xff00ff, 0xff0088, 0xff0000]);
  wuerfel = new THREE.Mesh(wuerfelGeometrie, wuerfelMaterialDrahtgitter);
  wuerfel.position.set(3, 0, 0);
  szene.add(wuerfel);
}

// Erzeugt ein Farbverlaufs-Material basierend auf der y-Position der Geometrie (Teil 1 Material)
function erstelleVerlaufsMaterial(geometrie, farben) {
  const anzahlVertices = geometrie.attributes.position.count;
  const farbAttribut = new Float32Array(anzahlVertices * 3);
  for (let i = 0; i < anzahlVertices; i++) {
    const y = geometrie.attributes.position.getY(i);
    const normalisierteY = (y + 2) / 4;
    const farbIndex = Math.floor(normalisierteY * (farben.length - 1));
    const farbe = new THREE.Color(farben[Math.max(0, Math.min(farbIndex, farben.length - 1))]);
    farbAttribut[i * 3] = farbe.r;
    farbAttribut[i * 3 + 1] = farbe.g;
    farbAttribut[i * 3 + 2] = farbe.b;
  }
  geometrie.setAttribute('color', new THREE.BufferAttribute(farbAttribut, 3));
  return new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.9 });
}

// Umschalten zwischen Drahtgitter- und Verlaufsmodus (Teil 1 Material)
function moduswechsel() {
  drahtgitterModus = !drahtgitterModus;
  const knopf = document.getElementById('toggleMode');
  if (drahtgitterModus) {
    kugel.material = kugelMaterialDrahtgitter;
    wuerfel.material = wuerfelMaterialDrahtgitter;
    knopf.textContent = 'Zu Verlauf wechseln';
    console.log('Drahtgittermodus aktiviert');
  } else {
    kugel.material = kugelMaterialVerlauf;
    wuerfel.material = wuerfelMaterialVerlauf;
    knopf.textContent = 'Zu Drahtgitter wechseln';
    console.log('Verlaufsmodus aktiviert');
  }
}

// Teil 2: Basis-Geometrie Oktaeder für rekursive Kugel
const octahedronVertices = [
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, -1, 0),
  new THREE.Vector3(0, 0, 1),
  new THREE.Vector3(0, 0, -1),
];
const octahedronFaces = [
  [0, 4, 2],
  [2, 4, 1],
  [1, 4, 3],
  [3, 4, 0],
  [0, 2, 5],
  [2, 1, 5],
  [1, 3, 5],
  [3, 0, 5],
];

// Teil 2: Rekursive Unterteilung (Subdivision) der Oktaederflächen
function subdivide(vertices, faces, depth) {
  if (depth === 0) return { vertices, faces };
  const midpointCache = {};
  const newFaces = [];

  // Hilfsfunktion: Zwischenpunktindex berechnen oder abrufen
  function getMidpointIndex(v1, v2) {
    const key = [Math.min(v1, v2), Math.max(v1, v2)].join('_');
    if (midpointCache[key] !== undefined) return midpointCache[key];
    const midpoint = vertices[v1].clone().add(vertices[v2]).multiplyScalar(0.5).normalize();
    vertices.push(midpoint);
    const idx = vertices.length - 1;
    midpointCache[key] = idx;
    return idx;
  }

  // Für jedes Dreieck der aktuellen Ebenen vier neue Dreiecke erzeugen
  for (const face of faces) {
    const [v1, v2, v3] = face;
    const a = getMidpointIndex(v1, v2);
    const b = getMidpointIndex(v2, v3);
    const c = getMidpointIndex(v3, v1);
    newFaces.push([v1, a, c]);
    newFaces.push([v2, b, a]);
    newFaces.push([v3, c, b]);
    newFaces.push([a, b, c]);
  }

  // Rekursiver Aufruf mit verminderter Tiefe
  return subdivide(vertices, newFaces, depth - 1);
}

// Teil 2: Erstellen der rekursiven Kugel mit gegebener Tiefe und Kolorierung
function createRecursiveSphere(depth) {
  let vertices = octahedronVertices.map(v => v.clone());
  let faces = octahedronFaces.map(f => f.slice());

  const result = subdivide(vertices, faces, depth);
  vertices = result.vertices;
  faces = result.faces;

  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const colors = [];

  // Positionen und Farben für jedes Dreieck sammeln
  for (const face of faces) {
    for (const idx of face) {
      const v = vertices[idx];
      positions.push(v.x, v.y, v.z);
      const color = new THREE.Color();
      color.setHSL((v.y + 1) / 2, 1.0, 0.5);
      colors.push(color.r, color.g, color.b);
    }
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshLambertMaterial({ vertexColors: true });

  rekursiveKugel = new THREE.Mesh(geometry, material);
  rekursiveKugel.position.set(0, 0, 0);
  szene.add(rekursiveKugel);
}

// Anpassung von Renderer und Kamera bei Fenstergrößenänderung, responsives Design
function fensterGroesseAendern() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  kamera.aspect = window.innerWidth / window.innerHeight;
  kamera.updateProjectionMatrix();
}

// Tastendruck registrieren (für Interaktion Teil 1)
function onKeyDown(event) {
  const key = event.key.toLowerCase();
  if (keysPressed.hasOwnProperty(key)) keysPressed[key] = true;
}

// Tastendruck loslassen registrieren (für Interaktion Teil 1)
function onKeyUp(event) {
  const key = event.key.toLowerCase();
  if (keysPressed.hasOwnProperty(key)) keysPressed[key] = false;
}

// Bewegungs- und Rotationslogik der Kamera implementiert die Viewtransformation mit lookAt (Teil 1)
function updateCameraPosition() {
  // Abstand der Kamera zum Zielpunkt als Vektor berechnen
  const offset = new THREE.Vector3().subVectors(cameraPosition, cameraTarget);

  // Sphärische Koordinaten: Radius, Azimutwinkel theta, Polarwinkel phi
  const spherical = new THREE.Spherical();
  spherical.setFromVector3(offset);

  // Rotation nach oben (Verringern des Phiwinkels)
  if (keysPressed.w) {
    spherical.phi = Math.max(0.01, spherical.phi - rotationSpeed);
  }
  // Rotation nach unten (Erhöhen des Phiwinkels)
  if (keysPressed.s) {
    spherical.phi = Math.min(Math.PI - 0.01, spherical.phi + rotationSpeed);
  }
  // Rotation nach links (Verringern Azimuttheta)
  if (keysPressed.a) {
    spherical.theta -= rotationSpeed;
  }
  // Rotation nach rechts (Erhöhen Azimuttheta)
  if (keysPressed.d) {
    spherical.theta += rotationSpeed;
  }
  // Zoom heran mit Mindestabstand von 3 Einheiten
  if (keysPressed.q) {
    spherical.radius = Math.max(3, spherical.radius - zoomSpeed);
  }
  // Zoom heraus mit Maximalabstand von 50 Einheiten
  if (keysPressed.e) {
    spherical.radius = Math.min(50, spherical.radius + zoomSpeed);
  }

  // Umwandlung zurück in kartesische Koordinaten
  offset.setFromSpherical(spherical);

  // Update der Kameraposition
  cameraPosition.copy(cameraTarget).add(offset);

  // Kamera an neuen Ort setzen und auf Ziel schauen
  kamera.position.copy(cameraPosition);
  kamera.up.copy(upVector);
  kamera.lookAt(cameraTarget);
}

// Endlosschleife für Animation und Rendering
function animieren() {
  animationsId = requestAnimationFrame(animieren);
  updateCameraPosition();
  renderer.render(szene, kamera);
}

// Starte Initialisierung beim Laden der Seite
window.addEventListener('load', initialisieren);
