const pool = require('../config/database');

/**
 * 统一数据库所有表的字符集为 utf8mb4_unicode_ci
 * 在应用启动时调用
 */
async function unifyDatabaseCharset() {
  const connection = await pool.getConnection();
  
  try {
    console.log('[Charset] 开始统一数据库字符集...');
    
    // 获取数据库名称
    const [dbRows] = await connection.execute('SELECT DATABASE() as db_name');
    const dbName = dbRows[0].db_name;
    
    console.log(`[Charset] 当前数据库: ${dbName}`);
    
    // 1. 修改数据库默认字符集
    await connection.execute(
      `ALTER DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log('[Charset] 数据库默认字符集已修改为 utf8mb4_unicode_ci');
    
    // 2. 获取所有表
    const [tables] = await connection.execute(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?`,
      [dbName]
    );
    
    console.log(`[Charset] 找到 ${tables.length} 个表需要处理`);
    
    // 3. 逐个修改表的字符集
    for (const table of tables) {
      const tableName = table.TABLE_NAME;
      try {
        // 修改表默认字符集
        await connection.execute(
          `ALTER TABLE \`${tableName}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
        );
        console.log(`[Charset] 表 ${tableName} 字符集已统一`);
      } catch (err) {
        console.error(`[Charset] 修改表 ${tableName} 失败:`, err.message);
      }
    }
    
    // 4. 获取所有需要修改的字符串列
    const [columns] = await connection.execute(
      `SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE 
       FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = ? 
       AND (DATA_TYPE = 'varchar' OR DATA_TYPE = 'text' OR DATA_TYPE = 'longtext' OR DATA_TYPE = 'mediumtext' OR DATA_TYPE = 'char')
       AND (COLLATION_NAME IS NOT NULL AND COLLATION_NAME != 'utf8mb4_unicode_ci')`,
      [dbName]
    );
    
    console.log(`[Charset] 找到 ${columns.length} 个列需要修改字符集`);
    
    // 5. 逐个修改列的字符集
    for (const col of columns) {
      const { TABLE_NAME, COLUMN_NAME, COLUMN_TYPE } = col;
      try {
        await connection.execute(
          `ALTER TABLE \`${TABLE_NAME}\` MODIFY \`${COLUMN_NAME}\` ${COLUMN_TYPE} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
        );
        console.log(`[Charset] 列 ${TABLE_NAME}.${COLUMN_NAME} 字符集已修改`);
      } catch (err) {
        console.error(`[Charset] 修改列 ${TABLE_NAME}.${COLUMN_NAME} 失败:`, err.message);
      }
    }
    
    console.log('[Charset] 数据库字符集统一完成！');
    
  } catch (error) {
    console.error('[Charset] 统一字符集失败:', error.message);
  } finally {
    connection.release();
  }
}

module.exports = { unifyDatabaseCharset };
