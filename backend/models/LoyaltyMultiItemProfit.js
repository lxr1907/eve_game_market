const pool = require('../config/database');

class LoyaltyMultiItemProfit {
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS loyalty_multi_item_profit (
        id INT PRIMARY KEY AUTO_INCREMENT,
        type_id INT NOT NULL,
        corporation_id INT NOT NULL,
        region_id INT NOT NULL,
        lp_cost INT NOT NULL,
        isk_cost BIGINT NOT NULL,
        quantity INT NOT NULL,
        required_items_total_sell_price DECIMAL(20,6) NOT NULL,
        result_item_sell_price DECIMAL(20,6) NOT NULL,
        result_item_buy_price DECIMAL(20,6) NOT NULL,
        total_profit DECIMAL(20,6) NOT NULL,
        profit_per_lp DECIMAL(20,6) NOT NULL,
        required_items_json JSON,
        datasource VARCHAR(20) NOT NULL DEFAULT 'serenity',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_type_corp_region_datasource (type_id, corporation_id, region_id, datasource)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    await pool.execute(query);
  }

  static async insertOrUpdate(data, datasource = 'serenity') {
    const query = `
      INSERT INTO loyalty_multi_item_profit (
        type_id, corporation_id, region_id, lp_cost, isk_cost, 
        quantity, required_items_total_sell_price, result_item_sell_price, 
        result_item_buy_price, total_profit, profit_per_lp, required_items_json, datasource
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        lp_cost = VALUES(lp_cost),
        isk_cost = VALUES(isk_cost),
        quantity = VALUES(quantity),
        required_items_total_sell_price = VALUES(required_items_total_sell_price),
        result_item_sell_price = VALUES(result_item_sell_price),
        result_item_buy_price = VALUES(result_item_buy_price),
        total_profit = VALUES(total_profit),
        profit_per_lp = VALUES(profit_per_lp),
        required_items_json = VALUES(required_items_json),
        datasource = VALUES(datasource),
        updated_at = CURRENT_TIMESTAMP
    `;
    
    try {
      await pool.execute(query, [
        data.type_id,
        data.corporation_id,
        data.region_id,
        data.lp_cost,
        data.isk_cost,
        data.quantity,
        data.required_items_total_sell_price,
        data.result_item_sell_price,
        data.result_item_buy_price,
        data.total_profit,
        data.profit_per_lp,
        data.required_items_json ? JSON.stringify(data.required_items_json) : null,
        datasource
      ]);
      
      return true;
    } catch (error) {
      console.error('Error inserting/updating loyalty multi item profit:', error);
      return false;
    }
  }

  static async findAll(page = 1, limit = 50, datasource = 'serenity') {
    const offset = (page - 1) * limit;
    const query = `
      SELECT * FROM loyalty_multi_item_profit 
      WHERE datasource = ? 
      ORDER BY profit_per_lp DESC 
      LIMIT ${limit} OFFSET ${offset}
    `;
    const [rows] = await pool.execute(query, [datasource]);
    return rows;
  }

  static async findByCorporationId(corporationId, datasource = 'serenity', page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const query = `
      SELECT * FROM loyalty_multi_item_profit 
      WHERE corporation_id = ? AND datasource = ? 
      ORDER BY profit_per_lp DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const [rows] = await pool.execute(query, [corporationId, datasource]);
    return rows;
  }

  static async findByTypeId(typeId, datasource = 'serenity') {
    const query = `
      SELECT * FROM loyalty_multi_item_profit 
      WHERE type_id = ? AND datasource = ? 
      ORDER BY profit_per_lp DESC
    `;
    const [rows] = await pool.execute(query, [typeId, datasource]);
    return rows;
  }

  static async count(datasource = 'serenity', corporationId = null) {
    let query;
    const params = [];
    if (corporationId) {
      query = `SELECT COUNT(*) as count FROM loyalty_multi_item_profit WHERE datasource = ? AND corporation_id = ?`;
      params.push(datasource, corporationId);
    } else {
      query = `SELECT COUNT(*) as count FROM loyalty_multi_item_profit WHERE datasource = ?`;
      params.push(datasource);
    }
    const [rows] = await pool.execute(query, params);
    return rows[0].count;
  }

  static async deleteOldData(days = 5) {
    const query = `
      DELETE FROM loyalty_multi_item_profit 
      WHERE updated_at < NOW() - INTERVAL ? DAY
    `;
    await pool.execute(query, [days]);
  }

  static async deleteByCorporationId(corporationId, datasource = 'serenity') {
    const query = `
      DELETE FROM loyalty_multi_item_profit 
      WHERE corporation_id = ? AND datasource = ?
    `;
    await pool.execute(query, [corporationId, datasource]);
  }

  static async deleteOldDataByCorporationId(corporationId, days = 1, datasource = 'serenity') {
    const query = `
      DELETE FROM loyalty_multi_item_profit 
      WHERE corporation_id = ? AND datasource = ? AND updated_at < NOW() - INTERVAL ? DAY
    `;
    await pool.execute(query, [corporationId, datasource, days]);
  }

  static async deleteAll(datasource = 'serenity') {
    const query = `DELETE FROM loyalty_multi_item_profit WHERE datasource = ?`;
    await pool.execute(query, [datasource]);
  }

  /**
   * 查找最老的记录（按updated_at排序），用于增量更新
   * @param {string} datasource 数据源
   * @param {number} limit 限制条数
   * @returns {Promise<Array>} 最老的记录列表
   */
  static async findOldest(datasource = 'serenity', limit = 5) {
    const query = `
      SELECT * FROM loyalty_multi_item_profit
      WHERE datasource = ?
      ORDER BY updated_at ASC
      LIMIT ?
    `;
    const [rows] = await pool.query(query, [datasource, Number(limit)]);
    return rows;
  }

  /**
   * 获取指定势力的所有offer记录（按updated_at排序，最老的在前）
   * 用于增量更新：每次只更新最老的N条
   * @param {number} corporationId 势力公司ID
   * @param {string} datasource 数据源
   * @param {number} limit 限制条数
   * @returns {Promise<Array>} 记录列表
   */
  static async findByCorporationIdOldestFirst(corporationId, datasource = 'serenity', limit = 5) {
    const query = `
      SELECT * FROM loyalty_multi_item_profit
      WHERE corporation_id = ? AND datasource = ?
      ORDER BY updated_at ASC
      LIMIT ?
    `;
    const [rows] = await pool.query(query, [corporationId, datasource, Number(limit)]);
    return rows;
  }

  /**
   * 检查指定势力的offer是否已有记录
   * @param {number} typeId 物品类型ID
   * @param {number} corporationId 势力公司ID
   * @param {string} datasource 数据源
   * @returns {Promise<boolean>}
   */
  static async exists(typeId, corporationId, datasource = 'serenity') {
    const query = `
      SELECT COUNT(*) as count FROM loyalty_multi_item_profit
      WHERE type_id = ? AND corporation_id = ? AND datasource = ?
    `;
    const [rows] = await pool.execute(query, [typeId, corporationId, datasource]);
    return rows[0].count > 0;
  }

  /**
   * 插入占位数据（当没有市场订单时使用）
   * @param {Object} data 占位数据
   * @param {string} datasource 数据源
   */
  static async insertPlaceholder(data, datasource = 'serenity') {
    const query = `
      INSERT INTO loyalty_multi_item_profit (
        type_id, corporation_id, region_id, lp_cost, isk_cost,
        quantity, required_items_total_sell_price, result_item_sell_price,
        result_item_buy_price, total_profit, profit_per_lp, required_items_json, datasource
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        required_items_total_sell_price = VALUES(required_items_total_sell_price),
        result_item_sell_price = VALUES(result_item_sell_price),
        result_item_buy_price = VALUES(result_item_buy_price),
        total_profit = VALUES(total_profit),
        profit_per_lp = VALUES(profit_per_lp),
        required_items_json = VALUES(required_items_json),
        updated_at = CURRENT_TIMESTAMP
    `;

    try {
      await pool.execute(query, [
        data.type_id,
        data.corporation_id,
        data.region_id,
        data.lp_cost || 0,
        data.isk_cost || 0,
        data.quantity || 1,
        data.required_items_total_sell_price || 0,
        data.result_item_sell_price || 0,
        data.result_item_buy_price || 0,
        data.total_profit || 0,
        data.profit_per_lp || 0,
        data.required_items_json ? JSON.stringify(data.required_items_json) : null,
        datasource
      ]);
      return true;
    } catch (error) {
      console.error('Error inserting placeholder:', error);
      return false;
    }
  }

  /**
   * 启动时自动检查并修复表完整性：
   * 1. 检查 UNIQUE KEY 是否存在
   * 2. 如缺失：删除重复数据 → 添加索引
   */
  static async ensureTableIntegrity() {
    const tableName = 'loyalty_multi_item_profit';
    const indexName = 'unique_type_corp_region_datasource';
    const indexColumns = 'type_id, corporation_id, region_id, datasource';

    try {
      const [indexes] = await pool.execute(
        `SHOW INDEXES FROM \`${tableName}\` WHERE Key_name = ?`,
        [indexName]
      );

      if (indexes.length > 0) {
        console.log(`[Integrity] ${tableName}: UNIQUE KEY already exists, skipped`);
        return;
      }

      console.log(`[Integrity] ${tableName}: UNIQUE KEY missing, repairing...`);

      // 删除重复数据
      const [dupCheck] = await pool.execute(`
        SELECT COUNT(*) as cnt FROM (
          SELECT ${indexColumns}, COUNT(*) as c
          FROM \`${tableName}\`
          GROUP BY ${indexColumns}
          HAVING c > 1
        ) t
      `);

      if (dupCheck[0].cnt > 0) {
        const [delResult] = await pool.execute(`
          DELETE t1 FROM \`${tableName}\` t1
          INNER JOIN \`${tableName}\` t2
          WHERE t1.type_id = t2.type_id
            AND t1.corporation_id = t2.corporation_id
            AND t1.region_id = t2.region_id
            AND t1.datasource = t2.datasource
            AND t1.id < t2.id
        `);
        console.log(`[Integrity] ${tableName}: removed ${delResult.affectedRows} duplicate rows`);
      }

      await pool.execute(
        `ALTER TABLE \`${tableName}\` ADD UNIQUE KEY \`${indexName}\` (${indexColumns})`
      );
      console.log(`[Integrity] ${tableName}: UNIQUE KEY added successfully`);
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log(`[Integrity] ${tableName}: UNIQUE KEY already added by another process`);
      } else {
        console.error(`[Integrity] ${tableName}: repair failed -`, error.message);
      }
    }
  }
}

module.exports = LoyaltyMultiItemProfit;