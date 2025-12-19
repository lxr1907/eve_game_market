const Type = require('../models/Type');
const eveApiService = require('../services/eveApiService');
const pool = require('../config/database');

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
        let totalSynced = 0;
        
        // 获取所有类型数据（分页）
        await eveApiService.getAllTypesRecursively(1, async (types, page) => {
          console.log(`Processing ${types.length} types from page ${page}`);
          
          let pageSynced = 0;
          for (const type of types) {
            if (type !== null) { // 只有当type不为null时才插入或更新
              await Type.insertOrUpdate({
                id: type.type_id,
                name: type.name?.zh || type.name?.en || 'Unknown',
                description: type.description?.zh || type.description?.en || '',
                group_id: type.group_id,
                category_id: type.category_id,
                mass: type.mass,
                volume: type.volume,
                capacity: type.capacity,
                portion_size: type.portion_size,
                published: type.published
              });
              pageSynced++;
            }
          }
          
          totalSynced += pageSynced;
          console.log(`Synced ${pageSynced} out of ${types.length} types from page ${page}. Total: ${totalSynced}`);
        });
        
        console.log(`Data sync completed successfully. Total types synced: ${totalSynced}`);
      } catch (error) {
        console.error('Error in background syncing:', error);
      }
    })();
  }

  static async getTypes(req, res) {
    try {
      const { search = '' } = req.query;
      // 不传递分页参数，一次拉取所有数据
      const types = await Type.findAll(1, null, search);

      res.status(200).json({
        types
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
}

module.exports = TypeController;