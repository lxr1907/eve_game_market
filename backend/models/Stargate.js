const pool = require('../config/database');

class Stargate {
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS stargates (
        stargate_id BIGINT,
        name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        position_x DOUBLE,
        position_y DOUBLE,
        position_z DOUBLE,
        system_id INT,
        type_id INT,
        destination_stargate_id BIGINT,
        destination_system_id INT,
        datasource VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (stargate_id, datasource)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    await pool.execute(query);
    
    // 增量添加datasource字段
    await this.addDatasourceField();
    
    console.log('✓ 表 stargates 创建或验证成功');
  }
  
  // 增量添加datasource字段，确保多次执行不报错
  static async addDatasourceField() {
    try {
      // 检查字段是否存在
      const checkQuery = `
        SELECT column_name
        FROM information_schema.COLUMNS
        WHERE table_name = 'stargates'
        AND column_name = 'datasource'
        AND table_schema = DATABASE()
      `;
      
      const [columns] = await pool.execute(checkQuery);
      
      // 如果字段不存在，则添加
      if (columns.length === 0) {
        const addFieldQuery = `ALTER TABLE stargates ADD COLUMN datasource VARCHAR(20)`;
        await pool.execute(addFieldQuery);
        console.log('Successfully added datasource column to stargates table');
        return true;
      } else {
        console.log('datasource column already exists in stargates table');
        return false;
      }
    } catch (error) {
      console.error('Error adding datasource column:', error.message);
      // 如果是因为字段已经存在导致的错误，忽略它
      if (!error.message.includes('Duplicate column name')) {
        throw error;
      }
      console.log('datasource column already exists in stargates table (error caught)');
      return false;
    }
  }

  static async insertOrUpdate(stargateData) {
    if (!stargateData.stargate_id) {
      throw new Error('stargate_id is required');
    }

    // 只包含明确提供的字段，避免将现有数据覆盖为null
    const fields = [];
    const values = [];
    const updateClauses = [];
    
    // 必须包含stargate_id作为主键
    fields.push('stargate_id');
    values.push(stargateData.stargate_id);
    updateClauses.push('stargate_id = VALUES(stargate_id)');
    
    // 只添加明确提供的字段
    if (stargateData.name !== undefined) {
      fields.push('name');
      values.push(stargateData.name || null);
      updateClauses.push('name = VALUES(name)');
    }
    
    if (stargateData.position?.x !== undefined) {
      fields.push('position_x');
      values.push(stargateData.position.x || null);
      updateClauses.push('position_x = VALUES(position_x)');
    }
    
    if (stargateData.position?.y !== undefined) {
      fields.push('position_y');
      values.push(stargateData.position.y || null);
      updateClauses.push('position_y = VALUES(position_y)');
    }
    
    if (stargateData.position?.z !== undefined) {
      fields.push('position_z');
      values.push(stargateData.position.z || null);
      updateClauses.push('position_z = VALUES(position_z)');
    }
    
    if (stargateData.system_id !== undefined) {
      fields.push('system_id');
      values.push(stargateData.system_id || null);
      updateClauses.push('system_id = VALUES(system_id)');
    }
    
    if (stargateData.type_id !== undefined) {
      fields.push('type_id');
      values.push(stargateData.type_id || null);
      updateClauses.push('type_id = VALUES(type_id)');
    }
    
    if (stargateData.destination_stargate_id !== undefined) {
      fields.push('destination_stargate_id');
      values.push(stargateData.destination_stargate_id || null);
      updateClauses.push('destination_stargate_id = VALUES(destination_stargate_id)');
    }
    
    if (stargateData.destination_system_id !== undefined) {
      fields.push('destination_system_id');
      values.push(stargateData.destination_system_id || null);
      updateClauses.push('destination_system_id = VALUES(destination_system_id)');
    }
    
    if (stargateData.datasource !== undefined) {
      fields.push('datasource');
      values.push(stargateData.datasource || null);
      updateClauses.push('datasource = VALUES(datasource)');
    }
    
    // 添加updated_at字段
    updateClauses.push('updated_at = CURRENT_TIMESTAMP');
    
    const query = `
      INSERT INTO stargates (
        ${fields.join(', ')}
      ) VALUES (${fields.map(() => '?').join(', ')})
      ON DUPLICATE KEY UPDATE
        ${updateClauses.join(', ')}
    `;

    try {
      await pool.execute(query, values);
      return true;
    } catch (error) {
      console.error('Error inserting/updating stargate:', error);
      throw error;
    }
  }

  static async findById(stargateId, datasource = 'infinity') {
    const query = `SELECT * FROM stargates WHERE stargate_id = ? AND datasource = ?`;
    const [rows] = await pool.execute(query, [stargateId, datasource]);
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
  static async needSync(stargateId, systemId, datasource = 'infinity') {
    const query = `
      SELECT destination_stargate_id 
      FROM stargates 
      WHERE stargate_id = ? AND system_id = ? AND datasource = ?
    `;
    const [rows] = await pool.execute(query, [stargateId, systemId, datasource]);
    
    // 如果记录不存在，需要同步
    if (rows.length === 0) {
      return true;
    }
    
    // 如果记录存在但destination_stargate_id为空、null或字符串'null'，需要同步
    const destinationStargateId = rows[0].destination_stargate_id;
    return destinationStargateId === null || destinationStargateId === undefined || destinationStargateId === 'null';
  }
  
  // 删除指定系统的所有星门记录
  static async deleteBySystemId(systemId) {
    const query = `DELETE FROM stargates WHERE system_id = ?`;
    const [result] = await pool.execute(query, [systemId]);
    return result.affectedRows;
  }
  
  // 删除指定系统中除了有效星门ID列表之外的所有星门记录
  static async deleteBySystemIdExcluding(systemId, validStargateIds) {
    if (!validStargateIds || validStargateIds.length === 0) {
      return this.deleteBySystemId(systemId);
    }
    
    const query = `
      DELETE FROM stargates 
      WHERE system_id = ? 
      AND stargate_id NOT IN (${validStargateIds.map(() => '?').join(', ')})
    `;
    
    const values = [systemId, ...validStargateIds];
    const [result] = await pool.execute(query, values);
    return result.affectedRows;
  }
}

module.exports = Stargate;
