const pool = require('../config/database');

class Order {

  static async dropTable() {
    const query = `DROP TABLE IF EXISTS orders`;
    await pool.execute(query);
  }

  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS orders (
        order_id BIGINT PRIMARY KEY,
        region_id INT,
        type_id INT,
        is_buy_order BOOLEAN,
        price DECIMAL(20,6),
        volume_remaining INT,
        volume_total INT,
        minimum_volume INT,
        order_range VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        location_id BIGINT,
        duration INT,
        is_active BOOLEAN,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    await pool.execute(query);
  }

  static async insertOrUpdate(orders) {
    if (!orders || orders.length === 0) {
      return;
    }

    // 构建批量插入语句
    const values = orders.map(order => `(
      ${order.order_id}, 
      ${order.region_id}, 
      ${order.type_id}, 
      ${order.is_buy_order ? 1 : 0}, 
      ${order.price}, 
      ${order.volume_remaining}, 
      ${order.volume_total}, 
      ${order.minimum_volume}, 
      '${order.order_range}', 
      ${order.location_id}, 
      ${order.duration}, 
      ${order.is_active !== undefined ? (order.is_active ? 1 : 0) : 1}
    )`).join(', ');

    const query = `
      INSERT INTO orders (
        order_id, region_id, type_id, is_buy_order, price, 
        volume_remaining, volume_total, minimum_volume, order_range, 
        location_id, duration, is_active
      ) VALUES ${values}
      ON DUPLICATE KEY UPDATE
        region_id = VALUES(region_id),
        type_id = VALUES(type_id),
        is_buy_order = VALUES(is_buy_order),
        price = VALUES(price),
        volume_remaining = VALUES(volume_remaining),
        volume_total = VALUES(volume_total),
        minimum_volume = VALUES(minimum_volume),
        order_range = VALUES(order_range),
        location_id = VALUES(location_id),
        duration = VALUES(duration),
        is_active = VALUES(is_active),
        updated_at = CURRENT_TIMESTAMP
    `;

    try {
      await pool.query(query);
      return true;
    } catch (error) {
      console.error('Error inserting/updating orders:', error);
      throw error;
    }
  }

  static async findByRegionAndType(regionId, typeId, orderType = null, page = 1, limit = 10) {
    // 将page和limit转换为整数
    const pageInt = parseInt(page) || 1;
    const limitInt = parseInt(limit) || 10;
    const offset = (pageInt - 1) * limitInt;

    let query = `
      SELECT * FROM orders
      WHERE region_id = ? AND type_id = ?
    `;
    const params = [regionId, typeId];

    if (orderType === 'buy') {
      query += ` AND is_buy_order = 1`;
    } else if (orderType === 'sell') {
      query += ` AND is_buy_order = 0`;
    }

    query += ` ORDER BY price ${orderType === 'buy' ? 'DESC' : 'ASC'}`;
    query += ` LIMIT ${limitInt} OFFSET ${offset}`;

    const [rows] = await pool.execute(query, params);
    return rows;
  }

  static async countByRegionAndType(regionId, typeId, orderType = null) {
    let query = `
      SELECT COUNT(*) as count FROM orders
      WHERE region_id = ? AND type_id = ?
    `;
    const params = [regionId, typeId];

    if (orderType === 'buy') {
      query += ` AND is_buy_order = 1`;
    } else if (orderType === 'sell') {
      query += ` AND is_buy_order = 0`;
    }

    const [rows] = await pool.execute(query, params);
    return rows[0].count;
  }

  static async deleteByRegionAndType(regionId, typeId) {
    const query = `DELETE FROM orders WHERE region_id = ? AND type_id = ?`;
    const [result] = await pool.execute(query, [regionId, typeId]);
    return result.affectedRows;
  }
}

module.exports = Order;