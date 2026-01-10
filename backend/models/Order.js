const pool = require('../config/database');

class Order {
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
        datasource VARCHAR(20) NOT NULL DEFAULT 'serenity',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    await pool.execute(query);
  }

  static async insertOrUpdate(orders, datasource = 'serenity') {
    if (!orders || orders.length === 0) {
      return;
    }

    // 合并相同价格的订单
    const mergedOrdersMap = new Map();
    
    orders.forEach(order => {
      // 构建合并键：price_regionId_typeId_isBuyOrder
      const mergeKey = `${order.price}_${order.region_id}_${order.type_id}_${order.is_buy_order ? 1 : 0}`;
      
      if (mergedOrdersMap.has(mergeKey)) {
        // 合并订单：累加数量
        const existingOrder = mergedOrdersMap.get(mergeKey);
        existingOrder.volume_remaining += order.volume_remaining;
        existingOrder.volume_total += order.volume_total;
        
        // 保留最小的order_id作为合并后的order_id
        if (order.order_id < existingOrder.order_id) {
          existingOrder.order_id = order.order_id;
        }
      } else {
        // 添加新订单
        mergedOrdersMap.set(mergeKey, {
          ...order,
          volume_remaining: order.volume_remaining,
          volume_total: order.volume_total
        });
      }
    });
    
    // 转换为数组
    const mergedOrders = Array.from(mergedOrdersMap.values());
    
    // 构建批量插入语句 - 使用参数化查询更安全
    const placeholders = mergedOrders.map((_, index) => `(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).join(', ');
    const params = [];
    
    mergedOrders.forEach(order => {
      params.push(
        order.order_id,
        order.region_id,
        order.type_id,
        order.is_buy_order ? 1 : 0,
        order.price,
        order.volume_remaining,
        order.volume_total,
        order.minimum_volume,
        order.order_range,
        order.location_id,
        order.duration,
        order.is_active !== undefined ? (order.is_active ? 1 : 0) : 1,
        datasource
      );
    });

    const query = `
      INSERT INTO orders (
        order_id, region_id, type_id, is_buy_order, price, 
        volume_remaining, volume_total, minimum_volume, order_range, 
        location_id, duration, is_active, datasource
      ) VALUES ${placeholders}
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
        datasource = VALUES(datasource),
        updated_at = CURRENT_TIMESTAMP
    `;

    // 添加死锁重试机制
    const maxRetries = 3;
    let retries = 0;

    while (retries <= maxRetries) {
      try {
        console.log(`Processing ${orders.length} orders, merged into ${mergedOrders.length} records (attempt ${retries + 1})`);
        await pool.execute(query, params);
        return true;
      } catch (error) {
        if (error.errno === 1213 && retries < maxRetries) {
          // 1213是MySQL死锁错误码
          console.error(`Deadlock detected, retrying in ${2 ** retries} seconds...`);
          retries++;
          // 指数退避策略
          await new Promise(resolve => setTimeout(resolve, 2 ** retries * 1000));
        } else {
          console.error('Error inserting/updating orders:', error);
          throw error;
        }
      }
    }

    // 如果所有重试都失败
    throw new Error('Failed to insert/update orders after multiple retries due to deadlocks');
  }

  static async findByRegionAndType(regionId, typeId, orderType = null, page = 1, limit = 10, datasource = 'serenity') {
    // 将page和limit转换为整数
    const pageInt = parseInt(page) || 1;
    const limitInt = parseInt(limit) || 10;
    const offset = (pageInt - 1) * limitInt;

    let query = `
      SELECT * FROM orders
      WHERE region_id = ? AND type_id = ? AND datasource = ?
    `;
    const params = [regionId, typeId, datasource];

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

  static async countByRegionAndType(regionId, typeId, orderType = null, datasource = 'serenity') {
    let query = `
      SELECT COUNT(*) as count FROM orders
      WHERE region_id = ? AND type_id = ? AND datasource = ?
    `;
    const params = [regionId, typeId, datasource];

    if (orderType === 'buy') {
      query += ` AND is_buy_order = 1`;
    } else if (orderType === 'sell') {
      query += ` AND is_buy_order = 0`;
    }

    const [rows] = await pool.execute(query, params);
    return rows[0].count;
  }

  static async deleteByRegionAndType(regionId, typeId, datasource = 'serenity') {
    const query = `DELETE FROM orders WHERE region_id = ? AND type_id = ? AND datasource = ?`;
    const [result] = await pool.execute(query, [regionId, typeId, datasource]);
    return result.affectedRows;
  }

  static async deleteOlderThanOneHourByRegionAndType(regionId, typeId, datasource = 'serenity') {
    const query = `DELETE FROM orders WHERE region_id = ? AND type_id = ? AND datasource = ? AND updated_at < DATE_SUB(NOW(), INTERVAL 1 HOUR)`;
    const [result] = await pool.execute(query, [regionId, typeId, datasource]);
    return result.affectedRows;
  }

  static async getLatestUpdateTime(regionId, typeId, orderType = null, datasource = 'serenity') {
    let query = `
      SELECT MAX(updated_at) as latest_update
      FROM orders
      WHERE region_id = ? AND type_id = ? AND datasource = ?
    `;
    const params = [regionId, typeId, datasource];

    if (orderType === 'buy') {
      query += ` AND is_buy_order = 1`;
    } else if (orderType === 'sell') {
      query += ` AND is_buy_order = 0`;
    }

    const [rows] = await pool.execute(query, params);
    return rows[0].latest_update;
  }
}

module.exports = Order;