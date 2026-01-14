const System = require('../models/System');
const Stargate = require('../models/Stargate');
const eveApiService = require('../services/eveApiService');

// 全局变量，用于分页获取系统
let currentPage = 1;
const pageSize = 50; // 每页获取的系统数量
let currentSystems = []; // 当前页的系统列表
let currentIndex = 0; // 当前处理的系统索引

// 同步单个stargate详情的函数
const syncSingleStargate = async (stargateId, systemId, datasource = 'infinity') => {
  try {
    // 检查该星门是否需要同步
    const needsSync = await Stargate.needSync(stargateId, systemId);
    
    if (!needsSync) {
      console.log(`ℹ️  Stargate ${stargateId} in system ${systemId} already has complete data, skipping sync.`);
      return;
    }
    
    // 获取stargate详情
    const stargateDetails = await eveApiService.getStargateDetails(stargateId, datasource);
    
    if (stargateDetails) {
      // 处理destination字段，将其展开到外层
      const processedData = {
        stargate_id: stargateDetails.stargate_id,
        name: stargateDetails.name,
        position: stargateDetails.position,
        system_id: systemId,
        type_id: stargateDetails.type_id,
        destination_stargate_id: stargateDetails.destination?.stargate_id,
        destination_system_id: stargateDetails.destination?.system_id
      };
      
      // 插入或更新到数据库
      await Stargate.insertOrUpdate(processedData);
      console.log(`✓ Stargate ${stargateId} (${processedData.name}) synced successfully.`);
    }
  } catch (error) {
    console.error(`✗ Error syncing stargate ${stargateId}:`, error.message);
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
      await syncSingleStargate(stargateId, system.system_id);
      // 每处理一个星门后等待1秒，确保API请求不超过限制
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
  } catch (error) {
    console.error(`Error syncing stargates for system ${system.system_id}:`, error.message);
  }
};

// 获取下一个系统的函数，使用分页从systems表获取
const getNextSystem = async () => {
  try {
    // 如果当前页的系统列表为空或已处理完所有系统，获取下一页
    if (currentSystems.length === 0 || currentIndex >= currentSystems.length) {
      console.log(`Fetching systems page ${currentPage} with page size ${pageSize}...`);
      
      // 从数据库获取系统列表，分页查询
      currentSystems = await System.findAll(currentPage, pageSize);
      currentIndex = 0;
      
      if (currentSystems.length === 0) {
        // 如果没有更多系统，重置到第一页
        console.log('No more systems found, resetting to page 1');
        currentPage = 1;
        currentSystems = await System.findAll(currentPage, pageSize);
        
        if (currentSystems.length === 0) {
          // 如果仍然没有系统，返回null
          console.error('No systems found in database');
          return null;
        }
      } else {
        // 否则，准备获取下一页
        currentPage++;
      }
      
      console.log(`Fetched ${currentSystems.length} systems from page ${currentPage - 1}`);
    }
    
    // 获取当前系统并增加索引
    const system = currentSystems[currentIndex];
    currentIndex++;
    
    return system;
  } catch (error) {
    console.error('Error getting next system:', error.message);
    return null;
  }
};

// 定时任务主函数
const syncStargates = async () => {
  try {
    // 获取下一个系统
    const system = await getNextSystem();
    
    if (system) {
      // 同步该系统的stargates
      await syncSystemStargates(system);
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
  
  // 然后每3秒执行一次
  setInterval(syncStargates, 3000);
};

// 如果直接运行这个文件，启动调度器
if (require.main === module) {
  startScheduler();
}

module.exports = { startScheduler, syncStargates };
