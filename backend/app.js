require('dotenv').config();
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
const systemKillRoutes = require('./routes/systemKillRoutes');
const eveSsoRoutes = require('./routes/eveSsoRoutes');
const stationRoutes = require('./routes/stationRoutes');
const kbRoutes = require('./routes/kbRoutes');
const bilibiliRoutes = require('./routes/bilibiliRoutes');
const Type = require('./models/Type');
const Region = require('./models/Region');
const RegionType = require('./models/RegionType');
const Order = require('./models/Order');
const LoyaltyOffer = require('./models/LoyaltyOffer');
const LpBlueprintProfit = require('./models/LpBlueprintProfit');
const LoyaltyTypeLpIsk = require('./models/LoyaltyTypeLpIsk');
const Group = require('./models/Group');
const Category = require('./models/Category');
const OnlinePlayerStats = require('./models/OnlinePlayerStats');
const System = require('./models/System');
const EveSsoCode = require('./models/EveSsoCode');
const Killmail = require('./models/Killmail');
const Station = require('./models/Station');
const { syncDatabaseStructure } = require('./utils/syncDatabaseStructure');
const { unifyDatabaseCharset } = require('./utils/unifyCharset');
const { initTable: initBilibiliTable } = require('./services/BilibiliService');

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
    // 先统一数据库字符集
    await unifyDatabaseCharset();
    
    await syncDatabaseStructure();
    // 初始化KB相关表
    await Killmail.createTables();
    // 初始化LP蓝图收益表并添加新列
    await LpBlueprintProfit.createTable();
    await LpBlueprintProfit.addNewColumns();
    // 初始化 bilibili_videos 表
    await initBilibiliTable();
    // 初始化 stations 表
    await Station.createTable();
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
app.use('/api', systemKillRoutes);
app.use('/api', eveSsoRoutes);
app.use('/api', stationRoutes);
app.use('/api/kb', kbRoutes);
app.use('/api/bilibili', bilibiliRoutes);

// 图片代理路由 - 解决 B站 CDN 防盗链问题
const https = require('https');
const http = require('http');
const { URL } = require('url');

app.get('/api/proxy/image', async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    
    const options = {
      headers: {
        'Referer': 'https://www.bilibili.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    };

    protocol.get(url, options, (proxyRes) => {
      // 处理重定向
      if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
        return res.redirect(proxyRes.statusCode, proxyRes.headers.location);
      }
      
      res.setHeader('Content-Type', proxyRes.headers['content-type'] || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 缓存 1 天
      proxyRes.pipe(res);
    }).on('error', (err) => {
      console.error('Proxy error:', err);
      res.status(502).json({ error: 'Failed to fetch image' });
    });
  } catch (err) {
    console.error('Invalid URL:', err);
    res.status(400).json({ error: 'Invalid URL' });
  }
});

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