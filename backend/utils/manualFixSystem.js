const pool = require('../config/database');

// 手动修复特定系统的星门数据
const manualFixSystem = async (systemId) => {
  try {
    console.log(`Manually fixing system ${systemId}...`);
    
    // 1. 查询当前数据
    const [currentData] = await pool.execute('SELECT system_id, stargates FROM systems WHERE system_id = ?', [systemId]);
    
    if (currentData.length === 0) {
      console.log(`System ${systemId} not found`);
      return;
    }
    
    const system = currentData[0];
    console.log(`Current stargates value:`, system.stargates);
    
    // 2. 手动将stargates字段设置为null
    await pool.execute('UPDATE systems SET stargates = NULL WHERE system_id = ?', [systemId]);
    console.log(`Manually set stargates to NULL for system ${systemId}`);
    
    // 3. 验证修复结果
    const [fixedData] = await pool.execute('SELECT system_id, stargates FROM systems WHERE system_id = ?', [systemId]);
    if (fixedData.length > 0) {
      console.log(`Verified stargates data:`, fixedData[0].stargates);
      console.log(`Verified stargates type:`, typeof fixedData[0].stargates);
    }
    
  } catch (error) {
    console.error(`Error manually fixing system ${systemId}:`, error.message);
    console.error(error.stack);
  }
};

// 如果直接运行这个文件，执行修复
if (require.main === module) {
  // 修复系统30000229
  manualFixSystem(30000229).then(() => {
    console.log('\nManual fix completed successfully');
    process.exit(0);
  }).catch((error) => {
    console.error('Manual fix failed:', error);
    process.exit(1);
  });
}

module.exports = { manualFixSystem };
