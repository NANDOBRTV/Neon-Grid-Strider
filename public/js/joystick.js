export class Joystick {
  constructor(zoneId, stickId, baseId) {
    this.zone = document.getElementById(zoneId);
    this.stick = document.getElementById(stickId);
    this.base = document.getElementById(baseId);
    
    this.active = false;
    this.pos = { x: 0, y: 0 };
    this.input = { x: 0, y: 0 };
    
    this.init();
  }

  init() {
    this.zone.addEventListener('touchstart', (e) => this.handleStart(e), { passive: false });
    this.zone.addEventListener('touchmove', (e) => this.handleMove(e), { passive: false });
    this.zone.addEventListener('touchend', () => this.handleEnd(), { passive: false });
  }

  handleStart(e) {
    this.active = true;
    this.handleMove(e);
  }

  handleMove(e) {
    if (!this.active) return;
    e.preventDefault();

    const touch = e.touches[0];
    const rect = this.base.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    let dx = touch.clientX - centerX;
    let dy = touch.clientY - centerY;
    
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDistance = rect.width / 2;
    
    if (distance > maxDistance) {
      dx = (dx / distance) * maxDistance;
      dy = (dy / distance) * maxDistance;
    }

    this.pos = { x: dx, y: dy };
    this.input = { x: dx / maxDistance, y: dy / maxDistance };
    
    this.stick.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  handleEnd() {
    this.active = false;
    this.pos = { x: 0, y: 0 };
    this.input = { x: 0, y: 0 };
    this.stick.style.transform = `translate(0px, 0px)`;
  }

  getInput() {
    return this.input;
  }
}
