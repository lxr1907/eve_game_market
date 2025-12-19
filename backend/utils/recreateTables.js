const Region = require('../models/Region');
const Type = require('../models/Type');
const Order = require('../models/Order');
const RegionType = require('../models/RegionType');
const LoyaltyOffer = require('../models/LoyaltyOffer');
const LoyaltyTypeLpIsk = require('../models/LoyaltyTypeLpIsk');

async function recreateAllTables() {
  try {
    console.log('开始重新创建所有表...');
    
    // 按照依赖顺序删除并重新创建表
    console.log('1. 删除并重新创建Region表');
    await Region.dropTable();
    await Region.createTable();
    
    console.log('2. 删除并重新创建Type表');
    await Type.dropTable();
    await Type.createTable();
    
    console.log('3. 删除并重新创建Order表');
    await Order.dropTable();
    await Order.createTable();
    
    console.log('4. 删除并重新创建RegionType表');
    await RegionType.dropTable();
    await RegionType.createTable();
    
    console.log('5. 删除并重新创建LoyaltyOffer表');
    await LoyaltyOffer.dropTable();
    await LoyaltyOffer.createTable();
    
    console.log('6. 删除并重新创建LoyaltyTypeLpIsk表');
    await LoyaltyTypeLpIsk.dropTable();
    await LoyaltyTypeLpIsk.createTable();
    
    console.log('所有表已成功删除并重新创建，字符集已更新为utf8mb4');
    console.log('请重新启动后端服务以应用更改');
  } catch (error) {
    console.error('重新创建表时出错:', error);
    process.exit(1);
  }
}

recreateAllTables();
