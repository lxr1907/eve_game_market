const pool = require('../config/database');

async function fixOrderColumns() {
  const alterQueries = [
    'ALTER TABLE orders MODIFY COLUMN volume_remaining BIGINT',
    'ALTER TABLE orders MODIFY COLUMN volume_total BIGINT',
    'ALTER TABLE orders MODIFY COLUMN minimum_volume BIGINT'
  ];

  for (const query of alterQueries) {
    try {
      await pool.execute(query);
      const columnName = query.match(/COLUMN (\w+)/)[1];
      console.log(`✓ Column ${columnName} changed to BIGINT successfully`);
    } catch (error) {
      if (error.errno === 1054) {
        console.log(`- Column not found, skipping: ${error.message}`);
      } else {
        console.error(`Error: ${error.message}`);
      }
    }
  }

  console.log('\nDone!');
  process.exit(0);
}

fixOrderColumns();