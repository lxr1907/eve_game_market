const pool = require('./config/database');

async function testProfitDataQuery() {
  try {
    console.log('Testing profit data query...');
    
    // 测试参数
    const page = 1;
    const limit = 10;
    const corporationId = 1000180;
    const regionId = 10000002;
    const datasource = 'serenity';
    const offset = (page - 1) * limit;
    
    console.log('Parameters:', { page, limit, corporationId, regionId, datasource });
    
    // 1. 测试总数查询
    const countQuery = `
      SELECT COUNT(*) as total
      FROM loyalty_type_lp_isk l
      WHERE l.datasource = ?
      ${corporationId ? ' AND l.corporation_id = ?' : ''}
      ${regionId ? ' AND l.region_id = ?' : ''}
    `;
    
    const countParams = [datasource];
    if (corporationId) countParams.push(parseInt(corporationId));
    if (regionId) countParams.push(parseInt(regionId));
    
    console.log('Count query:', countQuery);
    console.log('Count params:', countParams);
    
    const [countResult] = await pool.execute(countQuery, countParams);
    console.log('Total count:', countResult[0].total);
    
    // 2. 测试原始数据查询（不包含join）
    const rawQuery = `
      SELECT * FROM loyalty_type_lp_isk 
      WHERE datasource = ? 
      ${corporationId ? ' AND corporation_id = ?' : ''}
      ${regionId ? ' AND region_id = ?' : ''}
      LIMIT 5
    `;
    
    const rawParams = [datasource];
    if (corporationId) rawParams.push(parseInt(corporationId));
    if (regionId) rawParams.push(parseInt(regionId));
    
    const [rawResult] = await pool.execute(rawQuery, rawParams);
    console.log('Raw data (first 5):', rawResult);
    
    // 3. 测试orders表是否有对应数据
    const orderQuery = `
      SELECT COUNT(*) as order_count 
      FROM orders 
      WHERE datasource = ? AND is_buy_order = 1
    `;
    
    const [orderResult] = await pool.execute(orderQuery, [datasource]);
    console.log('Orders count:', orderResult[0].order_count);
    
    // 4. 测试完整的利润数据查询
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
      LEFT JOIN (
        SELECT type_id, region_id, price, volume_remaining
        FROM orders o1
        WHERE o1.is_buy_order = 1 AND o1.datasource = ? AND 
              (o1.type_id, o1.region_id, o1.price) IN (
                SELECT type_id, region_id, MAX(price) as max_price
                FROM orders
                WHERE is_buy_order = 1 AND datasource = ?
                GROUP BY type_id, region_id
              )
      ) o ON l.type_id = o.type_id AND l.region_id = o.region_id
      WHERE l.datasource = ?
      ${corporationId ? ' AND l.corporation_id = ?' : ''}
      ${regionId ? ' AND l.region_id = ?' : ''}
      ORDER BY l.profit_per_lp DESC
      LIMIT ? OFFSET ?
    `;
    
    const fullParams = [
      datasource, // lo.datasource = ?
      datasource, // o1.datasource = ?
      datasource, // orders.datasource = ?
      datasource, // l.datasource = ?
      ...(corporationId ? [parseInt(corporationId)] : []), // l.corporation_id = ?
      ...(regionId ? [parseInt(regionId)] : []), // l.region_id = ?
      parseInt(limit), // LIMIT ?
      parseInt(offset) // OFFSET ?
    ];
    
    console.log('Full query:', fullQuery);
    console.log('Full params:', fullParams);
    
    const [fullResult] = await pool.execute(fullQuery, fullParams);
    console.log('Full query result (count):', fullResult.length);
    console.log('Full query result (first 2):', fullResult.slice(0, 2));
    
  } catch (error) {
    console.error('Error in test:', error);
  } finally {
    // 关闭数据库连接
    pool.end();
  }
}

testProfitDataQuery();
