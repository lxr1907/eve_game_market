const System = require('../models/System');
const eveApiService = require('../services/eveApiService');
const pool = require('../config/database');

class SystemController {
  // 同步System IDs
  static async syncSystemIds(req, res) {
    // 直接返回成功给前端
    res.status(202).json({
      message: 'System IDs同步任务已开始，将在后台执行',
      status: 'started'
    });

    // 在后台异步执行System IDs同步
    (async () => {
      try {
        console.log('Starting system IDs synchronization in background...');
        
        let currentPage = 1;
        let hasMoreData = true;
        let totalInsertedIds = 0;
        
        while (hasMoreData) {
          const systemIds = await eveApiService.getSystemIds(currentPage);
          console.log(`Fetched ${systemIds.length} system IDs from API page ${currentPage}`);
          
          if (systemIds.length === 0) {
            hasMoreData = false;
            break;
          }
          
          let insertedIds = 0;
          
          // 只插入ID，其他字段可以为空
          for (const systemId of systemIds) {
            try {
              await System.insertOrUpdate({ system_id: systemId });
              insertedIds++;
            } catch (dbError) {
              console.error(`Error inserting system ID ${systemId} to database:`, dbError.message);
            }
          }
          
          totalInsertedIds += insertedIds;
          console.log(`${insertedIds} system IDs inserted into database from page ${currentPage}`);
          currentPage++;
          
          // 添加小延迟，避免API请求过于频繁
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log(`${totalInsertedIds} system IDs inserted into database`);
        console.log('System IDs synchronization completed successfully.');
      } catch (error) {
        console.error('Error in background syncing system IDs:', error.message);
        console.error('Error stack:', error.stack);
      }
    })();
  }

  // 同步System详情
  static async syncSystemDetails(req, res) {
    // 直接返回成功给前端
    res.status(202).json({
      message: 'System详情同步任务已开始，将在后台执行',
      status: 'started'
    });

    // 在后台异步执行System详情同步
    (async () => {
      try {
        console.log('Starting system details synchronization in background...');
        
        const pageSize = 50; // 每次查询的数量
        let currentPage = 1;
        let hasMore = true;
        let updatedSystems = 0;
        
        while (hasMore) {
          try {
            // 分页查询数据库中的系统ID，只查询name为空的记录
            const systems = await System.findAll(currentPage, pageSize, '', true);
            
            if (systems.length === 0) {
              hasMore = false;
              break;
            }
            
            console.log(`Processing page ${currentPage} with ${systems.length} system IDs`);
            
            // 对每个ID请求详细信息
            for (const system of systems) {
              const systemId = system.system_id;
              
              try {
                // 请求系统详情
                const systemDetails = await eveApiService.getSystemDetails(systemId);
                
                if (systemDetails !== null) {
                  // 使用详情更新数据库
                  await System.insertOrUpdate({
                    system_id: systemDetails.system_id,
                    constellation_id: systemDetails.constellation_id,
                    name: systemDetails.name || '',
                    position: systemDetails.position,
                    security_status: systemDetails.security_status
                  });
                  
                  updatedSystems++;
                  
                  // 每处理10个系统打印一次进度
                  if (updatedSystems % 10 === 0) {
                    console.log(`Progress: ${updatedSystems} systems updated with details`);
                  }
                }
                
                // 设置同步间隔为1000ms
                await new Promise(resolve => setTimeout(resolve, 1000));
              } catch (apiError) {
                console.error(`Error fetching details for system ID ${systemId}:`, apiError.message);
              }
            }
            
            currentPage++;
          } catch (dbError) {
            console.error(`Error querying systems from database on page ${currentPage}:`, dbError.message);
            hasMore = false;
          }
        }
        
        console.log(`${updatedSystems} systems updated with details`);
        console.log('System details synchronization completed successfully.');
      } catch (error) {
        console.error('Error in background syncing system details:', error.message);
        console.error('Error stack:', error.stack);
      }
    })();
  }

  // 同步所有System数据（完整数据，包括ID和详情）
  static async syncAllSystems(req, res) {
    // 直接返回成功给前端
    res.status(202).json({
      message: '所有System数据同步任务已开始，将在后台执行',
      status: 'started'
    });

    // 在后台异步执行所有System数据同步
    (async () => {
      try {
        console.log('Starting all systems synchronization in background...');
        
        await eveApiService.getAllSystemsRecursively(1, async (systemDetails, page) => {
          console.log(`Fetched ${systemDetails.length} system details from API page ${page}`);
          
          let insertedSystems = 0;
          
          // 批量插入或更新系统详情
          for (const system of systemDetails) {
            try {
              await System.insertOrUpdate({
                system_id: system.system_id,
                constellation_id: system.constellation_id,
                name: system.name || '',
                position: system.position,
                security_status: system.security_status
              });
              insertedSystems++;
            } catch (dbError) {
              console.error(`Error inserting system ${system.system_id} to database:`, dbError.message);
            }
          }
          
          console.log(`${insertedSystems} systems inserted/updated from page ${page}`);
          
          // 添加小延迟，避免API请求过于频繁
          await new Promise(resolve => setTimeout(resolve, 500));
        }, false);
        
        console.log('All systems synchronization completed successfully.');
      } catch (error) {
        console.error('Error in background syncing all systems:', error.message);
        console.error('Error stack:', error.stack);
      }
    })();
  }

  static async getSystems(req, res) {
    try {
      const { page = 1, limit = 10, search = '' } = req.query;
      const systems = await System.findAll(parseInt(page), parseInt(limit), search);
      const total = await System.count(search);

      res.status(200).json({
        systems,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error getting systems:', error);
      res.status(500).json({ message: 'Failed to get systems', error: error.message });
    }
  }

  static async getSystemById(req, res) {
    try {
      const { id } = req.params;
      const system = await System.findById(id);

      if (!system) {
        return res.status(404).json({ message: 'System not found' });
      }

      res.status(200).json(system);
    } catch (error) {
      console.error(`Error getting system with ID ${req.params.id}:`, error);
      res.status(500).json({ message: 'Failed to get system', error: error.message });
    }
  }

  static async createSystem(req, res) {
    try {
      const systemData = req.body;
      await System.insertOrUpdate(systemData);
      res.status(201).json({ message: 'System created successfully', system: systemData });
    } catch (error) {
      console.error('Error creating system:', error);
      res.status(500).json({ message: 'Failed to create system', error: error.message });
    }
  }

  static async updateSystem(req, res) {
    try {
      const { id } = req.params;
      const systemData = { ...req.body, system_id: id };
      await System.insertOrUpdate(systemData);
      res.status(200).json({ message: 'System updated successfully', system: systemData });
    } catch (error) {
      console.error(`Error updating system with ID ${id}:`, error);
      res.status(500).json({ message: 'Failed to update system', error: error.message });
    }
  }

  static async deleteSystem(req, res) {
    try {
      const { id } = req.params;
      const query = 'DELETE FROM systems WHERE system_id = ?';
      await pool.execute(query, [id]);
      res.status(200).json({ message: 'System deleted successfully' });
    } catch (error) {
      console.error(`Error deleting system with ID ${id}:`, error);
      res.status(500).json({ message: 'Failed to delete system', error: error.message });
    }
  }
}

module.exports = SystemController;
