const pool = require('../config/database');

// 修复特定系统的星门数据
const fixSystemStargates = async (systemId) => {
  try {
    console.log(`Fixing stargates data for system ID: ${systemId}`);
    
    // 1. 查询当前数据
    const [currentData] = await pool.execute('SELECT system_id, stargates FROM systems WHERE system_id = ?', [systemId]);
    
    if (currentData.length === 0) {
      console.log(`System ${systemId} not found`);
      return;
    }
    
    const system = currentData[0];
    console.log(`Current stargates value:`, system.stargates);
    console.log(`Current stargates type:`, typeof system.stargates);
    
    // 2. 修复数据，将错误的字符串"null"或空数组设置为null
    let newStargates = system.stargates;
    
    if (system.stargates === 'null' || system.stargates === '[]') {
      newStargates = null;
    }
    
    if (newStargates !== system.stargates) {
      // 3. 更新数据库
      await pool.execute('UPDATE systems SET stargates = ? WHERE system_id = ?', [newStargates, systemId]);
      console.log(`Fixed stargates data for system ${systemId}:`, newStargates);
    } else {
      console.log(`System ${systemId} already has correct stargates data`);
    }
    
    // 4. 验证修复结果
    const [fixedData] = await pool.execute('SELECT system_id, stargates FROM systems WHERE system_id = ?', [systemId]);
    if (fixedData.length > 0) {
      console.log(`Verified fixed stargates data:`, fixedData[0].stargates);
      console.log(`Verified fixed stargates type:`, typeof fixedData[0].stargates);
    }
    
  } catch (error) {
    console.error(`Error fixing stargates data for system ${systemId}:`, error.message);
    console.error(error.stack);
  }
};

// 修复所有可能有问题的数据
const fixAllStargatesData = async () => {
  try {
    console.log('Fixing all potential stargates data issues...');
    
    // 查询所有有问题的记录
    const [problematicSystems] = await pool.execute(
      "SELECT system_id, stargates FROM systems WHERE stargates = 'null' OR stargates = '[]'"
    );
    
    console.log(`Found ${problematicSystems.length} systems with potential stargates data issues`);
    
    // 修复每个系统
    for (const system of problematicSystems) {
      await fixSystemStargates(system.system_id);
      // 添加小延迟，避免操作过于频繁
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('All stargates data fixes completed');
  } catch (error) {
    console.error('Error in fixAllStargatesData:', error.message);
    console.error(error.stack);
  }
};

// 如果直接运行这个文件，执行修复
if (require.main === module) {
  // 首先修复系统30000229
  fixSystemStargates(30000229).then(() => {
    // 然后修复所有其他可能有问题的数据
    return fixAllStargatesData();
  }).then(() => {
    console.log('\nAll fixes completed successfully');
    process.exit(0);
  }).catch((error) => {
    console.error('Fixes failed:', error);
    process.exit(1);
  });
}

module.exports = { fixSystemStargates, fixAllStargatesData };
