const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

const db = new sqlite3.Database('./neon_grid.db');
const activePlayers = {};
const sessions = new Map();

function sanitizeUsername(input, fallback = 'Runner') {
  if (typeof input !== 'string') return fallback;
  const cleaned = input.trim().replace(/\s+/g, ' ').slice(0, 24);
  return cleaned || fallback;
}

function sanitizePosition(data = {}) {
  const x = Number(data.x);
  const y = Number(data.y);
  return {
    x: Number.isFinite(x) ? x : 120,
    y: Number.isFinite(y) ? y : 430,
  };
}

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    x REAL DEFAULT 120,
    y REAL DEFAULT 430,
    color TEXT NOT NULL,
    character_id TEXT
  )`);
});

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  socket.on('register', ({ username, password } = {}) => {
    const safeUser = sanitizeUsername(username, '');
    if (!safeUser || typeof password !== 'string' || password.length < 4) {
      socket.emit('auth_error', { message: 'Usuário/senha inválidos. Mínimo 4 caracteres na senha.' });
      return;
    }

    db.run('INSERT INTO users (username, password) VALUES (?, ?)', [safeUser, password], (err) => {
      if (err) {
        socket.emit('auth_error', { message: 'Usuário já existe.' });
        return;
      }
      const token = crypto.randomBytes(16).toString('hex');
      sessions.set(token, safeUser);
      socket.emit('auth_success', { token, username: safeUser });
    });
  });

  socket.on('login', ({ username, password } = {}) => {
    const safeUser = sanitizeUsername(username, '');
    db.get('SELECT username FROM users WHERE username = ? AND password = ?', [safeUser, password], (err, row) => {
      if (err || !row) {
        socket.emit('auth_error', { message: 'Credenciais inválidas.' });
        return;
      }
      const token = crypto.randomBytes(16).toString('hex');
      sessions.set(token, safeUser);
      socket.emit('auth_success', { token, username: safeUser });
    });
  });

  socket.on('start_game', ({ token, characterId, color } = {}) => {
    const username = sessions.get(token);
    if (!username) {
      socket.emit('auth_error', { message: 'Sessão inválida. Faça login novamente.' });
      return;
    }

    db.get('SELECT x, y, color FROM players WHERE username = ? LIMIT 1', [username], (err, row) => {
      const spawn = sanitizePosition(row || {});
      const player = {
        id: socket.id,
        username,
        x: spawn.x,
        y: spawn.y,
        vx: 0,
        vy: 0,
        grounded: true,
        color: typeof color === 'string' ? color : '#2be3ff',
        characterId: characterId || 'strider',
      };

      activePlayers[socket.id] = player;

      db.run('INSERT OR REPLACE INTO players (id, username, x, y, color, character_id) VALUES (?, ?, ?, ?, ?, ?)',
        [player.id, player.username, player.x, player.y, player.color, player.characterId]);

      socket.emit('game_started', { you: player, allPlayers: activePlayers });
      socket.broadcast.emit('new_player', player);
    });
  });

  socket.on('player_movement', (movementData) => {
    const me = activePlayers[socket.id];
    if (!me) return;
    const pos = sanitizePosition(movementData);
    me.x = pos.x;
    me.y = pos.y;
    me.vx = Number(movementData.vx) || 0;
    me.vy = Number(movementData.vy) || 0;
    socket.broadcast.emit('player_moved', me);
  });

  socket.on('disconnect', () => {
    const me = activePlayers[socket.id];
    if (!me) return;
    db.run('UPDATE players SET x = ?, y = ? WHERE id = ?', [me.x, me.y, socket.id]);
    delete activePlayers[socket.id];
    io.emit('player_disconnected', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Servidor online em http://localhost:${PORT}`);
});
