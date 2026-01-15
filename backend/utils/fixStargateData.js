const pool = require('../config/database');
const System = require('../models/System');
const eveApiService = require('../services/eveApiService');

/**
 * 修复星门数据脚本
 * 用于修复数据库中系统星门信息与API不一致的问题
 */

// 修复单个系统的星门数据
const fixSingleSystem = async (systemId) => {
  try {
    console.log(`Fixing system ${systemId}...`);
    
    // 获取系统详情
    const systemDetails = await eveApiService.getSystemDetails(systemId);
    
    if (systemDetails !== null) {
      // 确保当API不返回stargates字段时，将其设置为null
      const stargatesValue = systemDetails.stargates === undefined ? null : systemDetails.stargates;
      
      // 更新系统信息到数据库
      await System.insertOrUpdate({
        system_id: systemDetails.system_id,
        constellation_id: systemDetails.constellation_id,
        name: systemDetails.name || '',
        position: systemDetails.position,
        security_status: systemDetails.security_status,
        stargates: stargatesValue
      });
      
      console.log(`✅ System ${systemId} (${systemDetails.name}) updated with correct stargates data:`, stargatesValue);
      return true;
    } else {
      console.log(`❌ No details returned for system ${systemId}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error fixing system ${systemId}:`, error.message);
    return false;
  }
};

// 修复特定的系统列表
const fixSpecificSystems = async (systemIds) => {
  console.log(`Fixing ${systemIds.length} specific systems...`);
  
  let fixedCount = 0;
  
  for (const systemId of systemIds) {
    const success = await fixSingleSystem(systemId);
    if (success) fixedCount++;
    
    // 每处理一个系统后等待1秒，确保API请求不超过限制
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\nFix completed: ${fixedCount}/${systemIds.length} systems fixed successfully.`);
};

// 修复所有可能有问题的系统（包含stargates的系统）
const fixAllSystemsWithStargates = async () => {
  try {
    console.log('Fixing all systems that might have incorrect stargate data...');
    
    // 查询所有包含stargates字段的系统
    const sql = `SELECT system_id FROM systems WHERE stargates IS NOT NULL`;
    const [systems] = await pool.execute(sql);
    
    console.log(`Found ${systems.length} systems with stargates data.`);
    
    let fixedCount = 0;
    
    for (const system of systems) {
      const success = await fixSingleSystem(system.system_id);
      if (success) fixedCount++;
      
      // 每处理一个系统后等待1秒，确保API请求不超过限制
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`\nFix completed: ${fixedCount}/${systems.length} systems fixed successfully.`);
  } catch (error) {
    console.error('Error fixing all systems:', error.message);
  }
};

// 主函数
const main = async () => {
  try {
    console.log('Starting stargate data fix script...');
    
    // 1. 修复特定系统
    const specificSystems = [30000229, 30000218, 30000217];
    await fixSpecificSystems(specificSystems);
    
    // 2. 询问是否修复所有系统
    console.log('\nWould you like to fix all systems with stargates data? (This will take a long time)');
    console.log('To fix all systems, run: node backend/utils/fixStargateData.js --all');
    
  } catch (error) {
    console.error('Error in main script:', error.message);
    console.error('Error stack:', error.stack);
  }
};

// 运行脚本
if (require.main === module) {
  // 检查命令行参数
  const args = process.argv.slice(2);
  
  if (args.includes('--all')) {
    // 修复所有系统
    fixAllSystemsWithStargates();
  } else {
    // 默认修复特定系统
    main();
  }
}

module.exports = { fixSingleSystem, fixSpecificSystems, fixAllSystemsWithStargates };
