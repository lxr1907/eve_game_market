const pool = require('../config/database');

async function addDatasourceColumn() {
  try {
    console.log('Checking if datasource column exists in orders table...');
    
    // 检查datasource列是否存在
    const [result] = await pool.execute("SHOW COLUMNS FROM orders LIKE 'datasource'");
    
    if (result.length === 0) {
      console.log('datasource column does not exist, adding it...');
      // 如果列不存在，添加它
      await pool.execute("ALTER TABLE orders ADD COLUMN datasource VARCHAR(20) NOT NULL DEFAULT 'serenity' AFTER system_id");
      console.log('Successfully added datasource column to orders table');
    } else {
      console.log('datasource column already exists in orders table');
    }
  } catch (error) {
    console.error('Error checking/adding datasource column:', error.message);
  } finally {
    await pool.end();
  }
}

addDatasourceColumn();
