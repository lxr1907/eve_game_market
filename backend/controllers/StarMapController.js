const Stargate = require('../models/Stargate');
const System = require('../models/System');
const SystemKill = require('../models/SystemKill');
const pool = require('../config/database');

// 获取星图数据
async function getStarMapData(req, res) {
  try {
    const { datasource = 'infinity', filter = 'active', securityFilter = 'all' } = req.query;
    
    // 获取所有星门数据，包含源系统和目标系统
    const stargates = await Stargate.getStarMapConnections(datasource);
    
    // 如果没有星门数据，返回空的节点和连接
    if (stargates.length === 0) {
      return res.json({
        nodes: [],
        links: []
      });
    }
    
    // 构建系统ID集合
    const systemIds = new Set();
    stargates.forEach(stargate => {
      systemIds.add(stargate.system_id);
      if (stargate.destination_system_id) {
        systemIds.add(stargate.destination_system_id);
      }
    });
    
    // 最终要使用的系统ID集合
    let finalSystemIds = new Set(systemIds);
    let activeSystemIds = null;
    
    // 当filter为'active'时，只返回在system_kills表中存在的系统
    if (filter === 'active') {
      // 获取所有在system_kills表中存在的系统ID
      const activeSystemIdsArray = await SystemKill.getActiveSystemIds(datasource);
      
      // 确保activeSystemIdsArray是数字类型的数组
      activeSystemIds = new Set(activeSystemIdsArray.map(id => parseInt(id, 10)));
      
      // 创建一个新的Set来存储过滤后的系统ID
      finalSystemIds = new Set();
      for (const systemId of systemIds) {
        // 确保比较时类型一致
        const numSystemId = parseInt(systemId, 10);
        if (activeSystemIds.has(numSystemId)) {
          finalSystemIds.add(systemId);
        }
      }
    }
    
    // 如果过滤后没有系统，返回空的节点和连接
    if (finalSystemIds.size === 0) {
      return res.json({
        nodes: [],
        links: []
      });
    }
    
    // 获取所有相关系统的名称和安全状态
    let systems = [];
    let systemInfoMap = new Map();
    
    if (securityFilter === 'highsec9') {
      // 当过滤安全状态≥0.9时，直接从数据库获取所有符合条件的系统
      // 这样可以确保即使没有星门连接的系统也能被找到
      console.log('Querying systems with security >= 0.9 for datasource:', datasource);
      const [rows] = await pool.execute(
        'SELECT system_id, name, security_status FROM systems WHERE security_status >= 0.9 AND datasource = ?',
        [datasource]
      );
      systems = rows;
      console.log('Systems with security >= 0.9 found:', systems.length);
      console.log('Sample high security systems:', systems.slice(0, 5));
      
      // 构建系统信息映射，使用字符串类型的键，与finalSystemIds保持一致
      systemInfoMap = new Map(systems.map(system => [
        system.system_id.toString(), 
        { name: system.name, security_status: system.security_status }
      ]));
      console.log('System info map size:', systemInfoMap.size);
      console.log('Sample system info map entries:', Array.from(systemInfoMap.entries()).slice(0, 5));
      
      // 更新finalSystemIds为这些高安全系统
      finalSystemIds = new Set(systems.map(system => system.system_id.toString()));
      console.log('Final system IDs size:', finalSystemIds.size);
      console.log('Sample final system IDs:', Array.from(finalSystemIds).slice(0, 5));
    } else {
      // 正常流程：从finalSystemIds获取系统信息
      const finalSystemIdsArray = Array.from(finalSystemIds);
      const numericSystemIds = finalSystemIdsArray.map(id => parseInt(id, 10));
      
      systems = await System.getSystemsByIds(numericSystemIds, datasource);
      
      // 构建系统信息映射，使用字符串类型的键，与finalSystemIds保持一致
      systemInfoMap = new Map(systems.map(system => [
        system.system_id.toString(), 
        { name: system.name, security_status: system.security_status }
      ]));
    }
    
    const systemNames = new Map(systems.map(system => [system.system_id, system.name]));
    
    // 根据安全状态过滤系统
    let securityFilteredSystemIds = new Set(finalSystemIds);
    if (securityFilter !== 'all') {
      securityFilteredSystemIds = new Set();
      for (const systemId of finalSystemIds) {
        // 直接使用字符串类型的systemId作为键，与systemInfoMap保持一致
        const systemInfo = systemInfoMap.get(systemId);
        const securityStatus = systemInfo ? systemInfo.security_status : 0;
        
        let shouldInclude = false;
        if (securityFilter === 'highsec' && securityStatus >= 0.5) {
          shouldInclude = true;
        } else if (securityFilter === 'highsec9' && securityStatus >= 0.9) {
          shouldInclude = true;
        } else if (securityFilter === 'lowsec' && securityStatus > 0 && securityStatus < 0.5) {
          shouldInclude = true;
        } else if (securityFilter === 'nullsec' && securityStatus <= 0) {
          shouldInclude = true;
        }
        
        if (shouldInclude) {
          securityFilteredSystemIds.add(systemId);
        }
      }
    }
    
    // 如果安全状态过滤后没有系统，返回空的节点和连接
    if (securityFilteredSystemIds.size === 0) {
      return res.json({
        nodes: [],
        links: []
      });
    }
    
    // 构建节点数据
    const nodes = Array.from(securityFilteredSystemIds).map(systemId => {
      // 直接使用字符串类型的systemId作为键，与systemInfoMap保持一致
      const systemInfo = systemInfoMap.get(systemId) || {};
      return {
        id: systemId,
        name: systemInfo.name || systemId,
        system_id: systemId,
        security_status: systemInfo.security_status || 0
      };
    });
    
    // 过滤连接，只保留两个系统都在过滤后的系统集合中的连接
    const filteredStargates = stargates
      .filter(stargate => stargate.destination_system_id) // 只包含有目标系统的连接
      .filter(stargate => {
        // 检查源系统和目标系统是否都在过滤后的系统集合中
        return securityFilteredSystemIds.has(stargate.system_id) && 
               securityFilteredSystemIds.has(stargate.destination_system_id);
      });
    
    const links = filteredStargates.map(stargate => ({
      source: stargate.system_id,
      target: stargate.destination_system_id
    }));
    
    res.json({
      nodes,
      links
    });
  } catch (error) {
    console.error('Error getting star map data:', error);
    res.status(500).json({ message: 'Failed to get star map data', error: error.message });
  }
}

module.exports = {
  getStarMapData
};