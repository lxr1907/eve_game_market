const pool = require('../config/database');

class OnlinePlayerStats {

  static async dropTable() {
    const query = `DROP TABLE IF EXISTS online_player_stats`;
    await pool.execute(query);
  }

  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS online_player_stats (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        players INT NOT NULL,
        server_version VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        start_time DATETIME NOT NULL,
        vip BOOLEAN DEFAULT FALSE,
        recorded_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    await pool.execute(query);
  }

  static async insert(stats) {
    const query = `
      INSERT INTO online_player_stats (players, server_version, start_time, vip, recorded_at)
      VALUES (?, ?, ?, ?, ?)
    `;
    const params = [
      stats.players,
      stats.server_version,
      stats.start_time,
      stats.vip ? 1 : 0,
      stats.recorded_at
    ];
    
    try {
      await pool.execute(query, params);
      return true;
    } catch (error) {
      console.error('Error inserting online player stats:', error);
      throw error;
    }
  }

  static async findAll(page = 1, limit = 10) {
    const pageInt = parseInt(page) || 1;
    const limitInt = parseInt(limit) || 10;
    const offset = (pageInt - 1) * limitInt;
    
    const query = `
      SELECT * FROM online_player_stats
      ORDER BY recorded_at DESC
      LIMIT ${limitInt} OFFSET ${offset}
    `;
    
    const [rows] = await pool.execute(query);
    return rows;
  }

  static async countAll() {
    const query = `SELECT COUNT(*) as count FROM online_player_stats`;
    const [rows] = await pool.execute(query);
    return rows[0].count;
  }

  static async findByDateRange(startDate, endDate, page = 1, limit = 10) {
    const pageInt = parseInt(page) || 1;
    const limitInt = parseInt(limit) || 10;
    const offset = (pageInt - 1) * limitInt;
    
    const query = `
      SELECT * FROM online_player_stats
      WHERE recorded_at BETWEEN ? AND ?
      ORDER BY recorded_at DESC
      LIMIT ${limitInt} OFFSET ${offset}
    `;
    
    const params = [startDate, endDate];
    const [rows] = await pool.execute(query, params);
    return rows;
  }

  static async countByDateRange(startDate, endDate) {
    const query = `
      SELECT COUNT(*) as count FROM online_player_stats
      WHERE recorded_at BETWEEN ? AND ?
    `;
    const params = [startDate, endDate];
    const [rows] = await pool.execute(query, params);
    return rows[0].count;
  }

  static async getLatest() {
    const query = `
      SELECT * FROM online_player_stats
      ORDER BY recorded_at DESC
      LIMIT 1
    `;
    
    const [rows] = await pool.execute(query);
    return rows.length > 0 ? rows[0] : null;
  }
}

module.exports = OnlinePlayerStats;