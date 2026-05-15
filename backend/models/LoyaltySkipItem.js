const pool = require('../config/database');

class LoyaltySkipItem {
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS loyalty_skip_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        type_id INT NOT NULL,
        reason VARCHAR(255) DEFAULT 'no_buy_orders',
        datasource VARCHAR(20) NOT NULL DEFAULT 'serenity',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_type_datasource (type_id, datasource)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    await pool.execute(query);
  }

  static async addSkipItem(typeId, datasource = 'serenity', reason = 'no_buy_orders') {
    const query = `
      INSERT IGNORE INTO loyalty_skip_items (type_id, datasource, reason)
      VALUES (?, ?, ?)
    `;
    try {
      await pool.execute(query, [typeId, datasource, reason]);
      return true;
    } catch (error) {
      console.error('Error adding skip item:', error);
      return false;
    }
  }

  static async getAllSkipIds(datasource = 'serenity') {
    const query = `SELECT type_id FROM loyalty_skip_items WHERE datasource = ?`;
    try {
      const [rows] = await pool.execute(query, [datasource]);
      return rows.map(row => row.type_id);
    } catch (error) {
      console.error('Error getting all skip ids:', error);
      return [];
    }
  }

  /**
   * 删除超过1天的跳过记录
   */
  static async deleteOldSkipItems(datasource = 'serenity') {
    const query = `DELETE FROM loyalty_skip_items WHERE datasource = ? AND created_at < DATE_SUB(NOW(), INTERVAL 1 DAY)`;
    try {
      const [result] = await pool.execute(query, [datasource]);
      if (result.affectedRows > 0) {
        console.log(`Deleted ${result.affectedRows} old skip items from ${datasource} (older than 1 day)`);
      }
      return result.affectedRows;
    } catch (error) {
      console.error('Error deleting old skip items:', error);
      return 0;
    }
  }

  static async removeSkipItem(typeId, datasource = 'serenity') {
    const query = `DELETE FROM loyalty_skip_items WHERE type_id = ? AND datasource = ?`;
    try {
      await pool.execute(query, [typeId, datasource]);
      return true;
    } catch (error) {
      console.error('Error removing skip item:', error);
      return false;
    }
  }
}

module.exports = LoyaltySkipItem;
