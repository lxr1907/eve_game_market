const Category = require('../models/Category');
const Group = require('../models/Group');
const eveApiService = require('../services/eveApiService');

class CategoryController {
  // 获取所有Category数据（分页）
  static async getCategories(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || '';

      const categories = await Category.findAll(page, limit);
      const total = await Category.count();

      res.status(200).json({
        categories,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error getting categories:', error);
      res.status(500).json({ message: 'Failed to get categories', error: error.message });
    }
  }

  // 根据ID获取单个Category数据
  static async getCategoryById(req, res) {
    try {
      const categoryId = parseInt(req.params.id);
      const category = await Category.findById(categoryId);

      if (!category) {
        // 如果category不存在，尝试从API获取
        const categoryDetails = await eveApiService.getCategoryDetails(categoryId);
        if (categoryDetails) {
          // 保存到数据库
          await Category.insertOrUpdate({
            category_id: categoryDetails.category_id,
            name: categoryDetails.name || '',
            published: categoryDetails.published
          });
          // 返回新保存的category
          res.status(200).json(categoryDetails);
        } else {
          res.status(404).json({ message: 'Category not found' });
        }
      } else {
        res.status(200).json(category);
      }
    } catch (error) {
      console.error(`Error getting category with ID ${req.params.id}:`, error);
      res.status(500).json({ message: 'Failed to get category', error: error.message });
    }
  }

  // 同步单个Category数据
  static async syncCategory(req, res) {
    try {
      const categoryId = parseInt(req.params.id);
      const categoryDetails = await eveApiService.getCategoryDetails(categoryId);

      if (categoryDetails) {
        // 保存到数据库
        await Category.insertOrUpdate({
          category_id: categoryDetails.category_id,
          name: categoryDetails.name || '',
          published: categoryDetails.published
        });
        res.status(200).json({ message: 'Category synced successfully', category: categoryDetails });
      } else {
        res.status(404).json({ message: 'Category not found or failed to fetch from API' });
      }
    } catch (error) {
      console.error(`Error syncing category with ID ${req.params.id}:`, error);
      res.status(500).json({ message: 'Failed to sync category', error: error.message });
    }
  }

  // 从Group表中获取不重复的category_id并同步所有数据（异步处理）
  static async syncAllCategoriesFromGroups(req, res) {
    try {
      // 从Group表中获取不重复的category_id
      const categoryIds = await Group.findDistinctCategoryIds();
      
      if (categoryIds.length === 0) {
        return res.status(200).json({ message: 'No category IDs found in groups table' });
      }

      // 立即返回响应，告知同步任务已启动
      res.status(200).json({
        message: 'Category sync task started',
        total: categoryIds.length
      });

      // 在后台执行同步操作
      const syncStats = {
        total: categoryIds.length,
        success: 0,
        failed: 0,
        syncedIds: [],
        failedIds: []
      };

      // 使用setTimeout将同步操作放入事件循环，不阻塞当前响应
      setTimeout(async () => {
        // 同步每个Category
        for (const categoryId of categoryIds) {
          try {
            const categoryDetails = await eveApiService.getCategoryDetails(categoryId);
            if (categoryDetails) {
              await Category.insertOrUpdate({
                category_id: categoryDetails.category_id,
                name: categoryDetails.name || '',
                published: categoryDetails.published
              });
              syncStats.success++;
              syncStats.syncedIds.push(categoryId);
            } else {
              syncStats.failed++;
              syncStats.failedIds.push(categoryId);
            }
          } catch (error) {
            console.error(`Error syncing category ${categoryId}:`, error);
            syncStats.failed++;
            syncStats.failedIds.push(categoryId);
          }
        }

        // 同步完成后记录统计信息
        console.log('Category sync completed', syncStats);
      }, 0);

    } catch (error) {
      console.error('Error starting category sync:', error);
      res.status(500).json({ message: 'Failed to start category sync', error: error.message });
    }
  }
}

module.exports = CategoryController;