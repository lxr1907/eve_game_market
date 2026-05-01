const pool = require('./config/database');
const eveApiService = require('./services/eveApiService');

(async () => {
  console.log('=== 手动同步所有数据源的 Loyalty Offers ===\n');

  const datasources = ['serenity', 'infinity', 'tranquility'];
  const corporationIds = [1000180, 1000179, 1000181, 1000182, 1000436, 1000437];

  for (const datasource of datasources) {
    console.log(`\n>>> 开始同步数据源: ${datasource}`);

    let totalOffers = 0;
    let insertedCount = 0;
    let errorCount = 0;

    for (const corporationId of corporationIds) {
      console.log(`[${datasource}] Syncing corporation ${corporationId}...`);

      try {
        const offers = await eveApiService.getLoyaltyStoreOffers(corporationId, datasource);
        console.log(`  API 返回 ${offers.length} 条 offers`);
        totalOffers += offers.length;

        for (const offer of offers) {
          try {
            const offerData = {
              offer_id: offer.offer_id,
              corporation_id: corporationId,
              type_id: offer.type_id,
              quantity: offer.quantity,
              lp_cost: offer.lp_cost,
              isk_cost: offer.isk_cost,
              ak_cost: offer.ak_cost || 0
            };

            // 直接使用 pool 执行 INSERT
            const query = `
              INSERT INTO loyalty_offers (offer_id, corporation_id, type_id, quantity, lp_cost, isk_cost, ak_cost, datasource, status)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed')
              ON DUPLICATE KEY UPDATE
                type_id = VALUES(type_id),
                quantity = VALUES(quantity),
                lp_cost = VALUES(lp_cost),
                isk_cost = VALUES(isk_cost),
                ak_cost = VALUES(ak_cost),
                updated_at = CURRENT_TIMESTAMP
            `;
            await pool.execute(query, [
              offerData.offer_id,
              offerData.corporation_id,
              offerData.type_id,
              offerData.quantity,
              offerData.lp_cost,
              offerData.isk_cost,
              offerData.ak_cost,
              datasource
            ]);
            insertedCount++;
          } catch (dbError) {
            errorCount++;
            if (errorCount <= 3) {
              console.error(`  插入错误: ${dbError.message}`);
            }
          }
        }

        console.log(`  成功插入/更新 ${offers.length} 条`);
      } catch (error) {
        console.error(`  API 调用错误: ${error.message}`);
      }

      await new Promise(r => setTimeout(r, 500));
    }

    console.log(`[${datasource}] 完成: 总计 ${totalOffers} 条 API 数据, ${insertedCount} 条已处理, ${errorCount} 条错误`);
  }

  // 验证结果
  console.log('\n=== 验证同步结果 ===');
  const [counts] = await pool.query(`
    SELECT datasource, COUNT(*) as count FROM loyalty_offers GROUP BY datasource
  `);
  for (const row of counts) {
    console.log(`  ${row.datasource}: ${row.count} 条`);
  }

  await pool.end();
  console.log('\n同步完成!');
  process.exit(0);
})();
