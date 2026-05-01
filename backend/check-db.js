const pool = require('./config/database');

(async () => {
  console.log('=== 直接查询数据库 ===\n');

  // 检查所有数据
  const [all] = await pool.query('SELECT * FROM loyalty_offers WHERE datasource = ? LIMIT 5', ['infinity']);
  console.log('infinity 查询结果:', all.length);

  const [all2] = await pool.query('SELECT * FROM loyalty_offers WHERE datasource = ? LIMIT 5', ['tranquility']);
  console.log('tranquility 查询结果:', all2.length);

  // 检查数据库中的 datasource 值
  const [datasources] = await pool.query('SELECT DISTINCT datasource FROM loyalty_offers');
  console.log('\n数据库中的 datasource 值:', datasources.map(r => r.datasource));

  // 检查 INSERT 是否成功
  const [counts] = await pool.query('SELECT datasource, COUNT(*) as count FROM loyalty_offers GROUP BY datasource ORDER BY datasource');
  console.log('\n各数据源记录数:');
  for (const row of counts) {
    console.log(`  ${row.datasource}: ${row.count}`);
  }

  await pool.end();
})();
