import { CONFIG } from './constants.js';
import { Renderer } from './renderer.js';
import { Joystick } from './joystick.js';
import { ActionButtons } from './actions.js';

const socket = io();
const joystick = new Joystick('joystickZone', 'joystickStick', 'joystickBase');
const actions = new ActionButtons('jumpBtn', 'attackBtn');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const renderer = new Renderer(canvas, ctx);

const ui = {
  username: document.getElementById('username'),
  color: document.getElementById('color'),
  joinBtn: document.getElementById('joinBtn'),
  chatInput: document.getElementById('chatInput'),
  chatMessages: document.getElementById('chatMessages')
};

const state = {
  players: {},
  myId: null,
  joined: false,
  isJumping: false,
  jumpVelocity: 0,
  jumpHeight: 30,
  gravity: 0.8,
  attackCooldown: 0,
  attackDuration: 200
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

socket.on('new_message', (msg) => {
  const msgEl = document.createElement('div');
  msgEl.className = 'message';
  msgEl.innerHTML = `<span class="username" style="color: ${msg.color}">${msg.username}:</span> ${msg.text}`;
  ui.chatMessages.appendChild(msgEl);
  ui.chatMessages.scrollTop = ui.chatMessages.scrollHeight;
});

socket.on('player_attack', (attackData) => {
  if (attackData.id === state.myId) return;
  const attacker = state.players[attackData.id];
  if (attacker) {
    attacker.isAttacking = true;
    setTimeout(() => {
      attacker.isAttacking = false;
    }, state.attackDuration);
  }
});

ui.chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const text = ui.chatInput.value.trim();
    if (text && state.joined) {
      socket.emit('send_message', text);
      ui.chatInput.value = '';
    }
  }
});

// Loop Principal - Joystick + Ações Multi-touch
function update() {
  if (!state.joined || !state.myId || !state.players[state.myId]) return;

  const me = state.players[state.myId];
  const joystickInput = joystick.getInput();
  const currentActions = actions.getActions();

  // Movimento
  let dx = joystickInput.x * CONFIG.SPEED;
  let dy = joystickInput.y * CONFIG.SPEED;

  // Pulo
  if (currentActions.jump && !state.isJumping) {
    state.isJumping = true;
    state.jumpVelocity = -state.jumpHeight;
  }

  if (state.isJumping) {
    state.jumpVelocity += state.gravity;
    if (state.jumpVelocity >= 0) {
      state.isJumping = false;
      state.jumpVelocity = 0;
    }
  }

  // Ataque
  if (currentActions.attack && state.attackCooldown <= 0) {
    state.attackCooldown = state.attackDuration;
    me.isAttacking = true;
    setTimeout(() => {
      me.isAttacking = false;
    }, state.attackDuration);
    
    socket.emit('player_attack', { 
      x: me.x, 
      y: me.y,
      timestamp: Date.now()
    });
  }

  if (state.attackCooldown > 0) {
    state.attackCooldown -= 16;
  }

  const oldX = me.x;
  const oldY = me.y;

  me.x = Math.max(10, Math.min(canvas.width - 10, me.x + dx));
  me.y = Math.max(10, Math.min(canvas.height - 10, me.y + dy));
  
  if (!me.jumpOffset) me.jumpOffset = 0;
  me.jumpOffset = state.jumpVelocity;

  if (me.x !== oldX || me.y !== oldY || state.isJumping) {
    if (!me.trail) me.trail = [];
    me.trail.push({ x: me.x, y: me.y });
    if (me.trail.length > CONFIG.TRAIL_LENGTH) me.trail.shift();
    
    socket.emit('player_movement', { 
      x: me.x, 
      y: me.y,
      trail: me.trail,
      jumpOffset: me.jumpOffset,
      isJumping: state.isJumping
    });
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
