const pool = require('../config/database');

/**
 * 蓝图相关表结构同步工具
 * 基于blueprints.jsonl数据结构设计新的表结构
 */

async function syncBlueprintTables() {
  console.log('开始同步蓝图相关表结构...');
  
  try {
    // 1. 创建或更新 blueprints 表 - 蓝图基本信息
    await createOrUpdateTable('blueprints', `
      CREATE TABLE IF NOT EXISTS blueprints (
        blueprint_type_id INT PRIMARY KEY,
        max_production_limit INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 2. 创建或更新 blueprint_materials 表 - 蓝图制造材料
    await createOrUpdateTable('blueprint_materials', `
      CREATE TABLE IF NOT EXISTS blueprint_materials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        blueprint_type_id INT NOT NULL,
        material_type_id INT NOT NULL,
        quantity INT NOT NULL,
        activity_type VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'manufacturing',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_blueprint (blueprint_type_id),
        INDEX idx_material (material_type_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 3. 创建或更新 blueprint_products 表 - 蓝图制造产品
    await createOrUpdateTable('blueprint_products', `
      CREATE TABLE IF NOT EXISTS blueprint_products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        blueprint_type_id INT NOT NULL,
        product_type_id INT NOT NULL,
        quantity INT NOT NULL,
        probability DECIMAL(5,2) DEFAULT 1.00,
        activity_type VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'manufacturing',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_blueprint (blueprint_type_id),
        INDEX idx_product (product_type_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 4. 创建或更新 blueprint_skills 表 - 蓝图所需技能
    await createOrUpdateTable('blueprint_skills', `
      CREATE TABLE IF NOT EXISTS blueprint_skills (
        id INT AUTO_INCREMENT PRIMARY KEY,
        blueprint_type_id INT NOT NULL,
        skill_type_id INT NOT NULL,
        skill_level INT NOT NULL,
        activity_type VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'manufacturing',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_blueprint (blueprint_type_id),
        INDEX idx_skill (skill_type_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 5. 创建或更新 blueprint_activities 表 - 蓝图活动信息
    await createOrUpdateTable('blueprint_activities', `
      CREATE TABLE IF NOT EXISTS blueprint_activities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        blueprint_type_id INT NOT NULL,
        activity_type VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        activity_time INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_blueprint_activity (blueprint_type_id, activity_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    console.log('蓝图相关表结构同步完成！');
    
  } catch (error) {
    console.error('同步蓝图表结构时出错:', error);
    throw error;
  }
}

/**
 * 创建或更新表结构
 * @param {string} tableName 表名
 * @param {string} createTableSql 创建表的SQL语句
 */
async function createOrUpdateTable(tableName, createTableSql) {
  try {
    await pool.execute(createTableSql);
    console.log(`✓ 表 ${tableName} 创建或验证成功`);
  } catch (error) {
    console.error(`✗ 处理表 ${tableName} 时出错:`, error.message);
    throw error;
  }
}

// 执行同步
if (require.main === module) {
  syncBlueprintTables().then(() => {
    console.log('蓝图表结构同步完成');
    process.exit(0);
  }).catch(error => {
    console.error('同步失败:', error);
    process.exit(1);
  });
}

module.exports = { syncBlueprintTables };