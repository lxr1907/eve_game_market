const Order = require('../models/Order');
const Type = require('../models/Type');
const Region = require('../models/Region');
const Station = require('../models/Station');
const eveApiService = require('../services/eveApiService');

class OrderController {
  // 同步特定区域和类型的订单数据
  static async syncOrders(req, res) {
    try {
      // 支持路径参数和查询参数两种方式
      const regionId = req.params.regionId || req.query.regionId || req.query.region_id;
      const typeId = req.params.typeId || req.query.typeId || req.query.type_id;
      const datasource = req.query.datasource || 'serenity';
      
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
        message: `Order synchronization started for region ${region.name} and type ${type.name} (${datasource})`,
        regionId, 
        typeId,
        datasource
      });

      // 后台异步同步数据
      (async () => {
        try {
          console.log(`Starting order synchronization for region ${regionId}, type ${typeId}, datasource ${datasource}`);
          
          // 只删除该区域和类型的1小时之前的订单数据
          const deletedCount = await Order.deleteOlderThanOneHourByRegionAndType(regionId, typeId, datasource);
          console.log(`Deleted ${deletedCount} outdated orders for region ${regionId}, type ${typeId}, datasource ${datasource}`);
          
          // 定义处理订单数据的回调函数
          const processOrders = async (orders, page) => {
            console.log(`Processing page ${page} with ${orders.length} orders for ${datasource}`);
            
            // 为每个订单添加region_id和type_id
            const ordersWithRegionAndType = orders.map(order => ({
              ...order,
              region_id: regionId,
              type_id: typeId
            }));
            
            // 批量插入或更新数据库
            await Order.insertOrUpdate(ordersWithRegionAndType, datasource);
          };

          // 获取买入订单
          console.log(`Fetching buy orders for region ${regionId}, type ${typeId}, datasource ${datasource}`);
          await eveApiService.getAllMarketOrdersByRegionAndType(
            regionId, 
            typeId, 
            'buy', 
            1, // startPage
            processOrders,
            datasource
          );

          // 获取卖出订单
          console.log(`Fetching sell orders for region ${regionId}, type ${typeId}, datasource ${datasource}`);
          await eveApiService.getAllMarketOrdersByRegionAndType(
            regionId, 
            typeId, 
            'sell', 
            1, // startPage
            processOrders,
            datasource
          );

          console.log(`Order synchronization completed for region ${regionId}, type ${typeId}, datasource ${datasource}`);
        } catch (error) {
          console.error(`Error synchronizing orders for region ${regionId}, type ${typeId}, datasource ${datasource}:`, error.message);
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
      // 支持驼峰和下划线两种命名法
      const regionId = req.query.regionId || req.query.region_id;
      const typeId = req.query.typeId || req.query.type_id;
      const datasource = req.query.datasource || req.query.datasource || 'serenity';
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

      // 获取买入订单数据
      let buyOrders = await Order.findByRegionAndType(regionId, typeId, 'buy', page, limit, datasource);
      let buyTotal = await Order.countByRegionAndType(regionId, typeId, 'buy', datasource);
      
      // 获取卖出订单数据
      let sellOrders = await Order.findByRegionAndType(regionId, typeId, 'sell', page, limit, datasource);
      let sellTotal = await Order.countByRegionAndType(regionId, typeId, 'sell', datasource);

      // 如果本地没有数据，从官方API同步
      const needSyncBuy = buyTotal === 0;
      const needSyncSell = sellTotal === 0;
      
      if (needSyncBuy || needSyncSell) {
        console.log(`No ${needSyncBuy ? 'buy ' : ''}${needSyncSell ? 'sell ' : ''}orders found in local database for region ${regionId}, type ${typeId}, datasource ${datasource}. Synchronizing from official API...`);
        
        // 只删除该区域和类型的1小时之前的订单数据
        const deletedCount = await Order.deleteOlderThanOneHourByRegionAndType(regionId, typeId, datasource);
        console.log(`Deleted ${deletedCount} outdated orders for region ${regionId}, type ${typeId}, datasource ${datasource}`);
        
        // 定义处理订单数据的回调函数
        const processOrders = async (orders, page) => {
          console.log(`Processing page ${page} with ${orders.length} orders for ${datasource}`);
          
          // 为每个订单添加region_id和type_id
          const ordersWithRegionAndType = orders.map(order => ({
            ...order,
            region_id: regionId,
            type_id: typeId
          }));
          
          // 批量插入或更新数据库
          await Order.insertOrUpdate(ordersWithRegionAndType, datasource);
        };

        // 获取买入订单
        if (needSyncBuy) {
          console.log(`Fetching buy orders for region ${regionId}, type ${typeId}, datasource ${datasource}`);
          await eveApiService.getAllMarketOrdersByRegionAndType(
            regionId, 
            typeId, 
            'buy', 
            1, // startPage
            processOrders,
            datasource
          );
        }

        // 获取卖出订单
        if (needSyncSell) {
          console.log(`Fetching sell orders for region ${regionId}, type ${typeId}, datasource ${datasource}`);
          await eveApiService.getAllMarketOrdersByRegionAndType(
            regionId, 
            typeId, 
            'sell', 
            1, // startPage
            processOrders,
            datasource
          );
        }

        console.log(`Order synchronization completed for region ${regionId}, type ${typeId}, datasource ${datasource}`);
        
        // 再次查询本地数据库
        buyOrders = await Order.findByRegionAndType(regionId, typeId, 'buy', page, limit, datasource);
        buyTotal = await Order.countByRegionAndType(regionId, typeId, 'buy', datasource);
        
        sellOrders = await Order.findByRegionAndType(regionId, typeId, 'sell', page, limit, datasource);
        sellTotal = await Order.countByRegionAndType(regionId, typeId, 'sell', datasource);
      }

      // 为订单数据补充空间站名称
      buyOrders = await enrichWithStationNames(buyOrders, datasource);
      sellOrders = await enrichWithStationNames(sellOrders, datasource);

      res.status(200).json({
        buyOrders: {
          data: buyOrders,
          pagination: {
            page,
            limit,
            total: buyTotal,
            totalPages: Math.ceil(buyTotal / limit)
          }
        },
        sellOrders: {
          data: sellOrders,
          pagination: {
            page,
            limit,
            total: sellTotal,
            totalPages: Math.ceil(sellTotal / limit)
          }
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

// 为订单数据补充空间站名称
async function enrichWithStationNames(orders, datasource) {
  if (!orders || orders.length === 0) return orders;
  
  const locationIds = [...new Set(orders.map(o => o.location_id).filter(Boolean))];
  if (locationIds.length === 0) return orders;
  
  // 先查当前数据源
  let stationNames = await Station.findByIds(locationIds, datasource);
  
  // 如果有缺失且当前不是 serenity，回退到 serenity 缓存（站ID跨服一致）
  const missingIds = locationIds.filter(id => !stationNames[id]);
  if (missingIds.length > 0 && datasource !== 'serenity') {
    const fallbackNames = await Station.findByIds(missingIds, 'serenity');
    stationNames = { ...stationNames, ...fallbackNames };
  }
  
  return orders.map(order => ({
    ...order,
    location_name: stationNames[order.location_id] || null
  }));
}

module.exports = OrderController;