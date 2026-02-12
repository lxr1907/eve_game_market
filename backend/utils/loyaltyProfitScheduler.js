const LoyaltyController = require('../controllers/LoyaltyController');

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

/**
 * 启动LP收益计算调度器
 * 每20分钟同步一次每个势力在吉他的收益数据（晨曦服务器）
 */
function startLoyaltyProfitScheduler() {
  console.log('Starting LP profit scheduler...');
  
  // 立即执行一次
  syncAllFactionProfits();
  
  // 每20分钟执行一次
  const interval = 20 * 60 * 1000; // 20分钟
  setInterval(syncAllFactionProfits, interval);
  
  console.log(`LP profit scheduler started. Will sync every ${interval / 1000 / 60} minutes.`);
}

/**
 * 同步所有势力的LP收益数据
 */
async function syncAllFactionProfits() {
  console.log('\n=== Starting LP profit sync for all factions ===');
  
  try {
    for (const corporationId of factionCorporations) {
      console.log(`\nSyncing LP profit for corporation ${corporationId}...`);
      try {
        // 使用晨曦服务器（serenity）
        await LoyaltyController.calculateProfitInternal(corporationId, 'serenity');
        console.log(`✅ LP profit sync completed for corporation ${corporationId}`);
      } catch (error) {
        console.error(`❌ Error syncing LP profit for corporation ${corporationId}:`, error.message);
      }
      
      // 每处理一个势力，暂停2秒，避免API调用过于频繁
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\n=== All factions LP profit sync completed ===');
  } catch (error) {
    console.error('❌ Error in LP profit scheduler:', error.message);
  }
}

module.exports = {
  startLoyaltyProfitScheduler
};
