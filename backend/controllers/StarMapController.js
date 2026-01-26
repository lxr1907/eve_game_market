const Stargate = require('../models/Stargate');
const System = require('../models/System');
const SystemKill = require('../models/SystemKill');

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
    const systems = await System.getSystemsByIds(Array.from(finalSystemIds), datasource);
    const systemNames = new Map(systems.map(system => [system.system_id, system.name]));
    
    // 构建系统信息映射，包含name和security_status
    const systemInfoMap = new Map(systems.map(system => [
      system.system_id, 
      { name: system.name, security_status: system.security_status }
    ]));
    
    // 根据安全状态过滤系统
    let securityFilteredSystemIds = new Set(finalSystemIds);
    if (securityFilter !== 'all') {
      securityFilteredSystemIds = new Set();
      for (const systemId of finalSystemIds) {
        const systemInfo = systemInfoMap.get(systemId);
        const securityStatus = systemInfo ? systemInfo.security_status : 0;
        
        let shouldInclude = false;
        if (securityFilter === 'highsec' && securityStatus >= 0.5) {
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