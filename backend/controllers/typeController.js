const Type = require('../models/Type');
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
  static async syncTypes(req, res) {
    // 直接返回成功给前端
    res.status(202).json({
      message: '数据同步任务已开始，将在后台执行',
      status: 'started'
    });

    // 在后台异步执行数据同步
    (async () => {
      try {
        console.log('Starting types synchronization in background...');
        
        // 第一步：先获取所有类型ID并插入数据库
        console.log('Step 1: Fetching all type IDs from EVE API...');
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
        
        console.log(`Step 1 completed: ${insertedIds} type IDs inserted into database`);
        
        // 第二步：分页查询数据库中的ID，请求详情并更新
        console.log('Step 2: Updating type details...');
        
        const pageSize = 100; // 每次查询的数量
        let currentPage = 1;
        let hasMore = true;
        let updatedTypes = 0;
        
        while (hasMore) {
          try {
            // 分页查询数据库中的类型ID
            const types = await Type.findAll(currentPage, pageSize, '');
            
            if (types.length === 0) {
              hasMore = false;
              break;
            }
            
            console.log(`Processing page ${currentPage} with ${types.length} type IDs`);
            
            // 对每个ID请求详细信息
            for (const type of types) {
              const typeId = type.id;
              
              try {
                // 请求类型详情
                const typeDetails = await eveApiService.getTypeDetails(typeId);
                
                if (typeDetails !== null) {
                  // 使用详情更新数据库
                  await Type.insertOrUpdate({
                    id: typeDetails.type_id,
                    name: typeDetails.name || '',
                    description: typeDetails.description || '',
                    group_id: typeDetails.group_id,
                    category_id: typeDetails.category_id,
                    mass: typeDetails.mass,
                    volume: typeDetails.volume,
                    capacity: typeDetails.capacity,
                    portion_size: typeDetails.portion_size,
                    published: typeDetails.published
                  });
                  
                  updatedTypes++;
                  
                  // 每处理100个类型打印一次进度
                  if (updatedTypes % 100 === 0) {
                    console.log(`Progress: ${updatedTypes} types updated with details`);
                  }
                }
              } catch (apiError) {
                console.error(`Error fetching details for type ID ${typeId}:`, apiError.message);
              }
            }
            
            currentPage++;
          } catch (dbError) {
            console.error(`Error querying types from database on page ${currentPage}:`, dbError.message);
            hasMore = false;
          }
        }
        
        console.log(`Step 2 completed: ${updatedTypes} types updated with details`);
        console.log('Data synchronization completed successfully.');
      } catch (error) {
        console.error('Error in background syncing:', error.message);
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
}

module.exports = TypeController;