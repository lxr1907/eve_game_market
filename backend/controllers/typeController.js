const Type = require('../models/Type');
const Group = require('../models/Group');
const eveApiService = require('../services/eveApiService');
const pool = require('../config/database');

// 任务状态跟踪
let syncTaskStatus = {
  running: false,
  progress: 0,
  page: 1,
  totalPages: 0,
  processedTypes: 0,
  totalTypes: 0,
  lastUpdated: new Date().toISOString()
};

class TypeController {
  // 同步Type IDs
  static async syncTypeIds(req, res) {
    // 直接返回成功给前端
    res.status(202).json({
      message: 'Type IDs同步任务已开始，将在后台执行',
      status: 'started'
    });

    // 在后台异步执行Type IDs同步
    (async () => {
      try {
        console.log('Starting type IDs synchronization in background...');
        
        let totalTypeIds = 0;
        let insertedIds = 0;
        
        await eveApiService.getAllTypesRecursively(1, async (typeIds, page) => {
          console.log(`Fetched ${typeIds.length} type IDs from page ${page}`);
          totalTypeIds += typeIds.length;
          
          // 只插入ID，其他字段可以为空
          for (const typeId of typeIds) {
            try {
              await Type.insertOrUpdate({ id: typeId });
              insertedIds++;
            } catch (dbError) {
              console.error(`Error inserting type ID ${typeId} to database:`, dbError.message);
            }
          }
          
          console.log(`Progress: ${insertedIds}/${totalTypeIds} type IDs inserted`);
        }, true); // 第三个参数true表示只返回ID
        
        console.log(`${insertedIds} type IDs inserted into database`);
        console.log('Type IDs synchronization completed successfully.');
      } catch (error) {
        console.error('Error in background syncing type IDs:', error.message);
        console.error('Error stack:', error.stack);
      }
    })();
  }

  // 同步Type详情
  static async syncTypeDetails(req, res) {
    // 直接返回成功给前端
    res.status(202).json({
      message: 'Type详情同步任务已开始，将在后台执行',
      status: 'started'
    });

    // 在后台异步执行Type详情同步
    (async () => {
      try {
        console.log('Starting type details synchronization in background...');
        
        const batchSize = 100; // 每批处理的数量
        const pageSize = 100; // 分页查询的数量（修复：添加pageSize变量定义）
        let updatedTypes = 0;
        
        // 首先同步loyalty_offers表中存在的、且name为空的type记录
        console.log('First synchronizing type details that exist in loyalty_offers table...');
        
        try {
          // 一次性获取所有需要同步的loyalty offer类型ID列表
          const loyaltyTypeIds = await Type.findAllIdsWithEmptyNameFromLoyaltyOffers();
          const totalLoyaltyTypes = loyaltyTypeIds.length;
          
          console.log(`Total loyalty type IDs to process: ${totalLoyaltyTypes}`);
          
          if (totalLoyaltyTypes > 0) {
            // 使用批量API请求获取类型详情
            const loyaltyTypeDetails = await eveApiService.getTypeDetailsBatch(loyaltyTypeIds);
            
            // 处理group信息：收集所有唯一的group_id并同步
            const uniqueGroupIds = [...new Set(loyaltyTypeDetails.map(details => details.group_id))];
            for (const groupId of uniqueGroupIds) {
              if (groupId) {
                // 检查group是否已存在于数据库
                const existingGroup = await Group.findById(groupId);
                if (!existingGroup) {
                  // 从API获取group详情并保存到数据库
                  const groupDetails = await eveApiService.getGroupDetails(groupId);
                  if (groupDetails) {
                    await Group.insertOrUpdate({
                      group_id: groupDetails.group_id,
                      category_id: groupDetails.category_id,
                      name: groupDetails.name || '',
                      published: groupDetails.published
                    });
                  }
                }
              }
            }
            
            // 将获取到的类型详情转换为数据库更新格式
            const loyaltyTypeUpdateData = loyaltyTypeDetails.map(details => ({
              id: details.type_id,
              name: details.name || '',
              description: details.description || '',
              group_id: details.group_id,
              category_id: details.category_id,
              mass: details.mass,
              volume: details.volume,
              capacity: details.capacity,
              portion_size: details.portion_size,
              published: details.published
            }));
            
            // 批量更新数据库
            if (loyaltyTypeUpdateData.length > 0) {
              await Type.bulkInsertOrUpdate(loyaltyTypeUpdateData);
              updatedTypes += loyaltyTypeUpdateData.length;
            }
          }
        } catch (dbError) {
          console.error('Error querying loyalty type IDs from database:', dbError.message);
        }
        
        console.log(`Loyalty type details synchronization completed. ${updatedTypes} types updated.`);
        
        // 然后同步其他name为空的type记录
        console.log('Now synchronizing remaining type details with empty names...');
        
        let hasMore = true;
        let currentPage = 1;
        
        while (hasMore) {
          try {
            // 分页查询数据库中的类型ID，只查询name为空的记录
            const types = await Type.findAllWithEmptyName(currentPage, pageSize);
            
            if (types.length === 0) {
              hasMore = false;
              break;
            }
            
            console.log(`Processing page ${currentPage} with ${types.length} type IDs (name is empty)`);
            
            // 提取类型ID列表
            const typeIds = types.map(type => type.id);
            
            // 使用批量API请求获取类型详情
            const typeDetailsList = await eveApiService.getTypeDetailsBatch(typeIds);
            
            // 处理group信息：收集所有唯一的group_id并同步
            const uniqueGroupIds = [...new Set(typeDetailsList.map(details => details.group_id))];
            for (const groupId of uniqueGroupIds) {
              if (groupId) {
                // 检查group是否已存在于数据库
                const existingGroup = await Group.findById(groupId);
                if (!existingGroup) {
                  // 从API获取group详情并保存到数据库
                  const groupDetails = await eveApiService.getGroupDetails(groupId);
                  if (groupDetails) {
                    await Group.insertOrUpdate({
                      group_id: groupDetails.group_id,
                      category_id: groupDetails.category_id,
                      name: groupDetails.name || '',
                      published: groupDetails.published
                    });
                  }
                }
              }
            }
            
            // 将获取到的类型详情转换为数据库更新格式
            const typeUpdateData = typeDetailsList.map(details => ({
              id: details.type_id,
              name: details.name || '',
              description: details.description || '',
              group_id: details.group_id,
              category_id: details.category_id,
              mass: details.mass,
              volume: details.volume,
              capacity: details.capacity,
              portion_size: details.portion_size,
              published: details.published
            }));
            
            // 批量更新数据库
            if (typeUpdateData.length > 0) {
              await Type.bulkInsertOrUpdate(typeUpdateData);
              updatedTypes += typeUpdateData.length;
            }
            
            // 每处理100个类型打印一次进度
            if (updatedTypes % 100 === 0) {
              console.log(`Progress: ${updatedTypes} types updated with details`);
            }
            
            currentPage++;
          } catch (dbError) {
            console.error(`Error querying types from database on page ${currentPage}:`, dbError.message);
            hasMore = false;
          }
        }
        
        console.log(`${updatedTypes} types updated with details in total`);
        console.log('Type details synchronization completed successfully.');
      } catch (error) {
        console.error('Error in background syncing type details:', error.message);
        console.error('Error stack:', error.stack);
      }
    })();
  }

  static async getTypes(req, res) {
    try {
      const { page = 1, limit = 10, search = '' } = req.query;
      const types = await Type.findAll(parseInt(page), parseInt(limit), search);
      const total = await Type.count(search);

      res.status(200).json({
        types,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error getting types:', error);
      res.status(500).json({ message: 'Failed to get types', error: error.message });
    }
  }

  static async getTypeById(req, res) {
    try {
      const { id } = req.params;
      const type = await Type.findById(id);

      if (!type) {
        return res.status(404).json({ message: 'Type not found' });
      }

      res.status(200).json(type);
    } catch (error) {
      console.error(`Error getting type with ID ${req.params.id}:`, error);
      res.status(500).json({ message: 'Failed to get type', error: error.message });
    }
  }

  static async createType(req, res) {
    try {
      const typeData = req.body;
      await Type.insertOrUpdate(typeData);
      res.status(201).json({ message: 'Type created successfully', type: typeData });
    } catch (error) {
      console.error('Error creating type:', error);
      res.status(500).json({ message: 'Failed to create type', error: error.message });
    }
  }

  static async updateType(req, res) {
    try {
      const { id } = req.params;
      const typeData = { ...req.body, id };
      await Type.insertOrUpdate(typeData);
      res.status(200).json({ message: 'Type updated successfully', type: typeData });
    } catch (error) {
      console.error(`Error updating type with ID ${id}:`, error);
      res.status(500).json({ message: 'Failed to update type', error: error.message });
    }
  }

  static async deleteType(req, res) {
    try {
      const { id } = req.params;
      const query = 'DELETE FROM types WHERE id = ?';
      await pool.execute(query, [id]);
      res.status(200).json({ message: 'Type deleted successfully' });
    } catch (error) {
      console.error(`Error deleting type with ID ${id}:`, error);
      res.status(500).json({ message: 'Failed to delete type', error: error.message });
    }
  }

  static async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      // Validate status value
      if (!['pending', 'in_progress', 'completed'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status value' });
      }
      
      const result = await Type.update(id, { status });
      
      if (!result.success) {
        return res.status(404).json({ message: 'Type not found' });
      }
      
      res.status(200).json({ message: 'Type updated successfully', status });
    } catch (error) {
      console.error(`Error updating type status for ID ${req.params.id}:`, error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // 获取name不为null的数据总数
  static async getCountWithNameNotNull(req, res) {
    try {
      const count = await Type.countWithNameNotNull();
      res.status(200).json({ count });
    } catch (error) {
      console.error('Error getting count of types with name not null:', error);
      res.status(500).json({ message: 'Failed to get count', error: error.message });
    }
  }
}

module.exports = TypeController;