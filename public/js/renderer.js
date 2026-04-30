import { CONFIG } from './constants.js';

export class Renderer {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.sprites = {};
    this.loadSprites();
  }

  loadSprites() {
    const colors = ['green', 'red', 'blue', 'yellow'];
    colors.forEach(color => {
      const img = new Image();
      img.src = `assets/sprites/ninja_${color}.png`;
      this.sprites[color] = img;
    });
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

  drawTrail(player) {
    if (!player.trail || player.trail.length < 2) return;
    const { ctx } = this;
    
    ctx.save();
    ctx.lineWidth = CONFIG.PLAYER_RADIUS * 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowBlur = CONFIG.SHADOW_BLUR / 2;
    ctx.shadowColor = player.color;

    for (let i = 1; i < player.trail.length; i++) {
      const p1 = player.trail[i - 1];
      const p2 = player.trail[i];
      const opacity = (i / player.trail.length) * 0.5;
      
      ctx.beginPath();
      ctx.strokeStyle = player.color;
      ctx.globalAlpha = opacity;
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  getAnimationState(player) {
    // Determinar direção baseada no movimento ou última direção
    let row = 0; // Down (default)
    if (player.velY < 0) row = 1; // Up
    else if (player.velX < 0) row = 2; // Left
    else if (player.velX > 0) row = 3; // Right

    // Se estiver atacando, usar linhas de ataque (Attack é tipicamente nas linhas 12-15)
    if (player.isAttacking) {
      row += 12;
    }

    // Calcular frame de animação
    const isMoving = Math.abs(player.velX || 0) > 0.1 || Math.abs(player.velY || 0) > 0.1;
    const frameCount = 4; // Spritesheets do NinjaAdventure costumam ter 4 frames por animação
    const frame = isMoving ? Math.floor((Date.now() / (1000 * CONFIG.SPRITE.ANIM_SPEED)) % frameCount) : 0;

    return { row, frame };
  }

  drawPlayer(player, isMe) {
    const { ctx } = this;
    if (!player.x || !player.y) return;

    this.drawTrail(player);

    ctx.save();
    
    const yOffset = player.jumpOffset || 0;
    const drawY = player.y - yOffset;
    
    // Tentar desenhar Sprite
    const colorKey = this.getSpriteColorKey(player.color);
    const spriteImg = this.sprites[colorKey];

    if (spriteImg && spriteImg.complete) {
      const { row, frame } = this.getAnimationState(player);
      const sW = CONFIG.SPRITE.WIDTH;
      const sH = CONFIG.SPRITE.HEIGHT;
      const scale = CONFIG.SPRITE.SCALE;
      const dW = sW * scale;
      const dH = sH * scale;

      ctx.drawImage(
        spriteImg,
        frame * sW, row * sH, sW, sH, // Source
        player.x - dW / 2, drawY - dH / 2, dW, dH // Destination
      );
    } else {
      // Fallback para círculo se a imagem não carregar
      ctx.beginPath();
      ctx.fillStyle = player.color || '#fff';
      ctx.shadowColor = player.color || '#fff';
      ctx.shadowBlur = CONFIG.SHADOW_BLUR;
      ctx.arc(player.x, drawY, CONFIG.PLAYER_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }

    // Efeito de Ataque adicional
    if (player.isAttacking) {
      ctx.beginPath();
      ctx.strokeStyle = '#ff0055';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#ff0055';
      ctx.shadowBlur = 10;
      ctx.arc(player.x, drawY, CONFIG.PLAYER_RADIUS + 10, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Nome
    ctx.shadowBlur = 0;
    ctx.fillStyle = CONFIG.COLORS.TEXT;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    const displayName = isMe ? `${player.username} (Você)` : player.username;
    ctx.fillText(displayName, player.x, drawY - 25);
    
    ctx.restore();
  }

  getSpriteColorKey(hex) {
    // Mapear cores hex para os sprites disponíveis
    if (!hex) return 'green';
    const h = hex.toLowerCase();
    if (h.includes('ff0000') || h.includes('red')) return 'red';
    if (h.includes('0000ff') || h.includes('blue')) return 'blue';
    if (h.includes('ffff00') || h.includes('yellow')) return 'yellow';
    return 'green';
  }
}
