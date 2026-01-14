const pool = require('../config/database');

class Stargate {
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS stargates (
        stargate_id BIGINT PRIMARY KEY,
        name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        position_x DOUBLE,
        position_y DOUBLE,
        position_z DOUBLE,
        system_id INT,
        type_id INT,
        destination_stargate_id BIGINT,
        destination_system_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    await pool.execute(query);
    console.log('✓ 表 stargates 创建或验证成功');
  }

  static async insertOrUpdate(stargateData) {
    if (!stargateData.stargate_id) {
      throw new Error('stargate_id is required');
    }

    const query = `
      INSERT INTO stargates (
        stargate_id,
        name,
        position_x,
        position_y,
        position_z,
        system_id,
        type_id,
        destination_stargate_id,
        destination_system_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        position_x = VALUES(position_x),
        position_y = VALUES(position_y),
        position_z = VALUES(position_z),
        system_id = VALUES(system_id),
        type_id = VALUES(type_id),
        destination_stargate_id = VALUES(destination_stargate_id),
        destination_system_id = VALUES(destination_system_id),
        updated_at = CURRENT_TIMESTAMP
    `;

    const values = [
      stargateData.stargate_id,
      stargateData.name || null,
      stargateData.position?.x || null,
      stargateData.position?.y || null,
      stargateData.position?.z || null,
      stargateData.system_id || null,
      stargateData.type_id || null,
      stargateData.destination_stargate_id || null,
      stargateData.destination_system_id || null
    ];

    try {
      await pool.execute(query, values);
      return true;
    } catch (error) {
      console.error('Error inserting/updating stargate:', error);
      throw error;
    }
  }

  static async findById(stargateId) {
    const query = `SELECT * FROM stargates WHERE stargate_id = ?`;
    const [rows] = await pool.execute(query, [stargateId]);
    return rows[0] ? rows[0] : null;
  }

  static async findAll(page = 1, limit = 10) {
    const pageInt = parseInt(page) || 1;
    const limitInt = parseInt(limit) || 10;
    const offset = (pageInt - 1) * limitInt;

    const query = `
      SELECT * FROM stargates
      ORDER BY stargate_id
      LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.execute(query, [limitInt, offset]);
    return rows;
  }

  static async count() {
    const query = `SELECT COUNT(*) as count FROM stargates`;
    const [rows] = await pool.execute(query);
    return rows[0].count;
  }

  static async findBySystemId(systemId) {
    const query = `SELECT * FROM stargates WHERE system_id = ?`;
    const [rows] = await pool.execute(query, [systemId]);
    return rows;
  }

  // 检查星门是否需要同步
  static async needSync(stargateId, systemId) {
    const query = `
      SELECT destination_stargate_id 
      FROM stargates 
      WHERE stargate_id = ? AND system_id = ?
    `;
    const [rows] = await pool.execute(query, [stargateId, systemId]);
    
    // 如果记录不存在，需要同步
    if (rows.length === 0) {
      return true;
    }
    
    // 如果记录存在但destination_stargate_id为空、null或字符串'null'，需要同步
    const destinationStargateId = rows[0].destination_stargate_id;
    return destinationStargateId === null || destinationStargateId === undefined || destinationStargateId === 'null';
  }
}

module.exports = Stargate;
