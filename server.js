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

const db = new sqlite3.Database('./neon_grid.db', (err) => {
  if (err) console.error('Erro ao abrir DB:', err.message);
});

const activePlayers = {};
const sessions = new Map();

const DEFAULT_SPAWN = Object.freeze({ x: 120, y: 430 });

function sanitizeUsername(input, fallback = 'Runner') {
  if (typeof input !== 'string') return fallback;
  const cleaned = input.trim().replace(/\s+/g, ' ').slice(0, 24);
  return cleaned || fallback;
}

function sanitizePosition(data = {}) {
  const x = Number(data.x);
  const y = Number(data.y);
  return {
    x: Number.isFinite(x) ? x : DEFAULT_SPAWN.x,
    y: Number.isFinite(y) ? y : DEFAULT_SPAWN.y,
  };
}

function sanitizeColor(color) {
  return typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#2be3ff';
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, originalHash] = String(storedHash || '').split(':');
  if (!salt || !originalHash) return false;
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
}

function newToken() {
  return crypto.randomBytes(24).toString('hex');
}

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    x REAL DEFAULT 120,
    y REAL DEFAULT 430,
    color TEXT NOT NULL,
    character_id TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  socket.on('register', ({ username, password } = {}) => {
    const safeUser = sanitizeUsername(username, '');
    if (!safeUser || typeof password !== 'string' || password.length < 4) {
      socket.emit('auth_error', { message: 'Usuário/senha inválidos. Senha mínima: 4.' });
      return;
    }

    const passwordHash = hashPassword(password);
    db.run('INSERT INTO users (username, password_hash) VALUES (?, ?)', [safeUser, passwordHash], (err) => {
      if (err) {
        socket.emit('auth_error', { message: 'Usuário já existe.' });
        return;
      }

      const token = newToken();
      sessions.set(token, safeUser);
      socket.emit('auth_success', { token, username: safeUser });
    });
  });

  socket.on('login', ({ username, password } = {}) => {
    const safeUser = sanitizeUsername(username, '');
    if (!safeUser || typeof password !== 'string') {
      socket.emit('auth_error', { message: 'Credenciais inválidas.' });
      return;
    }

    db.get('SELECT username, password_hash FROM users WHERE username = ?', [safeUser], (err, row) => {
      if (err || !row || !verifyPassword(password, row.password_hash)) {
        socket.emit('auth_error', { message: 'Credenciais inválidas.' });
        return;
      }

      const token = newToken();
      sessions.set(token, row.username);
      socket.emit('auth_success', { token, username: row.username });
    });
  });

  socket.on('start_game', ({ token, characterId, color } = {}) => {
    const username = sessions.get(token);
    if (!username) {
      socket.emit('auth_error', { message: 'Sessão inválida. Faça login novamente.' });
      return;
    }

    db.get('SELECT x, y, color, character_id FROM players WHERE username = ? LIMIT 1', [username], (err, row) => {
      if (err) {
        socket.emit('auth_error', { message: 'Erro ao iniciar partida.' });
        return;
      }

      const spawn = sanitizePosition(row || {});
      const player = {
        id: socket.id,
        username,
        x: spawn.x,
        y: spawn.y,
        vx: 0,
        vy: 0,
        grounded: true,
        color: sanitizeColor(color || row?.color),
        characterId: characterId || row?.character_id || 'strider',
      };

      activePlayers[socket.id] = player;

      db.run(
        `INSERT OR REPLACE INTO players (id, username, x, y, color, character_id, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [player.id, player.username, player.x, player.y, player.color, player.characterId]
      );

      socket.emit('game_started', { you: player, allPlayers: activePlayers });
      socket.broadcast.emit('new_player', player);
    });
  });

  socket.on('player_movement', (movementData = {}) => {
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

    db.run('UPDATE players SET x = ?, y = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [me.x, me.y, socket.id]);
    delete activePlayers[socket.id];
    io.emit('player_disconnected', socket.id);
  });
});

function shutdown(signal) {
  console.log(`Recebido ${signal}. Encerrando...`);
  server.close(() => {
    db.close((err) => {
      if (err) console.error('Erro ao fechar DB:', err.message);
      process.exit(err ? 1 : 0);
    });
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

server.listen(PORT, () => {
  console.log(`Servidor online em http://localhost:${PORT}`);
});
