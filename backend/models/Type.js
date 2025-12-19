const pool = require('../config/database');

class Type {
  static async dropTable() {
    const query = `DROP TABLE IF EXISTS types`;
    await pool.execute(query);
  }

  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS types (
        id INT PRIMARY KEY,
        name VARCHAR(255),
        description TEXT,
        group_id INT,
        category_id INT,
        mass DECIMAL(18,4),
        volume DECIMAL(18,4),
        capacity DECIMAL(18,4),
        portion_size INT,
        published BOOLEAN,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    await pool.execute(query);
  }

  static async insertOrUpdate(typeData) {
    // 将所有undefined值转换为null，避免数据库绑定参数错误
    const safeData = {
      id: typeData.id !== undefined ? typeData.id : null,
      name: typeData.name !== undefined ? typeData.name : null,
      description: typeData.description !== undefined ? typeData.description : null,
      group_id: typeData.group_id !== undefined ? typeData.group_id : null,
      category_id: typeData.category_id !== undefined ? typeData.category_id : null,
      mass: typeData.mass !== undefined ? typeData.mass : null,
      volume: typeData.volume !== undefined ? typeData.volume : null,
      capacity: typeData.capacity !== undefined ? typeData.capacity : null,
      portion_size: typeData.portion_size !== undefined ? typeData.portion_size : null,
      published: typeData.published !== undefined ? typeData.published : null
    };
    
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

  // 分页查询name为空的类型记录
  static async findAllWithEmptyName(page = 1, limit = 10) {
    // 确保所有参数都是整数类型
    const pageInt = parseInt(page) || 1;
    const limitInt = parseInt(limit) || 10;
    const offsetInt = parseInt((pageInt - 1) * limitInt) || 0;
    
    const query = `SELECT * FROM types WHERE name IS NULL OR name = '' ORDER BY id LIMIT ${limitInt} OFFSET ${offsetInt}`;
    
    try {
      const [types] = await pool.query(query);
      return types;
    } catch (error) {
      console.error('Error fetching types with empty name:', error);
      throw error;
    }
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

  static async update(id, updates) {
    try {
      // 构建更新语句
      const updateFields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const updateValues = Object.values(updates);
      
      // 将id添加到参数数组末尾
      updateValues.push(id);
      
      const query = `
        UPDATE types 
        SET ${updateFields}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      
      const [result] = await pool.execute(query, updateValues);
      
      // Check if any row was affected
      if (result.affectedRows === 0) {
        return { success: false, message: 'Type not found' };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error updating type:', error);
      throw error;
    }
  }
}

module.exports = Type;