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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        datasource VARCHAR(20) NOT NULL DEFAULT 'serenity'
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    await pool.execute(query);
  }

  static async insert(stats) {
    const query = `
      INSERT INTO online_player_stats (players, server_version, start_time, vip, recorded_at, created_at, datasource)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      stats.players,
      stats.server_version,
      stats.start_time,
      stats.vip ? 1 : 0,
      stats.recorded_at,
      stats.recorded_at,
      stats.datasource || 'serenity'
    ];
    
    try {
      await pool.execute(query, params);
      return true;
    } catch (error) {
      console.error('Error inserting online player stats:', error);
      throw error;
    }
  }

  static async findAll(page = 1, limit = 10, datasource = null) {
    const pageInt = parseInt(page) || 1;
    const limitInt = parseInt(limit) || 10;
    const offset = (pageInt - 1) * limitInt;
    
    let query = `
      SELECT * FROM online_player_stats
    `;
    
    const params = [];
    if (datasource) {
      query += ` WHERE datasource = ?`;
      params.push(datasource);
    }
    
    query += `
      ORDER BY recorded_at ASC
      LIMIT ${limitInt} OFFSET ${offset}
    `;
    
    const [rows] = await pool.execute(query, params);
    return rows;
  }

  static async countAll(datasource = null) {
    let query = `SELECT COUNT(*) as count FROM online_player_stats`;
    const params = [];
    
    if (datasource) {
      query += ` WHERE datasource = ?`;
      params.push(datasource);
    }
    
    const [rows] = await pool.execute(query, params);
    return rows[0].count;
  }

  static async findByDateRange(startDate, endDate, page = 1, limit = 10, datasource = null) {
    const pageInt = parseInt(page) || 1;
    const limitInt = parseInt(limit) || 10;
    const offset = (pageInt - 1) * limitInt;
    
    let query = `
      SELECT * FROM online_player_stats
      WHERE recorded_at BETWEEN ? AND ?
    `;
    
    const params = [startDate, endDate];
    
    if (datasource) {
      query += ` AND datasource = ?`;
      params.push(datasource);
    }
    
    query += `
      ORDER BY recorded_at DESC
      LIMIT ${limitInt} OFFSET ${offset}
    `;
    
    const [rows] = await pool.execute(query, params);
    return rows;
  }

  static async countByDateRange(startDate, endDate, datasource = null) {
    let query = `
      SELECT COUNT(*) as count FROM online_player_stats
      WHERE recorded_at BETWEEN ? AND ?
    `;
    const params = [startDate, endDate];
    
    if (datasource) {
      query += ` AND datasource = ?`;
      params.push(datasource);
    }
    
    const [rows] = await pool.execute(query, params);
    return rows[0].count;
  }

  static async getLatest(datasource = null) {
    let query = `
      SELECT * FROM online_player_stats
    `;
    
    const params = [];
    if (datasource) {
      query += ` WHERE datasource = ?`;
      params.push(datasource);
    }
    
    query += `
      ORDER BY recorded_at DESC
      LIMIT 1
    `;
    
    const [rows] = await pool.execute(query, params);
    return rows.length > 0 ? rows[0] : null;
  }

  // 按时间维度聚合数据
  static async getAggregatedStats(dimension, page = 1, limit = 10, datasource = null) {
    const pageInt = parseInt(page) || 1;
    const limitInt = parseInt(limit) || 10;
    const offset = (pageInt - 1) * limitInt;
    
    let timeFormat = '';
    let queryParams = [];
    let whereClause = '';
    
    switch (dimension) {
      case 'month':
        timeFormat = '%Y-%m';
        break;
      case 'day':
        timeFormat = '%Y-%m-%d';
        break;
      case 'hour':
        timeFormat = '%Y-%m-%d %H:00';
        // 对于小时维度，只返回最近24小时的数据
        whereClause = 'WHERE recorded_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)';
        break;
      case 'minute':
      default:
        timeFormat = '%Y-%m-%d %H:%i';
        break;
    }
    
    // 添加数据源过滤条件
    if (datasource) {
      if (whereClause) {
        whereClause += ` AND datasource = ?`;
      } else {
        whereClause = 'WHERE datasource = ?';
      }
      queryParams.push(datasource);
    }
    
    // 查询聚合数据
    const query = `
      SELECT 
        DATE_FORMAT(recorded_at, '${timeFormat}') as recorded_at,
        AVG(players) as avg_players,
        MAX(players) as max_players,
        MIN(players) as min_players,
        COUNT(*) as data_points
      FROM online_player_stats
      ${whereClause}
      GROUP BY DATE_FORMAT(recorded_at, '${timeFormat}')
      ORDER BY recorded_at DESC
      LIMIT ${limitInt} OFFSET ${offset}
    `;
    
    // 查询总记录数
    const countQuery = `
      SELECT COUNT(DISTINCT DATE_FORMAT(recorded_at, '${timeFormat}')) as count
      FROM online_player_stats
      ${whereClause}
    `;
    
    try {
      const [rows] = await pool.execute(query, queryParams);
      const [countRows] = await pool.execute(countQuery, queryParams);
      
      return {
        data: rows,
        total: countRows[0].count
      };
    } catch (error) {
      console.error('Error getting aggregated stats:', error);
      throw error;
    }
  }
}

module.exports = OnlinePlayerStats;