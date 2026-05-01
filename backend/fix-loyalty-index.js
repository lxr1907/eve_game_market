const pool = require('./config/database');

(async () => {
  console.log('=== 修复 loyalty_offers 唯一索引 ===\n');

  try {
    // 1. 先删除旧的唯一索引
    console.log('1. 删除旧索引...');
    await pool.execute('ALTER TABLE loyalty_offers DROP INDEX unique_offer');
    console.log('   旧索引已删除');

    // 2. 添加新的唯一索引（包含 datasource）
    console.log('2. 添加新索引（含 datasource）...');
    await pool.execute('ALTER TABLE loyalty_offers ADD UNIQUE KEY unique_offer (offer_id, corporation_id, datasource)');
    console.log('   新索引已添加');

    // 3. 验证索引
    console.log('\n3. 验证索引...');
    const [keys] = await pool.query('SHOW INDEX FROM loyalty_offers WHERE Key_name = "unique_offer"');
    console.log('   新索引结构:', keys.map(k => ({ Column: k.Column_name, Non_unique: k.Non_unique })));

    // 4. 重新同步数据
    console.log('\n4. 重新同步数据...');
    const eveApiService = require('./services/eveApiService');
    const datasources = ['serenity', 'infinity', 'tranquility'];
    const corporationIds = [1000180, 1000179, 1000181, 1000182, 1000436, 1000437];

    for (const datasource of datasources) {
      console.log(`\n   >>> 同步 ${datasource}...`);
      for (const corporationId of corporationIds) {
        const offers = await eveApiService.getLoyaltyStoreOffers(corporationId, datasource);
        for (const offer of offers) {
          await pool.execute(`
            INSERT INTO loyalty_offers (offer_id, corporation_id, type_id, quantity, lp_cost, isk_cost, ak_cost, datasource, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed')
            ON DUPLICATE KEY UPDATE
              type_id = VALUES(type_id),
              quantity = VALUES(quantity),
              lp_cost = VALUES(lp_cost),
              isk_cost = VALUES(isk_cost),
              ak_cost = VALUES(ak_cost),
              updated_at = CURRENT_TIMESTAMP
          `, [offer.offer_id, corporationId, offer.type_id, offer.quantity, offer.lp_cost, offer.isk_cost, offer.ak_cost || 0, datasource]);
        }
        console.log(`   ${corporationId}: ${offers.length} 条`);
        await new Promise(r => setTimeout(r, 300));
      }
    }

    // 5. 验证最终结果
    console.log('\n5. 验证同步结果...');
    const [counts] = await pool.query('SELECT datasource, COUNT(*) as count FROM loyalty_offers GROUP BY datasource ORDER BY datasource');
    console.log('   各数据源记录数:');
    for (const row of counts) {
      console.log(`     ${row.datasource}: ${row.count} 条`);
    }

    console.log('\n=== 修复完成 ===');
  } catch (error) {
    console.error('修复失败:', error.message);
  } finally {
    await pool.end();
  }
})();
