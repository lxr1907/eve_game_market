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
        -- 列表展示用的中间价收益
        total_profit DECIMAL(20,2) NOT NULL DEFAULT 0,
        profit_per_lp DECIMAL(20,2) NOT NULL DEFAULT 0,
        -- 详情展示用的分开收益
        buy_profit DECIMAL(20,2) DEFAULT 0,
        sell_profit DECIMAL(20,2) DEFAULT 0,
        profit_per_lp_buy DECIMAL(20,2) DEFAULT 0,
        profit_per_lp_sell DECIMAL(20,2) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'active', -- active/no_orders/error
        datasource VARCHAR(20) NOT NULL DEFAULT 'serenity',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_type_region_datasource (type_id, region_id, datasource)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    await pool.execute(query);
  }

  // 检查并添加新列（用于升级现有表）
  static async addNewColumns() {
    const columns = [
      { name: 'buy_profit', type: 'DECIMAL(20,2) DEFAULT 0' },
      { name: 'sell_profit', type: 'DECIMAL(20,2) DEFAULT 0' },
      { name: 'profit_per_lp_buy', type: 'DECIMAL(20,2) DEFAULT 0' },
      { name: 'profit_per_lp_sell', type: 'DECIMAL(20,2) DEFAULT 0' },
      { name: 'status', type: 'VARCHAR(20) DEFAULT "active"' }
    ];

    // 先检查表是否存在
    const [tables] = await pool.execute(`
      SELECT TABLE_NAME FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'lp_blueprint_profits'
    `);
    
    if (tables.length === 0) {
      console.log('[LpBlueprintProfit] Table does not exist yet, skipping column addition');
      return;
    }

    for (const col of columns) {
      try {
        // 检查列是否存在
        const [existingCols] = await pool.execute(`
          SELECT COLUMN_NAME FROM information_schema.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'lp_blueprint_profits' 
            AND COLUMN_NAME = ?
        `, [col.name]);
        
        if (existingCols.length === 0) {
          await pool.execute(`
            ALTER TABLE lp_blueprint_profits 
            ADD COLUMN ${col.name} ${col.type}
          `);
          console.log(`[LpBlueprintProfit] Column ${col.name} added successfully`);
        } else {
          console.log(`[LpBlueprintProfit] Column ${col.name} already exists`);
        }
      } catch (error) {
        console.error(`[LpBlueprintProfit] Error adding column ${col.name}:`, error.message);
      }
    }
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
         total_cost, product_type_id, product_buy_price, product_sell_price, total_profit, profit_per_lp, 
         buy_profit, sell_profit, profit_per_lp_buy, profit_per_lp_sell, status, datasource)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        buy_profit = VALUES(buy_profit),
        sell_profit = VALUES(sell_profit),
        profit_per_lp_buy = VALUES(profit_per_lp_buy),
        profit_per_lp_sell = VALUES(profit_per_lp_sell),
        status = VALUES(status),
        updated_at = CURRENT_TIMESTAMP
    `;
    await pool.execute(query, [
      data.type_id, data.offer_id, data.corporation_id, data.region_id,
      data.lp_cost, data.isk_cost, data.material_cost, data.total_cost,
      data.product_type_id, data.product_buy_price, data.product_sell_price,
      data.total_profit, data.profit_per_lp,
      data.buy_profit || 0, data.sell_profit || 0, data.profit_per_lp_buy || 0, data.profit_per_lp_sell || 0,
      data.status || 'active',
      data.datasource
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
