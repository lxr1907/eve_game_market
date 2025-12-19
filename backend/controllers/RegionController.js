const Region = require('../models/Region');
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