const pool = require('../config/database');

class LoyaltyTypeLpIsk {

  static async dropTable() {
    const query = `DROP TABLE IF EXISTS loyalty_type_lp_isk`;
    await pool.execute(query);
  }

  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS loyalty_type_lp_isk (
        id INT PRIMARY KEY AUTO_INCREMENT,
        type_id INT NOT NULL,
        corporation_id INT NOT NULL,
        region_id INT NOT NULL,
        lp_cost INT NOT NULL,
        isk_cost BIGINT NOT NULL,
        sell_price DECIMAL(20,6) NOT NULL,
        quantity INT NOT NULL,
        total_profit DECIMAL(20,6) NOT NULL,
        profit_per_lp DECIMAL(20,6) NOT NULL,
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
      INSERT INTO loyalty_type_lp_isk (
        type_id, corporation_id, region_id, lp_cost, isk_cost, 
        sell_price, quantity, total_profit, profit_per_lp, datasource
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        lp_cost = VALUES(lp_cost),
        isk_cost = VALUES(isk_cost),
        sell_price = VALUES(sell_price),
        quantity = VALUES(quantity),
        total_profit = VALUES(total_profit),
        profit_per_lp = VALUES(profit_per_lp),
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
        data.sell_price,
        data.quantity,
        data.total_profit,
        data.profit_per_lp,
        datasource
      ]);
      return true;
    } catch (error) {
      console.error('Error inserting/updating loyalty type lp isk:', error);
      return false;
    }
  }

  static async findByCorporationId(corporationId, datasource = 'serenity') {
    const query = `
      SELECT * FROM loyalty_type_lp_isk 
      WHERE corporation_id = ? AND datasource = ? 
      ORDER BY profit_per_lp DESC
    `;
    
    try {
      const [rows] = await pool.execute(query, [corporationId, datasource]);
      return rows;
    } catch (error) {
      console.error('Error finding loyalty type lp isk by corporation id:', error);
      return [];
    }
  }

  static async findByCorporationIdAndRegionId(corporationId, regionId, datasource = 'serenity') {
    const query = `
      SELECT * FROM loyalty_type_lp_isk 
      WHERE corporation_id = ? AND region_id = ? AND datasource = ?
      ORDER BY profit_per_lp DESC
    `;
    
    try {
      const [rows] = await pool.execute(query, [corporationId, regionId, datasource]);
      return rows;
    } catch (error) {
      console.error('Error finding loyalty type lp isk by corporation and region:', error);
      return [];
    }
  }

  // 按corporationId删除数据
  static async deleteByCorporationId(corporationId, datasource = 'serenity') {
    const query = `DELETE FROM loyalty_type_lp_isk WHERE corporation_id = ? AND datasource = ?`;
    try {
      await pool.execute(query, [corporationId, datasource]);
      return true;
    } catch (error) {
      console.error('Error deleting loyalty_type_lp_isk by corporationId:', error);
      return false;
    }
  }

  // 清空表数据
  static async truncate() {
    const query = `TRUNCATE TABLE loyalty_type_lp_isk`;
    try {
      await pool.execute(query);
      return true;
    } catch (error) {
      console.error('Error truncating loyalty_type_lp_isk table:', error);
      return false;
    }
  }

  // 获取分页收益数据，包含type名称
  static async getProfitDataWithTypeNames(page = 1, limit = 10, filters = {}) {
    try {
      const offset = (page - 1) * limit;
      const { corporationId, regionId, datasource = 'serenity' } = filters;
      
      // 构建总数查询
      const countQuery = `
        SELECT COUNT(*) as total
        FROM loyalty_type_lp_isk l
        WHERE l.datasource = ?
        ${corporationId ? ' AND l.corporation_id = ?' : ''}
        ${regionId ? ' AND l.region_id = ?' : ''}
      `;
      
      // 执行总数查询
      const countParams = [datasource];
      if (corporationId) countParams.push(corporationId.toString());
      if (regionId) countParams.push(regionId.toString());
      
      const [countResult] = await pool.execute(countQuery, countParams);
      const total = countResult[0].total;
      
      // 如果没有数据，直接返回空结果
      if (total === 0) {
        return {
          data: [],
          total: 0,
          page,
          limit,
          totalPages: 0
        };
      }
      
      // 构建主查询
      const query = `
        SELECT l.*, t.name as type_name, 
               o.volume_remaining as max_buy_order_volume_remaining,
               ((l.total_profit / l.quantity) * o.volume_remaining) as max_buy_order_total_profit,
               NOT EXISTS(
                 SELECT 1 FROM loyalty_offers lo
                 WHERE lo.type_id = l.type_id AND lo.corporation_id != l.corporation_id AND lo.datasource = ?
               ) as is_unique
        FROM loyalty_type_lp_isk l
        LEFT JOIN types t ON l.type_id = t.id
        LEFT JOIN orders o ON l.type_id = o.type_id AND l.region_id = o.region_id AND o.is_buy_order = 1 AND o.datasource = ?
        LEFT JOIN (
          SELECT type_id, region_id, MAX(price) as max_price
          FROM orders
          WHERE is_buy_order = 1 AND datasource = ?
          GROUP BY type_id, region_id
        ) o_max ON o.type_id = o_max.type_id AND o.region_id = o_max.region_id AND o.price = o_max.max_price
        WHERE l.datasource = ?
        ${corporationId ? ' AND l.corporation_id = ?' : ''}
        ${regionId ? ' AND l.region_id = ?' : ''}
        ORDER BY l.profit_per_lp DESC
        LIMIT ? OFFSET ?
      `;
      
      // 构建查询参数数组
      const queryParams = [];
      
      // 添加子查询和JOIN条件的datasource参数
      queryParams.push(datasource); // loyalty_offers.datasource
      queryParams.push(datasource); // orders.datasource
      queryParams.push(datasource); // orders subquery.datasource
      queryParams.push(datasource); // loyalty_type_lp_isk.datasource
      
      // 添加过滤条件参数
      if (corporationId) queryParams.push(corporationId.toString()); // l.corporation_id = ?
      if (regionId) queryParams.push(regionId.toString()); // l.region_id = ?
      
      // 添加分页参数
      queryParams.push(limit.toString()); // LIMIT ?
      queryParams.push(offset.toString()); // OFFSET ?
      
      // 添加详细调试日志
      const placeholderCount = (query.match(/\?/g) || []).length;
      const paramCount = queryParams.length;
      
      console.log('Debug - Main query:', query);
      console.log('Debug - Placeholder count:', placeholderCount);
      console.log('Debug - Parameter count:', paramCount);
      console.log('Debug - Parameters:', queryParams);
      console.log('Debug - Filters:', { corporationId, regionId, datasource });
      console.log('Debug - CorporationId type:', typeof corporationId, 'RegionId type:', typeof regionId);
      
      // 执行主查询
      const [rows] = await pool.execute(query, queryParams);
      
      console.log('Debug - Main query result length:', rows.length);
      console.log('Debug - Total from count query:', total);
      
      return {
        data: rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('Error getting profit data with type names:', error);
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0
      };
    }
  }
}

module.exports = LoyaltyTypeLpIsk;