const pool = require('../config/database');

async function addIndexes() {
  try {
    console.log('Adding database indexes...');
    
    // 为loyalty_type_lp_isk表添加索引
    await pool.execute(`
      CREATE INDEX idx_loyalty_type_lp_isk_profit 
      ON loyalty_type_lp_isk (datasource, corporation_id, region_id, profit_per_lp DESC)
    `);
    console.log('✓ Index idx_loyalty_type_lp_isk_profit created successfully');
    
    // 为orders表添加索引
    await pool.execute(`
      CREATE INDEX idx_orders_buy_price 
      ON orders (datasource, is_buy_order, type_id, region_id, price DESC, order_id DESC)
    `);
    console.log('✓ Index idx_orders_buy_price created successfully');
    
    console.log('All indexes created successfully!');
  } catch (error) {
    console.error('Error adding indexes:', error.message);
  } finally {
    process.exit(0);
  }
}

addIndexes();