const pool = require('./config/database');

(async () => {
  // 检查表结构
  console.log('=== loyalty_offers 表结构 ===');
  const [structure] = await pool.query('SHOW CREATE TABLE loyalty_offers');
  console.log(structure[0]['Create Table']);

  // 检查 UNIQUE KEY
  console.log('\n=== 检查唯一约束 ===');
  const [keys] = await pool.query('SHOW INDEX FROM loyalty_offers');
  console.log('Indexes:', keys.map(k => ({ KeyName: k.Key_name, Column: k.Column_name, Non_unique: k.Non_unique })));

  // 测试单独插入
  console.log('\n=== 测试插入 infinity 数据 ===');
  try {
    await pool.execute(`
      INSERT INTO loyalty_offers (offer_id, corporation_id, type_id, quantity, lp_cost, isk_cost, ak_cost, datasource, status)
      VALUES (999999, 1000436, 12345, 1, 100, 1000, 0, 'infinity', 'completed')
    `);
    console.log('插入成功');

    const [test] = await pool.query('SELECT * FROM loyalty_offers WHERE offer_id = 999999');
    console.log('查询结果:', test);
  } catch (err) {
    console.error('插入失败:', err.message);
  }

  // 清理测试数据
  await pool.execute('DELETE FROM loyalty_offers WHERE offer_id = 999999');

  await pool.end();
})();
