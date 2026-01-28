const pool = require('../config/database');
const eveApiService = require('../services/eveApiService');

// 吉他的系统ID
const JITA_SYSTEM_ID = 30000142;

// 当前处理的系统索引
let currentSystemIndex = 0;

// 获取系统列表，按安全等级从大到小排序，只选择未同步距离的系统
async function getSystemList(datasource = 'serenity') {
  try {
    const query = `
      SELECT system_id 
      FROM systems 
      WHERE datasource = ? AND (distance_to_jita IS NULL OR distance_to_jita = '') 
      ORDER BY security_status DESC, system_id
    `;
    const [rows] = await pool.execute(query, [datasource]);
    return rows.map(row => row.system_id);
  } catch (error) {
    console.error('Error getting system list:', error.message);
    return [];
  }
}

// 同步单个系统到吉他的距离
async function syncSystemDistance(systemId, datasource = 'serenity') {
  try {
    // 如果是吉他系统本身，距离为0
    if (systemId === JITA_SYSTEM_ID) {
      await pool.execute(
        'UPDATE systems SET distance_to_jita = 0 WHERE system_id = ? AND datasource = ?',
        [systemId, datasource]
      );
      console.log(`Updated distance for Jita system (${systemId}) to 0`);
      return true;
    }

    // 调用EVE API获取路由
    const routeData = await eveApiService.getRoute(systemId, JITA_SYSTEM_ID, datasource);
    const distance = routeData.distance;

    // 更新数据库
    await pool.execute(
      'UPDATE systems SET distance_to_jita = ? WHERE system_id = ? AND datasource = ?',
      [distance, systemId, datasource]
    );

    console.log(`Updated distance for system ${systemId} to Jita: ${distance} jumps`);
    return true;
  } catch (error) {
    console.error(`Error syncing distance for system ${systemId}:`, error.message);
    // 检查是否是404错误，如果是，则将距离设置为100
    if (error.response && error.response.status === 404) {
      try {
        await pool.execute(
          'UPDATE systems SET distance_to_jita = 100 WHERE system_id = ? AND datasource = ?',
          [systemId, datasource]
        );
        console.log(`Updated distance for system ${systemId} to Jita: 100 (404 error)`);
        return true;
      } catch (dbError) {
        console.error(`Error updating distance for system ${systemId} (404 error):`, dbError.message);
        return false;
      }
    }
    return false;
  }
}

// 同步一批系统到吉他的距离
async function syncBatchSystems(systemList, batchSize = 2, datasource = 'serenity') {
  try {
    // 如果没有系统，返回
    if (systemList.length === 0) {
      console.log('No systems to sync');
      return;
    }

    // 重置索引，确保每次都从安全等级最高的系统开始
    currentSystemIndex = 0;

    // 获取当前批次的系统
    const batchSystems = [];
    for (let i = 0; i < batchSize && currentSystemIndex < systemList.length; i++) {
      batchSystems.push(systemList[currentSystemIndex]);
      currentSystemIndex++;
    }

    // 如果当前索引已经超过系统列表长度，重置为0
    if (currentSystemIndex >= systemList.length) {
      currentSystemIndex = 0;
      console.log('All systems synced, resetting index to 0');
    }

    // 同步当前批次的系统
    console.log(`Syncing batch of ${batchSystems.length} systems:`, batchSystems);
    const promises = batchSystems.map(systemId => syncSystemDistance(systemId, datasource));
    await Promise.allSettled(promises);

  } catch (error) {
    console.error('Error in syncBatchSystems:', error.message);
  }
}

// 为所有数据源启动距离同步
async function startDistanceSyncForAllDatasources() {
  const datasources = ['serenity', 'infinity', 'tranquility'];
  
  for (const datasource of datasources) {
    console.log(`Starting distance sync for datasource: ${datasource}`);
    const systemList = await getSystemList(datasource);
    
    if (systemList.length > 0) {
      // 同步当前数据源的一批系统
      await syncBatchSystems(systemList, 2, datasource);
    } else {
      console.log(`No systems need distance sync for datasource: ${datasource}`);
    }
    
    // 添加小延迟，避免并发请求过多
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

// 设置定时任务，每秒执行一次
const startScheduler = () => {
  console.log('Starting system distance to Jita scheduler...');
  
  // 立即执行一次
  startDistanceSyncForAllDatasources();
  
  // 然后每秒执行一次
  setInterval(startDistanceSyncForAllDatasources, 1000);
};

// 如果直接运行这个文件，启动调度器
if (require.main === module) {
  startScheduler();
}

module.exports = { startScheduler, syncSystemDistance };
