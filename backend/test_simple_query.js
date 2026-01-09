const pool = require('./config/database');

// 简化版本的查询测试
async function testSimpleQuery() {
  try {
    const page = 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    const corporationId = 1000180;
    const regionId = 10000002;
    const datasource = 'serenity';
    
    console.log('测试简化查询...');
    
    // 步骤1: 只查询基本字段和简单条件
    const simpleQuery = `
      SELECT l.*, t.name as type_name
      FROM loyalty_type_lp_isk l
      LEFT JOIN types t ON l.type_id = t.id
      WHERE l.datasource = ?
      ${corporationId ? ' AND l.corporation_id = ?' : ''}
      ${regionId ? ' AND l.region_id = ?' : ''}
      ORDER BY l.profit_per_lp DESC
      LIMIT ? OFFSET ?
    `;
    
    const simpleParams = [datasource];
    if (corporationId) simpleParams.push(parseInt(corporationId));
    if (regionId) simpleParams.push(parseInt(regionId));
    simpleParams.push(parseInt(limit));
    simpleParams.push(parseInt(offset));
    
    console.log('简化查询SQL:', simpleQuery);
    console.log('简化查询参数:', simpleParams);
    
    const [simpleResult] = await pool.execute(simpleQuery, simpleParams);
    console.log('简化查询结果数量:', simpleResult.length);
    console.log('简化查询结果示例:', simpleResult[0]);
    
    // 步骤2: 添加第一个JOIN (orders表)
    console.log('\n测试添加第一个JOIN...');
    const queryWithFirstJoin = `
      SELECT l.*, t.name as type_name,
             o.volume_remaining as max_buy_order_volume_remaining
      FROM loyalty_type_lp_isk l
      LEFT JOIN types t ON l.type_id = t.id
      LEFT JOIN orders o ON l.type_id = o.type_id AND l.region_id = o.region_id AND o.is_buy_order = 1 AND o.datasource = ?
      WHERE l.datasource = ?
      ${corporationId ? ' AND l.corporation_id = ?' : ''}
      ${regionId ? ' AND l.region_id = ?' : ''}
      ORDER BY l.profit_per_lp DESC
      LIMIT ? OFFSET ?
    `;
    
    const paramsWithFirstJoin = [datasource, datasource]; // orders.datasource 和 l.datasource
    if (corporationId) paramsWithFirstJoin.push(parseInt(corporationId));
    if (regionId) paramsWithFirstJoin.push(parseInt(regionId));
    paramsWithFirstJoin.push(parseInt(limit));
    paramsWithFirstJoin.push(parseInt(offset));
    
    console.log('添加第一个JOIN后的SQL:', queryWithFirstJoin);
    console.log('参数:', paramsWithFirstJoin);
    
    const [resultWithFirstJoin] = await pool.execute(queryWithFirstJoin, paramsWithFirstJoin);
    console.log('结果数量:', resultWithFirstJoin.length);
    
    // 步骤3: 添加子查询
    console.log('\n测试添加子查询...');
    const queryWithSubquery = `
      SELECT l.*, t.name as type_name,
             o.volume_remaining as max_buy_order_volume_remaining,
             ((l.total_profit / l.quantity) * o.volume_remaining) as max_buy_order_total_profit
      FROM loyalty_type_lp_isk l
      LEFT JOIN types t ON l.type_id = t.id
      LEFT JOIN orders o ON l.type_id = o.type_id AND l.region_id = o.region_id AND o.is_buy_order = 1 AND o.datasource = ?
      LEFT JOIN (
        SELECT type_id, region_id, MAX(price) as max_price
        FROM orders
        WHERE is_buy_order = 1 AND datasource = ?
        GROUP BY type_id, region_id
      ) o_max ON o.type_id = o_max.type_id AND o.region_id = o_max.region_id AND o.price = o_max.max_price
      WHERE l.datasource = ?
      ${corporationId ? ' AND l.corporation_id = ?' : ''}
      ${regionId ? ' AND l.region_id = ?' : ''}
      ORDER BY l.profit_per_lp DESC
      LIMIT ? OFFSET ?
    `;
    
    const paramsWithSubquery = [datasource, datasource, datasource]; // orders.datasource, subquery.datasource, l.datasource
    if (corporationId) paramsWithSubquery.push(parseInt(corporationId));
    if (regionId) paramsWithSubquery.push(parseInt(regionId));
    paramsWithSubquery.push(parseInt(limit));
    paramsWithSubquery.push(parseInt(offset));
    
    console.log('添加子查询后的SQL:', queryWithSubquery);
    console.log('参数:', paramsWithSubquery);
    
    const [resultWithSubquery] = await pool.execute(queryWithSubquery, paramsWithSubquery);
    console.log('结果数量:', resultWithSubquery.length);
    
    // 步骤4: 添加完整的查询（包括NOT EXISTS子查询）
    console.log('\n测试完整查询...');
    const fullQuery = `
      SELECT l.*, t.name as type_name, 
             o.volume_remaining as max_buy_order_volume_remaining,
             ((l.total_profit / l.quantity) * o.volume_remaining) as max_buy_order_total_profit,
             NOT EXISTS(
               SELECT 1 FROM loyalty_offers lo
               WHERE lo.type_id = l.type_id AND lo.corporation_id != l.corporation_id AND lo.datasource = ?
             ) as is_unique
      FROM loyalty_type_lp_isk l
      LEFT JOIN types t ON l.type_id = t.id
      LEFT JOIN orders o ON l.type_id = o.type_id AND l.region_id = o.region_id AND o.is_buy_order = 1 AND o.datasource = ?
      LEFT JOIN (
        SELECT type_id, region_id, MAX(price) as max_price
        FROM orders
        WHERE is_buy_order = 1 AND datasource = ?
        GROUP BY type_id, region_id
      ) o_max ON o.type_id = o_max.type_id AND o.region_id = o_max.region_id AND o.price = o_max.max_price
      WHERE l.datasource = ?
      ${corporationId ? ' AND l.corporation_id = ?' : ''}
      ${regionId ? ' AND l.region_id = ?' : ''}
      ORDER BY l.profit_per_lp DESC
      LIMIT ? OFFSET ?
    `;
    
    const fullParams = [datasource, datasource, datasource, datasource]; // lo.datasource, o.datasource, subquery.datasource, l.datasource
    if (corporationId) fullParams.push(parseInt(corporationId));
    if (regionId) fullParams.push(parseInt(regionId));
    fullParams.push(parseInt(limit));
    fullParams.push(parseInt(offset));
    
    console.log('完整查询SQL:', fullQuery);
    console.log('参数:', fullParams);
    
    const [fullResult] = await pool.execute(fullQuery, fullParams);
    console.log('完整查询结果数量:', fullResult.length);
    console.log('完整查询结果示例:', fullResult[0]);
    
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

testSimpleQuery();
