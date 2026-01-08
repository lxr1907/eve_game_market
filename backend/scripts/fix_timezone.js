const pool = require('../config/database');

// 修复数据库中所有时间字段的时区问题
async function fixTimezoneData() {
  console.log('开始修复数据库中的时区问题...');
  
  try {
    // 连接数据库
    const connection = await pool.getConnection();
    
    // 1. 更新 recorded_at 字段（添加8小时）
    console.log('更新 recorded_at 字段...');
    const updateRecordedAtQuery = `
      UPDATE online_player_stats 
      SET recorded_at = DATE_ADD(recorded_at, INTERVAL 8 HOUR)
    `;
    const [recordedAtResult] = await connection.execute(updateRecordedAtQuery);
    console.log(`已更新 ${recordedAtResult.affectedRows} 条记录的 recorded_at 字段`);
    
    // 2. 更新 start_time 字段（添加8小时）
    console.log('更新 start_time 字段...');
    const updateStartTimeQuery = `
      UPDATE online_player_stats 
      SET start_time = DATE_ADD(start_time, INTERVAL 8 HOUR)
    `;
    const [startTimeResult] = await connection.execute(updateStartTimeQuery);
    console.log(`已更新 ${startTimeResult.affectedRows} 条记录的 start_time 字段`);
    
    // 3. 更新 created_at 字段（添加8小时）
    console.log('更新 created_at 字段...');
    const updateCreatedAtQuery = `
      UPDATE online_player_stats 
      SET created_at = DATE_ADD(created_at, INTERVAL 8 HOUR)
    `;
    const [createdAtResult] = await connection.execute(updateCreatedAtQuery);
    console.log(`已更新 ${createdAtResult.affectedRows} 条记录的 created_at 字段`);
    
    // 释放连接
    connection.release();
    
    console.log('时区问题修复完成！');
  } catch (error) {
    console.error('修复时区问题时发生错误:', error);
    process.exit(1);
  }
}

// 验证修复结果
async function verifyFix() {
  console.log('\n验证修复结果...');
  
  try {
    // 查询修复后的最新数据
    const query = `
      SELECT id, recorded_at, start_time, created_at 
      FROM online_player_stats 
      ORDER BY id DESC 
      LIMIT 5
    `;
    const [rows] = await pool.execute(query);
    
    console.log('修复后的最新5条数据：');
    rows.forEach(row => {
      console.log(`ID: ${row.id}`);
      console.log(`  recorded_at: ${row.recorded_at}`);
      console.log(`  start_time: ${row.start_time}`);
      console.log(`  created_at: ${row.created_at}`);
      console.log('------------------------');
    });
  } catch (error) {
    console.error('验证修复结果时发生错误:', error);
  }
}

// 执行修复
if (require.main === module) {
  fixTimezoneData()
    .then(() => verifyFix())
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('执行修复时发生错误:', error);
      process.exit(1);
    });
}

module.exports = { fixTimezoneData, verifyFix };