/**
 * 启动时表完整性检查
 * 自动修复各 LP 表的 UNIQUE KEY 缺失问题，确保不同环境表结构一致
 */
const LoyaltyTypeLpIsk = require('../models/LoyaltyTypeLpIsk');
const LoyaltyMultiItemProfit = require('../models/LoyaltyMultiItemProfit');

async function ensureTableIntegrity() {
  console.log('[Startup] Checking table integrity...');

  try {
    await LoyaltyTypeLpIsk.ensureTableIntegrity();
    await LoyaltyMultiItemProfit.ensureTableIntegrity();
    console.log('[Startup] Table integrity check completed');
  } catch (error) {
    console.error('[Startup] Table integrity check failed:', error.message);
    // 不中断启动，让服务继续运行
  }
}

module.exports = { ensureTableIntegrity };
