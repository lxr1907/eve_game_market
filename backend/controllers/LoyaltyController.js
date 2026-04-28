const LoyaltyOffer = require('../models/LoyaltyOffer');
const Order = require('../models/Order');
const LoyaltyTypeLpIsk = require('../models/LoyaltyTypeLpIsk');
const LoyaltySkipItem = require('../models/LoyaltySkipItem');
const eveApiService = require('../services/eveApiService');

class LoyaltyController {
  // 同步特定公司的忠诚度商店商品
  static async syncLoyaltyOffers(req, res) {
    try {
      const { corporationId } = req.body;
      
      if (!corporationId) {
        return res.status(400).json({ message: 'corporationId is required' });
      }

      // 直接返回成功给前端，任务在后台执行
      res.status(202).json({
        message: `Loyalty offers synchronization for corporation ${corporationId} has started in background`,
        status: 'started'
      });

      // 在后台异步执行同步
      (async () => {
        try {
          console.log(`Starting loyalty offers synchronization for corporation ${corporationId} in background...`);
          
          // 从EVE API获取忠诚度商店商品
          const loyaltyOffers = await eveApiService.getLoyaltyStoreOffers(corporationId);
          
          let totalOffers = loyaltyOffers.length;
          let processedOffers = 0;
          let insertedOffers = 0;
          let updatedOffers = 0;
          
          console.log(`Fetched ${totalOffers} loyalty offers from API`);
          
          // 插入或更新到数据库
          for (const offer of loyaltyOffers) {
            try {
              // 准备数据，添加corporationId
              const offerData = {
                offer_id: offer.offer_id,
                corporation_id: corporationId,
                type_id: offer.type_id,
                quantity: offer.quantity,
                lp_cost: offer.lp_cost,
                isk_cost: offer.isk_cost,
                ak_cost: offer.ak_cost || 0,
                required_items: offer.required_items
              };
              
              const result = await LoyaltyOffer.insertOrUpdate(offerData);
              
              if (result.insertId) {
                insertedOffers++;
              } else {
                updatedOffers++;
              }
              
              // 插入或更新required_items
              await LoyaltyOffer.insertRequiredItems(
                offer.offer_id,
                corporationId,
                offer.required_items
              );
              
              processedOffers++;
              
              if (processedOffers % 10 === 0) {
                console.log(`Progress: ${processedOffers}/${totalOffers} loyalty offers processed`);
              }
            } catch (dbError) {
              console.error(`Error processing loyalty offer ${offer.offer_id}:`, dbError.message);
            }
          }
          
          console.log(`Loyalty offers synchronization completed for corporation ${corporationId}`);
          console.log(`Results: ${insertedOffers} inserted, ${updatedOffers} updated, ${totalOffers - processedOffers} failed`);
        } catch (error) {
          console.error(`Error in background syncing loyalty offers for corporation ${corporationId}:`, error.message);
          console.error('Error stack:', error.stack);
        }
      })();
    } catch (error) {
      console.error('Error starting loyalty offers sync:', error.message);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // 获取所有忠诚度商店商品（带分页）
  static async getLoyaltyOffers(req, res) {
    try {
      console.log('getLoyaltyOffers request query:', req.query);
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || '';
      const corporationId = req.query.corporationId ? parseInt(req.query.corporationId) : null;
      
      console.log('getLoyaltyOffers params:', { page, limit, search, corporationId });
      
      // 计算偏移量
      const offset = (page - 1) * limit;
      
      let offers;
      let total;
      
      if (corporationId) {
        // 按公司筛选
        offers = await LoyaltyOffer.findAll(page, limit, search, corporationId, 'serenity');
        total = offers.total;
      } else {
        // 获取所有
        offers = await LoyaltyOffer.findAll(page, limit, search, null, 'serenity');
        total = offers.total;
      }
      
      // 计算总页数
      const totalPages = Math.ceil(total / limit);
      
      res.status(200).json({
        data: offers.offers,
        pagination: {
          currentPage: page,
          pageSize: limit,
          totalItems: total,
          totalPages: offers.totalPages
        }
      });
    } catch (error) {
      console.error('Error getting loyalty offers:', error.message);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // 获取单个忠诚度商店商品详情
  static async getLoyaltyOfferById(req, res) {
    try {
      const { id } = req.params;
      
      const offer = await LoyaltyOffer.findById(id);
      
      if (!offer) {
        return res.status(404).json({ message: 'Loyalty offer not found' });
      }
      
      res.status(200).json(offer);
    } catch (error) {
      console.error(`Error getting loyalty offer ${req.params.id}:`, error.message);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // 创建忠诚度商店商品
  static async createLoyaltyOffer(req, res) {
    try {
      const offerData = req.body;
      
      const result = await LoyaltyOffer.insertOrUpdate(offerData);
      
      res.status(201).json({
        message: 'Loyalty offer created successfully',
        offerId: result.insertId || offerData.id
      });
    } catch (error) {
      console.error('Error creating loyalty offer:', error.message);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // 更新忠诚度商店商品
  static async updateLoyaltyOffer(req, res) {
    try {
      const { id } = req.params;
      const offerData = req.body;
      
      // 确保ID一致
      offerData.id = id;
      
      const result = await LoyaltyOffer.insertOrUpdate(offerData);
      
      res.status(200).json({
        message: 'Loyalty offer updated successfully',
        offerId: id
      });
    } catch (error) {
      console.error(`Error updating loyalty offer ${req.params.id}:`, error.message);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // 删除忠诚度商店商品
  static async deleteLoyaltyOffer(req, res) {
    try {
      const { id } = req.params;
      
      const result = await LoyaltyOffer.delete(id);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Loyalty offer not found' });
      }
      
      res.status(200).json({ message: 'Loyalty offer deleted successfully' });
    } catch (error) {
      console.error(`Error deleting loyalty offer ${req.params.id}:`, error.message);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // 获取分页收益数据
  static async getProfitData(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const corporationId = req.query.corporationId ? parseInt(req.query.corporationId) : null;
      const regionId = req.query.regionId ? parseInt(req.query.regionId) : null;
      const datasource = req.query.datasource || 'serenity';
      
      console.log('getProfitData params:', { page, limit, corporationId, regionId, datasource });
      
      // 调用模型方法获取分页数据
      const result = await LoyaltyTypeLpIsk.getProfitDataWithTypeNames(page, limit, { corporationId, regionId, datasource });
      
      console.log('getProfitData result:', { total: result.total, dataLength: result.data.length });
      
      res.status(200).json({
        data: result.data,
        pagination: {
          currentPage: result.page,
          pageSize: result.limit,
          totalItems: result.total,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      console.error('Error getting profit data:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // 清理并重新计算LP收益
  static async cleanAndRecalculateProfit(req, res) {
    try {
      // 添加更健壮的错误处理，确保即使req.body是undefined也不会抛出错误
      const corporationId = (req.body && req.body.corporationId) || parseInt(req.query.corporationId);
 
      if (!corporationId) {
        return res.status(400).json({ message: 'corporationId is required' });
      }

      // 直接返回成功给前端，任务在后台执行
      res.status(202).json({
        message: `Cleaning and recalculating LP profit for corporation ${corporationId} has started in background`,
        status: 'started'
      });

      // 在后台异步执行清理和重新计算
      // 使用箭头函数保持this上下文
      (async () => {
        try {
          console.log(`Starting cleaning and recalculating LP profit for corporation ${corporationId} in background...`);
          
          // 确定要处理的数据源
          const datasources =  ['serenity', 'infinity', 'tranquility'];
          
          // 并行处理所有数据源
          await Promise.all(datasources.map(async (ds) => {
            console.log(`Processing datasource: ${ds}`);
            
            // 清空该公司该数据源的表数据
            await LoyaltyTypeLpIsk.deleteByCorporationId(corporationId, ds);
            console.log(`Successfully deleted loyalty_type_lp_isk data for corporation ${corporationId} and datasource ${ds}`);
            
            // 重新计算利润 - 直接调用静态方法
            await LoyaltyController.calculateProfitInternal(corporationId, ds);
            console.log(`Profit recalculation completed for datasource ${ds}`);
          }));
          
          console.log('All datasources processing completed');
        } catch (error) {
          console.error(`Error in background cleaning and recalculating: ${error.message}`);
        }
      })();
    } catch (error) {
      console.error('Error starting cleaning and recalculating:', error.message);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // 内部方法：执行LP收益计算
  static async calculateProfitInternal(corporationId, datasource = 'serenity') {
    // 1. 先删除更新时间在5天之前的数据
    await LoyaltyTypeLpIsk.deleteOldData(5);

    // 根据数据源选择对应的区域ID
    const regionId = datasource === 'infinity' ? 10000016 : 10000002;
    
    // 获取该公司的所有loyalty_offers
    const allOffers = await LoyaltyOffer.findAll(1, 10000, '', corporationId);
    const offers = allOffers.offers;
    const totalOffersCount = offers.length;
    
    // 获取需要跳过的物品ID列表
    const skipItemIds = await LoyaltySkipItem.getAllSkipIds(datasource);
    
    console.log(`=== Starting LP profit calculation for ${datasource} ===`);
    console.log(`Total offers to process: ${totalOffersCount}`);
    console.log(`Already skipping ${skipItemIds.length} items from skip table`);
    
    // 遍历处理每个offer（仅处理没有required_items的offer）
    let processedOffers = 0;
    let savedOffers = 0;
    let syncedOffers = 0;
    let skippedOffers = 0;
    
    for (const offer of offers) {
      processedOffers++;
      const progress = ((processedOffers / totalOffersCount) * 100).toFixed(1);
      
      try {
        // 每处理10个打印一次进度，或者在关键节点打印
        if (processedOffers % 20 === 0 || processedOffers === 1 || processedOffers === totalOffersCount) {
          process.stdout.write(`\rProgress: [${processedOffers}/${totalOffersCount}] ${progress}% | Saved: ${savedOffers} | Skipped: ${skippedOffers}   `);
        }

        // 检查是否在跳过列表中
        if (skipItemIds.includes(offer.type_id)) {
          skippedOffers++;
          continue;
        }

        // 检查是否有required_items，如果有则跳过
        if (offer.required_items && offer.required_items.length > 0) {
          skippedOffers++;
          continue;
        }
        // 检查是否已有该regionId和typeId的buy订单数据
        const existingOrderCount = await Order.countByRegionAndType(regionId, offer.type_id, 'buy', datasource);
        
        let shouldSync = existingOrderCount === 0;
        
        // 如果有订单数据，检查更新时间是否超过1小时
        if (!shouldSync) {
          const latestUpdate = await Order.getLatestUpdateTime(regionId, offer.type_id, 'buy', datasource);
          if (latestUpdate) {
            const now = new Date();
            const updateTime = new Date(latestUpdate);
            const timeDiff = now - updateTime;
            const hoursDiff = timeDiff / (1000 * 60 * 60);
            
            if (hoursDiff > 1) {
              shouldSync = true;
            }
          } else {
            // 如果没有更新时间，重新同步
            shouldSync = true;
          }
        }
        
        if (shouldSync) {
          // 先删除该区域和类型的现有订单数据（如果有）
          await Order.deleteByRegionAndType(regionId, offer.type_id, datasource);
          
          // 定义处理订单数据的回调函数
          const processOrders = async (orders, page) => {
            // 为每个订单添加region_id和type_id
            const ordersWithRegionAndType = orders.map(order => ({
              ...order,
              region_id: regionId,
              type_id: offer.type_id
            }));
            
            // 批量插入或更新数据库
            await Order.insertOrUpdate(ordersWithRegionAndType, datasource);
          };

          // 获取买入订单
          await eveApiService.getAllMarketOrdersByRegionAndType(
            regionId, 
            offer.type_id, 
            'buy', 
            processOrders,
            datasource
          );
          
          syncedOffers++;
          console.log(`Order synchronization completed for type ${offer.type_id} in region ${regionId}`);
        }
        
        // 查询该type_id在特定区域的最高价买单
        const buyOrders = await Order.findByRegionAndType(regionId, offer.type_id, 'buy', 1, 1, datasource);
        
        if (buyOrders.length > 0) {
          const highestBuyPrice = buyOrders[0].price;
          
          // 计算总收益和每LP收益
          const totalRevenue = highestBuyPrice * offer.quantity;
          const totalProfit = totalRevenue - offer.isk_cost;
          const profitPerLp = offer.lp_cost > 0 ? totalProfit / offer.lp_cost : 0;
          
          // 根据不同服务器设置不同的存储门槛
          // 晨曦/无限服务器每LP收益1300以上，欧服(tranquility)560以上
          const profitThreshold = datasource.toLowerCase() === 'tranquility' ? 560 : 1300;
          // 总利润门槛：1000W
          const minTotalProfit = 10000000;

          if (profitPerLp > profitThreshold && totalProfit >= minTotalProfit) {
            // 准备数据
            const lpIskData = {
              type_id: offer.type_id,
              corporation_id: corporationId,
              region_id: regionId,
              lp_cost: offer.lp_cost,
              isk_cost: offer.isk_cost,
              sell_price: highestBuyPrice,
              quantity: offer.quantity,
              total_profit: totalProfit,
              profit_per_lp: profitPerLp
            };
            
            // 插入或更新数据库
            const saved = await LoyaltyTypeLpIsk.insertOrUpdate(lpIskData, datasource);
            if (saved) {
              savedOffers++;
            }
          }
        } else {
          // 如果没有买单，记录到跳过表
          await LoyaltySkipItem.addSkipItem(offer.type_id, datasource, 'no_buy_orders');
          skippedOffers++;
        }
        
        // 每处理100个offers暂停1秒，避免API调用过于频繁
        if (processedOffers % 100 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        if (error.message.startsWith('API_BLOCKED')) {
          // 如果是API被屏蔽的错误，记录并停止处理
          process.stdout.write('\n');
          console.error(`API blocked while processing offer ${offer.offer_id}: ${error.message}`);
          console.error('Stopping profit calculation due to API block');
          // 抛出错误，让上层处理
          throw error;
        } else {
          // 其他错误，记录并继续处理下一个offer
          // console.error(`Error processing offer ${offer.offer_id}: ${error.message}`);
        }
      }
    }
    
    process.stdout.write('\n'); // 进度条结束后换行
    console.log(`LP profit calculation completed for corporation ${corporationId} (${datasource})`);
    console.log(`Statistics: Saved ${savedOffers} records, Synced ${syncedOffers} order sets, Skipped ${skippedOffers} items`);
    console.log('-----------------------------------');
  }

  // 计算LP收益
  static async calculateProfit(req, res) {
    try {
      const { corporationId, datasource = 'serenity' } = req.body;
      
      if (!corporationId) {
        return res.status(400).json({ message: 'corporationId is required' });
      }

      // 直接返回成功给前端，任务在后台执行
      res.status(202).json({
        message: `LP profit calculation for corporation ${corporationId} has started in background`,
        status: 'started'
      });

      // 在后台异步执行计算
      (async () => {
        try {
          console.log(`Starting LP profit calculation for corporation ${corporationId} in background...`);
          // 直接调用静态方法
          await LoyaltyController.calculateProfitInternal(corporationId, datasource);
        } catch (error) {
          console.error(`Error in background calculation: ${error.message}`);
        }
      })();
    } catch (error) {
      console.error('Error starting calculation:', error.message);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}

module.exports = LoyaltyController;