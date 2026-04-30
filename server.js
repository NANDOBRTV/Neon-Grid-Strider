const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// 1. Configurações Iniciais
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

const DEFAULT_POSITION = Object.freeze({ x: 400, y: 300 });
const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{6})$/;

function generateRandomColor() {
  return `#${Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, '0')}`;
}

function sanitizeUsername(input, socketId) {
  if (typeof input !== 'string') {
    return `Runner_${socketId.slice(0, 4)}`;
  }

  const cleaned = input.trim().replace(/\s+/g, ' ');
  if (!cleaned) {
    return `Runner_${socketId.slice(0, 4)}`;
  }

  return cleaned.slice(0, 24);
}

function sanitizeColor(input) {
  if (typeof input !== 'string') {
    return generateRandomColor();
  }

  const normalized = input.trim();
  return HEX_COLOR_REGEX.test(normalized) ? normalized : generateRandomColor();
}

function sanitizePosition(position) {
  if (!position || typeof position !== 'object') {
    return { ...DEFAULT_POSITION };
  }

  const x = Number(position.x);
  const y = Number(position.y);

  return {
    x: Number.isFinite(x) ? x : DEFAULT_POSITION.x,
    y: Number.isFinite(y) ? y : DEFAULT_POSITION.y,
  };
}

// 2. Configuração do Banco de Dados SQLite
const db = new sqlite3.Database('./neon_grid.db', (err) => {
  if (err) {
    console.error('Erro ao abrir banco:', err.message);
    return;
  }

  console.log('Conectado ao banco de dados SQLite.');
});

// Criar tabela de jogadores se não existir
db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      x REAL DEFAULT 400,
      y REAL DEFAULT 300,
      color TEXT NOT NULL
    )`,
    (err) => {
      if (err) {
        console.error('Erro ao criar tabela players:', err.message);
      }
    }
  );
});

// 3. Middlewares e Arquivos Estáticos
app.use(express.static(path.join(__dirname, 'public')));

// 4. Lógica de Comunicação Real-time (Socket.io)
const activePlayers = {};

io.on('connection', (socket) => {
  console.log(`[CONEXÃO] Novo dispositivo conectado: ${socket.id}`);

  // Quando o jogador entra no jogo via navegador
  socket.on('join_game', (data = {}) => {
    const positionInput = data.position ?? { x: data.x, y: data.y };
    const safePosition = sanitizePosition(positionInput);
    const player = {
      id: socket.id,
      username: sanitizeUsername(data.username, socket.id),
      x: safePosition.x,
      y: safePosition.y,
      color: sanitizeColor(data.color),
    };

    activePlayers[socket.id] = player;

    // Salva/Atualiza no Banco de Dados
    db.run(
      'INSERT OR REPLACE INTO players (id, username, x, y, color) VALUES (?, ?, ?, ?, ?)',
      [player.id, player.username, player.x, player.y, player.color],
      (err) => {
        if (err) {
          console.error(`Erro ao persistir jogador ${player.id}:`, err.message);
        }
      }
    );

    // Envia o estado atual para o novo jogador e avisa os outros
    socket.emit('current_players', activePlayers);
    socket.broadcast.emit('new_player', player);
  });

  // Atualização de movimento vinda do navegador
  socket.on('player_movement', (movementData) => {
    if (!activePlayers[socket.id]) {
      return;
    }

    const safePosition = sanitizePosition(movementData);
    activePlayers[socket.id].x = safePosition.x;
    activePlayers[socket.id].y = safePosition.y;

    // Broadcast otimizado para todos os outros
    socket.broadcast.emit('player_moved', activePlayers[socket.id]);
  });

  // Tratamento de desconexão
  socket.on('disconnect', () => {
    console.log(`[DESCONEXÃO] Dispositivo saiu: ${socket.id}`);
    if (!activePlayers[socket.id]) {
      return;
    }

    const player = activePlayers[socket.id];

    // Persistir posição final antes de remover da memória
    db.run('UPDATE players SET x = ?, y = ? WHERE id = ?', [player.x, player.y, socket.id], (err) => {
      if (err) {
        console.error(`Erro ao atualizar posição final de ${socket.id}:`, err.message);
      }
    });

    delete activePlayers[socket.id];
    io.emit('player_disconnected', socket.id);
  });
});

function shutdown(signal) {
  console.log(`Recebido ${signal}. Encerrando servidor...`);
  server.close((serverErr) => {
    if (serverErr) {
      console.error('Erro ao fechar servidor HTTP:', serverErr.message);
    }

    db.close((err) => {
      if (err) {
        console.error('Erro ao fechar banco de dados:', err.message);
      } else {
        console.log('Banco de dados encerrado com sucesso.');
      }

      if (serverErr || err) {
        process.exitCode = 1;
      }
    });
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('uncaughtException', (error) => {
  console.error('Erro não tratado:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('Promise rejeitada sem tratamento:', reason);
});

// 5. Inicialização do Servidor
server.listen(PORT, () => {
  console.log('-------------------------------------------');
  console.log(`SERVIDOR ONLINE: http://localhost:${PORT}`);
  console.log('DEPLOY RENDER: Verifique o link do dashboard');
  console.log('-------------------------------------------');
});
