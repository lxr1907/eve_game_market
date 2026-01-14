const Stargate = require('./models/Stargate');
const eveApiService = require('./services/eveApiService');

// 测试单个星门同步的脚本
async function testStargateSync() {
  const stargateId = 50016518;
  const systemId = 30000157;
  const datasource = 'infinity';
  
  try {
    console.log(`Testing sync for stargate ${stargateId} in system ${systemId}`);
    
    // 检查是否需要同步
    const needsSync = await Stargate.needSync(stargateId, systemId);
    console.log(`Does stargate need sync? ${needsSync}`);
    
    // 如果需要同步，手动执行同步
    if (needsSync) {
      // 获取stargate详情
      const stargateDetails = await eveApiService.getStargateDetails(stargateId, datasource);
      
      if (stargateDetails) {
        // 处理destination字段，将其展开到外层
        const processedData = {
          stargate_id: stargateDetails.stargate_id,
          name: stargateDetails.name,
          position: stargateDetails.position,
          system_id: systemId,
          type_id: stargateDetails.type_id,
          destination_stargate_id: stargateDetails.destination?.stargate_id,
          destination_system_id: stargateDetails.destination?.system_id
        };
        
        console.log('Processed data:', JSON.stringify(processedData, null, 2));
        
        // 插入或更新到数据库
        await Stargate.insertOrUpdate(processedData);
        console.log(`✓ Stargate ${stargateId} (${processedData.name}) synced successfully.`);
        
        // 再次检查数据库中的数据
        const updatedStargate = await Stargate.findById(stargateId);
        console.log('Updated stargate in database:', JSON.stringify(updatedStargate, null, 2));
      }
    }
  } catch (error) {
    console.error('Error testing stargate sync:', error);
  }
}

testStargateSync();
