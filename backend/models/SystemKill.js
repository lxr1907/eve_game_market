const pool = require('../config/database');

class SystemKill {
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS system_kills (
        id INT AUTO_INCREMENT PRIMARY KEY,
        system_id INT,
        npc_kills INT,
        pod_kills INT,
        ship_kills INT,
        total_kills INT,
        datasource VARCHAR(20) NOT NULL DEFAULT 'infinity',
        timestamp DATETIME,
        system_name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    await pool.execute(query);
  }

  static async insertOrUpdate(systemKillData) {
    // 计算总击杀数
    const totalKills = (systemKillData.npc_kills || 0) + (systemKillData.pod_kills || 0) + (systemKillData.ship_kills || 0);
    
    const query = `
      INSERT INTO system_kills (
        system_id, npc_kills, pod_kills, ship_kills, total_kills, datasource, timestamp, system_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        npc_kills = VALUES(npc_kills),
        pod_kills = VALUES(pod_kills),
        ship_kills = VALUES(ship_kills),
        total_kills = VALUES(total_kills),
        datasource = VALUES(datasource),
        timestamp = VALUES(timestamp),
        system_name = VALUES(system_name),
        updated_at = CURRENT_TIMESTAMP
    `;
    
    const params = [
      systemKillData.system_id,
      systemKillData.npc_kills || 0,
      systemKillData.pod_kills || 0,
      systemKillData.ship_kills || 0,
      totalKills,
      systemKillData.datasource || 'infinity',
      systemKillData.timestamp || new Date(),
      systemKillData.system_name
    ];
    
    try {
      await pool.execute(query, params);
      return true;
    } catch (error) {
      console.error('Error inserting/updating system kill:', error);
      throw error;
    }
  }

  static async batchInsertOrUpdate(systemKillsData, datasource = 'infinity') {
    if (!systemKillsData || systemKillsData.length === 0) {
      return;
    }

    // 构建批量插入语句
    const placeholders = systemKillsData.map(() => `(?, ?, ?, ?, ?, ?, ?, ?)`).join(', ');
    const params = [];
    
    systemKillsData.forEach(kill => {
      const totalKills = (kill.npc_kills || 0) + (kill.pod_kills || 0) + (kill.ship_kills || 0);
      params.push(
        kill.system_id,
        kill.npc_kills || 0,
        kill.pod_kills || 0,
        kill.ship_kills || 0,
        totalKills,
        datasource,
        new Date(),
        kill.system_name
      );
    });

    const query = `
      INSERT INTO system_kills (
        system_id, npc_kills, pod_kills, ship_kills, total_kills, datasource, timestamp, system_name
      ) VALUES ${placeholders}
      ON DUPLICATE KEY UPDATE
        npc_kills = VALUES(npc_kills),
        pod_kills = VALUES(pod_kills),
        ship_kills = VALUES(ship_kills),
        total_kills = VALUES(total_kills),
        datasource = VALUES(datasource),
        timestamp = VALUES(timestamp),
        system_name = VALUES(system_name),
        updated_at = CURRENT_TIMESTAMP
    `;

    try {
      await pool.execute(query, params);
      return true;
    } catch (error) {
      console.error('Error batch inserting/updating system kills:', error);
      throw error;
    }
  }

  static async findAll(page = 1, limit = 10, datasource = 'infinity', search = '', sortBy = 'ship_kills', sortOrder = 'descending') {
    const pageInt = parseInt(page) || 1;
    const limitInt = parseInt(limit) || 10;
    const offset = (pageInt - 1) * limitInt;
    
    // 验证排序字段，确保只允许安全的字段排序
    const validSortFields = ['system_id', 'system_name', 'npc_kills', 'pod_kills', 'ship_kills', 'timestamp'];
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'ship_kills';
    // 转换排序方向为MySQL支持的格式（ASC或DESC）
    const safeSortOrder = sortOrder.toLowerCase().includes('desc') ? 'DESC' : 'ASC';
    
    // 使用MAX(id)获取每个system_id的最新记录，因为id是自增的，更可靠
    let query = `
      SELECT sk.*
      FROM system_kills sk
      WHERE sk.id IN (
        SELECT MAX(id)
        FROM system_kills
        WHERE datasource = ?
        GROUP BY system_id
      )
      AND sk.datasource = ?
    `;
    let params = [datasource, datasource];
    
    if (search) {
      query += ` AND (sk.system_id = ? OR sk.system_name LIKE ?)`;
      params.push(search, `%${search}%`);
    }
    
    // 构建排序语句
    query += ` ORDER BY sk.${safeSortBy} ${safeSortOrder.toUpperCase()} LIMIT ${limitInt} OFFSET ${offset}`;
    
    const [rows] = await pool.execute(query, params);
    return rows;
  }

  static async count(datasource = 'infinity', search = '') {
    // 使用与findAll相同的查询结构来确保计数一致
    let query = `
      SELECT COUNT(*) as count FROM (
        SELECT sk.system_id FROM system_kills sk
        INNER JOIN (
          SELECT system_id, MAX(timestamp) as max_timestamp
          FROM system_kills
          WHERE datasource = ?
          GROUP BY system_id
        ) as latest
        ON sk.system_id = latest.system_id AND sk.timestamp = latest.max_timestamp
        WHERE sk.datasource = ?
    `;
    let params = [datasource, datasource];
    
    if (search) {
      query += ` AND (sk.system_id = ? OR sk.system_name LIKE ?)`;
      params.push(search, `%${search}%`);
    }
    
    query += `
        GROUP BY sk.system_id
      ) as distinct_systems
    `;
    
    const [rows] = await pool.execute(query, params);
    return rows[0].count;
  }

  static async findBySystemId(systemId, datasource = 'infinity') {
    const query = `
      SELECT sk.* FROM system_kills sk
      INNER JOIN (
        SELECT system_id, MAX(timestamp) as max_timestamp
        FROM system_kills
        WHERE system_id = ? AND datasource = ?
        GROUP BY system_id
      ) as latest
      ON sk.system_id = latest.system_id AND sk.timestamp = latest.max_timestamp
      WHERE sk.datasource = ?
    `;
    const [rows] = await pool.execute(query, [systemId, datasource, datasource]);
    return rows[0] ? rows[0] : null;
  }

  static async getLatestUpdate(datasource = 'infinity') {
    const query = `SELECT MAX(timestamp) as latest_update FROM system_kills WHERE datasource = ?`;
    const [rows] = await pool.execute(query, [datasource]);
    return rows[0].latest_update;
  }
}

module.exports = SystemKill;