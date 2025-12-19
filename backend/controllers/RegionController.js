const Region = require('../models/Region');
const RegionType = require('../models/RegionType');
const eveApiService = require('../services/eveApiService');
const pool = require('../config/database');

class RegionController {
  // 同步Region IDs
  static async syncRegionIds(req, res) {
    // 直接返回成功给前端
    res.status(202).json({
      message: 'Region IDs同步任务已开始，将在后台执行',
      status: 'started'
    });

    // 在后台异步执行Region IDs同步
    (async () => {
      try {
        console.log('Starting region IDs synchronization in background...');
        
        let totalRegionIds = 0;
        let insertedIds = 0;
        
        await eveApiService.getAllRegionsRecursively(1, async (regionIds, page) => {
          console.log(`Fetched ${regionIds.length} region IDs from page ${page}`);
          totalRegionIds += regionIds.length;
          
          // 只插入ID，其他字段可以为空
          for (const regionId of regionIds) {
            try {
              await Region.insertOrUpdate({ id: regionId });
              insertedIds++;
            } catch (dbError) {
              console.error(`Error inserting region ID ${regionId} to database:`, dbError.message);
            }
          }
          
          console.log(`Progress: ${insertedIds}/${totalRegionIds} region IDs inserted`);
        }, true); // 第三个参数true表示只返回ID
        
        console.log(`${insertedIds} region IDs inserted into database`);
        console.log('Region IDs synchronization completed successfully.');
      } catch (error) {
        console.error('Error in background syncing region IDs:', error.message);
        console.error('Error stack:', error.stack);
      }
    })();
  }

  // 同步Region详情
  static async syncRegionDetails(req, res) {
    // 直接返回成功给前端
    res.status(202).json({
      message: 'Region详情同步任务已开始，将在后台执行',
      status: 'started'
    });

    // 在后台异步执行Region详情同步
    (async () => {
      try {
        console.log('Starting region details synchronization in background...');
        
        const pageSize = 50; // 每次查询的数量
        let currentPage = 1;
        let hasMore = true;
        let updatedRegions = 0;
        
        while (hasMore) {
          try {
            // 分页查询数据库中的区域ID，只查询name为空的记录
            const regions = await Region.findAllWithEmptyName(currentPage, pageSize);
            
            if (regions.length === 0) {
              hasMore = false;
              break;
            }
            
            console.log(`Processing page ${currentPage} with ${regions.length} region IDs (name is empty)`);
            
            // 对每个ID请求详细信息
            for (const region of regions) {
              const regionId = region.id;
              
              try {
                // 请求区域详情
                const regionDetails = await eveApiService.getRegionDetails(regionId);
                
                if (regionDetails !== null) {
                  // 使用详情更新数据库
                  await Region.insertOrUpdate({
                    id: regionDetails.region_id,
                    name: regionDetails.name || '',
                    description: regionDetails.description || '',
                    constellations: regionDetails.constellations || []
                  });
                  
                  updatedRegions++;
                  
                  // 每处理10个区域打印一次进度
                  if (updatedRegions % 10 === 0) {
                    console.log(`Progress: ${updatedRegions} regions updated with details`);
                  }
                }
                
                // 设置同步间隔为200ms
                await new Promise(resolve => setTimeout(resolve, 200));
              } catch (apiError) {
                console.error(`Error fetching details for region ID ${regionId}:`, apiError.message);
              }
            }
            
            currentPage++;
          } catch (dbError) {
            console.error(`Error querying regions from database on page ${currentPage}:`, dbError.message);
            hasMore = false;
          }
        }
        
        console.log(`${updatedRegions} regions updated with details`);
        console.log('Region details synchronization completed successfully.');
      } catch (error) {
        console.error('Error in background syncing region details:', error.message);
        console.error('Error stack:', error.stack);
      }
    })();
  }

  // 同步单个Region Types
  static async syncRegionTypes(req, res) {
    try {
      const { regionId } = req.params;
      
      // 验证regionId参数
      if (!regionId) {
        return res.status(400).json({
          message: '缺少regionId参数',
          status: 'error'
        });
      }
      
      // 直接返回成功给前端
      res.status(202).json({
        message: `Region ${regionId}类型同步任务已开始，将在后台执行`,
        status: 'started'
      });

      // 在后台异步执行Region Types同步
      await RegionController.syncRegionTypesInBackground(regionId);
    } catch (error) {
      console.error('Error starting region types synchronization:', error.message);
      res.status(500).json({
        message: '启动Region类型同步任务失败',
        status: 'error'
      });
    }
  }
  
  // 同步所有Region Types
  static async syncAllRegionTypes(req, res) {
    try {
      // 直接返回成功给前端
      res.status(202).json({
        message: '所有Region类型同步任务已开始，将在后台执行',
        status: 'started'
      });

      // 在后台异步执行所有Region Types同步
      (async () => {
        try {
          console.log('Starting all region types synchronization in background...');
          
          // 获取所有region的列表（分页获取）
          let page = 1;
          const pageSize = 100;
          let hasMoreRegions = true;
          let totalRegions = 0;
          let processedRegions = 0;
          
          // 先获取总数
          const regionsCount = await Region.count();
          totalRegions = regionsCount;
          console.log(`Total regions to process: ${totalRegions}`);
          
          while (hasMoreRegions) {
            // 获取当前页的region列表
            const regions = await Region.findAll(page, pageSize);
            
            if (regions.length === 0) {
              hasMoreRegions = false;
              break;
            }
            
            // 遍历每个region并同步types
            for (const region of regions) {
              const regionId = region.id;
              console.log(`Processing region ${regionId} (${processedRegions + 1}/${totalRegions})...`);
              
              try {
                await RegionController.syncRegionTypesInBackground(regionId);
                processedRegions++;
                console.log(`Processed region ${regionId} (${processedRegions}/${totalRegions})`);
              } catch (error) {
                console.error(`Error syncing region ${regionId} types:`, error.message);
              }
              
              // 每处理一个region后稍作延迟，避免API请求过于频繁
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            page++;
          }
          
          console.log(`All region types synchronization completed. Processed ${processedRegions}/${totalRegions} regions.`);
        } catch (error) {
          console.error('Error in background syncing all region types:', error.message);
          console.error('Error stack:', error.stack);
        }
      })();
    } catch (error) {
      console.error('Error starting all region types synchronization:', error.message);
      res.status(500).json({
        message: '启动所有Region类型同步任务失败',
        status: 'error'
      });
    }
  }
  
  // 内部方法：在后台同步单个Region的Types
  static async syncRegionTypesInBackground(regionId) {
    try {
      console.log(`Starting region types synchronization for region ${regionId} in background...`);
      
      let totalTypeIds = 0;
      let insertedIds = 0;
      
      // 先清除该区域的所有现有类型
      console.log(`Clearing existing types for region ${regionId}...`);
      await RegionType.deleteByRegionId(regionId);
      
      await eveApiService.getAllMarketRegionTypesRecursively(regionId, 1, async (typeIds, page) => {
        console.log(`Fetched ${typeIds.length} type IDs for region ${regionId} from page ${page}`);
        totalTypeIds += typeIds.length;
        
        try {
          await RegionType.insertOrUpdate(regionId, typeIds);
          insertedIds += typeIds.length;
          console.log(`Progress for region ${regionId}: ${insertedIds}/${totalTypeIds} type IDs inserted`);
        } catch (dbError) {
          console.error(`Error inserting type IDs to database for region ${regionId}:`, dbError.message);
        }
      });
      
      console.log(`${insertedIds} type IDs inserted into database for region ${regionId}`);
      console.log(`Region ${regionId} types synchronization completed successfully.`);
    } catch (error) {
      console.error(`Error in background syncing region ${regionId} types:`, error.message);
      console.error('Error stack:', error.stack);
    }
  }

  static async getRegions(req, res) {
    try {
      const { page = 1, limit = 10, search = '' } = req.query;
      const regions = await Region.findAll(parseInt(page), parseInt(limit), search);
      const total = await Region.count(search);

      res.status(200).json({
        regions,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error getting regions:', error);
      res.status(500).json({ message: 'Failed to get regions', error: error.message });
    }
  }

  static async getRegionById(req, res) {
    try {
      const { id } = req.params;
      const region = await Region.findById(id);

      if (!region) {
        return res.status(404).json({ message: 'Region not found' });
      }

      res.status(200).json(region);
    } catch (error) {
      console.error(`Error getting region with ID ${req.params.id}:`, error);
      res.status(500).json({ message: 'Failed to get region', error: error.message });
    }
  }

  static async createRegion(req, res) {
    try {
      const regionData = req.body;
      await Region.insertOrUpdate(regionData);
      res.status(201).json({ message: 'Region created successfully', region: regionData });
    } catch (error) {
      console.error('Error creating region:', error);
      res.status(500).json({ message: 'Failed to create region', error: error.message });
    }
  }

  static async updateRegion(req, res) {
    try {
      const { id } = req.params;
      const regionData = { ...req.body, id };
      await Region.insertOrUpdate(regionData);
      res.status(200).json({ message: 'Region updated successfully', region: regionData });
    } catch (error) {
      console.error(`Error updating region with ID ${id}:`, error);
      res.status(500).json({ message: 'Failed to update region', error: error.message });
    }
  }

  static async deleteRegion(req, res) {
    try {
      const { id } = req.params;
      const query = 'DELETE FROM regions WHERE id = ?';
      await pool.execute(query, [id]);
      res.status(200).json({ message: 'Region deleted successfully' });
    } catch (error) {
      console.error(`Error deleting region with ID ${id}:`, error);
      res.status(500).json({ message: 'Failed to delete region', error: error.message });
    }
  }
}

module.exports = RegionController;