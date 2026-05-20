const path = require('path');
const app = require('./app');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const onlinePlayerStatsScheduler = require('./utils/onlinePlayerStatsScheduler');
const systemKillScheduler = require('./utils/systemKillScheduler');
const systemDetailsScheduler = require('./utils/systemDetailsScheduler');
const stargateScheduler = require('./utils/stargateScheduler');
const systemDistanceScheduler = require('./utils/systemDistanceScheduler');
const loyaltyProfitScheduler = require('./utils/loyaltyProfitScheduler');
const lpBlueprintScheduler = require('./utils/lpBlueprintScheduler');
const loyaltyMultiItemProfitScheduler = require('./utils/loyaltyMultiItemProfitScheduler');
const kbSyncScheduler = require('./utils/kbSyncScheduler');
const { ensureTableIntegrity } = require('./utils/ensureTableIntegrity');
const Type = require('./models/Type');


console.log('Starting server...');
console.log('Environment variables loaded:', process.env.PORT);

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API documentation: http://localhost:${PORT}/api`);
  console.log('Server listening:', server.address());

  // 启动时清理旧数据
  await Type.cleanupOldRegionTypes();

  // 启动时检查并修复 LP 表完整性（UNIQUE KEY 自动修复）
  await ensureTableIntegrity();

  // Start the online player stats scheduler
  onlinePlayerStatsScheduler.startScheduler();
  
  // // Start the system kills scheduler
  // systemKillScheduler.startScheduler();
  
  // // Start the system details scheduler
  // systemDetailsScheduler.startScheduler();
  
  // // Start the stargate sync scheduler
  // stargateScheduler.startScheduler();
  
  // // Start the system distance to Jita scheduler
  // systemDistanceScheduler.startScheduler();
  
  // Start the LP profit scheduler
  loyaltyProfitScheduler.startLoyaltyProfitScheduler();

  // Start the LP blueprint profit scheduler
  lpBlueprintScheduler.startScheduler();

  // Start the LP multi-item profit scheduler (incremental, every minute)
  loyaltyMultiItemProfitScheduler.startLoyaltyMultiItemProfitScheduler();

  // Start the KB sync scheduler (every 3 minutes)
  kbSyncScheduler.startKbSyncScheduler();
});

server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});