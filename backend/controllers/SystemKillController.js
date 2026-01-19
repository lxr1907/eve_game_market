const SystemKill = require('../models/SystemKill');
const System = require('../models/System');
const Constellation = require('../models/Constellation');
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
      
      // 检查并同步星座信息
      await SystemKillController.checkAndSyncConstellationInfo(systemKillsData, datasource);
      
    } catch (error) {
      console.error(`Error syncing system kills for datasource ${datasource}:`, error.message);
      throw error;
    }
  }

  // 检查并同步星座信息
  static async checkAndSyncConstellationInfo(systemKillsData, datasource) {
    try {
      console.log(`Checking constellation information for ${systemKillsData.length} systems...`);
      
      // 提取所有系统ID
      const systemIds = systemKillsData.map(kill => kill.system_id);
      
      // 获取这些系统对应的星座ID
      const query = `
        SELECT DISTINCT s.constellation_id 
        FROM systems s 
        WHERE s.system_id IN (${systemIds.map(() => '?').join(', ')}) 
        AND s.constellation_id IS NOT NULL
      `;
      const [rows] = await pool.execute(query, systemIds);
      
      const constellationIds = rows.map(row => row.constellation_id);
      
      if (constellationIds.length === 0) {
        console.log('No constellation IDs found for the systems.');
        return;
      }
      
      console.log(`Found ${constellationIds.length} unique constellation IDs.`);
      
      // 检查这些星座ID是否在本地数据库中存在
      const missingConstellations = [];
      for (const constellationId of constellationIds) {
        const existing = await Constellation.findById(constellationId);
        if (!existing) {
          missingConstellations.push(constellationId);
        }
      }
      
      if (missingConstellations.length === 0) {
        console.log('All constellation information already exists in the database.');
        return;
      }
      
      console.log(`Need to fetch information for ${missingConstellations.length} constellations.`);
      
      // 从API获取缺失的星座信息并存储
      for (const constellationId of missingConstellations) {
        const constellationDetails = await eveApiService.getConstellationDetails(constellationId, datasource);
        
        if (constellationDetails) {
          // 处理数据格式以便存储
          const constellationData = {
            constellation_id: constellationDetails.constellation_id,
            name: constellationDetails.name,
            position: constellationDetails.position,
            region_id: constellationDetails.region_id
          };
          
          await Constellation.insertOrUpdate(constellationData);
          console.log(`Synced constellation: ${constellationDetails.name} (ID: ${constellationId})`);
        }
        
        // 添加小延迟，避免API请求过于频繁
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log(`Successfully synced ${missingConstellations.length} constellations.`);
      
    } catch (error) {
      console.error('Error checking and syncing constellation info:', error.message);
      console.error('Error stack:', error.stack);
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