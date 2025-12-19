const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const typeRoutes = require('./routes/typeRoutes');
const regionRoutes = require('./routes/regionRoutes');
const Type = require('./models/Type');
const Region = require('./models/Region');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize database tables
Promise.all([
  Type.createTable(),
  Region.createTable()
])
  .then(() => console.log('Database tables initialized successfully'))
  .catch(err => console.error('Error initializing database tables:', err));

// Routes
app.use('/api', typeRoutes);
app.use('/api', regionRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'EVE Online API Service is running' });
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