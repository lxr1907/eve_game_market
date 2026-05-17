const pool = require('../config/database');

class Type {
  // 清理所有 region_types 表中2周前的旧数据
  static async cleanupOldRegionTypes() {
    try {
      const [result] = await pool.execute(
        'DELETE FROM region_types WHERE updated_at < DATE_SUB(NOW(), INTERVAL 2 WEEK)'
      );
      if (result.affectedRows > 0) {
        console.log(`Cleaned up ${result.affectedRows} region_types records older than 2 weeks`);
      }
      return result.affectedRows;
    } catch (error) {
      console.error('Error cleaning up old region_types:', error);
      return 0;
    }
  }

  // 检查 region_types 表中某个 region 的数据是否超过指定小时数未更新
  static async isRegionTypesStale(regionId, staleHours = 3, datasource = 'serenity') {
    const sql = `
      SELECT updated_at FROM region_types
      WHERE region_id = ? AND datasource = ?
      ORDER BY updated_at asc
      LIMIT 1
    `;
    try {
      const [rows] = await pool.execute(sql, [regionId, datasource]);
      if (rows.length === 0) {
        return true; // 没有数据，视为过期
      }
      const lastUpdate = new Date(rows[0].updated_at);
      const now = new Date();
      const hoursDiff = (now - lastUpdate) / (1000 * 60 * 60);
      return hoursDiff >= staleHours;
    } catch (error) {
      console.error('Error checking region_types freshness:', error);
      return true; // 出错时返回过期，触发更新
    }
  }

  static async updateRegionTypes(regionId, datasource = 'serenity') {
    const eveApiService = require('../services/eveApiService');

    try {
      console.log(`Starting update for region ${regionId} market types for datasource ${datasource}...`);

      // 先删除所有2周前的旧数据
      await pool.execute('DELETE FROM region_types WHERE updated_at < DATE_SUB(NOW(), INTERVAL 2 WEEK)');
      console.log(`Deleted region_types data older than 2 weeks`);

      // 再删除该 region 和 datasource 的所有旧数据
      await pool.execute('DELETE FROM region_types WHERE region_id = ? AND datasource = ?', [regionId, datasource]);
      console.log(`Deleted old data for region ${regionId} and datasource ${datasource}`);

      let page = 1;
      let hasMore = true;
      let totalTypes = 0;

      while (hasMore) {
        const typeIds = await eveApiService.getMarketRegionTypes(regionId, page, datasource);

        if (!typeIds || typeIds.length === 0) {
          hasMore = false;
          break;
        }

        // 批量插入或更新 region_types
        for (const typeId of typeIds) {
          try {
            await pool.execute(`
              INSERT INTO region_types (region_id, type_id, datasource, updated_at)
              VALUES (?, ?, ?, NOW())
              ON DUPLICATE KEY UPDATE updated_at = NOW()
            `, [regionId, typeId, datasource]);
            totalTypes++;
          } catch (err) {
            console.error(`Error inserting region_type (${regionId}, ${typeId}):`, err.message);
          }
        }

        console.log(`Region ${regionId} page ${page}: inserted ${typeIds.length} types (total: ${totalTypes})`);
        page++;

        // 如果返回的数量少于1000，说明是最后一页
        if (typeIds.length < 1000) {
          hasMore = false;
        }
      }

      console.log(`Region ${regionId} update completed: ${totalTypes} types`);
      return { success: true, totalTypes };
    } catch (error) {
      console.error(`Error updating region_types for region ${regionId}:`, error);
      throw error;
    }
  }

  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS types (
        id INT PRIMARY KEY,
        name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        description TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        group_id INT,
        category_id INT,
        mass VARCHAR(50),
        volume VARCHAR(50),
        capacity VARCHAR(50),
        portion_size INT,
        published BOOLEAN,
        status VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    await pool.execute(query);
  }

  static async insertOrUpdate(typeData) {
    // 过滤掉未定义的字段
    const definedFields = {};
    for (const [key, value] of Object.entries(typeData)) {
      if (value !== undefined) {
        definedFields[key] = value;
      }
    }
    
    // 如果没有定义任何字段，直接返回
    if (Object.keys(definedFields).length === 0) {
      return;
    }
    
    const fields = Object.keys(definedFields);
    const values = Object.values(definedFields);
    const placeholders = fields.map(() => '?').join(',');
    
    // 构建ON DUPLICATE KEY UPDATE部分，只更新传入的字段
    const updateClause = fields.map(field => `${field} = VALUES(${field})`).join(', ');
    
    const query = `
      INSERT INTO types (${fields.join(', ')})
      VALUES (${placeholders})
      ON DUPLICATE KEY UPDATE
        ${updateClause},
        updated_at = CURRENT_TIMESTAMP
    `;
    
    await pool.execute(query, values);
  }

  // 批量插入或更新类型数据，提高效率
  static async bulkInsertOrUpdate(typeDataList) {
    if (!Array.isArray(typeDataList) || typeDataList.length === 0) {
      return;
    }
    
    // 过滤掉未定义的字段，确保所有对象都有相同的字段结构
    const firstItem = typeDataList[0];
    const fields = Object.keys(firstItem).filter(key => firstItem[key] !== undefined);
    
    // 如果没有定义任何字段，直接返回
    if (fields.length === 0) {
      return;
    }
    
    // 构建批量插入的values部分
    const values = [];
    const placeholders = [];
    
    typeDataList.forEach(item => {
      const rowValues = fields.map(field => item[field]);
      values.push(...rowValues);
      placeholders.push(`(${fields.map(() => '?').join(', ')})`);
    });
    
    // 构建ON DUPLICATE KEY UPDATE部分
    const updateClause = fields.map(field => `${field} = VALUES(${field})`).join(', ');
    
    const query = `
      INSERT INTO types (${fields.join(', ')})
      VALUES ${placeholders.join(', ')}
      ON DUPLICATE KEY UPDATE
        ${updateClause},
        updated_at = CURRENT_TIMESTAMP
    `;
    
    try {
      await pool.execute(query, values);
      console.log(`Successfully updated ${typeDataList.length} types in bulk`);
    } catch (error) {
      console.error('Error in bulk insert/update:', error);
      // 如果批量操作失败，尝试逐个插入
      for (const item of typeDataList) {
        try {
          await this.insertOrUpdate(item);
        } catch (singleError) {
          console.error(`Error updating single type ID ${item.id}:`, singleError);
        }
      }
    }
  }

  static async findById(id) {
    const query = 'SELECT * FROM types WHERE id = ?';
    const [rows] = await pool.execute(query, [id]);
    return rows[0];
  }

  static async findByIds(ids) {
    if (!ids || ids.length === 0) {
      return [];
    }
    
    // 使用IN语句批量查询
    const placeholders = ids.map(() => '?').join(',');
    const query = `SELECT * FROM types WHERE id IN (${placeholders})`;
    const [rows] = await pool.execute(query, ids);
    return rows;
  }

  // 获取完整的层级结构数据 (Category -> Group -> Type)
  // categoryId: 可选，用于过滤特定分类（如 9 为蓝图）
  static async getHierarchyData(regionId = null, categoryId = null) {
    let query = `
      SELECT DISTINCT
        c.category_id, c.name as category_name,
        g.group_id, g.name as group_name,
        t.id as type_id, t.name as type_name
      FROM types t
      JOIN item_groups g ON t.group_id = g.group_id
      JOIN item_categories c ON g.category_id = c.category_id
    `;

    const params = [];
    let whereClause = " WHERE t.name IS NOT NULL AND t.name != ''";

    if (regionId) {
      query += ` LEFT JOIN region_types rt ON t.id = rt.type_id `;
      whereClause += ` AND (rt.region_id = ? OR rt.region_id IS NULL)`;
      params.push(regionId);
    }

    if (categoryId) {
      whereClause += ` AND c.category_id = ?`;
      params.push(categoryId);
    }

    query += whereClause + ` ORDER BY c.name, g.name, t.name `;

    try {
      const [rows] = await pool.execute(query, params);
      return rows;
    } catch (error) {
      console.error('Error in Type.getHierarchyData:', error);
      throw error;
    }
  }

  static async findAll(page = 1, limit = 10, search = '') {
    let query = 'SELECT * FROM types';
    const params = [];

    if (search) {
      // 纯数字则同时搜索ID和名称
      const isNumeric = /^\d+$/.test(search);
      if (isNumeric) {
        query += ` WHERE (name LIKE ? OR id = ?)`;
        params.push(`%${search}%`, search);
      } else {
        query += ` WHERE name LIKE ?`;
        params.push(`%${search}%`);
      }
    }

    query += ' ORDER BY id';
    
    // 如果limit为null，则返回所有数据，不分页
    if (limit !== null) {
      // 确保所有参数都是整数类型
      const pageInt = parseInt(page) || 1;
      const limitInt = parseInt(limit) || 10;
      const offsetInt = parseInt((pageInt - 1) * limitInt) || 0;
      query += ` LIMIT ${limitInt} OFFSET ${offsetInt}`;
    }

    const [rows] = await pool.query(query, params);
    return rows;
  }

  // 分页查询name为空的类型记录
  static async findAllWithEmptyName(page = 1, limit = 10) {
    // 确保所有参数都是整数类型
    const pageInt = parseInt(page) || 1;
    const limitInt = parseInt(limit) || 10;
    const offsetInt = parseInt((pageInt - 1) * limitInt) || 0;
    
    const query = `SELECT * FROM types WHERE name IS NULL OR name = '' ORDER BY id LIMIT ${limitInt} OFFSET ${offsetInt}`;
    
    try {
      const [types] = await pool.query(query);
      return types;
    } catch (error) {
      console.error('Error fetching types with empty name:', error);
      throw error;
    }
  }
  
  // 获取所有loyalty_offers表中存在的、且name为空的type记录的ID列表
  static async findAllIdsWithEmptyNameFromLoyaltyOffers() {
    const query = `
      SELECT DISTINCT t.id 
      FROM types t 
      JOIN loyalty_offers lo ON t.id = lo.type_id 
      WHERE (t.name IS NULL OR t.name = '') 
      ORDER BY t.id
    `;
    
    try {
      const [results] = await pool.query(query);
      return results.map(row => row.id);
    } catch (error) {
      console.error('Error fetching loyalty offer type IDs with empty name:', error);
      throw error;
    }
  }
  
  // 分页查询loyalty_offers表中存在的、且name为空的类型记录
  static async findAllWithEmptyNameFromLoyaltyOffers(page = 1, limit = 10) {
    // 确保所有参数都是整数类型
    const pageInt = parseInt(page) || 1;
    const limitInt = parseInt(limit) || 10;
    const offsetInt = parseInt((pageInt - 1) * limitInt) || 0;
    
    // 使用JOIN查询获取loyalty_offers表中存在的、且name为空的type记录
    const query = `
      SELECT t.* 
      FROM types t 
      JOIN loyalty_offers lo ON t.id = lo.type_id 
      WHERE (t.name IS NULL OR t.name = '') 
      GROUP BY t.id 
      ORDER BY t.id 
      LIMIT ${limitInt} OFFSET ${offsetInt}
    `;
    
    try {
      const [types] = await pool.query(query);
      return types;
    } catch (error) {
      console.error('Error fetching loyalty offer types with empty name:', error);
      throw error;
    }
  }
  
  // 获取loyalty_offers表中存在的、且name为空的type记录总数
  static async countWithEmptyNameFromLoyaltyOffers() {
    const query = `
      SELECT COUNT(DISTINCT t.id) as count 
      FROM types t 
      JOIN loyalty_offers lo ON t.id = lo.type_id 
      WHERE (t.name IS NULL OR t.name = '')
    `;
    
    try {
      const [result] = await pool.query(query);
      return result[0].count;
    } catch (error) {
      console.error('Error counting loyalty offer types with empty name:', error);
      return 0;
    }
  }

  static async count(search = '') {
    let query = 'SELECT COUNT(*) AS total FROM types';
    const params = [];

    if (search) {
      const isNumeric = /^\d+$/.test(search);
      if (isNumeric) {
        query += ` WHERE (name LIKE ? OR id = ?)`;
        params.push(`%${search}%`, search);
      } else {
        query += ` WHERE name LIKE ?`;
        params.push(`%${search}%`);
      }
    }

    const [rows] = await pool.query(query, params);
    return rows[0].total;
  }

  // 获取name不为null的数据总数
  static async countWithNameNotNull() {
    const query = 'SELECT COUNT(*) AS total FROM types WHERE name IS NOT NULL AND name <> \'\'';
    const [rows] = await pool.query(query);
    return rows[0].total;
  }

  // 获取types表中不重复的groupId列表
  static async findDistinctGroupIds() {
    const query = 'SELECT DISTINCT group_id FROM types WHERE group_id IS NOT NULL ORDER BY group_id';
    const [rows] = await pool.query(query);
    return rows.map(row => row.group_id);
  }

  static async update(id, updates) {
    try {
      // 构建更新语句
      const updateFields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const updateValues = Object.values(updates);
      
      // 将id添加到参数数组末尾
      updateValues.push(id);
      
      const query = `
        UPDATE types 
        SET ${updateFields}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      
      const [result] = await pool.execute(query, updateValues);
      
      // Check if any row was affected
      if (result.affectedRows === 0) {
        return { success: false, message: 'Type not found' };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error updating type:', error);
      throw error;
    }
  }

  // 根据组ID获取该组下的所有类型
  static async findByGroupId(groupId, search = '') {
    let sql = 'SELECT * FROM types WHERE group_id = ? AND name IS NOT NULL AND name != \'\'';
    const params = [groupId];

    if (search) {
      sql += ' AND name LIKE ?';
      params.push(`%${search}%`);
    }

    sql += ' ORDER BY name';

    try {
      const [rows] = await pool.execute(sql, params);
      return rows;
    } catch (error) {
      console.error('Error in Type.findByGroupId:', error);
      throw error;
    }
  }

  // 根据 regionId 获取该区域下的所有类型及其层层级结构
  static async findByRegionId(regionId, datasource) {
    const sql = `
      SELECT DISTINCT
        c.category_id, c.name as category_name,
        g.group_id, g.name as group_name,
        t.id as type_id, t.name as type_name
      FROM region_types rt
      JOIN types t ON rt.type_id = t.id
      JOIN item_groups g ON t.group_id = g.group_id
      JOIN item_categories c ON g.category_id = c.category_id
      WHERE rt.region_id = ? AND rt.datasource = ? AND t.name IS NOT NULL AND t.name != ''
      ORDER BY c.name, g.name, t.name
    `;
    try {
      const [rows] = await pool.execute(sql, [regionId, datasource]);
      return rows;
    } catch (error) {
      console.error('Error in Type.findByRegionId:', error);
      throw error;
    }
  }

  // 根据 regionId 获取该区域下的所有分类
  static async findCategoriesByRegion(regionId, datasource, search = '') {
    let sql = `
      SELECT DISTINCT
        c.category_id, c.name as category_name
      FROM region_types rt
      JOIN types t ON rt.type_id = t.id
      JOIN item_groups g ON t.group_id = g.group_id
      JOIN item_categories c ON g.category_id = c.category_id
      WHERE rt.region_id = ? AND rt.datasource = ? AND t.name IS NOT NULL AND t.name != ''
    `;
    const params = [regionId, datasource];

    if (search) {
      sql += ' AND c.name LIKE ?';
      params.push(`%${search}%`);
    }

    sql += ' ORDER BY c.name';

    try {
      const [rows] = await pool.execute(sql, params);
      return rows;
    } catch (error) {
      console.error('Error in Type.findCategoriesByRegion:', error);
      throw error;
    }
  }

  // 根据 regionId 和 categoryId 获取该分类在该区域下的所有组
  static async findGroupsByCategoryAndRegion(categoryId, regionId, datasource, search = '') {
    let sql = `
      SELECT DISTINCT
        g.group_id, g.name as group_name, g.category_id
      FROM region_types rt
      JOIN types t ON rt.type_id = t.id
      JOIN item_groups g ON t.group_id = g.group_id
      WHERE rt.region_id = ? AND rt.datasource = ? AND g.category_id = ? AND t.name IS NOT NULL AND t.name != ''
    `;
    const params = [regionId, datasource, categoryId];

    if (search) {
      sql += ' AND g.name LIKE ?';
      params.push(`%${search}%`);
    }

    sql += ' ORDER BY g.name';

    try {
      const [rows] = await pool.execute(sql, params);
      return rows;
    } catch (error) {
      console.error('Error in Type.findGroupsByCategoryAndRegion:', error);
      throw error;
    }
  }

  // 根据 regionId 和 groupId 获取该组在该区域下的所有类型
  static async findTypesByGroupAndRegion(groupId, regionId, datasource, search = '') {
    let sql = `
      SELECT DISTINCT
        t.id as type_id, t.name as type_name, t.group_id, g.category_id
      FROM region_types rt
      JOIN types t ON rt.type_id = t.id
      JOIN item_groups g ON t.group_id = g.group_id
      WHERE rt.region_id = ? AND rt.datasource = ? AND t.group_id = ? AND t.name IS NOT NULL AND t.name != ''
    `;
    const params = [regionId, datasource, groupId];

    if (search) {
      sql += ' AND t.name LIKE ?';
      params.push(`%${search}%`);
    }

    sql += ' ORDER BY t.name';

    try {
      const [rows] = await pool.execute(sql, params);
      return rows;
    } catch (error) {
      console.error('Error in Type.findTypesByGroupAndRegion:', error);
      throw error;
    }
  }
}

module.exports = Type;