const pool = require('../config/database');

class Group {
  static async dropTable() {
    const query = `DROP TABLE IF EXISTS item_groups`;
    await pool.execute(query);
  }

  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS item_groups (
        group_id INT PRIMARY KEY,
        category_id INT,
        name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        published BOOLEAN,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    await pool.execute(query);
  }

  static async insertOrUpdate(groupData) {
    // 过滤掉未定义的字段
    const definedFields = {};
    for (const [key, value] of Object.entries(groupData)) {
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
      INSERT INTO item_groups (${fields.join(', ')})
      VALUES (${placeholders})
      ON DUPLICATE KEY UPDATE
        ${updateClause},
        updated_at = CURRENT_TIMESTAMP
    `;
    
    await pool.execute(query, values);
  }

  static async findById(groupId) {
    const query = `SELECT * FROM item_groups WHERE group_id = ?`;
    const [rows] = await pool.execute(query, [groupId]);
    return rows[0] || null;
  }

  static async findAll(page = 1, limit = 10, search = '') {
    // 构建查询字符串，使用字符串拼接代替参数绑定
    let query = 'SELECT * FROM item_groups';

    if (search) {
      query += ` WHERE name LIKE '%${search}%'`;
    }

    query += ' ORDER BY group_id';
    
    // 如果limit为null，则返回所有数据，不分页
    if (limit !== null) {
      // 确保所有参数都是整数类型
      const pageInt = parseInt(page) || 1;
      const limitInt = parseInt(limit) || 10;
      const offsetInt = parseInt((pageInt - 1) * limitInt) || 0;
      query += ` LIMIT ${limitInt} OFFSET ${offsetInt}`;
    }

    try {
      const [rows] = await pool.query(query);
      return rows;
    } catch (error) {
      console.error('Error in Group.findAll:', error);
      throw error;
    }
  }

  // 从groups表中获取不重复的category_id
  static async findDistinctCategoryIds() {
    const sql = 'SELECT DISTINCT category_id FROM item_groups WHERE category_id IS NOT NULL';
    try {
      const [rows] = await pool.execute(sql);
      // 转换为数字数组
      return rows.map(row => parseInt(row.category_id));
    } catch (error) {
      console.error('Error finding distinct category IDs:', error);
      throw error;
    }
  }

  static async count(search = '') {
    // 构建查询字符串，使用字符串拼接代替参数绑定
    let query = 'SELECT COUNT(*) AS total FROM item_groups';

    if (search) {
      query += ` WHERE name LIKE '%${search}%'`;
    }

    try {
      const [rows] = await pool.query(query);
      return rows[0].total;
    } catch (error) {
      console.error('Error in Group.count:', error);
      throw error;
    }
  }
}

module.exports = Group;