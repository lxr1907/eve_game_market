const Order = require('../models/Order');
const Type = require('../models/Type');
const Region = require('../models/Region');
const eveApiService = require('../services/eveApiService');

class OrderController {
  // 同步特定区域和类型的订单数据
  static async syncOrders(req, res) {
    try {
      const { regionId, typeId } = req.params;
      
      // 验证参数
      if (!regionId || !typeId) {
        return res.status(400).json({ error: 'regionId and typeId are required' });
      }

      // 检查区域和类型是否存在
      const region = await Region.findById(regionId);
      const type = await Type.findById(typeId);
      
      if (!region) {
        return res.status(404).json({ error: 'Region not found' });
      }
      
      if (!type) {
        return res.status(404).json({ error: 'Type not found' });
      }

      // 返回202，表示请求已接受，正在后台处理
      res.status(202).json({ 
        message: `Order synchronization started for region ${region.name} and type ${type.name}`,
        regionId, 
        typeId 
      });

      // 后台异步同步数据
      (async () => {
        try {
          console.log(`Starting order synchronization for region ${regionId}, type ${typeId}`);
          
          // 先删除该区域和类型的现有订单数据
          await Order.deleteByRegionAndType(regionId, typeId);
          
          // 定义处理订单数据的回调函数
          const processOrders = async (orders, page) => {
            console.log(`Processing page ${page} with ${orders.length} orders`);
            
            // 为每个订单添加region_id和type_id
            const ordersWithRegionAndType = orders.map(order => ({
              ...order,
              region_id: regionId,
              type_id: typeId
            }));
            
            // 批量插入或更新数据库
            await Order.insertOrUpdate(ordersWithRegionAndType);
          };

          // 获取买入订单
          console.log(`Fetching buy orders for region ${regionId}, type ${typeId}`);
          await eveApiService.getAllMarketOrdersByRegionAndType(
            regionId, 
            typeId, 
            'buy', 
            processOrders
          );

          // 获取卖出订单
          console.log(`Fetching sell orders for region ${regionId}, type ${typeId}`);
          await eveApiService.getAllMarketOrdersByRegionAndType(
            regionId, 
            typeId, 
            'sell', 
            processOrders
          );

          console.log(`Order synchronization completed for region ${regionId}, type ${typeId}`);
        } catch (error) {
          console.error(`Error synchronizing orders for region ${regionId}, type ${typeId}:`, error.message);
          console.error('Error stack:', error.stack);
        }
      })();

    } catch (error) {
      console.error('Error in syncOrders:', error.message);
      console.error('Error stack:', error.stack);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // 查询订单数据
  static async getOrders(req, res) {
    try {
      const { regionId, typeId, orderType } = req.query;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      
      // 验证参数
      if (!regionId || !typeId) {
        return res.status(400).json({ error: 'regionId and typeId are required' });
      }

      // 检查区域和类型是否存在
      const region = await Region.findById(regionId);
      const type = await Type.findById(typeId);
      
      if (!region) {
        return res.status(404).json({ error: 'Region not found' });
      }
      
      if (!type) {
        return res.status(404).json({ error: 'Type not found' });
      }

      // 获取订单数据
      const orders = await Order.findByRegionAndType(regionId, typeId, orderType, page, limit);
      const total = await Order.countByRegionAndType(regionId, typeId, orderType);

      res.status(200).json({
        data: orders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Error in getOrders:', error.message);
      console.error('Error stack:', error.stack);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // 根据区域ID获取可用类型（用于前端下拉选择）
  static async getAvailableTypesByRegion(req, res) {
    try {
      const { regionId } = req.params;
      const search = req.query.search || '';
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      
      if (!regionId) {
        return res.status(400).json({ error: 'regionId is required' });
      }

      // 查询该区域可用的类型
      const RegionType = require('../models/RegionType');
      const regionTypes = await RegionType.findByRegionId(regionId, page, limit * 100); // 获取更多数据用于前端筛选
      
      // 提取type_id列表
      const typeIds = regionTypes.map(rt => rt.type_id);
      
      if (typeIds.length === 0) {
        return res.status(200).json({
          data: [],
          pagination: {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0
          }
        });
      }

      // 查询类型详情并根据搜索条件过滤
      const allTypes = await Type.findByIds(typeIds);
      const filteredTypes = allTypes.filter(type => 
        type && type.name && type.name.toLowerCase().includes(search.toLowerCase())
      );

      // 分页处理
      const start = (page - 1) * limit;
      const end = start + limit;
      const paginatedTypes = filteredTypes.slice(start, end);

      res.status(200).json({
        data: paginatedTypes,
        pagination: {
          page,
          limit,
          total: filteredTypes.length,
          totalPages: Math.ceil(filteredTypes.length / limit)
        }
      });

    } catch (error) {
      console.error('Error in getAvailableTypesByRegion:', error.message);
      console.error('Error stack:', error.stack);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = OrderController;