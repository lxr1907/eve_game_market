const pool = require('../config/database');

class LoyaltyOffer {
  static async dropTable() {
    // 先删除从表
    await pool.execute(`DROP TABLE IF EXISTS loyalty_offer_required_items`);
    // 再删除主表
    await pool.execute(`DROP TABLE IF EXISTS loyalty_offers`);
  }

  static async createTable() {
    // 创建主表：loyalty_offers
    const query = `
      CREATE TABLE IF NOT EXISTS loyalty_offers (
        id INT PRIMARY KEY AUTO_INCREMENT,
        offer_id INT NOT NULL,
        corporation_id INT NOT NULL,
        type_id INT NOT NULL,
        quantity INT NOT NULL,
        lp_cost INT NOT NULL,
        isk_cost BIGINT NOT NULL,
        ak_cost INT,
        status VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_offer (offer_id, corporation_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    await pool.execute(query);
    
    // 创建从表：loyalty_offer_required_items
    const query2 = `
      CREATE TABLE IF NOT EXISTS loyalty_offer_required_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        offer_id INT NOT NULL,
        corporation_id INT NOT NULL,
        type_id INT NOT NULL,
        quantity INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    await pool.execute(query2);
  }

  static async insertOrUpdate(offerData) {
    // 将所有undefined值转换为null，避免数据库绑定参数错误
    const safeData = {
      offer_id: offerData.offer_id !== undefined ? offerData.offer_id : null,
      corporation_id: offerData.corporation_id !== undefined ? offerData.corporation_id : null,
      type_id: offerData.type_id !== undefined ? offerData.type_id : null,
      quantity: offerData.quantity !== undefined ? offerData.quantity : null,
      lp_cost: offerData.lp_cost !== undefined ? offerData.lp_cost : null,
      isk_cost: offerData.isk_cost !== undefined ? offerData.isk_cost : null,
      ak_cost: offerData.ak_cost !== undefined ? offerData.ak_cost : null
    };
    
    const query = `
      INSERT INTO loyalty_offers (
        offer_id, corporation_id, type_id, quantity, lp_cost, isk_cost, ak_cost
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        type_id = VALUES(type_id),
        quantity = VALUES(quantity),
        lp_cost = VALUES(lp_cost),
        isk_cost = VALUES(isk_cost),
        ak_cost = VALUES(ak_cost),
        status = 'completed',
        updated_at = CURRENT_TIMESTAMP
    `;
    
    try {
      await pool.execute(query, [
        safeData.offer_id,
        safeData.corporation_id,
        safeData.type_id,
        safeData.quantity,
        safeData.lp_cost,
        safeData.isk_cost,
        safeData.ak_cost
      ]);
      
      return true;
    } catch (error) {
      console.error('Error inserting/updating loyalty offer:', error);
      return false;
    }
  }

  static async insertRequiredItems(offerId, corporationId, requiredItems) {
    if (!requiredItems || requiredItems.length === 0) {
      return true;
    }
    
    // 先删除该offer_id和corporation_id的所有现有required_items
    const deleteQuery = `
      DELETE FROM loyalty_offer_required_items 
      WHERE offer_id = ? AND corporation_id = ?
    `;
    await pool.execute(deleteQuery, [offerId, corporationId]);
    
    // 插入新的required_items
    const insertQuery = `
      INSERT INTO loyalty_offer_required_items (
        offer_id, corporation_id, type_id, quantity
      ) VALUES (?, ?, ?, ?)
    `;
    
    try {
      for (const item of requiredItems) {
        await pool.execute(insertQuery, [
          offerId,
          corporationId,
          item.type_id,
          item.quantity
        ]);
      }
      
      return true;
    } catch (error) {
      console.error('Error inserting loyalty offer required items:', error);
      return false;
    }
  }

  static async findById(offerId, corporationId) {
    const query = `
      SELECT lo.*, lor.type_id as required_type_id, lor.quantity as required_quantity
      FROM loyalty_offers lo
      LEFT JOIN loyalty_offer_required_items lor ON lo.offer_id = lor.offer_id AND lo.corporation_id = lor.corporation_id
      WHERE lo.offer_id = ? AND lo.corporation_id = ?
    `;
    
    try {
      const [rows] = await pool.execute(query, [offerId, corporationId]);
      
      if (rows.length === 0) {
        return null;
      }
      
      // 将结果转换为合适的格式
      const offer = {
        offer_id: rows[0].offer_id,
        corporation_id: rows[0].corporation_id,
        type_id: rows[0].type_id,
        quantity: rows[0].quantity,
        lp_cost: rows[0].lp_cost,
        isk_cost: rows[0].isk_cost,
        ak_cost: rows[0].ak_cost,
        status: rows[0].status,
        created_at: rows[0].created_at,
        updated_at: rows[0].updated_at,
        required_items: []
      };
      
      // 收集所有required_items
      rows.forEach(row => {
        if (row.required_type_id !== null) {
          offer.required_items.push({
            type_id: row.required_type_id,
            quantity: row.required_quantity
          });
        }
      });
      
      return offer;
    } catch (error) {
      console.error('Error finding loyalty offer by id:', error);
      return null;
    }
  }

  static async findAll(page = 1, limit = 10, search = '', corporationId = null, datasource = 'serenity') {
    const offset = (page - 1) * limit;
    
    try {
      // 使用预处理语句的另一种方式
      let offers, countResult;
      
      if (search && corporationId) {
        // 同时有搜索条件和公司ID
        const [offersResult] = await pool.query(
          `SELECT lo.*, t.name as type_name FROM loyalty_offers lo 
           LEFT JOIN types t ON lo.type_id = t.id 
           WHERE (lo.offer_id LIKE ? OR lo.type_id LIKE ? OR t.name LIKE ?) AND lo.corporation_id = ? 
           ORDER BY lo.offer_id DESC LIMIT ? OFFSET ?`,
          [`%${search}%`, `%${search}%`, `%${search}%`, parseInt(corporationId, 10), parseInt(limit, 10), parseInt(offset, 10)]
        );
        offers = offersResult;
        
        const [countResultData] = await pool.query(
          `SELECT COUNT(*) as count FROM loyalty_offers lo 
           LEFT JOIN types t ON lo.type_id = t.id 
           WHERE (lo.offer_id LIKE ? OR lo.type_id LIKE ? OR t.name LIKE ?) AND lo.corporation_id = ?`,
          [`%${search}%`, `%${search}%`, `%${search}%`, parseInt(corporationId, 10)]
        );
        countResult = countResultData;
      } else if (search) {
        // 只有搜索条件
        const [offersResult] = await pool.query(
          `SELECT lo.*, t.name as type_name FROM loyalty_offers lo 
           LEFT JOIN types t ON lo.type_id = t.id 
           WHERE lo.offer_id LIKE ? OR lo.type_id LIKE ? OR t.name LIKE ? 
           ORDER BY lo.offer_id DESC LIMIT ? OFFSET ?`,
          [`%${search}%`, `%${search}%`, `%${search}%`, parseInt(limit, 10), parseInt(offset, 10)]
        );
        offers = offersResult;
        
        const [countResultData] = await pool.query(
          `SELECT COUNT(*) as count FROM loyalty_offers lo 
           LEFT JOIN types t ON lo.type_id = t.id 
           WHERE lo.offer_id LIKE ? OR lo.type_id LIKE ? OR t.name LIKE ?`,
          [`%${search}%`, `%${search}%`, `%${search}%`]
        );
        countResult = countResultData;
      } else if (corporationId) {
        // 只有公司ID
        console.log('Only corporationId:', corporationId, limit, offset);
        const [offersResult] = await pool.query(
          `SELECT lo.*, t.name as type_name FROM loyalty_offers lo 
           LEFT JOIN types t ON lo.type_id = t.id 
           WHERE lo.corporation_id = ? 
           ORDER BY lo.offer_id DESC LIMIT ? OFFSET ?`,
          [parseInt(corporationId, 10), parseInt(limit, 10), parseInt(offset, 10)]
        );
        offers = offersResult;
        
        const [countResultData] = await pool.query(
          `SELECT COUNT(*) as count FROM loyalty_offers lo WHERE lo.corporation_id = ?`,
          [parseInt(corporationId, 10)]
        );
        countResult = countResultData;
      } else {
        // 没有条件
        const [offersResult] = await pool.query(
          `SELECT lo.*, t.name as type_name FROM loyalty_offers lo 
           LEFT JOIN types t ON lo.type_id = t.id 
           ORDER BY lo.offer_id DESC LIMIT ? OFFSET ?`,
          [parseInt(limit, 10), parseInt(offset, 10)]
        );
        offers = offersResult;
        
        const [countResultData] = await pool.query(
          `SELECT COUNT(*) as count FROM loyalty_offers lo`
        );
        countResult = countResultData;
      }
      
      // 获取每个offer的required_items
      for (const offer of offers) {
        const requiredItemsQuery = `
          SELECT type_id, quantity
          FROM loyalty_offer_required_items
          WHERE offer_id = ? AND corporation_id = ?
        `;
        const [requiredItems] = await pool.execute(requiredItemsQuery, [offer.offer_id, offer.corporation_id]);
        offer.required_items = requiredItems;
      }
      
      return {
        offers,
        total: countResult[0].count,
        page,
        limit,
        totalPages: Math.ceil(countResult[0].count / limit)
      };
    } catch (error) {
      console.error('Error finding all loyalty offers:', error);
      return {
        offers: [],
        total: 0,
        page,
        limit,
        totalPages: 0
      };
    }
  }

  static async count(search = '', corporationId = null) {
    let query = `
      SELECT COUNT(*) as count
      FROM loyalty_offers lo
      LEFT JOIN types t ON lo.type_id = t.id
      WHERE 1 = 1
    `;
    
    const params = [];
    
    if (search) {
      query += ` AND (lo.offer_id LIKE ? OR lo.type_id LIKE ? OR t.name LIKE ?)`;
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }
    
    if (corporationId) {
      query += ` AND lo.corporation_id = ?`;
      params.push(corporationId);
    }
    
    try {
      const [result] = await pool.execute(query, params);
      return result[0].count;
    } catch (error) {
      console.error('Error counting loyalty offers:', error);
      return 0;
    }
  }

  static async findAllByCorporationId(corporationId, limit = 10, offset = 0) {
    // 将limit和offset转换为page
    const page = Math.floor(offset / limit) + 1;
    return this.findAll(page, limit, '', corporationId);
  }
}

module.exports = LoyaltyOffer;
