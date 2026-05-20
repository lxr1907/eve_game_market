const LoyaltyController = require('../controllers/LoyaltyController');
const LoyaltyMultiItemProfit = require('../models/LoyaltyMultiItemProfit');

// 势力公司ID列表
const factionCorporations = [
  // 加达里
  1000180, // 加达里-合众国护卫军
  // 艾玛
  1000179, // 艾玛-帝国科洛斯第二十四军团
  // 盖伦特
  1000181, // 盖伦特-联邦防务联合会
  // 米玛塔尔
  1000182, // 米玛塔尔-部族解放力量
  // 海盗势力
  1000436, // 天使-摩拉辛狂热者
  1000437, // 古斯塔斯-古力突击队
];

// 每次更新最老的记录数
const BATCH_SIZE = 5;

/**
 * 启动多物品LP兑换收益调度器
 * 每1分钟增量更新一次，每次只更新每个势力最老的5条记录
 */
function startLoyaltyMultiItemProfitScheduler() {
  console.log('Starting LP multi-item profit scheduler...');

  // 立即执行一次
  syncAllFactionMultiItemProfits();

  // 每10分钟执行一次
  const interval = 10 * 60 * 1000; // 10分钟
  setInterval(syncAllFactionMultiItemProfits, interval);

  console.log(`LP multi-item profit scheduler started. Will sync every ${interval / 1000 / 60} minutes, updating ${BATCH_SIZE} oldest records per faction.`);
}

/**
 * 同步所有势力的多物品LP兑换收益数据
 * 每次只更新每个势力最老的5条记录
 */
async function syncAllFactionMultiItemProfits() {
  console.log('\n=== Starting LP multi-item profit sync (incremental) for all factions ===');

  const datasources = ['serenity', 'infinity', 'tranquility'];

  try {
    for (const datasource of datasources) {
      console.log(`\n>>> Processing datasource: ${datasource} >>>`);

      for (const corporationId of factionCorporations) {
        console.log(`\nSyncing LP multi-item profit for corporation ${corporationId} (${datasource})...`);
        try {
          // 检查该势力+数据源是否有已存在的记录
          const existingCount = await LoyaltyMultiItemProfit.count(datasource, corporationId);

          if (existingCount === 0) {
            // 初次运行：全量计算
            console.log(`[${datasource}] No existing records for corporation ${corporationId}, running full calculation...`);
            await LoyaltyController.calculateMultiItemProfitInternal(
              corporationId,
              datasource
              // incremental=false, limit=0 → 全量模式
            );
            console.log(`✅ LP multi-item profit full sync completed for corporation ${corporationId} (${datasource})`);
          } else {
            // 已有记录：增量更新，每次只更新最老的5条
            console.log(`[${datasource}] Corporation ${corporationId} has ${existingCount} existing records, updating oldest ${BATCH_SIZE}...`);
            await LoyaltyController.calculateMultiItemProfitInternal(
              corporationId,
              datasource,
              BATCH_SIZE,
              true // incremental mode
            );
            console.log(`✅ LP multi-item profit incremental sync completed for corporation ${corporationId} (${datasource})`);
          }
        } catch (error) {
          console.error(`❌ Error syncing LP multi-item profit for corporation ${corporationId} (${datasource}):`, error.message);
        }

        // 每处理一个势力，暂停2秒，避免API调用过于频繁
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      console.log(`\n>>> Completed datasource: ${datasource} <<<`);
    }

    console.log('\n=== All factions LP multi-item profit sync completed ===');
  } catch (error) {
    console.error('❌ Error in LP multi-item profit scheduler:', error.message);
  }
}

module.exports = {
  startLoyaltyMultiItemProfitScheduler
};
