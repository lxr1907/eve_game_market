const axios = require('axios');

const SYNC_INTERVAL = 3 * 60 * 1000; // 3分钟
const BATCH_SIZE = 5;

let schedulerTimer = null;

function startKbSyncScheduler() {
  console.log('Starting KB sync scheduler...');
  runKbSync();
  schedulerTimer = setInterval(runKbSync, SYNC_INTERVAL);
  console.log(`KB sync scheduler started. Will sync ${BATCH_SIZE} characters every ${SYNC_INTERVAL / 1000 / 60} minutes.`);
}

async function runKbSync() {
  try {
    const pool = require('../config/database');
    
    // 获取5条更新时间最老的记录
    const [records] = await pool.query(
      `SELECT * FROM eve_sso_codes
       WHERE character_id IS NOT NULL
       ORDER BY updated_at ASC
       LIMIT ?`,
      [Number(BATCH_SIZE)]
    );

    if (records.length === 0) {
      console.log('[KbSync] No characters to sync');
      return;
    }

    console.log(`[KbSync] Syncing ${records.length} characters...`);

    for (const record of records) {
      try {
        // 先更新更新时间
        await pool.execute(
          'UPDATE eve_sso_codes SET updated_at = CURRENT_TIMESTAMP WHERE character_id = ? AND datasource = ?',
          [record.character_id, record.datasource]
        );

        // 调用内部API同步KB
        const baseUrl = `http://localhost:${process.env.PORT || 3000}`;
        const response = await axios.post(
          `${baseUrl}/api/kb/sync/${record.character_id}`,
          null,
          { params: { datasource: record.datasource }, timeout: 60000 }
        );

        console.log(`[KbSync] Character ${record.character_name || record.character_id} (${record.datasource}): ${response.data?.message || 'synced'}`);
      } catch (error) {
        console.error(`[KbSync] Error syncing character ${record.character_id}: ${error.message}`);
      }

      // 每个角色间隔2秒避免API限流
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`[KbSync] Batch sync completed`);
  } catch (error) {
    console.error(`[KbSync] Error in sync batch: ${error.message}`);
  }
}

module.exports = { startKbSyncScheduler };
