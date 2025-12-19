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
        
        // 获取所有类型数据（分页）
        await eveApiService.getAllTypesRecursively(1, async (types, page) => {
          console.log(`Processing ${types.length} types from page ${page}`);
          
          let processedCount = 0;
          let errorCount = 0;
          
          for (const type of types) {
              if (type !== null) { // 只有当type不为null时才插入或更新
                console.log(`Processing type ID: ${type.type_id}, Name: ${type.name}`);
                try {
                  const result = await Type.insertOrUpdate({
                    id: type.type_id,
                    name: type.name || 'Unknown',
                    description: type.description || '',
                    group_id: type.group_id,
                    category_id: type.category_id,
                    mass: type.mass,
                    volume: type.volume,
                    capacity: type.capacity,
                    portion_size: type.portion_size,
                    published: type.published
                  });
                  processedCount++;
                  console.log(`Saved type ID ${type.type_id} to database, result: ${result}`);
                } catch (dbError) {
                  console.error(`Error saving type ID ${type.type_id} to database:`, dbError.message);
                  console.error('Database error stack:', dbError.stack);
                  errorCount++;
                }
              } else {
                console.log('Skipping null type data');
                errorCount++;
              }
            }
          
          console.log(`Processed ${types.length} types from page ${page}: ${processedCount} saved, ${errorCount} errors`);
        });
        
        console.log('Data synchronization completed.');
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