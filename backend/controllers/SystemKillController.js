const SystemKill = require('../models/SystemKill');
const System = require('../models/System');
const eveApiService = require('../services/eveApiService');
const pool = require('../config/database');

class SystemKillController {
  // 同步System Kills数据
  static async syncSystemKills(req, res) {
    // 直接返回成功给前端
    res.status(202).json({
      message: 'System Kills同步任务已开始，将在后台执行',
      status: 'started'
    });

    // 在后台异步执行System Kills同步
    (async () => {
      try {
        console.log('Starting system kills synchronization in background...');
        
        // 获取所有系统的名称映射
        const systemMap = await SystemKillController.getSystemNameMap();
        
        // 同步所有数据源
        const datasources = ['serenity', 'infinity', 'tranquility'];
        
        for (const datasource of datasources) {
          try {
            console.log(`Syncing system kills for datasource: ${datasource}`);
            await SystemKillController.syncSystemKillsForDatasource(datasource, systemMap);
            console.log(`Successfully synced system kills for datasource: ${datasource}`);
          } catch (error) {
            console.error(`Error syncing system kills for datasource ${datasource}:`, error.message);
            console.error('Error stack:', error.stack);
          }
          
          // 添加小延迟，避免API请求过于频繁
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        console.log('System kills synchronization completed successfully.');
      } catch (error) {
        console.error('Error in background syncing system kills:', error.message);
        console.error('Error stack:', error.stack);
      }
    })();
  }

  // 同步指定数据源的System Kills数据
  static async syncSystemKillsForDatasource(datasource, systemMap) {
    try {
      // 从API获取数据
      const systemKillsData = await eveApiService.getSystemKills(datasource);
      
      if (!systemKillsData || systemKillsData.length === 0) {
        console.log(`No system kills data received for datasource: ${datasource}`);
        return;
      }
      
      console.log(`Processing ${systemKillsData.length} system kills records for datasource: ${datasource}`);
      
      // 准备要插入或更新的数据
      const processedData = systemKillsData.map(kill => ({
        system_id: kill.system_id,
        npc_kills: kill.npc_kills || 0,
        pod_kills: kill.pod_kills || 0,
        ship_kills: kill.ship_kills || 0,
        datasource: datasource,
        timestamp: new Date()
      }));
      
      // 批量插入或更新
      const batchSize = 100;
      for (let i = 0; i < processedData.length; i += batchSize) {
        const batch = processedData.slice(i, i + batchSize);
        await SystemKill.batchInsertOrUpdate(batch, datasource);
        console.log(`Inserted/updated batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(processedData.length / batchSize)} for datasource: ${datasource}`);
        
        // 添加小延迟，避免数据库操作过于频繁
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      console.log(`Finished processing ${processedData.length} system kills records for datasource: ${datasource}`);
      
    } catch (error) {
      console.error(`Error syncing system kills for datasource ${datasource}:`, error.message);
      throw error;
    }
  }

  // 获取系统名称映射
  static async getSystemNameMap() {
    try {
      const query = `SELECT system_id, name FROM systems`;
      const [rows] = await pool.execute(query);
      
      // 创建system_id到name的映射
      const systemMap = {};
      rows.forEach(row => {
        systemMap[row.system_id] = row.name;
      });
      
      return systemMap;
    } catch (error) {
      console.error('Error getting system name map:', error.message);
      return {};
    }
  }

  // 获取System Kills数据列表
  static async getSystemKills(req, res) {
    try {
      const { page = 1, limit = 10, search = '', datasource = 'infinity', sortBy = 'ship_kills', sortOrder = 'descending', securityStatus = '', timeRange = 'realtime' } = req.query;
      const systemKills = await SystemKill.findAll(parseInt(page), parseInt(limit), datasource, search, sortBy, sortOrder, securityStatus, timeRange);
      const total = await SystemKill.count(datasource, search, securityStatus, timeRange);

      res.status(200).json({
        system_kills: systemKills,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error getting system kills:', error);
      res.status(500).json({ message: 'Failed to get system kills', error: error.message });
    }
  }

  // 获取特定System的Kills数据
  static async getSystemKillById(req, res) {
    try {
      const { id } = req.params;
      const { datasource = 'infinity' } = req.query;
      const systemKill = await SystemKill.findBySystemId(id, datasource);

      if (!systemKill) {
        return res.status(404).json({ message: 'System kill data not found' });
      }

      res.status(200).json(systemKill);
    } catch (error) {
      console.error(`Error getting system kill data with ID ${req.params.id}:`, error);
      res.status(500).json({ message: 'Failed to get system kill data', error: error.message });
    }
  }

  // 获取最新更新时间
  static async getLatestUpdate(req, res) {
    try {
      const { datasource = 'infinity' } = req.query;
      const latestUpdate = await SystemKill.getLatestUpdate(datasource);
      
      res.status(200).json({
        latest_update: latestUpdate
      });
    } catch (error) {
      console.error('Error getting latest update time:', error);
      res.status(500).json({ message: 'Failed to get latest update time', error: error.message });
    }
  }
}

module.exports = SystemKillController;