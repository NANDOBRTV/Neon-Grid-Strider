export class ActionButtons {
  constructor(jumpBtnId, attackBtnId) {
    this.jumpBtn = document.getElementById(jumpBtnId);
    this.attackBtn = document.getElementById(attackBtnId);
    
    this.actions = {
      jump: false,
      attack: false
    };

    this.init();
  }

  init() {
    // Suporte a multi-touch
    this.jumpBtn.addEventListener('touchstart', (e) => this.handleJumpStart(e), { passive: false });
    this.jumpBtn.addEventListener('touchend', (e) => this.handleJumpEnd(e), { passive: false });
    this.jumpBtn.addEventListener('mousedown', () => this.actions.jump = true);
    this.jumpBtn.addEventListener('mouseup', () => this.actions.jump = false);

    this.attackBtn.addEventListener('touchstart', (e) => this.handleAttackStart(e), { passive: false });
    this.attackBtn.addEventListener('touchend', (e) => this.handleAttackEnd(e), { passive: false });
    this.attackBtn.addEventListener('mousedown', () => this.actions.attack = true);
    this.attackBtn.addEventListener('mouseup', () => this.actions.attack = false);
  }

  handleJumpStart(e) {
    e.preventDefault();
    this.actions.jump = true;
  }

  handleJumpEnd(e) {
    e.preventDefault();
    this.actions.jump = false;
  }

  handleAttackStart(e) {
    e.preventDefault();
    this.actions.attack = true;
  }

  handleAttackEnd(e) {
    e.preventDefault();
    this.actions.attack = false;
  }

  getActions() {
    return { ...this.actions };
  }

  reset() {
    this.actions.jump = false;
    this.actions.attack = false;
  }
}
