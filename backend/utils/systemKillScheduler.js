const axios = require('axios');

// 创建一个axios实例来调用我们自己的API
const apiClient = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 30000 // 增加超时时间，因为同步可能需要更长时间
});

// 定时调用同步system kills的函数
const syncSystemKills = async (datasource) => {
  try {
    console.log(`Starting to sync system kills for ${datasource}...`);
    const response = await apiClient.get('/system-kills/sync', {
      params: { datasource: datasource }
    });
    console.log(`${datasource} system kills synced successfully:`, response.data);
  } catch (error) {
    console.error(`Error syncing ${datasource} system kills:`, error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
};

// 为所有数据源同步system kills
const syncAllSystemKills = async () => {
  console.log('Starting to sync system kills for all datasources...');
  const datasources = ['serenity', 'infinity', 'tranquility'];
  
  for (const datasource of datasources) {
    await syncSystemKills(datasource);
    // 添加小延迟，避免并发请求过多
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('All datasources system kills sync completed.');
};

// 设置定时任务，每5分钟执行一次
const startScheduler = () => {
  console.log('Starting system kills scheduler...');
  
  // 立即执行一次
  syncAllSystemKills();
  
  // 然后每3分钟执行一次 (3 * 60 * 1000 ms)
  setInterval(syncAllSystemKills, 3 * 60 * 1000);
};

// 如果直接运行这个文件，启动调度器
if (require.main === module) {
  startScheduler();
}

module.exports = { startScheduler, syncAllSystemKills };