const System = require('../models/System');
const eveApiService = require('../services/eveApiService');

// 同步所有系统ID的函数
const syncAllSystemIds = async (datasource = 'infinity') => {
  try {
    console.log(`开始同步${datasource}数据源的所有系统ID...`);
    
    let page = 1;
    let hasMoreData = true;
    let totalSystems = 0;
    
    while (hasMoreData) {
      try {
        // 获取当前页的系统ID列表
        const systemIds = await eveApiService.getSystemIds(page, datasource);
        
        if (systemIds.length === 0) {
          hasMoreData = false;
          break;
        }
        
        // 将系统ID批量插入数据库
        const systemDataArray = systemIds.map(systemId => ({
          system_id: systemId,
          datasource: datasource
        }));
        
        await System.batchInsertOrUpdate(systemDataArray);
        
        totalSystems += systemIds.length;
        console.log(`已同步${datasource}数据源第${page}页的系统ID，共${systemIds.length}个系统`);
        
        page++;
        
        // 每获取一页后等待一下，避免请求过于频繁
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (pageError) {
        console.error(`同步${datasource}数据源第${page}页系统ID失败:`, pageError.message);
        // 遇到错误仍继续尝试下一页
        page++;
        
        // 错误后等待更长时间
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    console.log(`成功同步${datasource}数据源的所有系统ID，共${totalSystems}个系统`);
    return totalSystems;
    
  } catch (error) {
    console.error(`同步${datasource}数据源的系统ID失败:`, error.message);
    console.error(error.stack);
    return 0;
  }
};

// 同步系统详情的函数
const syncSystemDetails = async (datasource = 'infinity') => {
  try {
    // 查询没有name或stargates的系统记录，限制5条
    const systemsToSync = await System.findSystemsMissingDetails(5);
    
    if (systemsToSync.length === 0) {
      // console.log('No systems need details synchronization at the moment.');
      return;
    }
    
    console.log(`Found ${systemsToSync.length} systems missing details, starting synchronization using datasource: ${datasource}...`);
    
    // 对每个系统同步详情
    for (const system of systemsToSync) {
      const systemId = system.system_id;
      
      try {
        // 请求系统详情，使用指定的数据源
        const systemDetails = await eveApiService.getSystemDetails(systemId, datasource);
        
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
            stargates: stargatesValue,
            datasource: datasource
          });
          
          console.log(`System ${systemId} (${systemDetails.name}) updated with details from ${datasource}. Stargates:`, stargatesValue);
        } else {
          console.log(`No details returned for system ${systemId} from ${datasource}`);
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

// 设置定时任务，先同步所有系统ID，然后每5秒执行一次系统详情同步
const startScheduler = async () => {
  console.log('Starting system details scheduler...');
  
  // 定义需要同步的数据源
  const datasources = ['infinity', 'serenity', 'tranquility'];
  
  // 先同步所有数据源的系统ID
  for (const datasource of datasources) {
    try {
      await syncAllSystemIds(datasource);
    } catch (error) {
      console.error(`Failed to sync system IDs for ${datasource}:`, error.message);
    }
    
    // 每个数据源同步后等待一下
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  // 立即执行一次系统详情同步
  syncSystemDetails();
  
  // 然后每5秒执行一次系统详情同步，轮流使用不同的数据源
  let datasourceIndex = 0;
  setInterval(() => {
    const datasource = datasources[datasourceIndex];
    syncSystemDetails(datasource);
    
    // 切换到下一个数据源
    datasourceIndex = (datasourceIndex + 1) % datasources.length;
  }, 5 * 1000);
};

// 如果直接运行这个文件，启动调度器
if (require.main === module) {
  startScheduler();
}

module.exports = { startScheduler, syncSystemDetails };
