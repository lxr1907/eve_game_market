const LoyaltyTypeLpIsk = require('./models/LoyaltyTypeLpIsk');

// 测试修复后的getProfitDataWithTypeNames方法
async function testFixedQuery() {
  try {
    console.log('测试修复后的查询...');
    
    const page = 1;
    const limit = 10;
    const filters = {
      corporationId: 1000180,
      regionId: 10000002,
      datasource: 'serenity'
    };
    
    console.log('测试参数:', { page, limit, filters });
    
    const result = await LoyaltyTypeLpIsk.getProfitDataWithTypeNames(page, limit, filters);
    
    console.log('查询结果:', {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      dataCount: result.data.length
    });
    
    if (result.data.length > 0) {
      console.log('结果示例:', {
        id: result.data[0].id,
        type_id: result.data[0].type_id,
        type_name: result.data[0].type_name,
        corporation_id: result.data[0].corporation_id,
        region_id: result.data[0].region_id,
        profit_per_lp: result.data[0].profit_per_lp,
        total_profit: result.data[0].total_profit,
        max_buy_order_volume_remaining: result.data[0].max_buy_order_volume_remaining,
        max_buy_order_total_profit: result.data[0].max_buy_order_total_profit,
        is_unique: result.data[0].is_unique
      });
    }
    
    console.log('\n测试不同数据源...');
    const result2 = await LoyaltyTypeLpIsk.getProfitDataWithTypeNames(1, 5, {
      datasource: 'infinity'
    });
    
    console.log('infinity数据源结果数量:', result2.data.length);
    
    console.log('\n所有测试完成！');
    
  } catch (error) {
    console.error('测试过程中出错:', error);
    console.error('错误代码:', error.code);
    console.error('错误信息:', error.message);
    console.error('错误堆栈:', error.stack);
  }
}

testFixedQuery();
