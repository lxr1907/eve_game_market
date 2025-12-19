const pool = require('../config/database');

class Type {
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS types (
        id INT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        group_id INT,
        category_id INT,
        mass DECIMAL(18,4),
        volume DECIMAL(18,4),
        capacity DECIMAL(18,4),
        portion_size INT,
        published BOOLEAN,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    await pool.execute(query);
  }

  static async insertOrUpdate(typeData) {
    // 将所有undefined值转换为null，避免数据库绑定参数错误
    const safeData = { ...typeData };
    Object.keys(safeData).forEach(key => {
      if (safeData[key] === undefined) {
        safeData[key] = null;
      }
    });
    
    const query = `
      INSERT INTO types (
        id, name, description, group_id, category_id, 
        mass, volume, capacity, portion_size, published
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        description = VALUES(description),
        group_id = VALUES(group_id),
        category_id = VALUES(category_id),
        mass = VALUES(mass),
        volume = VALUES(volume),
        capacity = VALUES(capacity),
        portion_size = VALUES(portion_size),
        published = VALUES(published),
        updated_at = CURRENT_TIMESTAMP
    `;
    await pool.execute(query, [
      safeData.id,
      safeData.name,
      safeData.description,
      safeData.group_id,
      safeData.category_id,
      safeData.mass,
      safeData.volume,
      safeData.capacity,
      safeData.portion_size,
      safeData.published
    ]);
  }

  static async findById(id) {
    const query = 'SELECT * FROM types WHERE id = ?';
    const [rows] = await pool.execute(query, [id]);
    return rows[0];
  }

  static async findAll(page = 1, limit = 10, search = '') {
    // 构建查询字符串，使用字符串拼接代替参数绑定
    let query = 'SELECT * FROM types';

    if (search) {
      query += ` WHERE name LIKE '%${search}%'`;
    }

    query += ' ORDER BY id';
    
    // 如果limit为null，则返回所有数据，不分页
    if (limit !== null) {
      // 确保所有参数都是整数类型
      const pageInt = parseInt(page) || 1;
      const limitInt = parseInt(limit) || 10;
      const offsetInt = parseInt((pageInt - 1) * limitInt) || 0;
      query += ` LIMIT ${limitInt} OFFSET ${offsetInt}`;
    }

    const [rows] = await pool.query(query);
    return rows;
  }

  static async count(search = '') {
    // 构建查询字符串，使用字符串拼接代替参数绑定
    let query = 'SELECT COUNT(*) AS total FROM types';

    if (search) {
      query += ` WHERE name LIKE '%${search}%'`;
    }

    const [rows] = await pool.query(query);
    return rows[0].total;
  }
}

module.exports = Type;