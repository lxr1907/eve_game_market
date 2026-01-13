const app = require('./app');
require('dotenv').config();
const onlinePlayerStatsScheduler = require('./utils/onlinePlayerStatsScheduler');
const systemKillScheduler = require('./utils/systemKillScheduler');


console.log('Starting server...');
console.log('Environment variables loaded:', process.env.PORT);

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API documentation: http://localhost:${PORT}/api`);
  console.log('Server listening:', server.address());
  
  // Start the online player stats scheduler
  onlinePlayerStatsScheduler.startScheduler();
  
  // Start the system kills scheduler
  systemKillScheduler.startScheduler();
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