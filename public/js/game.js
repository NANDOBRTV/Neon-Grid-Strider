import { CONFIG } from './constants.js';
import { Renderer } from './renderer.js';

const socket = io();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const renderer = new Renderer(canvas, ctx);

const ui = {
  username: document.getElementById('username'),
  color: document.getElementById('color'),
  joinBtn: document.getElementById('joinBtn')
};

const state = {
  players: {},
  myId: null,
  joined: false,
  keys: new Set()
};

// Eventos de UI
ui.joinBtn.addEventListener('click', () => {
  if (state.joined) return;
  
  if (socket.id) state.myId = socket.id;

  socket.emit('join_game', {
    username: ui.username.value || 'Runner',
    color: ui.color.value,
    x: canvas.width / 2,
    y: canvas.height / 2,
  });

  state.joined = true;
  ui.username.disabled = true;
  ui.color.disabled = true;
  ui.joinBtn.disabled = true;
  ui.joinBtn.innerText = 'No Jogo';
});

// Input de Teclado
document.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(key)) {
    state.keys.add(key);
    if (state.joined) e.preventDefault();
  }
});

document.addEventListener('keyup', (e) => state.keys.delete(e.key.toLowerCase()));

// Eventos de Socket
socket.on('connect', () => {
  state.myId = socket.id;
});

socket.on('current_players', (serverPlayers) => {
  state.players = serverPlayers;
});

socket.on('new_player', (player) => {
  state.players[player.id] = player;
});

socket.on('player_moved', (player) => {
  if (player.id !== state.myId) {
    state.players[player.id] = player;
  }
});

socket.on('player_disconnected', (id) => {
  delete state.players[id];
});

// Loop Principal
function update() {
  if (!state.joined || !state.myId || !state.players[state.myId]) return;

  let dx = 0;
  let dy = 0;
  const keys = state.keys;
  
  if (keys.has('arrowup') || keys.has('w')) dy -= CONFIG.SPEED;
  if (keys.has('arrowdown') || keys.has('s')) dy += CONFIG.SPEED;
  if (keys.has('arrowleft') || keys.has('a')) dx -= CONFIG.SPEED;
  if (keys.has('arrowright') || keys.has('d')) dx += CONFIG.SPEED;

  if (dx !== 0 || dy !== 0) {
    if (dx !== 0 && dy !== 0) {
      const factor = 1 / Math.sqrt(2);
      dx *= factor;
      dy *= factor;
    }

    const me = state.players[state.myId];
    const oldX = me.x;
    const oldY = me.y;

    me.x = Math.max(10, Math.min(canvas.width - 10, me.x + dx));
    me.y = Math.max(10, Math.min(canvas.height - 10, me.y + dy));

    if (me.x !== oldX || me.y !== oldY) {
      socket.emit('player_movement', { x: me.x, y: me.y });
    }
  }
}

function loop() {
  update();
  renderer.clear();
  renderer.drawGrid();

  Object.values(state.players).forEach(player => {
    renderer.drawPlayer(player, player.id === state.myId);
  });

  requestAnimationFrame(loop);
}

loop();
