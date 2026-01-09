const pool = require('./config/database');

async function testCountQuery() {
  try {
    console.log('Testing count query...');
    
    // 测试参数
    const corporationId = 1000180;
    const regionId = 10000002;
    const datasource = 'serenity';
    
    console.log('Parameters:', { corporationId, regionId, datasource });
    
    // 1. 测试总数查询 - 原始方式
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
    console.log('Count result:', countResult[0].total);
    
    // 2. 测试总数查询 - 直接SQL值
    const directQuery = `
      SELECT COUNT(*) as total
      FROM loyalty_type_lp_isk l
      WHERE l.datasource = '${datasource}'
      ${corporationId ? ` AND l.corporation_id = ${parseInt(corporationId)}` : ''}
      ${regionId ? ` AND l.region_id = ${parseInt(regionId)}` : ''}
    `;
    
    console.log('Direct query:', directQuery);
    
    const [directResult] = await pool.execute(directQuery);
    console.log('Direct result:', directResult[0].total);
    
    // 3. 测试原始数据查询
    const rawQuery = `
      SELECT * FROM loyalty_type_lp_isk 
      WHERE datasource = ? 
      AND corporation_id = ?
      AND region_id = ?
      LIMIT 3
    `;
    
    const rawParams = [datasource, corporationId, regionId];
    
    const [rawResult] = await pool.execute(rawQuery, rawParams);
    console.log('Raw data (first 3):', rawResult);
    
  } catch (error) {
    console.error('Error in test:', error);
  } finally {
    // 关闭数据库连接
    pool.end();
  }
}

testCountQuery();
