const System = require('../models/System');
const Stargate = require('../models/Stargate');
const eveApiService = require('../services/eveApiService');
const pool = require('../config/database');

// 全局变量，用于分页获取系统
let currentPage = 1;
const pageSize = 50; // 每页获取的系统数量
let currentSystems = []; // 当前页的系统列表
let currentIndex = 0; // 当前处理的系统索引

// 同步单个stargate详情的函数
const syncSingleStargate = async (stargateId, systemId, datasource = 'infinity') => {
  try {
    // 检查该星门是否需要同步
    const needsSync = await Stargate.needSync(stargateId, systemId, datasource);
    
    if (!needsSync) {
      console.log(`ℹ️  Stargate ${stargateId} in system ${systemId} already has complete data, skipping sync.`);
      return;
    }
    
    // 获取stargate详情
      const stargateDetails = await eveApiService.getStargateDetails(stargateId, systemId, datasource);
    
    if (stargateDetails) {
      // 处理destination字段，将其展开到外层
      const processedData = {
        stargate_id: stargateDetails.stargate_id,
        name: stargateDetails.name,
        position: stargateDetails.position,
        system_id: systemId,
        type_id: stargateDetails.type_id,
        destination_stargate_id: stargateDetails.destination?.stargate_id,
        destination_system_id: stargateDetails.destination?.system_id,
        datasource: datasource
      };
      
      // 插入或更新到数据库
      await Stargate.insertOrUpdate(processedData);
      console.log(`✓ Stargate ${stargateId} (${processedData.name}) synced successfully.`);
    }
  } catch (error) {
    console.error(`✗ Error syncing stargate ${stargateId} in system ${systemId}:`, error.message);
    
    // 输出错误对象的详细结构以便调试
    console.log('Error object structure:', error);
    console.log('Error response:', error.response);
    
    // 如果是404错误，重新同步系统详情
    if ((error.response && error.response.status === 404) || error.message.includes('404')) {
      console.log(`⚠️  Stargate ${stargateId} not found (404 error), re-syncing system ${systemId} details...`);
      
      try {
        // 重新获取系统详情，使用当前数据源
        const systemDetails = await eveApiService.getSystemDetails(systemId, datasource);
        
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
            stargates: stargatesValue,
            datasource: datasource
          });
          
          console.log(`✅ System ${systemId} details re-synced, stargates updated to:`, stargatesValue);
          
          // 清理stargates表中不再有效的星门记录
          if (stargatesValue === null || stargatesValue.length === 0) {
            // 如果系统没有星门，删除该系统的所有星门记录
            const deleteResult = await Stargate.deleteBySystemId(systemId, datasource);
            console.log(`🗑️  Deleted ${deleteResult} invalid stargate records for system ${systemId}`);
          } else {
            // 如果系统有星门，只保留有效的星门记录
            const deleteResult = await Stargate.deleteBySystemIdExcluding(systemId, stargatesValue, datasource);
            console.log(`🗑️  Deleted ${deleteResult} invalid stargate records for system ${systemId}`);
          }
        }
      } catch (systemError) {
        console.error(`✗ Error re-syncing system ${systemId} details:`, systemError.message);
      }
    }
  }
};

// 同步单个系统的stargates
const syncSystemStargates = async (system) => {
  try {
    if (!system || !system.stargates) {
      return;
    }
    
    // 解析stargates字段（可能是JSON字符串）
    let stargates = [];
    if (typeof system.stargates === 'string') {
      try {
        stargates = JSON.parse(system.stargates);
      } catch (jsonError) {
        console.error(`Error parsing stargates JSON for system ${system.system_id}:`, jsonError.message);
        return;
      }
    } else {
      stargates = system.stargates;
    }
    
    if (!Array.isArray(stargates) || stargates.length === 0) {
      return;
    }
    
    console.log(`Found ${stargates.length} stargates in system ${system.system_id} (${system.name})`);
    
    // 处理系统中的所有星门
    for (const stargateId of stargates) {
      await syncSingleStargate(stargateId, system.system_id, system.datasource || 'infinity');
      // 每处理一个星门后等待1秒，确保API请求不超过限制
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
  } catch (error) {
    console.error(`Error syncing stargates for system ${system.system_id}:`, error.message);
  }
};

// 获取下一个需要同步的stargate的函数
const getNextStargate = async () => {
  try {
    // 如果当前页的stargate列表为空或已处理完所有stargate，获取下一批
    if (currentSystems.length === 0 || currentIndex >= currentSystems.length) {
      console.log(`Fetching stargates to sync...`);
      
      // 查询stargate表中destination_system_id为空的数据
      const sqlStargatesWithNullDestination = `
        SELECT g.*
        FROM stargates g
        WHERE g.destination_system_id IS NULL
        LIMIT 10
      `;
      
      const [stargatesWithNullDestination] = await pool.execute(sqlStargatesWithNullDestination);
      
      if (stargatesWithNullDestination.length > 0) {
        // 如果有需要同步的stargate，处理这些stargate
        console.log(`Found ${stargatesWithNullDestination.length} stargates with null destination_system_id`);
        currentSystems = stargatesWithNullDestination;
      } else {
        // 如果没有需要同步的stargate，返回null
        console.log('All stargates have complete destination information');
        return null;
      }
      
      currentIndex = 0;
      console.log(`Fetched ${currentSystems.length} stargates to sync`);
    }
    
    // 获取当前stargate并增加索引
    const stargate = currentSystems[currentIndex];
    currentIndex++;
    
    return stargate;
  } catch (error) {
    console.error('Error getting next stargate:', error.message);
    return null;
  }
};

// 定时任务主函数
const syncStargates = async () => {
  try {
    // 获取下一个需要同步的stargate
    const stargate = await getNextStargate();
    
    if (stargate) {
      // 同步单个stargate的详情
      await syncSingleStargate(stargate.stargate_id, stargate.system_id, stargate.datasource);
    }
  } catch (error) {
    console.error('Error in stargate sync task:', error.message);
    console.error('Error stack:', error.stack);
  }
};

// 设置定时器，每3秒执行一次
const startScheduler = () => {
  console.log('Starting stargate sync scheduler...');
  
  // 立即执行一次
  syncStargates();
  
  // 然后每5秒执行一次
  setInterval(syncStargates, 5000);
};

// 如果直接运行这个文件，启动调度器
if (require.main === module) {
  startScheduler();
}

module.exports = { startScheduler, syncStargates };
