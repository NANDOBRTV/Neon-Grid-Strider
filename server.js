const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { initDatabase, db } = require('./src/config/database');
const gameController = require('./src/controllers/gameController');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.static(path.join(__dirname, 'public')));

// Inicialização do Banco de Dados e Controller
initDatabase().then(() => {
  gameController(io);

  server.listen(PORT, () => {
    console.log('-------------------------------------------');
    console.log(`SERVIDOR ONLINE: http://localhost:${PORT}`);
    console.log('-------------------------------------------');
  });
}).catch(err => {
  console.error('Falha ao iniciar o servidor:', err);
  process.exit(1);
});

// Graceful Shutdown
function shutdown(signal) {
  console.log(`Recebido ${signal}. Encerrando...`);
  server.close(() => {
    db.close((err) => {
      if (err) console.error('Erro ao fechar banco:', err.message);
      process.exit(err ? 1 : 0);
    });
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
