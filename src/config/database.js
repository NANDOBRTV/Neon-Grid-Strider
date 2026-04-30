const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../../neon_grid.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao abrir banco:', err.message);
    return;
  }
  console.log('Conectado ao banco de dados SQLite.');
});

function initDatabase() {
  return new Promise((resolve, reject) => {
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
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  });
}

module.exports = { db, initDatabase };
