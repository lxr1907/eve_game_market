const pool = require('../config/database');

async function fixOrdersTable() {
  try {
    console.log('Fixing orders table structure...');
    
    // 1. 检查并删除 range 列（如果存在）
    console.log('Checking if range column exists...');
    const [rangeResult] = await pool.execute("SHOW COLUMNS FROM orders LIKE 'range'");
    if (rangeResult.length > 0) {
      console.log('Dropping range column...');
      await pool.execute('ALTER TABLE orders DROP COLUMN `range`');
      console.log('Successfully dropped range column');
    }
    
    // 2. 检查并添加 order_range 列（如果不存在）
    console.log('Checking if order_range column exists...');
    const [orderRangeResult] = await pool.execute("SHOW COLUMNS FROM orders LIKE 'order_range'");
    if (orderRangeResult.length === 0) {
      console.log('Adding order_range column...');
      await pool.execute('ALTER TABLE orders ADD COLUMN order_range VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci AFTER minimum_volume');
      console.log('Successfully added order_range column');
    }
    
    // 3. 检查并添加 location_id 列（如果不存在）
    console.log('Checking if location_id column exists...');
    const [locationIdResult] = await pool.execute("SHOW COLUMNS FROM orders LIKE 'location_id'");
    if (locationIdResult.length === 0) {
      console.log('Adding location_id column...');
      await pool.execute('ALTER TABLE orders ADD COLUMN location_id BIGINT AFTER order_range');
      console.log('Successfully added location_id column');
    }
    
    // 4. 检查并添加 is_active 列（如果不存在）
    console.log('Checking if is_active column exists...');
    const [isActiveResult] = await pool.execute("SHOW COLUMNS FROM orders LIKE 'is_active'");
    if (isActiveResult.length === 0) {
      console.log('Adding is_active column...');
      await pool.execute('ALTER TABLE orders ADD COLUMN is_active BOOLEAN AFTER duration');
      console.log('Successfully added is_active column');
    }
    
    // 5. 检查并删除不需要的列（issued, station_id, system_id）
    const columnsToDrop = ['issued', 'station_id', 'system_id'];
    for (const column of columnsToDrop) {
      console.log(`Checking if ${column} column exists...`);
      const [columnResult] = await pool.execute(`SHOW COLUMNS FROM orders LIKE '${column}'`);
      if (columnResult.length > 0) {
        console.log(`Dropping ${column} column...`);
        await pool.execute(`ALTER TABLE orders DROP COLUMN ${column}`);
        console.log(`Successfully dropped ${column} column`);
      }
    }
    
    console.log('Orders table structure fixed successfully!');
  } catch (error) {
    console.error('Error fixing orders table structure:', error.message);
  } finally {
    await pool.end();
  }
}

fixOrdersTable();
