const pool = require('./config/database');

// 硬编码参数值的测试
async function testHardcodedQuery() {
  try {
    console.log('测试硬编码参数查询...');
    
    // 步骤1: 完全硬编码参数
    const hardcodedQuery = `
      SELECT l.*, t.name as type_name
      FROM loyalty_type_lp_isk l
      LEFT JOIN types t ON l.type_id = t.id
      WHERE l.datasource = 'serenity'
      AND l.corporation_id = 1000180
      AND l.region_id = 10000002
      ORDER BY l.profit_per_lp DESC
      LIMIT 10 OFFSET 0
    `;
    
    console.log('硬编码参数查询SQL:', hardcodedQuery);
    
    const [hardcodedResult] = await pool.execute(hardcodedQuery);
    console.log('硬编码参数查询结果数量:', hardcodedResult.length);
    if (hardcodedResult.length > 0) {
      console.log('硬编码参数查询结果示例:', hardcodedResult[0]);
    }
    
    // 步骤2: 只绑定datasource参数
    console.log('\n测试只绑定datasource参数...');
    const semiHardcodedQuery = `
      SELECT l.*, t.name as type_name
      FROM loyalty_type_lp_isk l
      LEFT JOIN types t ON l.type_id = t.id
      WHERE l.datasource = ?
      AND l.corporation_id = 1000180
      AND l.region_id = 10000002
      ORDER BY l.profit_per_lp DESC
      LIMIT 10 OFFSET 0
    `;
    
    const semiParams = ['serenity'];
    console.log('半硬编码查询SQL:', semiHardcodedQuery);
    console.log('参数:', semiParams);
    
    const [semiResult] = await pool.execute(semiHardcodedQuery, semiParams);
    console.log('半硬编码查询结果数量:', semiResult.length);
    
    // 步骤3: 测试参数类型转换
    console.log('\n测试参数类型转换...');
    const typeTestQuery = `
      SELECT l.*, t.name as type_name
      FROM loyalty_type_lp_isk l
      LEFT JOIN types t ON l.type_id = t.id
      WHERE l.datasource = ?
      AND l.corporation_id = ?
      AND l.region_id = ?
      ORDER BY l.profit_per_lp DESC
      LIMIT ? OFFSET ?
    `;
    
    // 测试不同的参数类型
    const testCases = [
      {
        name: '所有参数为字符串',
        params: ['serenity', '1000180', '10000002', '10', '0']
      },
      {
        name: '数字参数为数字类型',
        params: ['serenity', 1000180, 10000002, 10, 0]
      },
      {
        name: '数字参数为BigInt',
        params: ['serenity', BigInt(1000180), BigInt(10000002), BigInt(10), BigInt(0)]
      }
    ];
    
    for (const testCase of testCases) {
      console.log(`\n测试用例: ${testCase.name}`);
      console.log('参数:', testCase.params);
      try {
        const [result] = await pool.execute(typeTestQuery, testCase.params);
        console.log('结果数量:', result.length);
      } catch (error) {
        console.log('出错:', error.message);
      }
    }
    
    console.log('\n所有测试完成！');
    
  } catch (error) {
    console.error('测试过程中出错:', error);
    console.error('错误代码:', error.code);
    console.error('错误信息:', error.message);
    console.error('错误详细:', error.sqlMessage);
  } finally {
    pool.end();
  }
}

testHardcodedQuery();
