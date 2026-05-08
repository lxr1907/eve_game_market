const pool = require('./config/database');

(async () => {
  const [rows] = await pool.execute(
    "SELECT type_id, profit_per_lp, total_profit, updated_at FROM lp_blueprint_profits WHERE profit_per_lp < 0"
  );
  console.log('Negative profit blueprints:', JSON.stringify(rows, null, 2));
  
  const [rows2] = await pool.execute(
    "SELECT type_id, name FROM types WHERE name LIKE '%海关办公室%'"
  );
  console.log('海关办公室 types:', JSON.stringify(rows2, null, 2));
  
  process.exit(0);
})();
