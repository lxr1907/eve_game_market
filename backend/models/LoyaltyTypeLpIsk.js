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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_type_corp_region (type_id, corporation_id, region_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    await pool.execute(query);
  }

  static async insertOrUpdate(data) {
    const query = `
      INSERT INTO loyalty_type_lp_isk (
        type_id, corporation_id, region_id, lp_cost, isk_cost, 
        sell_price, quantity, total_profit, profit_per_lp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        lp_cost = VALUES(lp_cost),
        isk_cost = VALUES(isk_cost),
        sell_price = VALUES(sell_price),
        quantity = VALUES(quantity),
        total_profit = VALUES(total_profit),
        profit_per_lp = VALUES(profit_per_lp),
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
        data.profit_per_lp
      ]);
      return true;
    } catch (error) {
      console.error('Error inserting/updating loyalty type lp isk:', error);
      return false;
    }
  }

  static async findByCorporationId(corporationId) {
    const query = `
      SELECT * FROM loyalty_type_lp_isk 
      WHERE corporation_id = ? 
      ORDER BY profit_per_lp DESC
    `;
    
    try {
      const [rows] = await pool.execute(query, [corporationId]);
      return rows;
    } catch (error) {
      console.error('Error finding loyalty type lp isk by corporation id:', error);
      return [];
    }
  }

  static async findByCorporationIdAndRegionId(corporationId, regionId) {
    const query = `
      SELECT * FROM loyalty_type_lp_isk 
      WHERE corporation_id = ? AND region_id = ? 
      ORDER BY profit_per_lp DESC
    `;
    
    try {
      const [rows] = await pool.execute(query, [corporationId, regionId]);
      return rows;
    } catch (error) {
      console.error('Error finding loyalty type lp isk by corporation and region:', error);
      return [];
    }
  }

  // 按corporationId删除数据
  static async deleteByCorporationId(corporationId) {
    const query = `DELETE FROM loyalty_type_lp_isk WHERE corporation_id = ?`;
    try {
      await pool.execute(query, [corporationId]);
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
      const { corporationId, regionId } = filters;
      
      // 构建查询条件
      let whereClause = '';
      let params = [];
      
      if (corporationId) {
        whereClause += `WHERE corporation_id = ${parseInt(corporationId)} `;
      }
      
      if (regionId) {
        whereClause += whereClause ? 'AND ' : 'WHERE ';
        whereClause += `region_id = ${parseInt(regionId)} `;
      }
      
      // 构建总数查询
      const countQuery = `
        SELECT COUNT(*) as total
        FROM loyalty_type_lp_isk l
        ${whereClause}
      `;
      
      // 执行总数查询
      const [countResult] = await pool.execute(countQuery);
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
        SELECT l.*, t.name as type_name
        FROM loyalty_type_lp_isk l
        LEFT JOIN types t ON l.type_id = t.id
        ${whereClause}
        ORDER BY l.profit_per_lp DESC
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
      `;
      
      // 执行主查询
      const [rows] = await pool.execute(query);
      
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