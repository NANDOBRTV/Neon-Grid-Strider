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
  socket.emit('join_game', {
    username: usernameInput.value,
    color: colorInput.value,
    x: canvas.width / 2,
    y: canvas.height / 2,
  });
  joined = true;
});

document.addEventListener('keydown', (e) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d", "W", "A", "S", "D"].includes(e.key)) {
    keys.add(e.key.toLowerCase());
    e.preventDefault();
  }
});

document.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

socket.on('connect', () => {
  myId = socket.id;
});

socket.on('current_players', (serverPlayers) => {
  Object.assign(players, serverPlayers);
});

socket.on('new_player', (player) => {
  players[player.id] = player;
});

socket.on('player_moved', (player) => {
  players[player.id] = player;
});

socket.on('player_disconnected', (id) => {
  delete players[id];
});

function update() {
  if (joined && players[myId]) {
    let dx = 0;
    let dy = 0;
    if (keys.has('arrowup') || keys.has('w')) dy -= speed;
    if (keys.has('arrowdown') || keys.has('s')) dy += speed;
    if (keys.has('arrowleft') || keys.has('a')) dx -= speed;
    if (keys.has('arrowright') || keys.has('d')) dx += speed;

    if (dx || dy) {
      players[myId].x = Math.max(10, Math.min(canvas.width - 10, players[myId].x + dx));
      players[myId].y = Math.max(10, Math.min(canvas.height - 10, players[myId].y + dy));
      socket.emit('player_movement', { x: players[myId].x, y: players[myId].y });
    }
  }
}

function drawGrid() {
  ctx.strokeStyle = 'rgba(43, 227, 255, 0.1)';
  for (let x = 0; x < canvas.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  Object.values(players).forEach((player) => {
    ctx.beginPath();
    ctx.fillStyle = player.color || '#fff';
    ctx.shadowColor = player.color || '#fff';
    ctx.shadowBlur = 12;
    ctx.arc(player.x, player.y, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#e9f6ff';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(player.username, player.x, player.y - 16);
  });
}

function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

loop();
