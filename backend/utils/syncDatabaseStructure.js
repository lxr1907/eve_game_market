const pool = require('../config/database');
const SystemKill = require('../models/SystemKill');
const System = require('../models/System');
const Stargate = require('../models/Stargate');
const Constellation = require('../models/Constellation');
const LoyaltySkipItem = require('../models/LoyaltySkipItem');


/**
 * 数据库表结构同步工具
 * 该工具会检查并增量更新数据库表结构，不会删除现有数据
 */
async function syncDatabaseStructure() {
  console.log('开始同步数据库表结构...');
  
  try {
    // 1. 创建或更新 regions 表
    await createOrUpdateTable('regions', `
      CREATE TABLE IF NOT EXISTS regions (
        id INT PRIMARY KEY,
        name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        description TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        constellations JSON,
        status VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT "pending",
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 2. 创建或更新 types 表
    await createOrUpdateTable('types', `
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
        status VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT "pending",
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 3. 创建或更新 item_groups 表
    await createOrUpdateTable('item_groups', `
      CREATE TABLE IF NOT EXISTS item_groups (
        group_id INT PRIMARY KEY,
        category_id INT,
        name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        published BOOLEAN,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 4. 创建或更新 item_categories 表
    await createOrUpdateTable('item_categories', `
      CREATE TABLE IF NOT EXISTS item_categories (
        category_id INT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        published BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // 5. 创建或更新 orders 表
    await createOrUpdateTable('orders', `
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
    `);
    
    // 6. 创建或更新 region_types 表
    await createOrUpdateTable('region_types', `
      CREATE TABLE IF NOT EXISTS region_types (
        region_id INT,
        type_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (region_id, type_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 7. 创建或更新 online_player_stats 表
    await createOrUpdateTable('online_player_stats', `
      CREATE TABLE IF NOT EXISTS online_player_stats (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        players INT NOT NULL,
        server_version VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        start_time DATETIME NOT NULL,
        vip BOOLEAN DEFAULT FALSE,
        recorded_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        datasource VARCHAR(20) NOT NULL DEFAULT "serenity"
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 8. 创建或更新 loyalty_offers 表
    await createOrUpdateTable('loyalty_offers', `
      CREATE TABLE IF NOT EXISTS loyalty_offers (
        id INT PRIMARY KEY AUTO_INCREMENT,
        offer_id INT NOT NULL,
        corporation_id INT NOT NULL,
        type_id INT NOT NULL,
        quantity INT NOT NULL,
        lp_cost INT NOT NULL,
        isk_cost BIGINT NOT NULL,
        ak_cost INT,
        status VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT "pending",
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_offer (offer_id, corporation_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 9. 创建或更新 loyalty_offer_required_items 表
    await createOrUpdateTable('loyalty_offer_required_items', `
      CREATE TABLE IF NOT EXISTS loyalty_offer_required_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        offer_id INT NOT NULL,
        corporation_id INT NOT NULL,
        type_id INT NOT NULL,
        quantity INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 10. 创建或更新 loyalty_type_lp_isk 表
    await createOrUpdateTable('loyalty_type_lp_isk', `
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
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        datasource VARCHAR(20) NOT NULL DEFAULT "serenity"
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 11. 创建或更新 systems 表
    await System.createTable();
    console.log(`✓ 表 systems 创建或验证成功`);
    
    // 12. 创建或更新 constellations 表
    await Constellation.createTable();
    console.log(`✓ 表 constellations 创建或验证成功`);
    
    // 13. 创建或更新 system_kills 表
    await createOrUpdateTable('system_kills', `
      CREATE TABLE IF NOT EXISTS system_kills (
        id INT AUTO_INCREMENT PRIMARY KEY,
        system_id INT,
        npc_kills INT,
        pod_kills INT,
        ship_kills INT,
        total_kills INT,
        datasource VARCHAR(20) NOT NULL DEFAULT 'infinity',
        timestamp DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 增量式删除system_name字段（如果存在）
    await SystemKill.removeSystemNameField();
    
    // 14. 创建或更新 system_kills_aggregated 聚合表
    await createOrUpdateTable('system_kills_aggregated', `
      CREATE TABLE IF NOT EXISTS system_kills_aggregated (
        id INT AUTO_INCREMENT PRIMARY KEY,
        time_bucket DATETIME NOT NULL,
        system_id INT NOT NULL,
        datasource VARCHAR(20) NOT NULL DEFAULT 'infinity',
        npc_kills_sum INT NOT NULL,
        pod_kills_sum INT NOT NULL,
        ship_kills_sum INT NOT NULL,
        total_kills_sum INT NOT NULL,
        record_count INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_time_bucket (time_bucket),
        INDEX idx_system_datasource (system_id, datasource),
        INDEX idx_datasource_time (datasource, time_bucket)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log(`✓ 表 system_kills_aggregated 创建或验证成功`);
    
    // 15. 创建或更新 stargates 表
    await Stargate.createTable();
    
    // 16. 创建或更新 loyalty_skip_items 表
    await LoyaltySkipItem.createTable();
    console.log(`✓ 表 loyalty_skip_items 创建或验证成功`);
    
    console.log('所有表结构同步完成！');

  } catch (error) {
    console.error('同步表结构时出错:', error);
    // 只有作为独立脚本运行时才退出进程
    if (require.main === module) {
      process.exit(1);
    } else {
      throw error;
    }
  } finally {
    // 只有作为独立脚本运行时才关闭数据库连接
    if (require.main === module) {
      await pool.end();
    }
  }
}

/**
 * 创建或更新表结构
 * @param {string} tableName 表名
 * @param {string} createTableSql 创建表的SQL语句
 */
async function createOrUpdateTable(tableName, createTableSql) {
  try {
    // 首先尝试创建表（如果不存在）
    await pool.execute(createTableSql);
    console.log(`✓ 表 ${tableName} 创建或验证成功`);
    
    // 这里可以添加更精细的列检查和更新逻辑
    // 例如：检查列是否存在，如果不存在则添加
    // 由于MySQL不支持直接修改列类型而不丢失数据，这里仅做基础检查
    
  } catch (error) {
    console.error(`✗ 处理表 ${tableName} 时出错:`, error.message);
    throw error;
  }
}

// 执行同步
if (require.main === module) {
  syncDatabaseStructure();
}

module.exports = { syncDatabaseStructure };
