// Canvas und WebGL Initialisierung
const canvas = document.getElementById('canvas');
const gl = canvas.getContext('webgl');
if (!gl) alert('WebGL wird von Ihrem Browser nicht unterstützt.');

// Anzahl der Vertices und Radius für Polygon
const vertexCount = 30;
const radius = 0.8;

// Funktion zum Generieren eines regulären Polygons (30 Punkte)
function generateVertices() {
  const verts = [];
  for (let i = 0; i < vertexCount; i++) {
    const angle = (i / vertexCount) * 1 * Math.PI;
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    verts.push(x, y);
  }
  return new Float32Array(verts);
}

// Buffer und Shader global deklarieren
let vertexBuffer;
let program;
let positionLocation;

// Vertex Shader Code
const vertexShaderSource = `
 attribute vec2 position;
 void main() {
 gl_Position = vec4(position, 0.0, 1.0);
 }
`;

// Fragment Shader Code
const fragmentShaderSource = `
 precision mediump float;
 void main() {
 gl_FragColor = vec4(0.0, 0.0, 1.0, 1.0); // blaue Farbe
 }
`;

// Shader Erstellung Funktion
function createShader(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader Fehler:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

// Programm Initialisierung
function initProgram() {
  const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

  program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Programm Link Fehler:', gl.getProgramInfoLog(program));
  }
  gl.useProgram(program);
  positionLocation = gl.getAttribLocation(program, 'position');
}

// Initial Setup
initProgram();
vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
const vertices = generateVertices();
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

// Funktion zum Zeichnen nach Modus
function draw(mode) {
  gl.clearColor(1.0, 1.0, 1.0, 1.0); // weißer Hintergrund
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  gl.drawArrays(mode, 0, vertexCount);
}

// Event-Listener für Buttons, jede Taste für einen Modus
document.getElementById('lines').addEventListener('click', () => {
  draw(gl.LINES); // Linien zwischen Paaren
});

document.getElementById('lineStrip').addEventListener('click', () => {
  draw(gl.LINE_STRIP); // Verbundene Linien
});

document.getElementById('lineLoop').addEventListener('click', () => {
  draw(gl.LINE_LOOP); // Geschlossene Linie (Loop)
});

// Initiale Darstellung mit GL_LINE_LOOP
draw(gl.LINE_LOOP);