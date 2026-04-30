const socket = io();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const usernameInput = document.getElementById('username');
const colorInput = document.getElementById('color');
const joinBtn = document.getElementById('joinBtn');

const players = {};
let myId = null;
let joined = false;
const speed = 4;
const keys = new Set();

joinBtn.addEventListener('click', () => {
  if (joined) return;
  
  // Define o ID localmente se o socket já estiver conectado
  if (socket.id) myId = socket.id;

  socket.emit('join_game', {
    username: usernameInput.value || 'Runner',
    color: colorInput.value,
    x: canvas.width / 2,
    y: canvas.height / 2,
  });
  joined = true;
  
  // Desabilita inputs após entrar
  usernameInput.disabled = true;
  colorInput.disabled = true;
  joinBtn.disabled = true;
  joinBtn.innerText = 'No Jogo';
});

document.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(key)) {
    keys.add(key);
    // Só previne o scroll se estiver focado no jogo ou se o jogador já entrou
    if (joined) e.preventDefault();
  }
});

document.addEventListener('keyup', (e) => {
  keys.delete(e.key.toLowerCase());
});

socket.on('connect', () => {
  myId = socket.id;
  console.log('Conectado ao servidor com ID:', myId);
});

socket.on('current_players', (serverPlayers) => {
  // Limpa e reinicializa o objeto de jogadores para evitar dados obsoletos
  for (let id in players) delete players[id];
  Object.assign(players, serverPlayers);
});

socket.on('new_player', (player) => {
  players[player.id] = player;
});

socket.on('player_moved', (player) => {
  // Não atualiza a própria posição via servidor para evitar "jitter" (lag visual)
  // A posição local é a "fonte da verdade" para o cliente local
  if (player.id !== myId) {
    players[player.id] = player;
  }
});

socket.on('player_disconnected', (id) => {
  delete players[id];
});

function update() {
  if (joined && myId && players[myId]) {
    let dx = 0;
    let dy = 0;
    
    if (keys.has('arrowup') || keys.has('w')) dy -= speed;
    if (keys.has('arrowdown') || keys.has('s')) dy += speed;
    if (keys.has('arrowleft') || keys.has('a')) dx -= speed;
    if (keys.has('arrowright') || keys.has('d')) dx += speed;

    if (dx !== 0 || dy !== 0) {
      // Normalização para movimento diagonal não ser mais rápido
      if (dx !== 0 && dy !== 0) {
        const factor = 1 / Math.sqrt(2);
        dx *= factor;
        dy *= factor;
      }

      const oldX = players[myId].x;
      const oldY = players[myId].y;

      players[myId].x = Math.max(10, Math.min(canvas.width - 10, players[myId].x + dx));
      players[myId].y = Math.max(10, Math.min(canvas.height - 10, players[myId].y + dy));

      // Só emite se a posição realmente mudou (após o clamp)
      if (players[myId].x !== oldX || players[myId].y !== oldY) {
        socket.emit('player_movement', { x: players[myId].x, y: players[myId].y });
      }
    }
  }
}

function drawGrid() {
  ctx.strokeStyle = 'rgba(43, 227, 255, 0.1)';
  ctx.lineWidth = 1;
  
  ctx.beginPath();
  for (let x = 0; x <= canvas.width; x += 40) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
  }
  for (let y = 0; y <= canvas.height; y += 40) {
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
  }
  ctx.stroke();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  Object.values(players).forEach((player) => {
    if (!player.x || !player.y) return;

    ctx.save();
    
    // Desenha o rastro/brilho
    ctx.beginPath();
    ctx.fillStyle = player.color || '#fff';
    ctx.shadowColor = player.color || '#fff';
    ctx.shadowBlur = 15;
    ctx.arc(player.x, player.y, 10, 0, Math.PI * 2);
    ctx.fill();

    // Texto do nome
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#e9f6ff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    // Adiciona um indicador "(Você)" para o próprio jogador
    const displayName = player.id === myId ? `${player.username} (Você)` : player.username;
    ctx.fillText(displayName, player.x, player.y - 18);
    
    ctx.restore();
  });
}

function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

// Inicia o loop
loop();
