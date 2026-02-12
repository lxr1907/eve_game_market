const pool = require('../config/database');

async function fixLoyaltyTypeLpIskTable() {
  try {
    console.log('Fixing loyalty_type_lp_isk table structure...');
    
    // 1. 检查并删除 profit 列（如果存在）
    console.log('Checking if profit column exists...');
    const [profitResult] = await pool.execute("SHOW COLUMNS FROM loyalty_type_lp_isk LIKE 'profit'");
    if (profitResult.length > 0) {
      console.log('Dropping profit column...');
      await pool.execute('ALTER TABLE loyalty_type_lp_isk DROP COLUMN profit');
      console.log('Successfully dropped profit column');
    }
    
    // 2. 检查并删除 profit_rate 列（如果存在）
    console.log('Checking if profit_rate column exists...');
    const [profitRateResult] = await pool.execute("SHOW COLUMNS FROM loyalty_type_lp_isk LIKE 'profit_rate'");
    if (profitRateResult.length > 0) {
      console.log('Dropping profit_rate column...');
      await pool.execute('ALTER TABLE loyalty_type_lp_isk DROP COLUMN profit_rate');
      console.log('Successfully dropped profit_rate column');
    }
    
    // 3. 检查并添加 total_profit 列（如果不存在）
    console.log('Checking if total_profit column exists...');
    const [totalProfitResult] = await pool.execute("SHOW COLUMNS FROM loyalty_type_lp_isk LIKE 'total_profit'");
    if (totalProfitResult.length === 0) {
      console.log('Adding total_profit column...');
      await pool.execute('ALTER TABLE loyalty_type_lp_isk ADD COLUMN total_profit DECIMAL(20,6) NOT NULL AFTER quantity');
      console.log('Successfully added total_profit column');
    }
    
    // 4. 检查并添加 profit_per_lp 列（如果不存在）
    console.log('Checking if profit_per_lp column exists...');
    const [profitPerLpResult] = await pool.execute("SHOW COLUMNS FROM loyalty_type_lp_isk LIKE 'profit_per_lp'");
    if (profitPerLpResult.length === 0) {
      console.log('Adding profit_per_lp column...');
      await pool.execute('ALTER TABLE loyalty_type_lp_isk ADD COLUMN profit_per_lp DECIMAL(20,6) NOT NULL AFTER total_profit');
      console.log('Successfully added profit_per_lp column');
    }
    
    // 5. 检查并添加唯一索引（如果不存在）
    console.log('Checking if unique index exists...');
    const [indexResult] = await pool.execute("SHOW INDEX FROM loyalty_type_lp_isk WHERE Key_name = 'unique_type_corp_region_datasource'");
    if (indexResult.length === 0) {
      console.log('Adding unique index...');
      await pool.execute('ALTER TABLE loyalty_type_lp_isk ADD UNIQUE KEY unique_type_corp_region_datasource (type_id, corporation_id, region_id, datasource)');
      console.log('Successfully added unique index');
    }
    
    console.log('loyalty_type_lp_isk table structure fixed successfully!');
  } catch (error) {
    console.error('Error fixing loyalty_type_lp_isk table structure:', error.message);
  } finally {
    await pool.end();
  }
}

fixLoyaltyTypeLpIskTable();
