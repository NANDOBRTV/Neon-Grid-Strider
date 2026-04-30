const Player = require('../models/Player');
const { sanitizeUsername, sanitizeColor, sanitizePosition } = require('../utils/helpers');

const activePlayers = {};

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`[CONEXÃO] Novo dispositivo: ${socket.id}`);

    socket.on('join_game', async (data = {}) => {
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

      try {
        await Player.save(player);
        socket.emit('current_players', activePlayers);
        socket.broadcast.emit('new_player', player);
      } catch (err) {
        console.error(`Erro ao salvar jogador ${socket.id}:`, err.message);
      }
    });

    socket.on('player_movement', (movementData) => {
      if (!activePlayers[socket.id]) return;

      const safePosition = sanitizePosition(movementData);
      activePlayers[socket.id].x = safePosition.x;
      activePlayers[socket.id].y = safePosition.y;
      // Repassa a trilha se ela existir nos dados recebidos
      if (movementData.trail) {
        activePlayers[socket.id].trail = movementData.trail;
      }

      socket.broadcast.emit('player_moved', activePlayers[socket.id]);
    });

    socket.on('send_message', (text) => {
      if (!activePlayers[socket.id] || typeof text !== 'string') return;
      const message = {
        username: activePlayers[socket.id].username,
        text: text.slice(0, 50),
        color: activePlayers[socket.id].color
      };
      io.emit('new_message', message);
    });

    socket.on('player_attack', (attackData) => {
      if (!activePlayers[socket.id]) return;
      const attacker = activePlayers[socket.id];
      const attack = {
        id: socket.id,
        username: attacker.username,
        x: attackData.x,
        y: attackData.y,
        color: attacker.color,
        timestamp: attackData.timestamp
      };
      socket.broadcast.emit('player_attack', attack);
    });

    socket.on('disconnect', async () => {
      console.log(`[DESCONEXÃO] Dispositivo saiu: ${socket.id}`);
      if (!activePlayers[socket.id]) return;

      const player = activePlayers[socket.id];

      try {
        await Player.updatePosition(socket.id, player.x, player.y);
      } catch (err) {
        console.error(`Erro ao atualizar posição final de ${socket.id}:`, err.message);
      } finally {
        delete activePlayers[socket.id];
        io.emit('player_disconnected', socket.id);
      }
    });
  });
};
