// Canvas und WebGL Setup
const canvas = document.getElementById('canvas');
const gl = canvas.getContext('webgl');
if (!gl) alert('WebGL nicht unterstützt');

// Vertex Shader (Position + Farbe an Fragment Shader)
const vertexShaderSource = `
attribute vec2 position;
attribute vec3 color;
uniform float xOffset; // Verschiebung auf X-Achse
uniform float yOffset; // Verschiebung auf Y-Achse
varying vec3 vColor;
void main() {
  // Position mit Verschiebung auf X und Y Koordinate
  gl_Position = vec4(position.x + xOffset, position.y + yOffset, 0, 1);
  vColor = color;
}`;

// Fragment Shader (Interpolierte Farbe ausgeben)
const fragmentShaderSource = `
precision mediump float;
varying vec3 vColor;
void main() {
  gl_FragColor = vec4(vColor, 1);
}`;

// Shader erstellen und prüfen
function createShader(type, source) {
  const s = gl.createShader(type);
  gl.shaderSource(s, source);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }
  return s;
}

// Programm initialisieren
function initProgram() {
  const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
  const prog = gl.createProgram();
  gl.attachShader(prog, vertexShader);
  gl.attachShader(prog, fragmentShader);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(prog));
  }
  gl.useProgram(prog);
  return prog;
}
const program = initProgram();

const posLoc = gl.getAttribLocation(program, 'position');
const colLoc = gl.getAttribLocation(program, 'color');
const xOffsetLoc = gl.getUniformLocation(program, 'xOffset');
const yOffsetLoc = gl.getUniformLocation(program, 'yOffset');

// --- Daten für erste Figur (Regelmäßiges Rad) ---
const vertexCount = 30;
const radius = 0.4; // Radius des Kreises

// Funktion zur Generierung der Kreis-Vertices
function generateTriangleVertices() {
  const verts = [];
  for (let i = 0; i < vertexCount; i++) {
    const angle1 = (i / vertexCount) * 2 * Math.PI;
    const angle2 = ((i + 1) / vertexCount) * 2 * Math.PI;
    verts.push(0, 0); // Mittelpunkt
    verts.push(radius * Math.cos(angle1), radius * Math.sin(angle1));
    verts.push(radius * Math.cos(angle2), radius * Math.sin(angle2));
  }
  return new Float32Array(verts);
}

function generateColors(colorMode) {
  const colors = [];
  for (let i = 0; i < vertexCount; i++) {
    if (colorMode === 1) {
      const r = 0; // grün kann dominieren
      const g = Math.random();
      const b = 0;
       colors.push(1, 1, 1, 1, 1, 1, 1, 1, 1);

    }
  }
  return new Float32Array(colors);
}

// Kreis-Vertices und Farben
const vertices1 = generateTriangleVertices();
const colors1 = generateColors(1);

const vertexBuffer1 = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer1);
gl.bufferData(gl.ARRAY_BUFFER, vertices1, gl.STATIC_DRAW);

const colorBuffer1 = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer1);
gl.bufferData(gl.ARRAY_BUFFER, colors1, gl.STATIC_DRAW);

// --- Daten für zweite Figur (Nieregelmäßiges Fünfeck) ---
const vertices2 = new Float32Array([
  -0.7, 0.1,
  0.2, 0.8,
  0.55, 0.3,
  0.4, -0.5,
  -0.6, -0.4
]);
const indices2 = new Uint16Array([
  0, 1, 2,
  0, 2, 3,
  0, 3, 4
]);
const colors2 = new Float32Array([
  1.0, 0.0, 0.0,
  1.0, 0.5, 0.0,
  1.0, 1.0, 0.0,
  0.0, 1.0, 0.0,
  0.0, 1.0, 1.0
]);

const vertexBuffer2 = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer2);
gl.bufferData(gl.ARRAY_BUFFER, vertices2, gl.STATIC_DRAW);

const colorBuffer2 = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer2);
gl.bufferData(gl.ARRAY_BUFFER, colors2, gl.STATIC_DRAW);

const indexBuffer2 = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer2);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices2, gl.STATIC_DRAW);

// --- Canvas leeren ---
gl.clearColor(1, 1, 1, 1);
gl.clear(gl.COLOR_BUFFER_BIT);

// --- Funktion: Zeichne unregelmäßiges Fünfeck (links oben) ---
function drawSecondFigure() {
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer2);
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer2);
  gl.enableVertexAttribArray(colLoc);
  gl.vertexAttribPointer(colLoc, 3, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer2);

  gl.uniform1f(xOffsetLoc, -0.4); // Stellt nach links vom Bildzentrum
  gl.uniform1f(yOffsetLoc, 0.3);  // Hoch verschieben

  gl.drawElements(gl.TRIANGLES, indices2.length, gl.UNSIGNED_SHORT, 0);
}

// --- Funktion: Zeichne Kreis (unter der Figur) ---
function drawFirstFigure() {
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer1);
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer1);
  gl.enableVertexAttribArray(colLoc);
  gl.vertexAttribPointer(colLoc, 3, gl.FLOAT, false, 0, 0);

  gl.uniform1f(xOffsetLoc, -0.4); // Gleiche X-Position wie andere Figur
  // Verschiebe den Kreis vertikal um -radius (damit er sich am unteren Punkt berührt)
  gl.uniform1f(yOffsetLoc, 0.3 - radius);

  gl.drawArrays(gl.TRIANGLES, 0, vertexCount * 3);
}

// Beide Figuren zeichnen
drawSecondFigure();
drawFirstFigure();
