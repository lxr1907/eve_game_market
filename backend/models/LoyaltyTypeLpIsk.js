const pool = require('../config/database');

class LoyaltyTypeLpIsk {
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

  // 保留每个corporation_id和type_id下profit_per_lp最高的2条数据
  static async keepTop2ProfitRecords(corporationId, typeId, datasource = 'serenity') {
    const query = `
      DELETE FROM loyalty_type_lp_isk
      WHERE id NOT IN (
        SELECT id FROM (
          SELECT id 
          FROM loyalty_type_lp_isk 
          WHERE corporation_id = ? AND type_id = ? AND datasource = ?
          ORDER BY profit_per_lp DESC
          LIMIT 2
        ) AS top_records
      ) AND corporation_id = ? AND type_id = ? AND datasource = ?
    `;
    
    try {
      await pool.execute(query, [
        corporationId,
        typeId,
        datasource,
        corporationId,
        typeId,
        datasource
      ]);
      return true;
    } catch (error) {
      console.error('Error keeping top 2 profit records:', error);
      return false;
    }
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
      
      // 插入/更新后，保留该corporation_id和type_id下profit_per_lp最高的2条数据
      await this.keepTop2ProfitRecords(data.corporation_id, data.type_id, datasource);
      
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

  // 删除更新时间在5天之前的数据
  static async deleteOldData(days = 5) {
    const query = `DELETE FROM loyalty_type_lp_isk WHERE updated_at < DATE_SUB(NOW(), INTERVAL ? DAY)`;
    try {
      const [result] = await pool.execute(query, [days]);
      if (result.affectedRows > 0) {
        console.log(`Deleted ${result.affectedRows} LP profit records older than ${days} days.`);
      }
      return true;
    } catch (error) {
      console.error(`Error deleting LP profit data older than ${days} days:`, error);
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
      const { corporationId, regionId, datasource = 'serenity', search = '', profitFilter = '' } = filters;
      
      // 构建利润筛选条件
      let profitCondition = '';
      if (profitFilter === 'gt0') {
        profitCondition = ' AND l.profit_per_lp > 0';
      } else if (profitFilter === 'gt500') {
        profitCondition = ' AND l.profit_per_lp > 500';
      } else if (profitFilter === 'gt1000') {
        profitCondition = ' AND l.profit_per_lp > 1000';
      } else if (profitFilter === 'gt1500') {
        profitCondition = ' AND l.profit_per_lp > 1500';
      }
      
      // 构建主查询 - 使用相关子查询兼容MySQL 5.x（不支持窗口函数）
      // 使用子查询获取每个物品的最大买单信息，避免JOIN产生重复数据
      const query = `
        SELECT SQL_CALC_FOUND_ROWS l.*, t.name as type_name, 
               o.max_volume_remaining as max_buy_order_volume_remaining,
               ((l.total_profit / l.quantity) * o.max_volume_remaining) as max_buy_order_total_profit,
               NOT EXISTS(
                 SELECT 1 FROM loyalty_offers lo
                 WHERE lo.type_id = l.type_id AND lo.corporation_id != l.corporation_id
               ) as is_unique
        FROM loyalty_type_lp_isk l
        LEFT JOIN types t ON l.type_id = t.id
        LEFT JOIN (
          SELECT type_id, region_id, datasource, 
                 SUM(volume_remaining) as max_volume_remaining
          FROM orders 
          WHERE is_buy_order = 1 AND datasource = ?
            AND price = (
              SELECT MAX(price) FROM orders 
              WHERE type_id = orders.type_id AND region_id = orders.region_id AND is_buy_order = 1 AND datasource = orders.datasource
            )
          GROUP BY type_id, region_id, datasource
        ) o ON 
          l.type_id = o.type_id AND 
          l.region_id = o.region_id AND 
          o.datasource = ?
        WHERE l.datasource = ?
        ${corporationId ? ' AND l.corporation_id = ?' : ''}
        ${regionId ? ' AND l.region_id = ?' : ''}
        ${search ? ' AND t.name LIKE ?' : ''}
        ${profitCondition}
        ORDER BY l.profit_per_lp DESC
        LIMIT ? OFFSET ?
      `;
      
      // 构建查询参数数组
      const queryParams = [];
      
      // 添加子查询条件的datasource参数
      queryParams.push(datasource); // orders.datasource in subquery
      queryParams.push(datasource); // o.datasource in JOIN condition
      queryParams.push(datasource); // loyalty_type_lp_isk.datasource
      
      // 添加过滤条件参数 - 直接传递数字类型，避免转换
      if (corporationId) queryParams.push(corporationId); // l.corporation_id = ?
      if (regionId) queryParams.push(regionId); // l.region_id = ?
      if (search) queryParams.push(`%${search}%`); // t.name LIKE ?
      
      // 添加分页参数 - MySQL 8 需要确保是原生数字类型
      queryParams.push(Number(limit)); // LIMIT ?
      queryParams.push(Number(offset)); // OFFSET ?
      
      const [rows] = await pool.query(query, queryParams);
      
      // 获取总行数
      const [countResult] = await pool.execute('SELECT FOUND_ROWS() as total');
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
  /**
   * 启动时自动检查并修复表完整性：
   * 1. 检查 UNIQUE KEY 是否存在
   * 2. 如缺失：删除重复数据 → 添加索引
   * 确保不同环境（开发/生产/新部署）表结构一致
   */
  static async ensureTableIntegrity() {
    const tableName = 'loyalty_type_lp_isk';
    const indexName = 'unique_type_corp_region_datasource';
    const indexColumns = 'type_id, corporation_id, region_id, datasource';

    try {
      // 检查 UNIQUE KEY 是否存在
      const [indexes] = await pool.execute(
        `SHOW INDEXES FROM \`${tableName}\` WHERE Key_name = ?`,
        [indexName]
      );

      if (indexes.length > 0) {
        console.log(`[Integrity] ${tableName}: UNIQUE KEY already exists, skipped`);
        return;
      }

      console.log(`[Integrity] ${tableName}: UNIQUE KEY missing, repairing...`);

      // 1. 删除重复数据（保留 id 最大的行）
      const [dupCheck] = await pool.execute(`
        SELECT COUNT(*) as cnt FROM (
          SELECT ${indexColumns}, COUNT(*) as c
          FROM \`${tableName}\`
          GROUP BY ${indexColumns}
          HAVING c > 1
        ) t
      `);
      const dupCount = dupCheck[0].cnt;

      if (dupCount > 0) {
        const [delResult] = await pool.execute(`
          DELETE t1 FROM \`${tableName}\` t1
          INNER JOIN \`${tableName}\` t2
          WHERE t1.type_id = t2.type_id
            AND t1.corporation_id = t2.corporation_id
            AND t1.region_id = t2.region_id
            AND t1.datasource = t2.datasource
            AND t1.id < t2.id
        `);
        console.log(`[Integrity] ${tableName}: removed ${delResult.affectedRows} duplicate rows from ${dupCount} groups`);
      }

      // 2. 添加 UNIQUE KEY
      await pool.execute(
        `ALTER TABLE \`${tableName}\` ADD UNIQUE KEY \`${indexName}\` (${indexColumns})`
      );
      console.log(`[Integrity] ${tableName}: UNIQUE KEY added successfully`);
    } catch (error) {
      // 索引已存在的情况（并发场景）
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log(`[Integrity] ${tableName}: UNIQUE KEY already added by another process`);
      } else {
        console.error(`[Integrity] ${tableName}: repair failed -`, error.message);
      }
    }
  }
}

module.exports = LoyaltyTypeLpIsk;