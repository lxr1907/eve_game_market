const System = require('../models/System');
const eveApiService = require('../services/eveApiService');

// 同步系统详情的函数
const syncSystemDetails = async () => {
  try {
    // 查询没有name或stargates的系统记录，限制5条
    const systemsToSync = await System.findSystemsMissingDetails(5);
    
    if (systemsToSync.length === 0) {
      // console.log('No systems need details synchronization at the moment.');
      return;
    }
    
    console.log(`Found ${systemsToSync.length} systems missing details, starting synchronization...`);
    
    // 对每个系统同步详情
    for (const system of systemsToSync) {
      const systemId = system.system_id;
      
      try {
        // 请求系统详情
        const systemDetails = await eveApiService.getSystemDetails(systemId);
        
        if (systemDetails !== null) {
          // 确保当API不返回stargates字段时，将其设置为null
          const stargatesValue = systemDetails.stargates === undefined ? null : systemDetails.stargates;
          
          // 使用详情更新数据库
          await System.insertOrUpdate({
            system_id: systemDetails.system_id,
            constellation_id: systemDetails.constellation_id,
            name: systemDetails.name || '',
            position: systemDetails.position,
            security_status: systemDetails.security_status,
            stargates: stargatesValue
          });
          
          console.log(`System ${systemId} (${systemDetails.name}) updated with details.`);
        } else {
          console.log(`No details returned for system ${systemId}`);
        }
        
        // 设置API请求间隔，避免请求过于频繁
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (apiError) {
        console.error(`Error fetching details for system ID ${systemId}:`, apiError.message);
        // 如果API请求失败，也添加一个小延迟，避免立即重试
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log('System details synchronization completed.');
  } catch (error) {
    console.error('Error in system details synchronization:', error.message);
    console.error('Error stack:', error.stack);
  }
};

// 设置定时任务，每5秒执行一次
const startScheduler = () => {
  console.log('Starting system details scheduler...');
  
  // 立即执行一次
  syncSystemDetails();
  
  // 然后每5秒执行一次 (5 * 1000 ms)
  setInterval(syncSystemDetails, 5 * 1000);
};

// 如果直接运行这个文件，启动调度器
if (require.main === module) {
  startScheduler();
}

module.exports = { startScheduler, syncSystemDetails };
