const Stargate = require('../models/Stargate');
const System = require('../models/System');

// 获取星图数据
async function getStarMapData(req, res) {
  try {
    const { datasource = 'infinity' } = req.query;
    
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
    
    // 获取所有相关系统的名称
    const systems = await System.getSystemsByIds(Array.from(systemIds), datasource);
    const systemNames = new Map(systems.map(system => [system.system_id, system.name]));
    
    // 构建系统信息映射，包含name和security_status
    const systemInfoMap = new Map(systems.map(system => [
      system.system_id, 
      { name: system.name, security_status: system.security_status }
    ]));
    
    // 构建节点和连接数据
    const nodes = Array.from(systemIds).map(systemId => {
      const systemInfo = systemInfoMap.get(systemId) || {};
      return {
        id: systemId,
        name: systemInfo.name || systemId,
        system_id: systemId,
        security_status: systemInfo.security_status || 0
      };
    });
    
    const links = stargates
      .filter(stargate => stargate.destination_system_id) // 只包含有目标系统的连接
      .map(stargate => ({
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