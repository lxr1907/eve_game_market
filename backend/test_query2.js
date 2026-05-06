require('dotenv').config({ path: './.env' });
const pool = require('./config/database');

async function test() {
  try {
    const datasource = 'serenity';
    const query = `SELECT * FROM orders WHERE type_id = 81050 AND region_id = 10000002 AND is_buy_order = 1 AND datasource = ? LIMIT 5`;
    const [rows] = await pool.execute(query, [datasource]);
    console.log(rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
test();
