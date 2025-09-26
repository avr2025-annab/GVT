class DiscAnimationApp {
  constructor() {
    // Array mit Frames, jeweils Winkel und Bild-URL
    this.discFrames = [
      { angle: 0, url: 'img/ESA1_1-02.png' },
      { angle: 15, url: 'img/ESA1_1-25.png' },
      { angle: 30, url: 'img/ESA1_1-24.png' },
      { angle: 45, url: 'img/ESA1_1-23.png' },
      { angle: 60, url: 'img/ESA1_1-22.png' },
      { angle: 75, url: 'img/ESA1_1-21.png' },
      { angle: 90, url: 'img/ESA1_1-20.png' },
      { angle: 105, url: 'img/ESA1_1-19.png' },
      { angle: 120, url: 'img/ESA1_1-18.png' },
      { angle: 135, url: 'img/ESA1_1-17.png' },
      { angle: 150, url: 'img/ESA1_1-16.png' },
      { angle: 165, url: 'img/ESA1_1-15.png' },
      { angle: 180, url: 'img/ESA1_1-14.png' },
      { angle: 195, url: 'img/ESA1_1-13.png' },
      { angle: 210, url: 'img/ESA1_1-12.png' },
      { angle: 225, url: 'img/ESA1_1-11.png' },
      { angle: 240, url: 'img/ESA1_1-10.png' },
      { angle: 255, url: 'img/ESA1_1-09.png' },
      { angle: 270, url: 'img/ESA1_1-08.png' },
      { angle: 285, url: 'img/ESA1_1-07.png' },
      { angle: 300, url: 'img/ESA1_1-06.png' },
      { angle: 315, url: 'img/ESA1_1-05.png' },
      { angle: 330, url: 'img/ESA1_1-04.png' },
      { angle: 345, url: 'img/ESA1_1-03.png' }
    ];
    this.currentFrameIndex = 0; // aktueller Frame-Index
    this.isAutoRotating = false; // Automatische Drehung aktiv?
    this.autoRotationInterval = null; // Intervall-ID für automatische Drehung
    this.animationSpeed = 200; // Geschwindigkeit der Animation (ms)
    // HTML-Elemente für Anzeige und Steuerung
    this.discElement = document.getElementById('disc');
    this.currentAngleElement = document.getElementById('current-angle');
    this.rotationModeElement = document.getElementById('rotation-mode');
    this.frameDisplayElement = document.getElementById('frame-display');
    this.autoStatusElement = document.getElementById('auto-status');
    this.init(); // Initialisierung starten
  }
  init() {
    this.updateDiscDisplay(); // Ersten Frame anzeigen
    this.setupKeyboardControls(); // Tastatur-Listener einrichten
    this.updateUI(); // UI initial aktualisieren
  }
  setupKeyboardControls() {
    // Tastaturereignisse abfangen
    this.handleKeyboard = (e) => {
      switch (e.key.toLowerCase()) {
        case 'l': e.preventDefault(); this.rotateLeft(); break; // Drehung nach links
        case 'r': e.preventDefault(); this.rotateRight(); break; // Drehung nach rechts
        case 'a': e.preventDefault(); this.toggleAutoRotation(); break; // Auto-Drehung starten/stoppen
      }
    };
    document.addEventListener('keydown', this.handleKeyboard);
  }
  rotateLeft() {
    if (this.isAutoRotating) return; // wenn Auto-Drehung aktiv, nicht manuell drehen
    // vorherigen Frame wählen, mit Wraparound
    this.currentFrameIndex = (this.currentFrameIndex - 1 + this.discFrames.length) % this.discFrames.length;
    this.updateDiscDisplay(); // Disc-Bild aktualisieren
    this.updateUI(); // UI aktualisieren
  }
  rotateRight() {
    if (this.isAutoRotating) return; // wenn Auto-Drehung aktiv, nicht manuell drehen
    // nächsten Frame wählen, mit Wraparound
    this.currentFrameIndex = (this.currentFrameIndex + 1) % this.discFrames.length;
    this.updateDiscDisplay();
    this.updateUI();
  }
  toggleAutoRotation() {
    // Umschalten zwischen automatischer Drehung und Stillstand
    if (this.isAutoRotating) this.stopAutoRotation();
    else this.startAutoRotation();
  }
  startAutoRotation() {
    this.isAutoRotating = true;
    // Intervall starten, das Frames automatisch wechselt
    this.autoRotationInterval = setInterval(() => {
      this.currentFrameIndex = (this.currentFrameIndex + 1) % this.discFrames.length;
      this.updateDiscDisplay();
      this.updateUI();
    }, this.animationSpeed);
    this.updateUI();
  }
  stopAutoRotation() {
    this.isAutoRotating = false;
    clearInterval(this.autoRotationInterval); // Intervall stoppen
    this.autoRotationInterval = null;
    this.updateUI();
  }
  updateDiscDisplay() {
    // Aktuelles Frame laden und Anzeige aktualisieren
    const frame = this.discFrames[this.currentFrameIndex];
    this.discElement.src = frame.url;
    this.discElement.alt = `Disc rotated ${frame.angle}°`;
  }
  updateUI() {
    // Anzeigen im UI aktualisieren: Winkel, Modus, Frame-Nummer, Auto-Status
    this.currentAngleElement.textContent = `${this.discFrames[this.currentFrameIndex].angle}°`;
    this.rotationModeElement.textContent = this.isAutoRotating ? 'Auto' : 'Manuell';
    this.frameDisplayElement.textContent = `${this.currentFrameIndex + 1} von ${this.discFrames.length}`;
    this.autoStatusElement.textContent = this.isAutoRotating ? 'AN' : 'AUS';
  }
}
// Initialisierung der App nach dem Laden des Dokuments
document.addEventListener('DOMContentLoaded', () => new DiscAnimationApp());
