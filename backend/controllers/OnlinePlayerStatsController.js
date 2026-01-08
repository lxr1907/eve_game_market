const OnlinePlayerStats = require('../models/OnlinePlayerStats');
const eveApiService = require('../services/eveApiService');

class OnlinePlayerStatsController {
  constructor() {
    this.eveApiService = eveApiService;
  }

  // 记录当前在线人数
  async recordStats(req, res) {
    try {
      const datasource = req.query.datasource || 'serenity';
      const serverStatus = await this.eveApiService.getServerStatus(datasource);
      
      // 创建可靠的日期转换函数
      const formatDateForMySQL = (dateString) => {
        try {
          const date = new Date(dateString);
          if (isNaN(date.getTime())) {
            // 如果日期无效，使用当前时间
            return new Date().toISOString().slice(0, 19).replace('T', ' ');
          }
          return date.toISOString().slice(0, 19).replace('T', ' ');
        } catch (error) {
          // 如果转换失败，使用当前时间
          return new Date().toISOString().slice(0, 19).replace('T', ' ');
        }
      };

      const stats = {
        players: serverStatus.players,
        server_version: serverStatus.server_version,
        start_time: formatDateForMySQL(serverStatus.start_time),
        vip: serverStatus.vip || false,
        recorded_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
      };
      
      await OnlinePlayerStats.insert(stats);
      res.status(200).json({ success: true, message: 'Stats recorded successfully', data: stats });
    } catch (error) {
      console.error('Error recording stats:', error);
      res.status(500).json({ success: false, message: 'Failed to record stats', error: error.message });
    }
  }

  // 获取所有统计数据（分页）
  async getAllStats(req, res) {
    try {
      const page = req.query.page || 1;
      const limit = req.query.limit || 10;
      const dimension = req.query.dimension;
      
      let stats, total;
      
      // 如果指定了时间维度，使用聚合查询
      if (dimension && ['month', 'day', 'hour', 'minute'].includes(dimension)) {
        const aggregatedResult = await OnlinePlayerStats.getAggregatedStats(dimension, page, limit);
        stats = aggregatedResult.data;
        total = aggregatedResult.total;
      } else {
        // 否则使用普通查询
        stats = await OnlinePlayerStats.findAll(page, limit);
        total = await OnlinePlayerStats.countAll();
      }
      
      res.status(200).json({
        success: true,
        data: stats,
        pagination: {
          total: total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error getting all stats:', error);
      res.status(500).json({ success: false, message: 'Failed to get stats', error: error.message });
    }
  }

  // 根据日期范围获取统计数据
  async getStatsByDateRange(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const page = req.query.page || 1;
      const limit = req.query.limit || 10;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ success: false, message: 'startDate and endDate are required' });
      }
      
      const stats = await OnlinePlayerStats.findByDateRange(startDate, endDate, page, limit);
      const total = await OnlinePlayerStats.countByDateRange(startDate, endDate);
      
      res.status(200).json({
        success: true,
        data: stats,
        pagination: {
          total: total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error getting stats by date range:', error);
      res.status(500).json({ success: false, message: 'Failed to get stats', error: error.message });
    }
  }

  // 获取最新的统计数据
  async getLatestStats(req, res) {
    try {
      const stats = await OnlinePlayerStats.getLatest();
      if (stats) {
        res.status(200).json({ success: true, data: stats });
      } else {
        res.status(404).json({ success: false, message: 'No stats found' });
      }
    } catch (error) {
      console.error('Error getting latest stats:', error);
      res.status(500).json({ success: false, message: 'Failed to get latest stats', error: error.message });
    }
  }
}

// 创建实例并导出
const onlinePlayerStatsController = new OnlinePlayerStatsController();

// 确保方法绑定到正确的实例
module.exports = {
  recordStats: onlinePlayerStatsController.recordStats.bind(onlinePlayerStatsController),
  getAllStats: onlinePlayerStatsController.getAllStats.bind(onlinePlayerStatsController),
  getStatsByDateRange: onlinePlayerStatsController.getStatsByDateRange.bind(onlinePlayerStatsController),
  getLatestStats: onlinePlayerStatsController.getLatestStats.bind(onlinePlayerStatsController)
};