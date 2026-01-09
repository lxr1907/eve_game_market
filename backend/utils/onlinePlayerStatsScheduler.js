const OnlinePlayerStatsController = require('../controllers/OnlinePlayerStatsController');
const axios = require('axios');

// 创建一个axios实例来调用我们自己的API
const apiClient = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 10000
});

// 定时调用记录统计数据的函数
const recordStats = async (datasource) => {
  try {
    console.log(`Starting to record online player stats for ${datasource}...`);
    const response = await apiClient.post('/online-player-stats/record', null, {
      params: { datasource: datasource }
    });
    console.log(`${datasource} stats recorded successfully:`, response.data);
  } catch (error) {
    console.error(`Error recording ${datasource} stats:`, error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
};

// 为所有数据源记录统计数据
const recordAllStats = async () => {
  await recordStats('serenity');
  await recordStats('infinity');
};

// 设置定时任务，每分钟执行一次
const startScheduler = () => {
  console.log('Starting online player stats scheduler...');
  
  // 立即执行一次
  recordAllStats();
  
  // 然后每分钟执行一次
  setInterval(recordAllStats, 60 * 1000);
};

// 如果直接运行这个文件，启动调度器
if (require.main === module) {
  startScheduler();
}

module.exports = { startScheduler, recordStats };