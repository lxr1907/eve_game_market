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
        system_id, npc_kills, pod_kills, ship_kills, total_kills, datasource, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        npc_kills = VALUES(npc_kills),
        pod_kills = VALUES(pod_kills),
        ship_kills = VALUES(ship_kills),
        total_kills = VALUES(total_kills),
        datasource = VALUES(datasource),
        timestamp = VALUES(timestamp),
        updated_at = CURRENT_TIMESTAMP
    `;
    
    const params = [
      systemKillData.system_id,
      systemKillData.npc_kills || 0,
      systemKillData.pod_kills || 0,
      systemKillData.ship_kills || 0,
      totalKills,
      systemKillData.datasource || 'infinity',
      systemKillData.timestamp || new Date()
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
    const placeholders = systemKillsData.map(() => `(?, ?, ?, ?, ?, ?, ?)`).join(', ');
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
        new Date()
      );
    });

    const query = `
      INSERT INTO system_kills (
        system_id, npc_kills, pod_kills, ship_kills, total_kills, datasource, timestamp
      ) VALUES ${placeholders}
      ON DUPLICATE KEY UPDATE
        npc_kills = VALUES(npc_kills),
        pod_kills = VALUES(pod_kills),
        ship_kills = VALUES(ship_kills),
        total_kills = VALUES(total_kills),
        datasource = VALUES(datasource),
        timestamp = VALUES(timestamp),
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

  static async findAll(page = 1, limit = 10, datasource = 'infinity', search = '', sortBy = 'ship_kills', sortOrder = 'descending', securityStatus = '', timeRange = 'realtime') {
    const pageInt = parseInt(page) || 1;
    const limitInt = parseInt(limit) || 10;
    const offset = (pageInt - 1) * limitInt;
    
    // 验证排序字段，确保只允许安全的字段排序
    const validSortFields = ['system_id', 'system_name', 'npc_kills', 'pod_kills', 'ship_kills', 'timestamp', 'security_status'];
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'ship_kills';
    // 转换排序方向为MySQL支持的格式（ASC或DESC）
    const safeSortOrder = sortOrder.toLowerCase().includes('desc') ? 'DESC' : 'ASC';
    
    // 时间范围处理
    let timeCondition = '';
    let avgSelect = '';
    let groupBy = '';
    let fromClause = 'system_kills sk';
    let whereClause = 'sk.datasource = ?';
    let params = [datasource];
    
    if (timeRange === '1h') {
      // 1小时内的求和
      avgSelect = 'SUM(sk.npc_kills) AS npc_kills, SUM(sk.pod_kills) AS pod_kills, SUM(sk.ship_kills) AS ship_kills';
      timeCondition = ` AND sk.timestamp >= DATE_SUB(NOW(), INTERVAL 1 HOUR)`;
      groupBy = 'sk.system_id';
    } else if (timeRange === '6h') {
      // 6小时内的求和
      avgSelect = 'SUM(sk.npc_kills) AS npc_kills, SUM(sk.pod_kills) AS pod_kills, SUM(sk.ship_kills) AS ship_kills';
      timeCondition = ` AND sk.timestamp >= DATE_SUB(NOW(), INTERVAL 6 HOUR)`;
      groupBy = 'sk.system_id';
    } else if (timeRange === '1d') {
      // 1天内的求和
      avgSelect = 'SUM(sk.npc_kills) AS npc_kills, SUM(sk.pod_kills) AS pod_kills, SUM(sk.ship_kills) AS ship_kills';
      timeCondition = ` AND sk.timestamp >= DATE_SUB(NOW(), INTERVAL 1 DAY)`;
      groupBy = 'sk.system_id';
    } else {
      // 实时（默认）：获取最新记录
      avgSelect = 'sk.npc_kills, sk.pod_kills, sk.ship_kills';
      // 使用MAX(id)获取每个system_id的最新记录
      fromClause = `(SELECT * FROM system_kills WHERE id IN (
        SELECT MAX(id) FROM system_kills WHERE datasource = ? GROUP BY system_id
      )) sk`;
      params.unshift(datasource);
    }
    
    // 主查询
    let query = `
      SELECT sk.system_id, 
             ${avgSelect},
             s.name AS system_name,
             ROUND(s.security_status, 2) AS security_status
      FROM ${fromClause}
      LEFT JOIN systems s ON sk.system_id = s.system_id
      WHERE ${whereClause}${timeCondition}
    `;
    
    // 添加安全状态过滤
    if (securityStatus === 'high') {
      query += ` AND s.security_status >= 0.5`;
    } else if (securityStatus === 'low') {
      query += ` AND s.security_status > 0 AND s.security_status < 0.5`;
    } else if (securityStatus === 'nullsec') {
      query += ` AND s.security_status <= 0`;
    }
    
    if (search) {
      query += ` AND (sk.system_id = ? OR s.name LIKE ?)`;
      params.push(search, `%${search}%`);
    }
    
    // 添加分组（仅用于时间范围查询）
    if (groupBy) {
      query += ` GROUP BY ${groupBy}`;
    }
    
    // 构建排序语句，注意表别名的使用
    let sortTableAlias = safeSortBy === 'system_name' || safeSortBy === 'security_status' ? 's' : 'sk';
    
    // 对于时间范围查询（使用GROUP BY），确保排序字段是聚合函数或GROUP BY中的列
    if (groupBy) {
      // 如果排序字段是聚合列（npc_kills, pod_kills, ship_kills），不需要表别名
      if (['npc_kills', 'pod_kills', 'ship_kills'].includes(safeSortBy)) {
        sortTableAlias = '';
      }
    }
    
    const sortField = sortTableAlias ? `${sortTableAlias}.${safeSortBy}` : safeSortBy;
    query += ` ORDER BY ${sortField} ${safeSortOrder.toUpperCase()} LIMIT ${limitInt} OFFSET ${offset}`;
    
    const [rows] = await pool.execute(query, params);
    return rows;
  }

  static async count(datasource = 'infinity', search = '', securityStatus = '', timeRange = 'realtime') {
    // 使用与findAll相同的查询结构来确保计数一致
    let query, params;
    
    if (timeRange === '1h' || timeRange === '6h' || timeRange === '1d') {
      // 时间范围查询计数
      query = `
        SELECT COUNT(DISTINCT sk.system_id) as count FROM system_kills sk
        LEFT JOIN systems s ON sk.system_id = s.system_id
        WHERE sk.datasource = ?
      `;
      params = [datasource];
      
      if (timeRange === '1h') {
        query += ` AND sk.timestamp >= DATE_SUB(NOW(), INTERVAL 1 HOUR)`;
      } else if (timeRange === '6h') {
        query += ` AND sk.timestamp >= DATE_SUB(NOW(), INTERVAL 6 HOUR)`;
      } else if (timeRange === '1d') {
        query += ` AND sk.timestamp >= DATE_SUB(NOW(), INTERVAL 1 DAY)`;
      }
    } else {
      // 实时查询计数
      query = `
        SELECT COUNT(*) as count FROM (
          SELECT sk.system_id FROM system_kills sk
          LEFT JOIN systems s ON sk.system_id = s.system_id
          WHERE sk.id IN (
            SELECT MAX(id)
            FROM system_kills
            WHERE datasource = ?
            GROUP BY system_id
          )
          AND sk.datasource = ?
      `;
      params = [datasource, datasource];
    }
    
    // 添加安全状态过滤
    if (securityStatus === 'high') {
      query += ` AND s.security_status >= 0.5`;
    } else if (securityStatus === 'low') {
      query += ` AND s.security_status > 0 AND s.security_status < 0.5`;
    } else if (securityStatus === 'nullsec') {
      query += ` AND s.security_status <= 0`;
    }
    
    if (search) {
      query += ` AND (sk.system_id = ? OR s.name LIKE ?)`;
      params.push(search, `%${search}%`);
    }
    
    // 对于实时查询，需要闭合子查询
    if (timeRange !== '1h' && timeRange !== '6h' && timeRange !== '1d') {
      query += `
          GROUP BY sk.system_id
        ) as distinct_systems
      `;
    }
    
    const [rows] = await pool.execute(query, params);
    return rows[0].count;
  }

  static async findBySystemId(systemId, datasource = 'infinity') {
    const query = `
      SELECT sk.*, 
             s.name AS system_name,
             ROUND(s.security_status, 2) AS security_status
      FROM system_kills sk
      LEFT JOIN systems s ON sk.system_id = s.system_id
      WHERE sk.id IN (
        SELECT MAX(id)
        FROM system_kills
        WHERE system_id = ? AND datasource = ?
        GROUP BY system_id
      )
      AND sk.datasource = ?
    `;
    const [rows] = await pool.execute(query, [systemId, datasource, datasource]);
    return rows[0] ? rows[0] : null;
  }

  static async getLatestUpdate(datasource = 'infinity') {
    const query = `SELECT MAX(timestamp) as latest_update FROM system_kills WHERE datasource = ?`;
    const [rows] = await pool.execute(query, [datasource]);
    return rows[0].latest_update;
  }

  // 增量式删除system_name字段，确保多次执行不报错
  static async removeSystemNameField() {
    try {
      // 检查字段是否存在
      const checkQuery = `
        SELECT column_name
        FROM information_schema.COLUMNS
        WHERE table_name = 'system_kills'
        AND column_name = 'system_name'
        AND table_schema = DATABASE()
      `;
      
      const [columns] = await pool.execute(checkQuery);
      
      // 如果字段存在，则删除
      if (columns.length > 0) {
        const dropQuery = `ALTER TABLE system_kills DROP COLUMN system_name`;
        await pool.execute(dropQuery);
        console.log('Successfully removed system_name column from system_kills table');
        return true;
      } else {
        console.log('system_name column already removed from system_kills table');
        return false;
      }
    } catch (error) {
      console.error('Error removing system_name column:', error.message);
      // 如果是因为字段不存在导致的错误，忽略它
      if (!error.message.includes('Unknown column')) {
        throw error;
      }
      console.log('system_name column already removed from system_kills table (error caught)');
      return false;
    }
  }
}

module.exports = SystemKill;