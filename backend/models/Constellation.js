const pool = require('../config/database');

class Constellation {
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS constellations (
        constellation_id INT,
        name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        position_x DOUBLE,
        position_y DOUBLE,
        position_z DOUBLE,
        region_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (constellation_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    await pool.execute(query);
    console.log('✓ 表 constellations 创建或验证成功');
  }

  static async insertOrUpdate(constellationData) {
    const fields = [];
    const values = [];
    const updateClauses = [];
    
    // 必须包含constellation_id作为主键
    if (constellationData.constellation_id !== undefined) {
      fields.push('constellation_id');
      values.push(constellationData.constellation_id);
      updateClauses.push('constellation_id = VALUES(constellation_id)');
    }
    
    // 只添加明确提供的字段
    if (constellationData.name !== undefined) {
      fields.push('name');
      values.push(constellationData.name);
      updateClauses.push('name = VALUES(name)');
    }
    
    if (constellationData.position?.x !== undefined) {
      fields.push('position_x');
      values.push(constellationData.position.x);
      updateClauses.push('position_x = VALUES(position_x)');
    }
    
    if (constellationData.position?.y !== undefined) {
      fields.push('position_y');
      values.push(constellationData.position.y);
      updateClauses.push('position_y = VALUES(position_y)');
    }
    
    if (constellationData.position?.z !== undefined) {
      fields.push('position_z');
      values.push(constellationData.position.z);
      updateClauses.push('position_z = VALUES(position_z)');
    }
    
    if (constellationData.region_id !== undefined) {
      fields.push('region_id');
      values.push(constellationData.region_id);
      updateClauses.push('region_id = VALUES(region_id)');
    }
    
    // 添加updated_at字段
    updateClauses.push('updated_at = CURRENT_TIMESTAMP');
    
    if (fields.length === 0) {
      throw new Error('No fields provided for insert or update');
    }
    
    const query = `
      INSERT INTO constellations (
        ${fields.join(', ')}
      ) VALUES (${fields.map(() => '?').join(', ')})
      ON DUPLICATE KEY UPDATE
        ${updateClauses.join(', ')}
    `;
    
    try {
      await pool.execute(query, values);
      return true;
    } catch (error) {
      console.error('Error inserting/updating constellation:', error);
      throw error;
    }
  }

  static async findById(constellationId) {
    const query = `SELECT * FROM constellations WHERE constellation_id = ?`;
    const [rows] = await pool.execute(query, [constellationId]);
    return rows[0] ? rows[0] : null;
  }

  static async findAll(page = 1, limit = 10) {
    const pageInt = parseInt(page) || 1;
    const limitInt = parseInt(limit) || 10;
    const offset = (pageInt - 1) * limitInt;

    const query = `
      SELECT * FROM constellations
      ORDER BY constellation_id
      LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.execute(query, [limitInt, offset]);
    return rows;
  }

  static async count() {
    const query = `SELECT COUNT(*) as count FROM constellations`;
    const [rows] = await pool.execute(query);
    return rows[0].count;
  }

  static async batchInsertOrUpdate(constellationsData) {
    if (!constellationsData || constellationsData.length === 0) {
      return;
    }

    const allFields = new Set(['constellation_id']);
    
    // 收集所有存在的字段
    constellationsData.forEach(constellation => {
      if (constellation.name !== undefined) allFields.add('name');
      if (constellation.position?.x !== undefined) allFields.add('position_x');
      if (constellation.position?.y !== undefined) allFields.add('position_y');
      if (constellation.position?.z !== undefined) allFields.add('position_z');
      if (constellation.region_id !== undefined) allFields.add('region_id');
    });
    
    const fields = Array.from(allFields);
    
    const placeholders = constellationsData.map(() => {
      return `(${fields.map(() => '?').join(', ')})`;
    }).join(', ');
    
    const params = [];
    
    constellationsData.forEach(constellation => {
      fields.forEach(field => {
        switch(field) {
          case 'constellation_id':
            params.push(constellation.constellation_id);
            break;
          case 'name':
            params.push(constellation.name);
            break;
          case 'position_x':
            params.push(constellation.position?.x);
            break;
          case 'position_y':
            params.push(constellation.position?.y);
            break;
          case 'position_z':
            params.push(constellation.position?.z);
            break;
          case 'region_id':
            params.push(constellation.region_id);
            break;
          default:
            params.push(null);
        }
      });
    });
    
    const updateClauses = fields.filter(field => field !== 'constellation_id').map(field => {
      return `${field} = VALUES(${field})`;
    });
    updateClauses.push('updated_at = CURRENT_TIMESTAMP');
    
    const query = `
      INSERT INTO constellations (
        ${fields.join(', ')}
      ) VALUES ${placeholders}
      ON DUPLICATE KEY UPDATE
        ${updateClauses.join(', ')}
    `;

    try {
      await pool.execute(query, params);
      return true;
    } catch (error) {
      console.error('Error batch inserting/updating constellations:', error);
      throw error;
    }
  }
}

module.exports = Constellation;
