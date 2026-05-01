const pool = require('./config/database');

(async () => {
  try {
    console.log('=== LP 收益计算数据诊断报告 ===\n');

    // 1. 检查各数据源的 loyalty_offers 数量
    console.log('【1. loyalty_offers 表数据统计】');
    const [offerCounts] = await pool.query(`
      SELECT datasource, COUNT(*) as count,
             COUNT(DISTINCT corporation_id) as corp_count
      FROM loyalty_offers
      GROUP BY datasource
    `);
    for (const row of offerCounts) {
      console.log(`  ${row.datasource}: ${row.count} 条记录, ${row.corp_count} 个公司`);
    }

    // 2. 检查各数据源的 corporation_id 分布
    console.log('\n【2. loyalty_offers 公司分布】');
    const [corpByDs] = await pool.query(`
      SELECT datasource, corporation_id, COUNT(*) as count
      FROM loyalty_offers
      GROUP BY datasource, corporation_id
      ORDER BY datasource, corporation_id
    `);
    for (const row of corpByDs) {
      console.log(`  ${row.datasource}: corporation_id=${row.corporation_id}, ${row.count} 条`);
    }

    // 3. 检查 orders 表中各数据源的数据量
    console.log('\n【3. orders 表数据统计】');
    const [orderCounts] = await pool.query(`
      SELECT datasource, COUNT(*) as count,
             COUNT(DISTINCT region_id) as region_count,
             COUNT(DISTINCT type_id) as type_count
      FROM orders
      GROUP BY datasource
    `);
    for (const row of orderCounts) {
      console.log(`  ${row.datasource}: ${row.count} 条订单, ${row.region_count} 个区域, ${row.type_count} 个物品类型`);
    }

    // 4. 检查 LP 收益计算需要的特定区域数据
    console.log('\n【4. LP 收益计算特定区域订单统计】');
    const lpRegions = {
      serenity: 10000060,
      infinity: 10000016,
      tranquility: 10000060
    };
    for (const [ds, regionId] of Object.entries(lpRegions)) {
      const [rows] = await pool.query(`
        SELECT COUNT(*) as count
        FROM orders
        WHERE datasource = ? AND region_id = ? AND is_buy_order = 0
      `, [ds, regionId]);
      console.log(`  ${ds} 区域 ${regionId} (吉他/索八色基) 卖单: ${rows[0].count} 条`);

      // 检查是否有买单
      const [buyRows] = await pool.query(`
        SELECT COUNT(*) as count
        FROM orders
        WHERE datasource = ? AND region_id = ? AND is_buy_order = 1
      `, [ds, regionId]);
      console.log(`  ${ds} 区域 ${regionId} 买单: ${buyRows[0].count} 条`);
    }

    // 5. 检查 loyalty_type_lp_isk 表（LP 收益计算结果）
    console.log('\n【5. loyalty_type_lp_isk 表（LP收益计算结果）统计】');
    const [lpIskCounts] = await pool.query(`
      SELECT datasource, COUNT(*) as count,
             COUNT(CASE WHEN profit_per_lp > 0 THEN 1 END) as positive_count,
             MIN(updated_at) as oldest_update,
             MAX(updated_at) as latest_update
      FROM loyalty_type_lp_isk
      GROUP BY datasource
    `);
    for (const row of lpIskCounts) {
      console.log(`  ${row.datasource}: ${row.count} 条记录, ${row.positive_count} 条正收益`);
      console.log(`    更新范围: ${row.oldest_update} ~ ${row.latest_update}`);
    }

    // 6. 对比 loyalty_offers 和 orders 的 type_id 匹配情况
    console.log('\n【6. loyalty_offers 与 orders 的 type_id 匹配情况】');
    for (const ds of ['serenity', 'infinity', 'tranquility']) {
      // 获取该数据源 loyalty_offers 中的 type_id
      const [offerTypes] = await pool.query(`
        SELECT DISTINCT type_id FROM loyalty_offers WHERE datasource = ?
      `, [ds]);

      if (offerTypes.length === 0) {
        console.log(`  ${ds}: loyalty_offers 无数据`);
        continue;
      }

      const offerTypeIds = offerTypes.map(r => r.type_id);
      const [matchingOrders] = await pool.query(`
        SELECT COUNT(DISTINCT type_id) as count
        FROM orders
        WHERE datasource = ? AND type_id IN (?) AND region_id = ?
      `, [ds, offerTypeIds, lpRegions[ds]]);

      console.log(`  ${ds}: ${offerTypes.length} 种物品在 loyalty_offers, ${matchingOrders[0].count} 种在 orders 中有数据`);
    }

    // 7. 检查曙光和欧服的 corporation 列表（EVE 标准）
    console.log('\n【7. 曙光和欧服的 faction corporations ID】');
    console.log('  曙光 (infinity) 应该使用的公司: 1000436 (古斯塔斯), 1000437 (摩拉辛)');
    console.log('  欧服 (tranquility) 应该使用的公司: 1000436 (古斯塔斯), 1000437 (摩拉辛)');

    console.log('\n=== 诊断完成 ===');
    console.log('\n【结论】');
    if (offerCounts.length < 3 || offerCounts.find(r => r.datasource === 'infinity')?.count === 0) {
      console.log('  ❌ 问题: loyalty_offers 表缺少曙光和欧服数据！');
      console.log('  解决: 需要调用 POST /api/loyalty/offers/sync-all 同步所有数据源');
    }
    if (orderCounts.find(r => r.datasource === 'tranquility')?.count < 100) {
      console.log('  ❌ 问题: 欧服 orders 数据太少（仅 388 条），可能未同步完整');
    }
  } catch (error) {
    console.error('诊断过程出错:', error);
  } finally {
    await pool.end();
  }
})();
