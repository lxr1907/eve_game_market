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
        name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        description TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        group_id INT,
        category_id INT,
        mass VARCHAR(50),
        volume VARCHAR(50),
        capacity VARCHAR(50),
        portion_size INT,
        published BOOLEAN,
        status VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    await pool.execute(query);
  }

  static async insertOrUpdate(typeData) {
    // 过滤掉未定义的字段
    const definedFields = {};
    for (const [key, value] of Object.entries(typeData)) {
      if (value !== undefined) {
        definedFields[key] = value;
      }
    }
    
    // 如果没有定义任何字段，直接返回
    if (Object.keys(definedFields).length === 0) {
      return;
    }
    
    const fields = Object.keys(definedFields);
    const values = Object.values(definedFields);
    const placeholders = fields.map(() => '?').join(',');
    
    // 构建ON DUPLICATE KEY UPDATE部分，只更新传入的字段
    const updateClause = fields.map(field => `${field} = VALUES(${field})`).join(', ');
    
    const query = `
      INSERT INTO types (${fields.join(', ')})
      VALUES (${placeholders})
      ON DUPLICATE KEY UPDATE
        ${updateClause},
        updated_at = CURRENT_TIMESTAMP
    `;
    
    await pool.execute(query, values);
  }

  // 批量插入或更新类型数据，提高效率
  static async bulkInsertOrUpdate(typeDataList) {
    if (!Array.isArray(typeDataList) || typeDataList.length === 0) {
      return;
    }
    
    // 过滤掉未定义的字段，确保所有对象都有相同的字段结构
    const firstItem = typeDataList[0];
    const fields = Object.keys(firstItem).filter(key => firstItem[key] !== undefined);
    
    // 如果没有定义任何字段，直接返回
    if (fields.length === 0) {
      return;
    }
    
    // 构建批量插入的values部分
    const values = [];
    const placeholders = [];
    
    typeDataList.forEach(item => {
      const rowValues = fields.map(field => item[field]);
      values.push(...rowValues);
      placeholders.push(`(${fields.map(() => '?').join(', ')})`);
    });
    
    // 构建ON DUPLICATE KEY UPDATE部分
    const updateClause = fields.map(field => `${field} = VALUES(${field})`).join(', ');
    
    const query = `
      INSERT INTO types (${fields.join(', ')})
      VALUES ${placeholders.join(', ')}
      ON DUPLICATE KEY UPDATE
        ${updateClause},
        updated_at = CURRENT_TIMESTAMP
    `;
    
    try {
      await pool.execute(query, values);
      console.log(`Successfully updated ${typeDataList.length} types in bulk`);
    } catch (error) {
      console.error('Error in bulk insert/update:', error);
      // 如果批量操作失败，尝试逐个插入
      for (const item of typeDataList) {
        try {
          await this.insertOrUpdate(item);
        } catch (singleError) {
          console.error(`Error updating single type ID ${item.id}:`, singleError);
        }
      }
    }
  }

  static async findById(id) {
    const query = 'SELECT * FROM types WHERE id = ?';
    const [rows] = await pool.execute(query, [id]);
    return rows[0];
  }

  static async findByIds(ids) {
    if (!ids || ids.length === 0) {
      return [];
    }
    
    // 使用IN语句批量查询
    const placeholders = ids.map(() => '?').join(',');
    const query = `SELECT * FROM types WHERE id IN (${placeholders})`;
    const [rows] = await pool.execute(query, ids);
    return rows;
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
  
  // 获取所有loyalty_offers表中存在的、且name为空的type记录的ID列表
  static async findAllIdsWithEmptyNameFromLoyaltyOffers() {
    const query = `
      SELECT DISTINCT t.id 
      FROM types t 
      JOIN loyalty_offers lo ON t.id = lo.type_id 
      WHERE (t.name IS NULL OR t.name = '') 
      ORDER BY t.id
    `;
    
    try {
      const [results] = await pool.query(query);
      return results.map(row => row.id);
    } catch (error) {
      console.error('Error fetching loyalty offer type IDs with empty name:', error);
      throw error;
    }
  }
  
  // 分页查询loyalty_offers表中存在的、且name为空的类型记录
  static async findAllWithEmptyNameFromLoyaltyOffers(page = 1, limit = 10) {
    // 确保所有参数都是整数类型
    const pageInt = parseInt(page) || 1;
    const limitInt = parseInt(limit) || 10;
    const offsetInt = parseInt((pageInt - 1) * limitInt) || 0;
    
    // 使用JOIN查询获取loyalty_offers表中存在的、且name为空的type记录
    const query = `
      SELECT t.* 
      FROM types t 
      JOIN loyalty_offers lo ON t.id = lo.type_id 
      WHERE (t.name IS NULL OR t.name = '') 
      GROUP BY t.id 
      ORDER BY t.id 
      LIMIT ${limitInt} OFFSET ${offsetInt}
    `;
    
    try {
      const [types] = await pool.query(query);
      return types;
    } catch (error) {
      console.error('Error fetching loyalty offer types with empty name:', error);
      throw error;
    }
  }
  
  // 获取loyalty_offers表中存在的、且name为空的type记录总数
  static async countWithEmptyNameFromLoyaltyOffers() {
    const query = `
      SELECT COUNT(DISTINCT t.id) as count 
      FROM types t 
      JOIN loyalty_offers lo ON t.id = lo.type_id 
      WHERE (t.name IS NULL OR t.name = '')
    `;
    
    try {
      const [result] = await pool.query(query);
      return result[0].count;
    } catch (error) {
      console.error('Error counting loyalty offer types with empty name:', error);
      return 0;
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

  // 获取name不为null的数据总数
  static async countWithNameNotNull() {
    const query = 'SELECT COUNT(*) AS total FROM types WHERE name IS NOT NULL AND name <> \'\'';
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