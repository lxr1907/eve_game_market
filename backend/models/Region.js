const pool = require('../config/database');

class Region {
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS regions (
        id INT PRIMARY KEY,
        name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        description TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        constellations JSON,
        status VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    await pool.execute(query);
  }

  static async insertOrUpdate(regionData) {
    // 将所有undefined值转换为null，避免数据库绑定参数错误
    const safeData = {
      id: regionData.id !== undefined ? regionData.id : null,
      name: regionData.name !== undefined ? regionData.name : null,
      description: regionData.description !== undefined ? regionData.description : null,
      constellations: regionData.constellations !== undefined ? JSON.stringify(regionData.constellations) : null
    };
    
    const query = `
      INSERT INTO regions (
        id, name, description, constellations
      ) VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        description = VALUES(description),
        constellations = VALUES(constellations),
        status = 'completed',
        updated_at = CURRENT_TIMESTAMP
    `;
    
    try {
      await pool.execute(query, [
        safeData.id,
        safeData.name,
        safeData.description,
        safeData.constellations
      ]);
      return true;
    } catch (error) {
      console.error('Error inserting/updating region:', error);
      throw error;
    }
  }

  static async findById(id) {
    const query = `SELECT * FROM regions WHERE id = ?`;
    const [rows] = await pool.execute(query, [id]);
    return rows[0] ? rows[0] : null;
  }

  static async findAll(page = 1, limit = 10, search = '') {
    // 将page和limit转换为整数
    const pageInt = parseInt(page) || 1;
    const limitInt = parseInt(limit) || 10;
    const offset = (pageInt - 1) * limitInt;
    
    let query = `
      SELECT * FROM regions
    `;
    let params = [];
    
    if (search) {
      query += ` WHERE name LIKE ? OR description LIKE ?`;
      params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ` ORDER BY id LIMIT ${limitInt} OFFSET ${offset}`;
    
    const [rows] = await pool.query(query, params);
    return rows;
  }

  static async count(search = '') {
    let query = `SELECT COUNT(*) as count FROM regions`;
    let params = [];
    
    if (search) {
      query += ` WHERE name LIKE ? OR description LIKE ?`;
      params.push(`%${search}%`, `%${search}%`);
    }
    
    const [rows] = await pool.execute(query, params);
    return rows[0].count;
  }

  static async findAllWithEmptyName(page = 1, limit = 10, offset = 0) {
    // 将参数转换为整数
    const pageInt = parseInt(page) || 1;
    const limitInt = parseInt(limit) || 10;
    const offsetInt = parseInt(offset) || (pageInt - 1) * limitInt;
    
    const query = `
      SELECT * FROM regions WHERE name IS NULL OR name = ''
      ORDER BY id LIMIT ${limitInt} OFFSET ${offsetInt}
    `;
    
    const [rows] = await pool.query(query);
    return rows;
  }

  static async countWithEmptyName() {
    const query = `SELECT COUNT(*) as count FROM regions WHERE name IS NULL OR name = ''`;
    const [rows] = await pool.execute(query);
    return rows[0].count;
  }
}

module.exports = Region;