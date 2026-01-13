const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const typeRoutes = require('./routes/typeRoutes');
const regionRoutes = require('./routes/regionRoutes');
const orderRoutes = require('./routes/orderRoutes');
const loyaltyRoutes = require('./routes/loyaltyRoutes');
const groupRoutes = require('./routes/groupRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const onlinePlayerStatsRoutes = require('./routes/onlinePlayerStatsRoutes');
const systemRoutes = require('./routes/systemRoutes');
const Type = require('./models/Type');
const Region = require('./models/Region');
const RegionType = require('./models/RegionType');
const Order = require('./models/Order');
const LoyaltyOffer = require('./models/LoyaltyOffer');
const LoyaltyTypeLpIsk = require('./models/LoyaltyTypeLpIsk');
const Group = require('./models/Group');
const Category = require('./models/Category');
const OnlinePlayerStats = require('./models/OnlinePlayerStats');
const System = require('./models/System');
const { syncDatabaseStructure } = require('./utils/syncDatabaseStructure');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize database tables using syncDatabaseStructure
(async () => {
  try {
    await syncDatabaseStructure();
    console.log('Database tables initialized successfully');
  } catch (err) {
    console.error('Error initializing database tables:', err);
  }
})();

// Routes
app.use('/api', typeRoutes);
app.use('/api', regionRoutes);
app.use('/api', orderRoutes);
app.use('/api', loyaltyRoutes);
app.use('/api', groupRoutes);
app.use('/api', categoryRoutes);
app.use('/api', onlinePlayerStatsRoutes);
app.use('/api', systemRoutes);

// Health check route
app.get('/health', (req, res) => {
  console.log('Health check request received!');
  console.log('Request headers:', req.headers);
  console.log('Request URL:', req.url);
  res.status(200).json({ status: 'ok', message: 'EVE Online API Service is running' });
});

// Simple test route
app.get('/test', (req, res) => {
  console.log('Test request received!');
  res.send('Server is working!');
});

// 404 route
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

module.exports = app;