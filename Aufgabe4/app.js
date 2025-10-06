// Parametrische Oberflächen WebGL Anwendung

class ParametricSurfaceViewer {
    constructor() {
        // Canvas und WebGL Kontext
        this.canvas = document.getElementById('webgl-canvas');
        this.gl = null;
        this.program = null;

        // Aktuelle Oberfläche und Anzeige-Modus
        this.currentSurface = 'torus';
        this.renderMode = 'filled'; // Alternativ 'wireframe'
        //this.autoRotate = true;
        //this.rotation = { x: 0.3, y: 0 };
        //this.rotationSpeed = 0.008; // Langsamere, natürlichere Rotation

         // Präzise Rotationssteuerung nur über Maus
        this.rotation = { x: 0.2, y: 0.3 }; // Startposition für bessere Sicht
        this.isRotating = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.rotationSensitivity = 0.005; // Präzisere Steuerung

        // Definition der parametrischen Flächen
        this.surfaces = {
            torus: {
                name: 'Torus',
                description: 'Ein klassischer Torus, erzeugt durch Rotation eines Kreises um eine Achse',
                formulas: {
                    x: '(R + r·cos(v))·cos(u)',
                    y: '(R + r·cos(v))·sin(u)',
                    z: 'r·sin(v)'
                },
                parameters: {
                    'u-Bereich': '[0, 2π]',
                    'v-Bereich': '[0, 2π]',
                    'R (Hauptradius)': '0.4',
                    'r (Nebenradius)': '0.2'
                },
                source: 'Klassische Torus-Parametrisierung',
                generate: this.generateTorus.bind(this)
            },

            // Tropfen von 3d-meier.de Seite44
            tropfen: {
                name: 'Tropfen',
                description: 'Parametrische Fläche Tropfen',
                formulas: {
                    x: 'a * (b - cos(u)) * sin(u) * cos(v)',
                    y: 'a * (b - cos(u)) * sin(u) * sin(v)',
                    z: 'cos(u)'
                },
                parameters: {
                    'u-Bereich': '[0, π]',
                    'v-Bereich': '[0, 2π]',
                    'a (Skalierung)': '0.5',
                    'b (Konstante)': '1.7'
                },
                source: 'http://www.3d-meier.de/tut3/Seite44.html',
                generate: function() {
                    const uSteps = 50;
                    const vSteps = 50;
                    const a = 0.5; // Skalierungsfaktor
                    const b = 1.7; // Konstante b der Formel

                    const vertices = [];
                    const colors = [];
                    const triangleIndices = [];
                    const lineIndices = [];

                    for (let i = 0; i <= uSteps; i++) {
                        for (let j = 0; j <= vSteps; j++) {
                            const u = (i / uSteps) * Math.PI;
                            const v = (j / vSteps) * 2 * Math.PI;

                            const x = a * (b - Math.cos(u)) * Math.sin(u) * Math.cos(v);
                            const y = a * (b - Math.cos(u)) * Math.sin(u) * Math.sin(v);
                            const z = Math.cos(u);

                            vertices.push(x, y, z);

                            // Farbverlauf: hell oben, dunkler unten
                            const t = (z + 1) / 2;
                            colors.push(0.2 + 0.6 * t, 0.3 * (1 - t), 0.5 * (1 - t));
                        }
                    }

                    for (let i = 0; i < uSteps; i++) {
                        for (let j = 0; j < vSteps; j++) {
                            const idxA = i * (vSteps + 1) + j;
                            const idxB = idxA + vSteps + 1;

                            triangleIndices.push(idxA, idxB, idxA + 1);
                            triangleIndices.push(idxB, idxB + 1, idxA + 1);

                            lineIndices.push(idxA, idxB);
                            lineIndices.push(idxA, idxA + 1);
                            if (j === vSteps - 1) lineIndices.push(idxB, idxB + 1);
                            if (i === uSteps - 1) lineIndices.push(idxA + 1, idxB + 1);
                        }
                    }

                    return { vertices, colors, triangleIndices, lineIndices };
                }
            },

            // EIGENE KREATION - Doppel-Tropfen mit gemeinsamen Spitze
            doubleTropfen: {
                name: 'Doppel-Tropfen (Eigene Kreation)',
                description: 'Zwei Tropfen die sich an der Spitze berühren - oberer und unterer symmetrisch verbunden',
                formulas: {
                    x: 'a * (b - cos(u)) * sin(u) * cos(v)',
                    y: 'a * (b - cos(u)) * sin(u) * sin(v)',
                    z: 'cos(u) für oberen, cos(π-u) für unteren'
                },
                parameters: {
                    'u-Bereich': '[0, π]',
                    'v-Bereich': '[0, 2π]',
                    'a (Skalierung)': '0.5',
                    'b (Konstante)': '1.7',
                    'Verbindung': 'Gemeinsame Spitze bei z=0'
                },
                source: 'Eigene Kreation - Doppel-Tropfen',
                generate: function() {
                    const uSteps = 50;
                    const vSteps = 50;
                    const a = 0.5; // Skalierungsfaktor
                    const b = 1.7; // Konstante b der Formel

                    const vertices = [];
                    const colors = [];
                    const triangleIndices = [];
                    const lineIndices = [];

                    // Oberer Tropfen (normale Orientierung)
                    for (let i = 0; i <= uSteps; i++) {
                        for (let j = 0; j <= vSteps; j++) {
                            const u = (i / uSteps) * Math.PI;
                            const v = (j / vSteps) * 2 * Math.PI;

                            const x = a * (b - Math.cos(u)) * Math.sin(u) * Math.cos(v);
                            const y = a * (b - Math.cos(u)) * Math.sin(u) * Math.sin(v);
                            const z = Math.cos(u); // Von -1 bis 1

                            vertices.push(x, y, z);

                            // Blauer Farbverlauf für oberen Tropfen
                            const t = (z + 1) / 2;
                            colors.push(0.1 + 0.2 * t, 0.3 + 0.4 * t, 0.8);
                        }
                    }

                    // Unterer Tropfen (gespiegelte Orientierung, gemeinsame Spitze)
                    for (let i = 0; i <= uSteps; i++) {
                        for (let j = 0; j <= vSteps; j++) {
                            const u = (i / uSteps) * Math.PI;
                            const v = (j / vSteps) * 2 * Math.PI;

                            // Für unteren Tropfen verwenden wir (π - u) um die Spiegelung zu erreichen
                            const u_mirrored = Math.PI - u;
                            const x = a * (b - Math.cos(u_mirrored)) * Math.sin(u_mirrored) * Math.cos(v);
                            const y = a * (b - Math.cos(u_mirrored)) * Math.sin(u_mirrored) * Math.sin(v);
                            const z = -Math.cos(u_mirrored); // Negativ für unteren Teil

                            vertices.push(x, y, z);

                            // Roter Farbverlauf für unteren Tropfen
                            const t = (-z + 1) / 2;
                            colors.push(0.8, 0.1 + 0.3 * t, 0.1 + 0.2 * t);
                        }
                    }

                    // Indizes für oberen Tropfen generieren
                    const totalVerticesPerPart = (uSteps + 1) * (vSteps + 1);

                    for (let i = 0; i < uSteps; i++) {
                        for (let j = 0; j < vSteps; j++) {
                            const idxA = i * (vSteps + 1) + j;
                            const idxB = idxA + vSteps + 1;

                            triangleIndices.push(idxA, idxB, idxA + 1);
                            triangleIndices.push(idxB, idxB + 1, idxA + 1);

                            lineIndices.push(idxA, idxB);
                            lineIndices.push(idxA, idxA + 1);
                            if (j === vSteps - 1) lineIndices.push(idxB, idxB + 1);
                            if (i === uSteps - 1) lineIndices.push(idxA + 1, idxB + 1);
                        }
                    }

                    // Indizes für unteren Tropfen generieren
                    for (let i = 0; i < uSteps; i++) {
                        for (let j = 0; j < vSteps; j++) {
                            const offset = totalVerticesPerPart;
                            const idxA = offset + i * (vSteps + 1) + j;
                            const idxB = idxA + vSteps + 1;

                            triangleIndices.push(idxA, idxB, idxA + 1);
                            triangleIndices.push(idxB, idxB + 1, idxA + 1);

                            lineIndices.push(idxA, idxB);
                            lineIndices.push(idxA, idxA + 1);
                            if (j === vSteps - 1) lineIndices.push(idxB, idxB + 1);
                            if (i === uSteps - 1) lineIndices.push(idxA + 1, idxB + 1);
                        }
                    }

                    return { vertices, colors, triangleIndices, lineIndices };
                }
            },

            // Seashell von 3d-meier.de Seite18
            seashell: {
                name: 'Seashell',
                description: 'Parametrische Schneckenform',
                formulas: {
                    x: 'a * h * cos(n * v * π) * (1 + cos(u * π)) + c * cos(n * v * π)',
                    y: 'a * h * sin(n * v * π) * (1 + cos(u * π)) + c * sin(n * v * π)',
                    z: 'b * 0.5 * v + a * h * sin(u * π)'
                },
                parameters: {
                    'u-Bereich': '[0, 2]',
                    'v-Bereich': '[0, 2]',
                    'a (Breite)': '0.4',
                    'b (Höhe)': '0.6',
                    'c (Innenradius)': '0.2',
                    'n (Windungen)': '2'
                },
                source: 'http://www.3d-meier.de/tut3/Seite18.html',
                generate: function() {
                    const uSteps = 50;
                    const vSteps = 50;
                    const a = 0.4;
                    const b = 0.6;
                    const c = 0.2;
                    const n = 2;

                    const vertices = [];
                    const colors = [];
                    const triangleIndices = [];
                    const lineIndices = [];

                    for (let i = 0; i <= uSteps; i++) {
                        for (let j = 0; j <= vSteps; j++) {
                            const u = (i / uSteps) * 2;
                            const v = (j / vSteps) * 2;
                            const h = 1 - 0.5 * v;

                            const x = a * h * Math.cos(n * v * Math.PI) * (1 + Math.cos(u * Math.PI)) + c * Math.cos(n * v * Math.PI);
                            const y = a * h * Math.sin(n * v * Math.PI) * (1 + Math.cos(u * Math.PI)) + c * Math.sin(n * v * Math.PI);
                            const z = b * 0.5 * v + a * h * Math.sin(u * Math.PI);

                            vertices.push(x, y, z);

                            const t = (z + b) / (2 * b);
                            colors.push(0.8 * t + 0.2, 0.5 * (1 - t), 0.3);
                        }
                    }

                    for (let i = 0; i < uSteps; i++) {
                        for (let j = 0; j < vSteps; j++) {
                            const idxA = i * (vSteps + 1) + j;
                            const idxB = idxA + vSteps + 1;

                            triangleIndices.push(idxA, idxB, idxA + 1);
                            triangleIndices.push(idxB, idxB + 1, idxA + 1);

                            lineIndices.push(idxA, idxB);
                            lineIndices.push(idxA, idxA + 1);
                            if (j === vSteps - 1) lineIndices.push(idxB, idxB + 1);
                            if (i === uSteps - 1) lineIndices.push(idxA + 1, idxB + 1);
                        }
                    }

                    return { vertices, colors, triangleIndices, lineIndices };
                }
            }
        };

        // Initialisierung starten
        this.init();
    }

    // WebGL Initialisierung
    async init() {
        try {
            this.setupWebGL();
            this.setupShaders();
            this.setupEventListeners();
            this.generateCurrentSurface();
            this.updateUI();
            this.render();
        } catch (error) {
            console.error('Initialization failed:', error);
            this.showError('WebGL-Initialisierung fehlgeschlagen. Bitte überprüfen Sie die Browser-Unterstützung.');
        }
    }

    setupWebGL() {
        this.gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
        if (!this.gl) {
            throw new Error('WebGL not supported');
        }
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.gl.clearColor(0.95, 0.95, 0.94, 1.0); // Heller Hintergrund
    }

    setupShaders() {
        const vertexShaderSource = `
            attribute vec3 aPosition;
            attribute vec3 aColor;
            uniform mat4 uModelMatrix;
            varying vec3 vColor;
            void main() {
                gl_Position = uModelMatrix * vec4(aPosition, 1.0);
                vColor = aColor;
            }
        `;
        const fragmentShaderSource = `
            precision mediump float;
            varying vec3 vColor;
            void main() {
                gl_FragColor = vec4(vColor, 1.0);
            }
        `;

        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);
        this.program = this.gl.createProgram();
        this.gl.attachShader(this.program, vertexShader);
        this.gl.attachShader(this.program, fragmentShader);
        this.gl.linkProgram(this.program);
        if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
            throw new Error('Shader program failed to link');
        }
        this.gl.useProgram(this.program);

        // Attribut- und Uniform-Positionen abrufen
        this.attributes = {
            position: this.gl.getAttribLocation(this.program, 'aPosition'),
            color: this.gl.getAttribLocation(this.program, 'aColor')
        };
        this.uniforms = {
            modelMatrix: this.gl.getUniformLocation(this.program, 'uModelMatrix')
        };
    }

    createShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            const error = this.gl.getShaderInfoLog(shader);
            this.gl.deleteShader(shader);
            throw new Error(`Shader compilation error: ${error}`);
        }
        return shader;
    }

    generateTorus() {
        const R = 0.4; // Hauptradius
        const r = 0.2; // Nebenradius
        const uSteps = 50;
        const vSteps = 30;
        const vertices = [];
        const colors = [];
        const triangleIndices = [];
        const lineIndices = [];

        // Vertices generieren
        for (let i = 0; i <= uSteps; i++) {
            for (let j = 0; j <= vSteps; j++) {
                const u = (i / uSteps) * 2 * Math.PI;
                const v = (j / vSteps) * 2 * Math.PI;

                const x = (R + r * Math.cos(v)) * Math.cos(u);
                const y = (R + r * Math.cos(v)) * Math.sin(u);
                const z = r * Math.sin(v);

                vertices.push(x, y, z);

                // Blau-zu-Cyan Farbverlauf basierend auf Höhe
                const t = (z + r) / (2 * r); // Normalisiere z zu [0, 1]
                colors.push(0.93, 0.85 - t * 0.3, 0.5 - t * 0.2);
            }
        }

        // Dreieck-Indizes generieren
        for (let i = 0; i < uSteps; i++) {
            for (let j = 0; j < vSteps; j++) {
                const a = i * (vSteps + 1) + j;
                const b = a + vSteps + 1;

                triangleIndices.push(a, b, a + 1);
                triangleIndices.push(b, b + 1, a + 1);

                // Linien-Indizes für Wireframe generieren
                lineIndices.push(a, b);
                lineIndices.push(a, a + 1);
                if (j === vSteps - 1) {
                    lineIndices.push(b, b + 1);
                }
                if (i === uSteps - 1) {
                    lineIndices.push(a + 1, b + 1);
                }
            }
        }

        return { vertices, colors, triangleIndices, lineIndices };
    }

    generateCurrentSurface() {
        const surfaceData = this.surfaces[this.currentSurface].generate();

        // Vertex-Buffer erstellen und binden
        this.vertexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(surfaceData.vertices), this.gl.STATIC_DRAW);

        // Farb-Buffer erstellen und binden
        this.colorBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(surfaceData.colors), this.gl.STATIC_DRAW);

        // Dreieck-Index-Buffer erstellen und binden
        this.triangleIndexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.triangleIndexBuffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(surfaceData.triangleIndices), this.gl.STATIC_DRAW);

        // Linien-Index-Buffer erstellen und binden
        this.lineIndexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.lineIndexBuffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(surfaceData.lineIndices), this.gl.STATIC_DRAW);

        this.triangleIndexCount = surfaceData.triangleIndices.length;
        this.lineIndexCount = surfaceData.lineIndices.length;
    }

    createRotationMatrix(angleX, angleY) {
        const cosX = Math.cos(angleX);
        const sinX = Math.sin(angleX);
        const cosY = Math.cos(angleY);
        const sinY = Math.sin(angleY);

        return new Float32Array([
            cosY, sinX * sinY, -cosX * sinY, 0,
            0, cosX, sinX, 0,
            sinY, -sinX * cosY, cosX * cosY, 0,
            0, 0, 0, 1
        ]);
    }

    render() {
        if (this.autoRotate) {
            this.rotation.y += this.rotationSpeed;
            this.rotation.x += this.rotationSpeed * 0.3; // Langsamere X-Rotation für natürlichere Bewegung
        }

        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        // Modell-Matrix setzen
        const modelMatrix = this.createRotationMatrix(this.rotation.x, this.rotation.y);
        this.gl.uniformMatrix4fv(this.uniforms.modelMatrix, false, modelMatrix);

        // Vertex-Buffer binden
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.vertexAttribPointer(this.attributes.position, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.attributes.position);

        // Farb-Buffer binden
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
        this.gl.vertexAttribPointer(this.attributes.color, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.attributes.color);

        // Je nach Render-Modus zeichnen
        if (this.renderMode === 'wireframe') {
            // Wireframe mit Linien-Indizes zeichnen
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.lineIndexBuffer);
            this.gl.drawElements(this.gl.LINES, this.lineIndexCount, this.gl.UNSIGNED_SHORT, 0);
        } else {
            // Gefüllte Oberfläche mit Dreieck-Indizes zeichnen
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.triangleIndexBuffer);
            this.gl.drawElements(this.gl.TRIANGLES, this.triangleIndexCount, this.gl.UNSIGNED_SHORT, 0);
        }

        requestAnimationFrame(() => this.render());
    }

    setupEventListeners() {
        // Oberflächenauswahl
        const surfaceSelect = document.getElementById('surfaceSelect');
        if (surfaceSelect) {
            surfaceSelect.addEventListener('change', (e) => {
                console.log('Surface changed to:', e.target.value);
                this.currentSurface = e.target.value;
                this.generateCurrentSurface();
                this.updateUI();
            });
        }

        // Render-Modus Buttons
        const wireframeBtn = document.getElementById('wireframeBtn');
        const filledBtn = document.getElementById('filledBtn');
        if (wireframeBtn) {
            wireframeBtn.addEventListener('click', () => {
                console.log('Switching to wireframe mode');
                this.renderMode = 'wireframe';
                this.updateButtonStates();
            });
        }
        if (filledBtn) {
            filledBtn.addEventListener('click', () => {
                console.log('Switching to filled mode');
                this.renderMode = 'filled';
                this.updateButtonStates();
            });
        }

        // Auto-Rotation umschalten
        const autoRotateBtn = document.getElementById('autoRotateBtn');
        if (autoRotateBtn) {
            autoRotateBtn.addEventListener('click', () => {
                this.autoRotate = !this.autoRotate;
                const indicator = document.getElementById('rotationIndicator');
                if (indicator) {
                    indicator.textContent = this.autoRotate ? 'Auto-Rotation: An' : 'Auto-Rotation: Aus';
                }
                this.updateButtonStates();
            });
        }

        // Maus-Interaktion für manuelle Rotation
        let isDragging = false;
        let lastMouseX, lastMouseY;

        this.canvas.addEventListener('mousedown', (e) => {
            isDragging = true;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
            this.autoRotate = false;
            const indicator = document.getElementById('rotationIndicator');
            if (indicator) {
                indicator.textContent = 'Auto-Rotation: Aus';
            }
            this.updateButtonStates();
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const deltaX = e.clientX - lastMouseX;
            const deltaY = e.clientY - lastMouseY;
            this.rotation.y += deltaX * 0.01;
            this.rotation.x += deltaY * 0.01;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
        });

        this.canvas.addEventListener('mouseup', () => {
            isDragging = false;
        });

        this.canvas.addEventListener('mouseleave', () => {
            isDragging = false;
        });
    }

    updateUI() {
        const surface = this.surfaces[this.currentSurface];

        // Oberflächen-Info aktualisieren
        const surfaceNameElement = document.getElementById('surfaceName');
        const surfaceDescElement = document.getElementById('surfaceDescription');
        if (surfaceNameElement) surfaceNameElement.textContent = surface.name;
        if (surfaceDescElement) surfaceDescElement.textContent = surface.description;

        // Formeln aktualisieren
        const formulaX = document.getElementById('formulaX');
        const formulaY = document.getElementById('formulaY');
        const formulaZ = document.getElementById('formulaZ');
        if (formulaX) formulaX.textContent = surface.formulas.x;
        if (formulaY) formulaY.textContent = surface.formulas.y;
        if (formulaZ) formulaZ.textContent = surface.formulas.z;

        // Parameter aktualisieren
        const parametersDiv = document.getElementById('parameters');
        if (parametersDiv) {
            parametersDiv.innerHTML = '';
            Object.entries(surface.parameters).forEach(([key, value]) => {
                const p = document.createElement('p');
                p.innerHTML = `<strong>${key}:</strong> ${value}`;
                parametersDiv.appendChild(p);
            });
        }

        // Quelle aktualisieren
        const sourceInfo = document.getElementById('sourceInfo');
        if (sourceInfo) sourceInfo.textContent = surface.source;

        this.updateButtonStates();
    }

    updateButtonStates() {
        // Render-Modus Buttons
        const wireframeBtn = document.getElementById('wireframeBtn');
        const filledBtn = document.getElementById('filledBtn');

        if (wireframeBtn) {
            wireframeBtn.classList.remove('btn--active');
            if (this.renderMode === 'wireframe') {
                wireframeBtn.classList.add('btn--active');
                wireframeBtn.classList.remove('btn--secondary');
                wireframeBtn.classList.add('btn--primary');
            } else {
                wireframeBtn.classList.add('btn--secondary');
                wireframeBtn.classList.remove('btn--primary');
            }
        }

        if (filledBtn) {
            filledBtn.classList.remove('btn--active');
            if (this.renderMode === 'filled') {
                filledBtn.classList.add('btn--active');
                filledBtn.classList.remove('btn--secondary');
                filledBtn.classList.add('btn--primary');
            } else {
                filledBtn.classList.add('btn--secondary');
                filledBtn.classList.remove('btn--primary');
            }
        }

        // Auto-Rotation Button
        const autoRotateBtn = document.getElementById('autoRotateBtn');
        if (autoRotateBtn) {
            autoRotateBtn.classList.remove('btn--active');
            if (this.autoRotate) {
                autoRotateBtn.classList.add('btn--active');
                autoRotateBtn.classList.remove('btn--secondary');
                autoRotateBtn.classList.add('btn--primary');
            } else {
                autoRotateBtn.classList.add('btn--secondary');
                autoRotateBtn.classList.remove('btn--primary');
            }
        }
    }

    showError(message) {
        const canvas = document.getElementById('webgl-canvas');
        const container = canvas.parentElement;
        container.innerHTML = `<div class="error-message">${message}</div>`;
    }
}

// Anwendung initialisieren wenn die Seite geladen ist
document.addEventListener('DOMContentLoaded', () => {
    new ParametricSurfaceViewer();
});