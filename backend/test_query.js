require('dotenv').config({ path: './.env' });
const pool = require('./config/database');

async function test() {
  try {
    const datasource = 'serenity';
    const query = `
        SELECT l.type_id, l.region_id, l.corporation_id, l.total_profit, l.quantity,
               o.volume_remaining as max_buy_order_volume_remaining
        FROM loyalty_type_lp_isk l
        LEFT JOIN (
          SELECT o1.*
          FROM orders o1
          WHERE o1.is_buy_order = 1 AND o1.datasource = ?
          AND o1.order_id = (
            SELECT o2.order_id
            FROM orders o2
            WHERE o2.type_id = o1.type_id AND o2.region_id = o1.region_id
            AND o2.is_buy_order = 1 AND o2.datasource = ?
            ORDER BY o2.price DESC, o2.order_id DESC
            LIMIT 1
          )
        ) o ON l.type_id = o.type_id AND l.region_id = o.region_id
        WHERE l.datasource = ?
        LIMIT 5
      `;
    const [rows] = await pool.execute(query, [datasource, datasource, datasource]);
    console.log(rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
test();