const pool = require('../config/database');

/**
 * Fix the systems table by removing NOT NULL constraints from columns
 * This is needed because the existing table was created with NOT NULL constraints
 * but we need to allow NULL values when inserting only system IDs initially
 */
async function fixSystemsTable() {
  console.log('开始修复 systems 表结构...');
  
  try {
    // 修改列以允许 NULL 值
    const alterQueries = [
      'ALTER TABLE systems MODIFY COLUMN constellation_id INT NULL',
      'ALTER TABLE systems MODIFY COLUMN name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL',
      'ALTER TABLE systems MODIFY COLUMN position_x DOUBLE NULL',
      'ALTER TABLE systems MODIFY COLUMN position_y DOUBLE NULL',
      'ALTER TABLE systems MODIFY COLUMN position_z DOUBLE NULL',
      'ALTER TABLE systems MODIFY COLUMN security_status DOUBLE NULL'
    ];
    
    for (const query of alterQueries) {
      await pool.execute(query);
      console.log(`✓ 执行SQL: ${query}`);
    }
    
    console.log('systems 表结构修复完成！');
    await pool.end();
  } catch (error) {
    console.error('修复 systems 表结构时出错:', error.message);
    await pool.end();
    process.exit(1);
  }
}

// 执行修复
fixSystemsTable();