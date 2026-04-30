import { CONFIG } from './constants.js';

export class Renderer {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawGrid() {
    const { ctx, canvas } = this;
    ctx.strokeStyle = CONFIG.COLORS.GRID;
    ctx.lineWidth = 1;
    
    ctx.beginPath();
    for (let x = 0; x <= canvas.width; x += CONFIG.GRID_SIZE) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
    }
    for (let y = 0; y <= canvas.height; y += CONFIG.GRID_SIZE) {
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();
  }

  drawPlayer(player, isMe) {
    const { ctx } = this;
    if (!player.x || !player.y) return;

    ctx.save();
    
    // Corpo e Brilho
    ctx.beginPath();
    ctx.fillStyle = player.color || '#fff';
    ctx.shadowColor = player.color || '#fff';
    ctx.shadowBlur = CONFIG.SHADOW_BLUR;
    ctx.arc(player.x, player.y, CONFIG.PLAYER_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Nome
    ctx.shadowBlur = 0;
    ctx.fillStyle = CONFIG.COLORS.TEXT;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    const displayName = isMe ? `${player.username} (Você)` : player.username;
    ctx.fillText(displayName, player.x, player.y - 18);
    
    ctx.restore();
  }
}
