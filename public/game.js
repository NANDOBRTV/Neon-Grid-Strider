const socket = io();

const screens = {
  auth: document.getElementById('authScreen'),
  loadingCharacter: document.getElementById('loadingCharacter'),
  character: document.getElementById('characterScreen'),
  loadingGame: document.getElementById('loadingGame'),
  game: document.getElementById('gameScreen'),
};

const authUser = document.getElementById('authUser');
const authPass = document.getElementById('authPass');
const authMsg = document.getElementById('authMsg');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const characterList = document.getElementById('characterList');
const confirmCharacterBtn = document.getElementById('confirmCharacterBtn');
const playerInfo = document.getElementById('playerInfo');

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const characters = [
  { id: 'strider', name: 'Strider', color: '#2be3ff' },
  { id: 'blaze', name: 'Blaze', color: '#ff4d8a' },
  { id: 'volt', name: 'Volt', color: '#ffe066' },
];

const keys = new Set();
const players = {};
let myId = null;
let authToken = null;
let selectedCharacter = null;
let currentUser = null;

function showScreen(name) {
  Object.values(screens).forEach((el) => el.classList.remove('active'));
  screens[name].classList.add('active');
}

function showLoading(nextScreen, wait = 1200) {
  showScreen(nextScreen === 'character' ? 'loadingCharacter' : 'loadingGame');
  setTimeout(() => showScreen(nextScreen), wait);
}

function renderCharacterCards() {
  characterList.innerHTML = '';
  characters.forEach((char) => {
    const card = document.createElement('button');
    card.className = 'character-card';
    card.textContent = char.name;
    card.style.borderColor = char.color;
    card.onclick = () => {
      selectedCharacter = char;
      document.querySelectorAll('.character-card').forEach((c) => c.classList.remove('selected'));
      card.classList.add('selected');
    };
    characterList.appendChild(card);
  });
}

function auth(action) {
  socket.emit(action, { username: authUser.value.trim(), password: authPass.value });
}

loginBtn.onclick = () => auth('login');
registerBtn.onclick = () => auth('register');

socket.on('auth_success', ({ token, username }) => {
  authToken = token;
  currentUser = username;
  authMsg.textContent = 'Autenticado com sucesso!';
  renderCharacterCards();
  showLoading('character');
});

socket.on('auth_error', ({ message }) => {
  authMsg.textContent = message;
});

confirmCharacterBtn.onclick = () => {
  if (!selectedCharacter) {
    alert('Selecione um personagem.');
    return;
  }
  socket.emit('start_game', { token: authToken, characterId: selectedCharacter.id, color: selectedCharacter.color });
  showLoading('game');
};

socket.on('game_started', ({ you, allPlayers }) => {
  myId = you.id;
  Object.keys(players).forEach((id) => delete players[id]);
  Object.assign(players, allPlayers);
  playerInfo.textContent = `Jogador: ${currentUser} | Personagem: ${selectedCharacter?.name || '-'}`;
});

socket.on('new_player', (player) => { players[player.id] = player; });
socket.on('player_moved', (player) => { players[player.id] = player; });
socket.on('player_disconnected', (id) => { delete players[id]; });

document.addEventListener('keydown', (e) => keys.add(e.key.toLowerCase()));
document.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

function update() {
  const me = players[myId];
  if (!me) return;

  me.vx = 0;
  if (keys.has('a') || keys.has('arrowleft')) me.vx = -4;
  if (keys.has('d') || keys.has('arrowright')) me.vx = 4;

  if ((keys.has('w') || keys.has('arrowup') || keys.has(' ')) && me.grounded) {
    me.vy = -10;
    me.grounded = false;
  }

  me.vy += 0.45;
  me.x += me.vx;
  me.y += me.vy;

  if (me.y >= 430) {
    me.y = 430;
    me.vy = 0;
    me.grounded = true;
  }

  me.x = Math.max(20, Math.min(canvas.width - 20, me.x));
  socket.emit('player_movement', { x: me.x, y: me.y, vx: me.vx, vy: me.vy });
}

function drawLevel() {
  ctx.fillStyle = '#0a1426';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#1d2a42';
  ctx.fillRect(0, 450, canvas.width, 50);
}

function render() {
  drawLevel();
  Object.values(players).forEach((p) => {
    ctx.fillStyle = p.color || '#fff';
    ctx.fillRect(p.x - 12, p.y - 24, 24, 24);
    ctx.fillStyle = '#fff';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.username, p.x, p.y - 30);
  });
}

function loop() {
  if (screens.game.classList.contains('active')) {
    update();
    render();
  }
  requestAnimationFrame(loop);
}

loop();
showScreen('auth');
