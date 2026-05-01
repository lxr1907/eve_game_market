const eveApiService = require('./services/eveApiService');

(async () => {
  console.log('=== 测试 EVE API 获取 Loyalty Store Offers ===\n');

  const corporationIds = [1000180, 1000179, 1000181, 1000182, 1000436, 1000437];
  const datasources = ['serenity', 'infinity', 'tranquility'];

  for (const datasource of datasources) {
    console.log(`\n>>> 测试数据源: ${datasource}`);

    for (const corpId of corporationIds) {
      try {
        const offers = await eveApiService.getLoyaltyStoreOffers(corpId, datasource);
        console.log(`  corporation ${corpId}: ${offers.length} 条 offers`);
        if (offers.length > 0 && offers.length < 5) {
          console.log(`    示例:`, JSON.stringify(offers[0]));
        }
      } catch (error) {
        console.error(`  corporation ${corpId}: 错误 - ${error.message}`);
      }
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log('\n=== 测试完成 ===');
  process.exit(0);
})();
