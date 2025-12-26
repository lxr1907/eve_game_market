const pool = require('../config/database');

class Category {
  // 创建表
  static async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS item_categories (
        category_id INT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        published BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    try {
      await pool.execute(sql);
      console.log('item_categories table created successfully');
    } catch (error) {
      console.error('Error creating item_categories table:', error);
      throw error;
    }
  }

  // 删除表
  static async dropTable() {
    const sql = 'DROP TABLE IF EXISTS item_categories';
    try {
      await pool.execute(sql);
      console.log('item_categories table dropped successfully');
    } catch (error) {
      console.error('Error dropping item_categories table:', error);
      throw error;
    }
  }

  // 插入或更新Category
  static async insertOrUpdate(category) {
    const sql = `
      INSERT INTO item_categories (category_id, name, published)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        published = VALUES(published),
        updated_at = CURRENT_TIMESTAMP
    `;
    try {
      const [result] = await pool.execute(sql, [
        category.category_id,
        category.name || '',
        category.published || false
      ]);
      return result;
    } catch (error) {
      console.error('Error inserting/updating category:', error);
      throw error;
    }
  }

  // 根据ID查找Category
  static async findById(categoryId) {
    const sql = 'SELECT * FROM item_categories WHERE category_id = ?';
    try {
      const [rows] = await pool.execute(sql, [categoryId]);
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error(`Error finding category with ID ${categoryId}:`, error);
      throw error;
    }
  }

  // 获取所有Category
  static async findAll(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const sql = 'SELECT * FROM item_categories ORDER BY category_id LIMIT ? OFFSET ?';
    try {
      const [rows] = await pool.execute(sql, [limit, offset]);
      return rows;
    } catch (error) {
      console.error('Error finding all categories:', error);
      throw error;
    }
  }

  // 获取Category总数
  static async count() {
    const sql = 'SELECT COUNT(*) AS count FROM item_categories';
    try {
      const [rows] = await pool.execute(sql);
      return rows[0].count;
    } catch (error) {
      console.error('Error counting categories:', error);
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
}

module.exports = Category;