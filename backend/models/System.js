const pool = require('../config/database');

class System {
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS systems (
        system_id INT,
        constellation_id INT,
        name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        position_x DOUBLE,
        position_y DOUBLE,
        position_z DOUBLE,
        security_status DOUBLE,
        stargates JSON,
        datasource VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (system_id, datasource)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    await pool.execute(query);
    
    // 增量添加stargates字段
    await this.addStargatesField();
    // 增量添加datasource字段
    await this.addDatasourceField();
  }
  
  // 增量添加stargates字段，确保多次执行不报错
  static async addStargatesField() {
    try {
      // 检查字段是否存在
      const checkQuery = `
        SELECT column_name
        FROM information_schema.COLUMNS
        WHERE table_name = 'systems'
        AND column_name = 'stargates'
        AND table_schema = DATABASE()
      `;
      
      const [columns] = await pool.execute(checkQuery);
      
      // 如果字段不存在，则添加
      if (columns.length === 0) {
        const addFieldQuery = `ALTER TABLE systems ADD COLUMN stargates JSON`;
        await pool.execute(addFieldQuery);
        console.log('Successfully added stargates column to systems table');
        return true;
      } else {
        console.log('stargates column already exists in systems table');
        return false;
      }
    } catch (error) {
      console.error('Error adding stargates column:', error.message);
      // 如果是因为字段已经存在导致的错误，忽略它
      if (!error.message.includes('Duplicate column name')) {
        throw error;
      }
      console.log('stargates column already exists in systems table (error caught)');
      return false;
    }
  }
  
  // 增量添加datasource字段，确保多次执行不报错
  static async addDatasourceField() {
    try {
      // 检查字段是否存在
      const checkQuery = `
        SELECT column_name
        FROM information_schema.COLUMNS
        WHERE table_name = 'systems'
        AND column_name = 'datasource'
        AND table_schema = DATABASE()
      `;
      
      const [columns] = await pool.execute(checkQuery);
      
      // 如果字段不存在，则添加
      if (columns.length === 0) {
        const addFieldQuery = `ALTER TABLE systems ADD COLUMN datasource VARCHAR(20)`;
        await pool.execute(addFieldQuery);
        console.log('Successfully added datasource column to systems table');
        return true;
      } else {
        console.log('datasource column already exists in systems table');
        return false;
      }
    } catch (error) {
      console.error('Error adding datasource column:', error.message);
      // 如果是因为字段已经存在导致的错误，忽略它
      if (!error.message.includes('Duplicate column name')) {
        throw error;
      }
      console.log('datasource column already exists in systems table (error caught)');
      return false;
    }
  }

  static async insertOrUpdate(systemData) {
    // 只包含明确提供的字段，避免将现有数据覆盖为null
    const fields = [];
    const values = [];
    const updateClauses = [];
    const updateValues = [];
    
    // 必须包含system_id作为主键
    if (systemData.system_id !== undefined) {
      fields.push('system_id');
      values.push(systemData.system_id);
      updateClauses.push('system_id = VALUES(system_id)');
    }
    
    // 只添加明确提供的字段
    if (systemData.constellation_id !== undefined) {
      fields.push('constellation_id');
      values.push(systemData.constellation_id);
      updateClauses.push('constellation_id = VALUES(constellation_id)');
    }
    
    if (systemData.name !== undefined) {
      fields.push('name');
      values.push(systemData.name);
      updateClauses.push('name = VALUES(name)');
    }
    
    if (systemData.position?.x !== undefined) {
      fields.push('position_x');
      values.push(systemData.position.x);
      updateClauses.push('position_x = VALUES(position_x)');
    }
    
    if (systemData.position?.y !== undefined) {
      fields.push('position_y');
      values.push(systemData.position.y);
      updateClauses.push('position_y = VALUES(position_y)');
    }
    
    if (systemData.position?.z !== undefined) {
      fields.push('position_z');
      values.push(systemData.position.z);
      updateClauses.push('position_z = VALUES(position_z)');
    }
    
    if (systemData.security_status !== undefined) {
      fields.push('security_status');
      values.push(systemData.security_status);
      updateClauses.push('security_status = VALUES(security_status)');
    }
    
    if (systemData.stargates !== undefined) {
      fields.push('stargates');
      // 正确处理null值，保存为MySQL的NULL而不是字符串"null"
      values.push(systemData.stargates === null ? null : JSON.stringify(systemData.stargates));
      updateClauses.push('stargates = VALUES(stargates)');
    }
    
    if (systemData.datasource !== undefined) {
      fields.push('datasource');
      values.push(systemData.datasource || null);
      updateClauses.push('datasource = VALUES(datasource)');
    }
    
    // 添加updated_at字段
    updateClauses.push('updated_at = CURRENT_TIMESTAMP');
    
    if (fields.length === 0) {
      throw new Error('No fields provided for insert or update');
    }
    
    const query = `
      INSERT INTO systems (
        ${fields.join(', ')}
      ) VALUES (${fields.map(() => '?').join(', ')})
      ON DUPLICATE KEY UPDATE
        ${updateClauses.join(', ')}
    `;
    
    try {
      await pool.execute(query, values);
      return true;
    } catch (error) {
      console.error('Error inserting/updating system:', error);
      throw error;
    }
  }

  static async findById(systemId, datasource = 'infinity') {
    const query = `SELECT * FROM systems WHERE system_id = ? AND datasource = ?`;
    const [rows] = await pool.execute(query, [systemId, datasource]);
    return rows[0] ? rows[0] : null;
  }

  static async findAll(page = 1, limit = 10, search = '', onlyEmptyName = false) {
    // 将page和limit转换为整数
    const pageInt = parseInt(page) || 1;
    const limitInt = parseInt(limit) || 10;
    const offset = (pageInt - 1) * limitInt;
    
    let query = `
      SELECT * FROM systems
    `;
    let params = [];
    let whereClause = [];
    
    if (search) {
      whereClause.push(`name LIKE ?`);
      params.push(`%${search}%`);
    }
    
    if (onlyEmptyName) {
      whereClause.push(`(name IS NULL OR name = '')`);
    }
    
    if (whereClause.length > 0) {
      query += ` WHERE ${whereClause.join(' AND ')}`;
    }
    
    query += ` ORDER BY system_id LIMIT ${limitInt} OFFSET ${offset}`;
    
    const [rows] = await pool.query(query, params);
    return rows;
  }
  
  // 查询name为空的系统
  static async findSystemsMissingDetails(limit = 5) {
    const limitInt = parseInt(limit);
    const query = `
      SELECT * FROM systems
      WHERE (name IS NULL OR name = '')
      ORDER BY system_id
      LIMIT ${limitInt}
    `;
    const [rows] = await pool.query(query);
    return rows;
  }

  static async count(search = '', onlyEmptyName = false) {
    let query = `SELECT COUNT(*) as count FROM systems`;
    let params = [];
    let whereClause = [];
    
    if (search) {
      whereClause.push(`name LIKE ?`);
      params.push(`%${search}%`);
    }
    
    if (onlyEmptyName) {
      whereClause.push(`(name IS NULL OR name = '')`);
    }
    
    if (whereClause.length > 0) {
      query += ` WHERE ${whereClause.join(' AND ')}`;
    }
    
    const [rows] = await pool.execute(query, params);
    return rows[0].count;
  }
  
  // 按datasource统计系统数量
  static async countByDatasource(datasource) {
    const query = `SELECT COUNT(*) as count FROM systems WHERE datasource = ?`;
    const [rows] = await pool.execute(query, [datasource]);
    return rows[0].count;
  }
  
  // 根据系统ID列表获取系统信息
  static async getSystemsByIds(systemIds, datasource) {
    if (!systemIds || systemIds.length === 0) {
      return [];
    }
    
    const placeholders = systemIds.map(() => '?').join(', ');
    const query = `
      SELECT system_id, name 
      FROM systems 
      WHERE system_id IN (${placeholders}) 
      AND datasource = ?
    `;
    
    const values = [...systemIds, datasource];
    const [rows] = await pool.execute(query, values);
    return rows;
  }

  static async batchInsertOrUpdate(systemsData) {
    if (!systemsData || systemsData.length === 0) {
      return;
    }

    // 构建批量插入语句，但只包含所有系统都有的字段，避免null覆盖
    // 首先检查哪些字段在所有系统中都存在
    const allFields = new Set(['system_id']);
    
    // 收集所有存在的字段
    systemsData.forEach(system => {
      if (system.constellation_id !== undefined) allFields.add('constellation_id');
      if (system.name !== undefined) allFields.add('name');
      if (system.position?.x !== undefined) allFields.add('position_x');
      if (system.position?.y !== undefined) allFields.add('position_y');
      if (system.position?.z !== undefined) allFields.add('position_z');
      if (system.security_status !== undefined) allFields.add('security_status');
      if (system.stargates !== undefined) allFields.add('stargates');
      if (system.datasource !== undefined) allFields.add('datasource');
    });
    
    // 转换为数组并确保system_id在首位
    const fields = Array.from(allFields);
    if (!fields.includes('system_id')) {
      throw new Error('system_id is required for batch insert/update');
    }
    
    // 构建占位符和参数
    const placeholders = systemsData.map(() => {
      return `(${fields.map(field => {
        // 为每个系统构建对应字段的值
        switch(field) {
          case 'system_id':
            return '?';
          case 'constellation_id':
            return '?';
          case 'name':
            return '?';
          case 'position_x':
            return '?';
          case 'position_y':
            return '?';
          case 'position_z':
            return '?';
          case 'security_status':
            return '?';
          case 'stargates':
            return '?';
          case 'datasource':
            return '?';
          default:
            return 'null';
        }
      }).join(', ')})`;
    }).join(', ');
    
    const params = [];
    
    systemsData.forEach(system => {
      fields.forEach(field => {
        switch(field) {
          case 'system_id':
            params.push(system.system_id);
            break;
          case 'constellation_id':
            params.push(system.constellation_id);
            break;
          case 'name':
            params.push(system.name);
            break;
          case 'position_x':
            params.push(system.position?.x);
            break;
          case 'position_y':
            params.push(system.position?.y);
            break;
          case 'position_z':
            params.push(system.position?.z);
            break;
          case 'security_status':
            params.push(system.security_status);
            break;
          case 'stargates':
            // 将星门数组转换为JSON字符串
            params.push(system.stargates ? JSON.stringify(system.stargates) : null);
            break;
          case 'datasource':
            params.push(system.datasource || null);
            break;
          default:
            params.push(null);
        }
      });
    });
    
    // 构建更新子句
    const updateClauses = fields.filter(field => field !== 'system_id').map(field => {
      return `${field} = VALUES(${field})`;
    });
    updateClauses.push('updated_at = CURRENT_TIMESTAMP');
    
    const query = `
      INSERT INTO systems (
        ${fields.join(', ')}
      ) VALUES ${placeholders}
      ON DUPLICATE KEY UPDATE
        ${updateClauses.join(', ')}
    `;

    try {
      await pool.execute(query, params);
      return true;
    } catch (error) {
      console.error('Error batch inserting/updating systems:', error);
      throw error;
    }
  }
}

module.exports = System;
