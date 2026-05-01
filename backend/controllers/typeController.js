const Type = require('../models/Type');
const Group = require('../models/Group');
const Category = require('../models/Category');
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

// 辅助函数：从查询结果构建树形结构
function buildTreeFromRows(rows) {
  const hierarchy = [];
  const categoryMap = new Map();
  const groupMap = new Map();

  for (const row of rows) {
    // 处理 Category
    let category = categoryMap.get(row.category_id);
    if (!category) {
      category = {
        id: `c${row.category_id}`,
        realId: row.category_id,
        name: row.category_name,
        label: `${row.category_name} (${row.category_id})`,
        children: [],
        type: 'category'
      };
      categoryMap.set(row.category_id, category);
      hierarchy.push(category);
    }

    // 处理 Group
    let group = groupMap.get(row.group_id);
    if (!group) {
      group = {
        id: `g${row.group_id}`,
        realId: row.group_id,
        name: row.group_name,
        label: `${row.group_name} (${row.group_id})`,
        children: [],
        type: 'group',
        category_id: row.category_id
      };
      groupMap.set(row.group_id, group);
      category.children.push(group);
    }

    // 处理 Type
    group.children.push({
      id: row.type_id,
      realId: row.type_id,
      name: row.type_name,
      label: `${row.type_name} (${row.type_id})`,
      type: 'type',
      isLeaf: true,
      category_id: row.category_id
    });
  }

  return hierarchy;
}

class TypeController {
  // 获取层级结构（支持根据 regionId 过滤）
  static async getHierarchy(req, res) {
    try {
      const { regionId, datasource = 'serenity' } = req.query;

      let hierarchy = [];

      if (regionId) {
        // 检查该 region 是否有数据
        const rows = await Type.findByRegionId(regionId, datasource);

        // 如果没有数据，先同步
        if (rows.length === 0) {
          console.log(`No region_types data for region ${regionId}, syncing from EVE API...`);
          try {
            await Type.updateRegionTypes(parseInt(regionId), datasource);
            // 重新查询
            const newRows = await Type.findByRegionId(regionId, datasource);
            if (newRows.length > 0) {
              hierarchy = buildTreeFromRows(newRows);
            }
          } catch (syncError) {
            console.error(`Failed to sync region_types for region ${regionId}:`, syncError.message);
          }
        } else {
          hierarchy = buildTreeFromRows(rows);
        }
      } else {
        // 不带 regionId，使用原有逻辑
        const rows = await Type.getHierarchyData();
        hierarchy = buildTreeFromRows(rows);
      }

      res.status(200).json(hierarchy);
    } catch (error) {
      console.error('Error in getHierarchy:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // 获取所有分类（懒加载根节点）
  static async getCategories(req, res) {
    try {
      const { search } = req.query;
      const categories = await Category.findAll(1, null, search);
      const result = categories.map(cat => ({
        id: `c${cat.category_id}`,
        realId: cat.category_id,
        name: cat.name,
        label: `${cat.name} (${cat.category_id})`,
        type: 'category',
        isLeaf: false
      }));
      res.status(200).json(result);
    } catch (error) {
      console.error('Error in getCategories:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // 根据 regionId 获取分类（懒加载根节点，支持区域过滤）
  static async getCategoriesByRegion(req, res) {
    try {
      const { regionId, datasource = 'serenity' } = req.query;
      
      // 检查数据是否过期（超过3小时）
      const isStale = await Type.isRegionTypesStale(parseInt(regionId), 3);
      
      if (isStale) {
        console.log(`Region ${regionId} types data is stale, updating in background...`);
        // 在后台更新数据，不阻塞请求
        Type.updateRegionTypes(parseInt(regionId), datasource).catch(err => {
          console.error(`Background update failed for region ${regionId}:`, err);
        });
      }
      
      const categories = await Type.findCategoriesByRegion(regionId);
      const result = categories.map(cat => ({
        id: `c${cat.category_id}`,
        realId: cat.category_id,
        name: cat.category_name,
        label: `${cat.category_name} (${cat.category_id})`,
        type: 'category',
        isLeaf: false
      }));
      res.status(200).json(result);
    } catch (error) {
      console.error('Error in getCategoriesByRegion:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // 根据分类ID和regionId获取该分类下的所有组
  static async getGroupsByCategoryAndRegion(req, res) {
    try {
      const { categoryId, regionId, search } = req.query;
      const groups = await Type.findGroupsByCategoryAndRegion(parseInt(categoryId), regionId, search);
      const result = groups.map(group => ({
        id: `g${group.group_id}`,
        realId: group.group_id,
        name: group.group_name,
        label: `${group.group_name} (${group.group_id})`,
        type: 'group',
        isLeaf: false,
        category_id: group.category_id
      }));
      res.status(200).json(result);
    } catch (error) {
      console.error('Error in getGroupsByCategoryAndRegion:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // 根据组ID和regionId获取该组下的所有类型
  static async getTypesByGroupAndRegion(req, res) {
    try {
      const { groupId, regionId, search } = req.query;
      const types = await Type.findTypesByGroupAndRegion(parseInt(groupId), regionId, search);
      const result = types.map(type => ({
        id: type.type_id,
        realId: type.type_id,
        name: type.type_name,
        label: `${type.type_name} (${type.type_id})`,
        type: 'type',
        isLeaf: true,
        group_id: type.group_id,
        category_id: type.category_id
      }));
      res.status(200).json(result);
    } catch (error) {
      console.error('Error in getTypesByGroupAndRegion:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // 根据分类ID获取该分类下的所有组
  static async getGroupsByCategory(req, res) {
    try {
      const { categoryId, search } = req.query;
      const groups = await Group.findByCategoryId(parseInt(categoryId), search);
      const result = groups.map(group => ({
        id: `g${group.group_id}`,
        realId: group.group_id,
        name: group.name,
        label: `${group.name} (${group.group_id})`,
        type: 'group',
        isLeaf: false,
        category_id: group.category_id
      }));
      res.status(200).json(result);
    } catch (error) {
      console.error('Error in getGroupsByCategory:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // 根据组ID获取该组下的所有类型
  static async getTypesByGroup(req, res) {
    try {
      const { groupId, search } = req.query;
      const types = await Type.findByGroupId(parseInt(groupId), search);
      const result = types.map(type => ({
        id: type.id,
        realId: type.id,
        name: type.name,
        label: `${type.name} (${type.id})`,
        type: 'type',
        isLeaf: true,
        group_id: type.group_id,
        category_id: type.category_id
      }));
      res.status(200).json(result);
    } catch (error) {
      console.error('Error in getTypesByGroup:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

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

  // 同步单个Type详情
  static async syncOneType(req, res) {
    try {
      const { typeId, datasource = 'serenity' } = req.body;

      if (!typeId) {
        return res.status(400).json({ message: 'typeId is required' });
      }

      console.log(`[${datasource}] Syncing single type: ${typeId}`);

      // 获取类型详情
      const typeData = await eveApiService.getTypeDetails(typeId, datasource);

      if (!typeData) {
        return res.status(404).json({ message: 'Type not found in EVE API' });
      }

      // 同步group信息
      if (typeData.group_id) {
        await Group.insertOrUpdate(typeData.group_id, typeData.group_id.toString(), datasource);
      }

      // 同步category信息
      if (typeData.category_id) {
        await Category.insertOrUpdate(typeData.category_id, typeData.category_id.toString(), datasource);
      }

      // 保存类型数据
      const typeRecord = {
        id: typeId,
        name: typeData.name || `Type ${typeId}`,
        group_id: typeData.group_id,
        category_id: typeData.category_id,
        volume: typeData.volume,
        portion_size: typeData.portion_size,
        published: typeData.published
      };

      await Type.insertOrUpdate(typeRecord);

      res.status(200).json({
        success: true,
        message: `Type ${typeId} synced successfully`,
        data: { type_id: typeId, name: typeData.name }
      });

    } catch (error) {
      console.error(`Error syncing type ${req.body.typeId}:`, error);
      res.status(500).json({ message: 'Failed to sync type', error: error.message });
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

  // 获取蓝图所需的原材料
  static async getBlueprintMaterials(req, res) {
    try {
      const { id } = req.params;
      const { datasource } = req.query;
      
      // 从blueprint_materials表查询制造材料
      const [materials] = await pool.execute(
        'SELECT material_type_id, quantity FROM blueprint_materials WHERE blueprint_type_id = ? AND activity_type = "manufacturing"',
        [id]
      );
      
      console.log(`Query result for blueprint ${id}:`, materials);
      
      if (materials.length > 0) {
        console.log(`Found ${materials.length} materials from local blueprint_materials table for blueprint ${id}`);
        // 获取每个原材料的名称
        const materialsWithNames = await Promise.all(materials.map(async (material) => {
          const type = await Type.findById(material.material_type_id);
          return {
            type_id: material.material_type_id,
            name: type ? type.name : `Unknown Type (${material.material_type_id})`,
            quantity: material.quantity
          };
        }));
        res.status(200).json(materialsWithNames);
        return;
      }
      
      // 如果本地数据库没有，返回空数组
      console.log(`No materials found in local database for blueprint ${id}`);
      res.status(200).json([]);
    } catch (error) {
      console.error(`Error getting blueprint materials for type ID ${req.params.id}:`, error);
      res.status(500).json({ message: 'Failed to get blueprint materials', error: error.message });
    }
  }

  // 获取蓝图获取成本
  static async getBlueprintCost(req, res) {
    try {
      const { id } = req.params;
      const { datasource } = req.query;
      
      // 查询loyalty_offers表
      const [rows] = await pool.execute(
        'SELECT lp_cost, isk_cost FROM loyalty_offers WHERE type_id = ?',
        [id]
      );
      
      res.status(200).json(rows);
    } catch (error) {
      console.error(`Error getting blueprint cost for type ID ${req.params.id}:`, error);
      res.status(500).json({ message: 'Failed to get blueprint cost', error: error.message });
    }
  }

  // 获取蓝图制造产品
  static async getBlueprintProducts(req, res) {
    try {
      const { id } = req.params;
      const { datasource } = req.query;
      
      // 从blueprint_products表查询制造产品
      const [products] = await pool.execute(
        'SELECT product_type_id, quantity, probability FROM blueprint_products WHERE blueprint_type_id = ? AND activity_type = "manufacturing"',
        [id]
      );
      
      console.log(`Query result for blueprint products ${id}:`, products);
      
      if (products.length > 0) {
        console.log(`Found ${products.length} products from local blueprint_products table for blueprint ${id}`);
        // 获取每个产品的名称
        const productsWithNames = await Promise.all(products.map(async (product) => {
          const type = await Type.findById(product.product_type_id);
          return {
            type_id: product.product_type_id,
            name: type ? type.name : `Unknown Type (${product.product_type_id})`,
            quantity: product.quantity,
            probability: product.probability
          };
        }));
        res.status(200).json(productsWithNames);
        return;
      }
      
      // 如果本地数据库没有，返回空数组
      console.log(`No products found in local database for blueprint ${id}`);
      res.status(200).json([]);
    } catch (error) {
      console.error(`Error getting blueprint products for type ID ${req.params.id}:`, error);
      res.status(500).json({ message: 'Failed to get blueprint products', error: error.message });
    }
  }
}

module.exports = TypeController;
