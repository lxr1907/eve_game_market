const pool = require('./config/database');

(async () => {
  try {
    const [rows] = await pool.query('SELECT COUNT(*) as total FROM loyalty_offers');
    console.log('总记录数:', rows[0].total);

    const [rows2] = await pool.query('SELECT COUNT(*) as count FROM loyalty_offers WHERE ak_cost > 0');
    console.log('ak_cost > 0 的记录数:', rows2[0].count);

    if (rows2[0].count > 0) {
      const [rows3] = await pool.query('SELECT ak_cost FROM loyalty_offers WHERE ak_cost > 0 LIMIT 5');
      console.log('示例数据:', rows3);
    }

  } catch (error) {
    console.error('错误:', error);
  } finally {
    await pool.end();
  }
})();
