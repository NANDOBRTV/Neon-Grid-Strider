const { db } = require('../config/database');

class Player {
  static save(player) {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT OR REPLACE INTO players (id, username, x, y, color) VALUES (?, ?, ?, ?, ?)',
        [player.id, player.username, player.x, player.y, player.color],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  static updatePosition(id, x, y) {
    return new Promise((resolve, reject) => {
      db.run('UPDATE players SET x = ?, y = ? WHERE id = ?', [x, y, id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  static delete(id) {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM players WHERE id = ?', [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

module.exports = Player;
