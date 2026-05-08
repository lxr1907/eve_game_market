const pool = require('../config/database');

class LpBlueprintProfit {
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS lp_blueprint_profits (
        id INT PRIMARY KEY AUTO_INCREMENT,
        type_id INT NOT NULL,
        offer_id INT NOT NULL,
        corporation_id INT NOT NULL,
        region_id INT NOT NULL DEFAULT 10000002,
        lp_cost INT NOT NULL,
        isk_cost BIGINT NOT NULL,
        material_cost DECIMAL(20,2) NOT NULL DEFAULT 0,
        total_cost DECIMAL(20,2) NOT NULL DEFAULT 0,
        product_type_id INT,
        product_buy_price DECIMAL(20,2) DEFAULT 0,
        product_sell_price DECIMAL(20,2) DEFAULT 0,
        total_profit DECIMAL(20,2) NOT NULL DEFAULT 0,
        profit_per_lp DECIMAL(20,2) NOT NULL DEFAULT 0,
        datasource VARCHAR(20) NOT NULL DEFAULT 'serenity',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_type_region_datasource (type_id, region_id, datasource)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    await pool.execute(query);
  }

  // 获取所有已有的蓝图type_id
  static async getExistingTypeIds(regionId, datasource) {
    const [rows] = await pool.execute(
      `SELECT type_id FROM lp_blueprint_profits WHERE region_id = ? AND datasource = ?`,
      [regionId, datasource]
    );
    return rows.map(r => r.type_id);
  }

  // 获取更新时间最老的记录（排除负收益且未过期7天的）
  static async getOldestRecord(regionId, datasource) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [rows] = await pool.execute(
      `SELECT * FROM lp_blueprint_profits 
       WHERE region_id = ? AND datasource = ? 
         AND (profit_per_lp >= 0 OR updated_at < ?)
       ORDER BY updated_at ASC LIMIT 1`,
      [regionId, datasource, sevenDaysAgo]
    );
    return rows[0] || null;
  }

  // 获取所有已计算的蓝图（包含收益信息）
  static async getAllCalculated(regionId, datasource) {
    const [rows] = await pool.execute(
      `SELECT type_id, profit_per_lp, updated_at FROM lp_blueprint_profits WHERE region_id = ? AND datasource = ?`,
      [regionId, datasource]
    );
    return rows;
  }

  // 插入或更新收益数据
  static async upsert(data) {
    const query = `
      INSERT INTO lp_blueprint_profits 
        (type_id, offer_id, corporation_id, region_id, lp_cost, isk_cost, material_cost, 
         total_cost, product_type_id, product_buy_price, product_sell_price, total_profit, profit_per_lp, datasource)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        offer_id = VALUES(offer_id),
        corporation_id = VALUES(corporation_id),
        lp_cost = VALUES(lp_cost),
        isk_cost = VALUES(isk_cost),
        material_cost = VALUES(material_cost),
        total_cost = VALUES(total_cost),
        product_type_id = VALUES(product_type_id),
        product_buy_price = VALUES(product_buy_price),
        product_sell_price = VALUES(product_sell_price),
        total_profit = VALUES(total_profit),
        profit_per_lp = VALUES(profit_per_lp),
        updated_at = CURRENT_TIMESTAMP
    `;
    await pool.execute(query, [
      data.type_id, data.offer_id, data.corporation_id, data.region_id,
      data.lp_cost, data.isk_cost, data.material_cost, data.total_cost,
      data.product_type_id, data.product_buy_price, data.product_sell_price,
      data.total_profit, data.profit_per_lp, data.datasource
    ]);
  }

  // 获取所有收益数据（按profit_per_lp降序）
  static async getAllForDisplay(regionId, datasource) {
    const [rows] = await pool.execute(
      `SELECT type_id, profit_per_lp, updated_at FROM lp_blueprint_profits 
       WHERE region_id = ? AND datasource = ? 
       ORDER BY profit_per_lp DESC`,
      [regionId, datasource]
    );
    return rows;
  }

  // 获取单个蓝图的收益数据
  static async getByTypeId(typeId, regionId, datasource) {
    const [rows] = await pool.execute(
      `SELECT * FROM lp_blueprint_profits WHERE type_id = ? AND region_id = ? AND datasource = ?`,
      [typeId, regionId, datasource]
    );
    return rows[0] || null;
  }
}

module.exports = LpBlueprintProfit;
