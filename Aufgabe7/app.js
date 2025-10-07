// --- Initialisierung ---
// Canvas-Element und WebGL-Kontext abrufen
const canvas = document.getElementById('glcanvas');
const gl = canvas.getContext('webgl');
if (!gl) {
    alert('WebGL nicht verfügbar');
}

// --- GUI erzeugen ---
// Overlay-DIV für Steuerungsinformationen anlegen
const gui = document.createElement('div');
gui.id = 'gui';
gui.style.position = 'absolute';
gui.style.top = '10px';
gui.style.left = '10px';
gui.style.padding = '10px';
gui.style.background = 'rgba(0, 0, 0, 0.5)';
gui.style.color = 'white';
gui.style.fontFamily = 'Arial, sans-serif';
gui.innerHTML = `
    <h3>Steuerung:</h3>
    <ul>
        <li>W – Vorwärts bewegen</li>
        <li>S – Rückwärts bewegen</li>
        <li>A – Nach links bewegen</li>
        <li>D – Nach rechts bewegen</li>      
        <li>E – Zoom In</li>
        <li>Q – Zoom Out</li>
        <li>R – Kamera zurücksetzen</li>
    </ul>`;
document.body.appendChild(gui);

// --- Fragment-Shader ---
// gl_FragCoord.z liefert den normalisierten Tiefenwert:
// 0.0 an der Nah-Ebene, 1.0 an der Fern-Ebene
const fsSource = `
precision mediump float;
void main() {
    // Normalisierter Tiefenwert
    float depth = gl_FragCoord.z;
    // Mapping: depth 0 → grau 0 (dunkel), depth 1 → grau 1 (hell)
    float gray = depth;
    // Frag-Farbe basierend auf Tiefe
    gl_FragColor = vec4(vec3(gray), 15.0);
}
`;

// --- Vertex-Shader ---
// Verwendet nur Position, keine Normalen
const vsSource = `
attribute vec3 aPosition;
uniform mat4 uMVP;
void main() {
    // Projektion und Modell–View–Transform anwenden
    gl_Position = uMVP * vec4(aPosition, 1.0);
}
`;

// --- Shader-Kompilierung ---
function loadShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader-Fehler:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

// Shader laden und Programm erstellen
const vertexShader = loadShader(gl.VERTEX_SHADER, vsSource);
const fragmentShader = loadShader(gl.FRAGMENT_SHADER, fsSource);
const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Programmlink-Fehler:', gl.getProgramInfoLog(program));
}
gl.useProgram(program);

// --- Attribute und Uniforms ---
const aPositionLoc = gl.getAttribLocation(program, 'aPosition');
const uMVPLoc = gl.getUniformLocation(program, 'uMVP');

// --- Würfel-Geometriedaten ---
// Vertices und Indizes definieren
const cubeVertices = new Float32Array([
    // Vorderseite
    -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1,
    // Rückseite
    -1, -1, -1, -1, 1, -1, 1, 1, -1, 1, -1, -1,
    // Oberseite
    -1, 1, -1, -1, 1, 1, 1, 1, 1, 1, 1, -1,
    // Unterseite
    -1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1,
    // rechte Seite
    1, -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1,
    // linke Seite
    -1, -1, -1, -1, -1, 1, -1, 1, 1, -1, 1, -1
]);
const cubeIndices = new Uint16Array([
    0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7,
    8, 9, 10, 8, 10, 11, 12, 13, 14, 12, 14, 15,
    16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23
]);

// --- Buffer konfigurieren ---
const vbo = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
gl.bufferData(gl.ARRAY_BUFFER, cubeVertices, gl.STATIC_DRAW);
const ibo = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cubeIndices, gl.STATIC_DRAW);

// Position-Attribut aktivieren
gl.enableVertexAttribArray(aPositionLoc);
gl.vertexAttribPointer(aPositionLoc, 3, gl.FLOAT, false, 0, 0);

// Tiefentest aktivieren
gl.enable(gl.DEPTH_TEST);

// --- Kamera und Steuerung ---
// W/S/A/D für Translation, Pfeiltasten für Rotation, E/Q für Zoom
let camX = 0, camY = 0, camZ = 10;
let rotY = 0, rotX = 0;
function keyDown(e) {
    const moveSpeed = 0.2;
    const zoomSpeed = 0.5;
    switch (e.code) {
        case 'KeyW': rotY -= 0.05; break;      // Vorwärts
        case 'KeyS': rotY += 0.05; break;     // Rückwärts
        case 'KeyA': rotX += 0.05; break;   // Yachse links drehen
        case 'KeyD': rotX -= 0.05; break;       // Rechts
        case 'KeyE': camZ -= zoomSpeed; break;     // Zoom In
        case 'KeyQ': camZ += zoomSpeed; break;     // Zoom Out
        case 'KeyR':                             // Kamera zurücksetzen
            camX = 0; camY = 0; camZ = 10;
            rotX = 0; rotY = 0;
            break;
    }
}
window.addEventListener('keydown', keyDown);

// --- Matrix-Hilfsfunktionen ---
// Perspektivische Projektionsmatrix erstellen
function perspective(fovy, aspect, near, far) {
    const f = 1.0 / Math.tan(fovy / 2);
    const nf = 1 / (near - far);
    const out = new Float32Array(16);
    out[0] = f / aspect; out[5] = f; out[10] = (far + near) * nf; out[11] = -1;
    out[14] = 2 * far * near * nf;
    return out;
}
// LookAt-Matrix erzeugen
function lookAt(eye, center, up) {
    const z0 = eye[0] - center[0], z1 = eye[1] - center[1], z2 = eye[2] - center[2];
    const len = Math.hypot(z0, z1, z2);
    const zx = z0 / len, zy = z1 / len, zz = z2 / len;
    const ux = up[1] * zz - up[2] * zy;
    const uy = up[2] * zx - up[0] * zz;
    const uz = up[0] * zy - up[1] * zx;
    const lx = zy * uz - zz * uy;
    const ly = zz * ux - zx * uz;
    const lz = zx * uy - zy * ux;
    const out = new Float32Array(16);
    out.set([lx, ux, zx, 0, ly, uy, zy, 0, lz, uz, zz, 0, 0, 0, 0, 1]);
    out[12] = -(lx * eye[0] + ly * eye[1] + lz * eye[2]);
    out[13] = -(ux * eye[0] + uy * eye[1] + uz * eye[2]);
    out[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
    return out;
}
// Zwei 4×4-Matrizen multiplizieren
function multiply(a, b) {
    const out = new Float32Array(16);
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            let sum = 0;
            for (let k = 0; k < 4; k++) {
                sum += a[k * 4 + j] * b[i * 4 + k];
            }
            out[i * 4 + j] = sum;
        }
    }
    return out;
}

// --- Rendering-Schleife ---
// Szene rendern und Tiefenvisualisierung anwenden
function drawScene() {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1, 1, 1, 1); // Weißer Hintergrund
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const proj = perspective(Math.PI / 4, canvas.width / canvas.height, 0.1, 100);
    const view = lookAt([camX, camY, camZ], [0, 0, 0], [0, 1, 0]);

    const positions = [
        { x: -1.5, y: 0, z: 0 },
        { x: 1.5, y: 0, z: 0 },
        { x: 0, y: 1.5, z: -1 }
    ];
    for (const pos of positions) {
        // Modellmatrix: Translation und Rotation
        const model = new Float32Array(16);
        model.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, pos.x, pos.y, pos.z, 1]);
        const rotMatY = new Float32Array([
            Math.cos(rotY), 0, Math.sin(rotY), 0,
            0, 1, 0, 0,
            -Math.sin(rotY), 0, Math.cos(rotY), 0,
            0, 0, 0, 1
        ]);
        const rotMatX = new Float32Array([
            1, 0, 0, 0,
            0, Math.cos(rotX), -Math.sin(rotX), 0,
            0, Math.sin(rotX), Math.cos(rotX), 0,
            0, 0, 0, 1
        ]);
        const mvp = multiply(proj, multiply(view, multiply(rotMatX, multiply(rotMatY, model))));
        gl.uniformMatrix4fv(uMVPLoc, false, mvp);
        gl.drawElements(gl.TRIANGLES, cubeIndices.length, gl.UNSIGNED_SHORT, 0);
    }

    requestAnimationFrame(drawScene);
}

// --- Fenster-Resize behandeln ---
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();
drawScene();
