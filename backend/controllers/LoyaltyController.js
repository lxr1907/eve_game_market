const LoyaltyOffer = require('../models/LoyaltyOffer');
const Order = require('../models/Order');
const LoyaltyTypeLpIsk = require('../models/LoyaltyTypeLpIsk');
const LoyaltySkipItem = require('../models/LoyaltySkipItem');
const Corporation = require('../models/Corporation');
const eveApiService = require('../services/eveApiService');

class LoyaltyController {
  // 同步特定公司的忠诚度商店商品
  static async syncLoyaltyOffers(req, res) {
    try {
      const { corporationId } = req.body;
      const { datasource = 'serenity' } = req.query;

      if (!corporationId) {
        return res.status(400).json({ message: 'corporationId is required' });
      }

      // 直接返回成功给前端，任务在后台执行
      res.status(202).json({
        message: `Loyalty offers synchronization for corporation ${corporationId} (${datasource}) has started in background`,
        status: 'started'
      });

      // 在后台异步执行同步
      (async () => {
        try {
          console.log(`Starting loyalty offers synchronization for corporation ${corporationId} (${datasource}) in background...`);

          // 从EVE API获取忠诚度商店商品
          const loyaltyOffers = await eveApiService.getLoyaltyStoreOffers(corporationId, datasource);

          let totalOffers = loyaltyOffers.length;
          let processedOffers = 0;
          let insertedOffers = 0;
          let updatedOffers = 0;

          console.log(`Fetched ${totalOffers} loyalty offers from API for ${datasource}`);

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

              const result = await LoyaltyOffer.insertOrUpdate(offerData, datasource);

              if (result.insertId) {
                insertedOffers++;
              } else {
                updatedOffers++;
              }

              // 插入或更新required_items
              await LoyaltyOffer.insertRequiredItems(
                offer.offer_id,
                corporationId,
                offer.required_items,
                datasource
              );

              processedOffers++;

              if (processedOffers % 10 === 0) {
                console.log(`[${datasource}] Progress: ${processedOffers}/${totalOffers} loyalty offers processed`);
              }
            } catch (dbError) {
              console.error(`[${datasource}] Error processing loyalty offer ${offer.offer_id}:`, dbError.message);
            }
          }

          console.log(`[${datasource}] Loyalty offers synchronization completed for corporation ${corporationId}`);
          console.log(`[${datasource}] Results: ${insertedOffers} inserted, ${updatedOffers} updated, ${totalOffers - processedOffers} failed`);
        } catch (error) {
          console.error(`[${datasource}] Error in background syncing loyalty offers for corporation ${corporationId}:`, error.message);
          console.error('Error stack:', error.stack);
        }
      })();
    } catch (error) {
      console.error('Error starting loyalty offers sync:', error.message);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // 同步所有公司所有数据源的忠诚度商店商品
  static async syncAllLoyaltyOffers(req, res) {
    try {
      // 直接返回成功给前端，任务在后台执行
      res.status(202).json({
        message: 'All loyalty offers synchronization has started in background',
        status: 'started'
      });

      // 在后台异步执行同步
      (async () => {
        try {
          console.log('Starting all loyalty offers synchronization in background...');

          const datasources = ['serenity', 'infinity', 'tranquility'];
          const corporationIds = [1000180, 1000179, 1000181, 1000182, 1000436, 1000437];

          for (const datasource of datasources) {
            console.log(`\n=== Starting loyalty offers synchronization for datasource: ${datasource} ===`);

            for (const corporationId of corporationIds) {
              console.log(`[${datasource}] Syncing corporation ${corporationId}...`);

              try {
                const loyaltyOffers = await eveApiService.getLoyaltyStoreOffers(corporationId, datasource);
                let totalOffers = loyaltyOffers.length;
                let processedOffers = 0;

                for (const offer of loyaltyOffers) {
                  try {
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

                    await LoyaltyOffer.insertOrUpdate(offerData, datasource);
                    await LoyaltyOffer.insertRequiredItems(offer.offer_id, corporationId, offer.required_items, datasource);
                    processedOffers++;
                  } catch (dbError) {
                    console.error(`[${datasource}] Error processing loyalty offer ${offer.offer_id}:`, dbError.message);
                  }
                }

                console.log(`[${datasource}] Corporation ${corporationId}: ${processedOffers}/${totalOffers} offers processed`);
              } catch (error) {
                console.error(`[${datasource}] Error syncing corporation ${corporationId}:`, error.message);
              }

              // 每处理一个公司后暂停1秒，避免API调用过于频繁
              await new Promise(resolve => setTimeout(resolve, 1000));
            }

            console.log(`=== Completed datasource: ${datasource} ===\n`);
          }

          console.log('All loyalty offers synchronization completed');
        } catch (error) {
          console.error('Error in background syncing all loyalty offers:', error.message);
          console.error('Error stack:', error.stack);
        }
      })();
    } catch (error) {
      console.error('Error starting all loyalty offers sync:', error.message);
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
      const datasource = req.query.datasource || 'serenity';

      console.log('getLoyaltyOffers params:', { page, limit, search, corporationId, datasource });

      // 计算偏移量
      const offset = (page - 1) * limit;

      let offers;
      let total;

      if (corporationId) {
        // 按公司筛选
        offers = await LoyaltyOffer.findAll(page, limit, search, corporationId, datasource);
        total = offers.total;
      } else {
        // 获取所有
        offers = await LoyaltyOffer.findAll(page, limit, search, null, datasource);
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
    // 1. 删除更新时间在5天之前的LP收益数据
    await LoyaltyTypeLpIsk.deleteOldData(5);

    // 2. 删除2周前的订单数据
    await Order.deleteOlderThanTwoWeeks(datasource);

    // 3. 删除超过1天的跳过记录
    await LoyaltySkipItem.deleteOldSkipItems(datasource);

    // 根据数据源选择对应的区域ID
    const regionId = datasource === 'infinity' ? 10000016 : 10000002;
    
    // 获取该公司的所有loyalty_offers
    const allOffers = await LoyaltyOffer.findAll(1, 10000, '', corporationId, datasource);
    const offers = allOffers.offers;
    const totalOffersCount = offers.length;
    
    // 获取需要跳过的物品ID列表
    const skipItemIds = await LoyaltySkipItem.getAllSkipIds(datasource);
    
    console.log(`=== Starting LP profit calculation for ${datasource} ===`);
    console.log(`Total offers to process: ${totalOffersCount}`);
    console.log(`Skip list contains ${skipItemIds.length} items from skip table`);

    // 遍历处理每个offer（仅处理没有required_items的offer）
    let processedOffers = 0;
    let savedOffers = 0;
    let syncedOffers = 0;
    let skippedOffers = 0;
    const skipReasons = {
      inSkipTable: 0,
      hasRequiredItems: 0,
      noBuyOrders: 0,
      profitBelowThreshold: 0
    };

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
          skipReasons.inSkipTable++;
          continue;
        }

        // 检查是否有required_items，如果有则跳过
        if (offer.required_items && offer.required_items.length > 0) {
          skippedOffers++;
          skipReasons.hasRequiredItems++;
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

          // 对于 LP 收益计算，只获取第一页买单通常已经足够（1000条数据足以包含最高出价）
          // 这样可以避免不必要的翻页尝试和"Page 2 does not exist"的冗余日志
          const orders = await eveApiService.getMarketOrdersByRegionAndType(
            regionId,
            offer.type_id,
            'buy',
            1, // page 1
            datasource
          );

          if (orders && orders.length > 0) {
            // 为每个订单添加region_id和type_id
            const ordersWithRegionAndType = orders.map(order => ({
              ...order,
              region_id: regionId,
              type_id: offer.type_id
            }));

            // 批量插入或更新数据库
            await Order.insertOrUpdate(ordersWithRegionAndType, datasource);
          }

          syncedOffers++;
        }

        // 查询该type_id在特定区域的最高价买单
        const buyOrders = await Order.findByRegionAndType(regionId, offer.type_id, 'buy', 1, 1, datasource);

        if (buyOrders.length === 0) {
          skippedOffers++;
          skipReasons.noBuyOrders++;
          // 记录到跳过表
          await LoyaltySkipItem.addSkipItem(offer.type_id, datasource, 'no_buy_orders');
          continue;
        }

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

          if (profitPerLp <= profitThreshold || totalProfit < minTotalProfit) {
            skippedOffers++;
            skipReasons.profitBelowThreshold++;
            // 前5个打印详情
            if (skipReasons.profitBelowThreshold <= 5) {
              console.log(`[${datasource}] Skip reason: profitBelowThreshold | type_id=${offer.type_id} | profitPerLp=${profitPerLp.toFixed(2)} (threshold=${profitThreshold}) | totalProfit=${totalProfit.toFixed(0)} (min=${minTotalProfit})`);
            }
            continue;
          }

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

        // 每处理100个offers暂停1秒，避免API调用过于频繁
        if (processedOffers % 100 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        const isApiBlocked = error.message.startsWith('API_BLOCKED');
        const isSeriousError = error.response && error.response.status >= 400 && error.response.status < 500 && error.response.status !== 404;
        
        if (isApiBlocked || isSeriousError) {
          // 如果是API被屏蔽或严重参数错误，记录并停止整个计算任务
          process.stdout.write('\n');
          console.error(`Stopping task: ${isApiBlocked ? 'API BLOCKED' : 'Serious API Error (4xx)'} while processing offer ${offer.offer_id}`);
          console.error(`Error details: ${error.message}`);
          throw error;
        } else {
          // 其他错误（如 404, 5xx, 网络超时等），记录并继续处理下一个offer
          // 这些错误通常是暂时的或局限于单个物品的
        }
      }
    }
    process.stdout.write('\n'); // 进度条结束后换行
    console.log(`LP profit calculation completed for corporation ${corporationId} (${datasource})`);
    console.log(`Statistics: Saved ${savedOffers} records, Synced ${syncedOffers} order sets, Skipped ${skippedOffers} items`);
    console.log(`Skip reasons breakdown: inSkipTable=${skipReasons.inSkipTable}, hasRequiredItems=${skipReasons.hasRequiredItems}, noBuyOrders=${skipReasons.noBuyOrders}, profitBelowThreshold=${skipReasons.profitBelowThreshold}`);
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

  // 获取蓝图详情（包含材料、成本、收益等所有信息）
  static async getBlueprintDetails(req, res) {
    try {
      const pool = require('../config/database');
      const { typeId } = req.params;
      const { datasource = 'serenity', regionId = '10000002' } = req.query;

      // 1. 获取蓝图基本信息
      const [blueprint] = await pool.execute(`
        SELECT lo.offer_id, lo.corporation_id, lo.type_id, lo.quantity, lo.lp_cost, lo.isk_cost, 
               t.name as type_name, t.description
        FROM loyalty_offers lo
        LEFT JOIN types t ON lo.type_id = t.id
        WHERE lo.type_id = ? AND lo.datasource = ?
        LIMIT 1
      `, [typeId, datasource]);

      if (blueprint.length === 0) {
        return res.status(404).json({ message: 'Blueprint not found' });
      }

      const bp = blueprint[0];

      // 2. 获取蓝图制造材料
      const [materials] = await pool.execute(`
        SELECT bm.material_type_id, bm.quantity, t.name as material_name
        FROM blueprint_materials bm
        LEFT JOIN types t ON bm.material_type_id = t.id
        WHERE bm.blueprint_type_id = ? AND bm.activity_type = 'manufacturing'
      `, [typeId]);

      // 3. 获取材料价格并计算材料成本
      const materialsWithCost = [];
      let materialCost = 0;
      let hasMissingMaterials = false;
      const missingMaterials = [];
      
      for (const mat of materials) {
        // 获取材料最低卖价
        const [priceResult] = await pool.execute(`
          SELECT price FROM orders 
          WHERE type_id = ? AND region_id = ? AND datasource = ? AND is_buy_order = 0
          ORDER BY price ASC LIMIT 1
        `, [mat.material_type_id, regionId, datasource]);

        const price = priceResult.length > 0 ? priceResult[0].price : 0;
        const totalCost = price * mat.quantity;
        materialCost += totalCost;
        
        // 检查是否有材料没有买卖订单
        if (price === 0) {
          hasMissingMaterials = true;
          missingMaterials.push({
            type_id: mat.material_type_id,
            name: mat.material_name || `ID: ${mat.material_type_id}`,
            quantity: mat.quantity
          });
        }

        materialsWithCost.push({
          name: mat.material_name || `ID: ${mat.material_type_id}`,
          type_id: mat.material_type_id,
          quantity: mat.quantity,
          price: price,
          total_cost: totalCost,
          has_order: price > 0 // 标记该材料是否有订单
        });
      }

      // 4. 获取产品信息
      const [products] = await pool.execute(`
        SELECT bp.product_type_id, bp.quantity, t.name as product_name
        FROM blueprint_products bp
        LEFT JOIN types t ON bp.product_type_id = t.id
        WHERE bp.blueprint_type_id = ? AND bp.activity_type = 'manufacturing'
        LIMIT 1
      `, [typeId]);
      
      // 5. 获取所有相同type_id的兑换信息（蓝图出处）
      const [blueprintSources] = await pool.execute(`
        SELECT lo.offer_id, lo.corporation_id, lo.lp_cost, lo.isk_cost, lo.ak_cost
        FROM loyalty_offers lo
        WHERE lo.type_id = ? AND lo.datasource = ?
          AND lo.lp_cost > 0 AND lo.isk_cost > 0
        ORDER BY lo.lp_cost ASC, lo.isk_cost ASC
      `, [typeId, datasource]);

      // 6. 同步公司信息到数据库
      const Corporation = require('../models/Corporation');
      const eveApiService = require('../services/eveApiService');
      
      // 确保表存在
      await Corporation.createTable();
      
      // 获取所有需要同步的公司ID
      const corporationIds = blueprintSources.map(source => source.corporation_id);
      const uniqueCorporationIds = [...new Set(corporationIds)];
      
      // 先查询本地数据库中已有的公司信息
      const existingCorps = await Corporation.findByIds(uniqueCorporationIds, datasource);
      
      // 同步本地没有的公司信息
      for (const corpId of uniqueCorporationIds) {
        if (!existingCorps[corpId]) {
          console.log(`[LP Blueprint] Syncing corporation info for ${corpId} from ESI...`);
          const corpData = await eveApiService.getCorporationInfo(corpId, datasource);
          if (corpData) {
            // 转换数据格式
            const formattedData = {
              corporation_id: corpId,
              name: corpData.name,
              ticker: corpData.ticker,
              description: corpData.description,
              member_count: corpData.member_count,
              tax_rate: corpData.tax_rate,
              date_founded: corpData.date_founded,
              ceo_id: corpData.ceo_id,
              creator_id: corpData.creator_id,
              faction_id: corpData.faction_id,
              home_station_id: corpData.home_station_id,
              shares: corpData.shares,
              url: corpData.url
            };
            await Corporation.insertOrUpdate(formattedData, datasource);
            console.log(`[LP Blueprint] Synced corporation info for ${corpId}: ${corpData.name}`);
          } else {
            console.log(`[LP Blueprint] Failed to sync corporation info for ${corpId}`);
          }
        }
      }
      
      // 重新查询最新的公司信息
      const updatedCorps = await Corporation.findByIds(uniqueCorporationIds, datasource);

      let productInfo = null;
      let buyPrice = 0;
      let sellPrice = 0;

      if (products.length > 0) {
        const product = products[0];
        productInfo = {
          type_id: product.product_type_id,
          name: product.product_name || `ID: ${product.product_type_id}`,
          quantity: product.quantity
        };

        // 获取产品最高买价
        const [buyResult] = await pool.execute(`
          SELECT price FROM orders 
          WHERE type_id = ? AND region_id = ? AND datasource = ? AND is_buy_order = 1
          ORDER BY price DESC LIMIT 1
        `, [product.product_type_id, regionId, datasource]);
        buyPrice = buyResult.length > 0 ? buyResult[0].price : 0;

        // 获取产品最低卖价
        const [sellResult] = await pool.execute(`
          SELECT price FROM orders 
          WHERE type_id = ? AND region_id = ? AND datasource = ? AND is_buy_order = 0
          ORDER BY price ASC LIMIT 1
        `, [product.product_type_id, regionId, datasource]);
        sellPrice = sellResult.length > 0 ? sellResult[0].price : 0;
        
        // 如果最高买价或最低卖价为0，实时调用ESI同步订单数据
        if (buyPrice === 0 || sellPrice === 0) {
          console.log(`[LP Blueprint] Price is 0 for product type ${product.product_type_id}, syncing orders from ESI...`);
          
          try {
            // 删除该区域和类型的1小时之前的订单数据
            await Order.deleteOlderThanOneHourByRegionAndType(regionId, product.product_type_id, datasource);
            
            // 定义处理订单数据的回调函数
            const processOrders = async (orders, page) => {
              // 为每个订单添加region_id和type_id
              const ordersWithRegionAndType = orders.map(order => ({
                ...order,
                region_id: regionId,
                type_id: product.product_type_id
              }));
              
              // 批量插入或更新数据库
              await Order.insertOrUpdate(ordersWithRegionAndType, datasource);
            };
            
            // 同步买入订单
            if (buyPrice === 0) {
              await eveApiService.getAllMarketOrdersByRegionAndType(
                regionId, 
                product.product_type_id, 
                'buy', 
                1,
                processOrders,
                datasource
              );
            }
            
            // 同步卖出订单
            if (sellPrice === 0) {
              await eveApiService.getAllMarketOrdersByRegionAndType(
                regionId, 
                product.product_type_id, 
                'sell', 
                1,
                processOrders,
                datasource
              );
            }
            
            // 重新查询订单价格
            if (buyPrice === 0) {
              const [refreshedBuyResult] = await pool.execute(`
                SELECT price FROM orders 
                WHERE type_id = ? AND region_id = ? AND datasource = ? AND is_buy_order = 1
                ORDER BY price DESC LIMIT 1
              `, [product.product_type_id, regionId, datasource]);
              buyPrice = refreshedBuyResult.length > 0 ? refreshedBuyResult[0].price : 0;
            }
            
            if (sellPrice === 0) {
              const [refreshedSellResult] = await pool.execute(`
                SELECT price FROM orders 
                WHERE type_id = ? AND region_id = ? AND datasource = ? AND is_buy_order = 0
                ORDER BY price ASC LIMIT 1
              `, [product.product_type_id, regionId, datasource]);
              sellPrice = refreshedSellResult.length > 0 ? refreshedSellResult[0].price : 0;
            }
            
            console.log(`[LP Blueprint] Synced orders for product type ${product.product_type_id}, new buy price: ${buyPrice}, new sell price: ${sellPrice}`);
          } catch (error) {
            console.error(`[LP Blueprint] Failed to sync orders for product type ${product.product_type_id}:`, error.message);
          }
        }
      }

      // 5. 计算LP兑换成本和总成本
      const LP_TO_ISK_RATIO = 1300;
      const lpTotalCost = bp.lp_cost * LP_TO_ISK_RATIO;
      const totalCost = materialCost + lpTotalCost + bp.isk_cost;

      // 6. 计算收益
      let buyProfit = productInfo ? (buyPrice * productInfo.quantity) - totalCost : 0;
      let sellProfit = productInfo ? (sellPrice * productInfo.quantity) - totalCost : 0;
      let profitPerLpBuy = bp.lp_cost > 0 ? buyProfit / bp.lp_cost : 0;
      let profitPerLpSell = bp.lp_cost > 0 ? sellProfit / bp.lp_cost : 0;
      let buyProfitRate = totalCost > 0 ? (buyProfit / totalCost) * 100 : 0;
      let sellProfitRate = totalCost > 0 ? (sellProfit / totalCost) * 100 : 0;
      
      // 如果有材料没有买卖订单，将每LP收益设为0
      if (hasMissingMaterials) {
        console.log(`[LP Blueprint] Missing order data for materials in blueprint ${typeId}, setting profit per LP to 0`);
        buyProfit = 0;
        sellProfit = 0;
        profitPerLpBuy = 0;
        profitPerLpSell = 0;
        buyProfitRate = 0;
        sellProfitRate = 0;
      }

      // 7. 从预计算表获取缓存数据（如果有）
      const [cachedProfit] = await pool.execute(`
        SELECT * FROM lp_blueprint_profits 
        WHERE type_id = ? AND region_id = ? AND datasource = ?
        LIMIT 1
      `, [typeId, regionId, datasource]);

      const profitData = cachedProfit.length > 0 ? cachedProfit[0] : null;

      // 8. 先计算动态成本和收益（在updateData之前）
      const lpToIskRatio = datasource.toLowerCase() === 'tranquility' ? 560 : 1300;
      const dynamicLpTotalCost = bp.lp_cost * lpToIskRatio;
      const dynamicTotalCost = materialCost + dynamicLpTotalCost + bp.isk_cost;
      
      // 计算收益
      let dynamicBuyProfit = productInfo ? (buyPrice * productInfo.quantity) - dynamicTotalCost : 0;
      let dynamicSellProfit = productInfo ? (sellPrice * productInfo.quantity) - dynamicTotalCost : 0;
      let dynamicProfitPerLpBuy = bp.lp_cost > 0 ? dynamicBuyProfit / bp.lp_cost : 0;
      let dynamicProfitPerLpSell = bp.lp_cost > 0 ? dynamicSellProfit / bp.lp_cost : 0;
      let dynamicTotalProfit = productInfo ? (dynamicBuyProfit + dynamicSellProfit) / 2 : 0;
      let dynamicProfitPerLp = bp.lp_cost > 0 ? dynamicTotalProfit / bp.lp_cost : 0;
      
      // 如果有材料没有买卖订单，将每LP收益设为0
      if (hasMissingMaterials) {
        dynamicBuyProfit = 0;
        dynamicSellProfit = 0;
        dynamicProfitPerLpBuy = 0;
        dynamicProfitPerLpSell = 0;
        dynamicTotalProfit = 0;
        dynamicProfitPerLp = 0;
      }
      
      // 更新lp_blueprint_profits表中的数据
      const updateData = {
        type_id: bp.type_id,
        offer_id: bp.offer_id,
        corporation_id: bp.corporation_id,
        region_id: regionId,
        lp_cost: bp.lp_cost,
        isk_cost: bp.isk_cost,
        material_cost: materialCost,
        total_cost: dynamicTotalCost,
        product_type_id: productInfo ? productInfo.type_id : null,
        product_buy_price: buyPrice,
        product_sell_price: sellPrice,
        // 列表展示用的中间价收益
        total_profit: dynamicTotalProfit,
        profit_per_lp: dynamicProfitPerLp,
        // 详情展示用的分开收益
        buy_profit: dynamicBuyProfit,
        sell_profit: dynamicSellProfit,
        profit_per_lp_buy: dynamicProfitPerLpBuy,
        profit_per_lp_sell: dynamicProfitPerLpSell,
        datasource
      };

      if (profitData) {
        // 更新现有记录
        await pool.execute(`
          UPDATE lp_blueprint_profits 
          SET 
            offer_id = ?, corporation_id = ?, region_id = ?,
            lp_cost = ?, isk_cost = ?, material_cost = ?, total_cost = ?,
            product_type_id = ?, product_buy_price = ?, product_sell_price = ?,
            total_profit = ?, profit_per_lp = ?,
            buy_profit = ?, sell_profit = ?,
            profit_per_lp_buy = ?, profit_per_lp_sell = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE type_id = ? AND region_id = ? AND datasource = ?
        `, [
          updateData.offer_id, updateData.corporation_id, updateData.region_id,
          updateData.lp_cost, updateData.isk_cost, updateData.material_cost, updateData.total_cost,
          updateData.product_type_id, updateData.product_buy_price, updateData.product_sell_price,
          updateData.total_profit, updateData.profit_per_lp,
          updateData.buy_profit, updateData.sell_profit,
          updateData.profit_per_lp_buy, updateData.profit_per_lp_sell,
          updateData.type_id, updateData.region_id, updateData.datasource
        ]);
      } else {
        // 插入新记录
        await pool.execute(`
          INSERT INTO lp_blueprint_profits 
          (type_id, offer_id, corporation_id, region_id, lp_cost, isk_cost, material_cost, 
           total_cost, product_type_id, product_buy_price, product_sell_price, 
           total_profit, profit_per_lp, buy_profit, sell_profit, 
           profit_per_lp_buy, profit_per_lp_sell, datasource, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [
          updateData.type_id, updateData.offer_id, updateData.corporation_id, updateData.region_id,
          updateData.lp_cost, updateData.isk_cost, updateData.material_cost, updateData.total_cost,
          updateData.product_type_id, updateData.product_buy_price, updateData.product_sell_price,
          updateData.total_profit, updateData.profit_per_lp,
          updateData.buy_profit, updateData.sell_profit,
          updateData.profit_per_lp_buy, updateData.profit_per_lp_sell,
          updateData.datasource
        ]);
      }

      // 9. 组装响应数据
      // 计算响应数据需要的额外字段
      const dynamicBuyProfitRate = dynamicTotalCost > 0 ? (dynamicBuyProfit / dynamicTotalCost) * 100 : 0;
      const dynamicSellProfitRate = dynamicTotalCost > 0 ? (dynamicSellProfit / dynamicTotalCost) * 100 : 0;
      
      // 处理蓝图出处信息
      const formattedSources = await Promise.all(blueprintSources.map(async source => {
        let corp = updatedCorps[source.corporation_id];
        let corporationName = `Corporation ${source.corporation_id}`;
        let corporationTicker = '';
        
        // 先从缓存中获取
        if (corp) {
          corporationName = corp.name;
          corporationTicker = corp.ticker || '';
        } else {
          // 从数据库中获取
          corp = await Corporation.findById(source.corporation_id, datasource);
          if (corp) {
            corporationName = corp.name;
            corporationTicker = corp.ticker || '';
          } else {
            // 从ESI接口实时获取并同步到数据库
            const corpData = await eveApiService.getCorporationInfo(source.corporation_id, datasource);
            if (corpData) {
              const formattedCorpData = {
                corporation_id: source.corporation_id,
                name: corpData.name,
                ticker: corpData.ticker,
                description: corpData.description,
                member_count: corpData.member_count,
                tax_rate: corpData.tax_rate,
                date_founded: corpData.date_founded,
                ceo_id: corpData.ceo_id,
                creator_id: corpData.creator_id,
                faction_id: corpData.faction_id,
                home_station_id: corpData.home_station_id,
                shares: corpData.shares,
                url: corpData.url
              };
              await Corporation.insertOrUpdate(formattedCorpData, datasource);
              corporationName = corpData.name;
              corporationTicker = corpData.ticker || '';
            }
          }
        }
        
        return {
          offer_id: source.offer_id,
          corporation_id: source.corporation_id,
          corporation_name: corporationName,
          corporation_ticker: corporationTicker,
          lp_cost: source.lp_cost,
          isk_cost: source.isk_cost,
          ak_cost: source.ak_cost
        };
      }));
      
      const response = {
        // 材料状态信息
        has_missing_materials: hasMissingMaterials,
        missing_materials: missingMaterials,
        // 蓝图基本信息
        offer_id: bp.offer_id,
        type_id: bp.type_id,
        type_name: bp.type_name,
        description: bp.description,
        corporation_id: bp.corporation_id,
        lp_cost: bp.lp_cost,
        isk_cost: bp.isk_cost,
        quantity: bp.quantity,
        
        // 材料信息
        materials: materialsWithCost,
        material_cost: materialCost,
        
        // 产品信息
        product: productInfo,
        product_buy_price: buyPrice,
        product_sell_price: sellPrice,
        
        // 成本信息
        lp_to_isk_ratio: lpToIskRatio,
        lp_total_cost: dynamicLpTotalCost,
        total_cost: dynamicTotalCost,
        
        // 收益信息
        buy_profit: dynamicBuyProfit,
        sell_profit: dynamicSellProfit,
        profit_per_lp_buy: dynamicProfitPerLpBuy,
        profit_per_lp_sell: dynamicProfitPerLpSell,
        buy_profit_rate: dynamicBuyProfitRate,
        sell_profit_rate: dynamicSellProfitRate,
        
        // 列表页需要的中间价收益数据
        total_profit: dynamicTotalProfit,
        profit_per_lp: dynamicProfitPerLp,
        
        // 蓝图出处信息
        blueprint_sources: formattedSources,
        has_multiple_sources: formattedSources.length > 1
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error getting blueprint details:', error);
      res.status(500).json({ message: 'Failed to get blueprint details', error: error.message });
    }
  }

  // 获取LP商店中的蓝图列表（用于LP蓝图制造模块）
  static async getLoyaltyBlueprints(req, res) {
    try {
      const pool = require('../config/database');
      const { corporationId = null, datasource = 'serenity', search = '', hasBuyOrder = false, regionId = '10000002', positiveProfit = false } = req.query;
  
  // 调试日志
  console.log('搜索参数接收:', { search, searchLength: search?.length, searchTrimmed: search?.trim() });

      // 如果需要过滤有买单的蓝图，先检查 region_types 更新时间
      if (hasBuyOrder === 'true') {
        const [updateCheck] = await pool.execute(
          `SELECT MAX(updated_at) as last_update FROM region_types WHERE region_id = ? AND datasource = ?`,
          [regionId, datasource]
        );
        const lastUpdate = updateCheck[0]?.last_update;
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        if (!lastUpdate || new Date(lastUpdate) < oneDayAgo) {
          // 数据超过1天，触发后台同步
          console.log(`region_types for region ${regionId} is outdated, triggering sync...`);
          const RegionController = require('./RegionController');
          RegionController.syncRegionTypesInBackground(regionId, datasource).catch(err => {
            console.error('Failed to sync region_types:', err.message);
          });
        }
      }

      // 构建WHERE条件部分
      let whereConditions = `lo.datasource = ?
          ${corporationId ? 'AND lo.corporation_id = ?' : ''}
          AND lo.type_id IN (SELECT DISTINCT blueprint_type_id FROM blueprint_products)
          AND lo.lp_cost > 0
          AND lo.isk_cost > 0
          AND lo.type_id NOT IN (
            SELECT DISTINCT lor.type_id FROM loyalty_offer_required_items lor
          )`;
      
      const trimmedSearch = search?.trim();
      if (trimmedSearch) {
        console.log('添加搜索条件:', { search: trimmedSearch, likePattern: `%${trimmedSearch}%` });
        whereConditions += ` AND t.name LIKE ?`;
      } else {
        console.log('搜索条件为空，不添加过滤');
      }

      // 过滤有买单的蓝图（使用 region_types 表判断）
      if (hasBuyOrder === 'true') {
        whereConditions += `
          AND lo.type_id IN (
            SELECT bp.blueprint_type_id 
            FROM blueprint_products bp 
            JOIN region_types rt ON rt.type_id = bp.product_type_id 
            WHERE rt.region_id = ? AND rt.datasource = ?
          )`;
      }

      // 过滤正收益蓝图（必须有计算数据且收益大于0）
      if (positiveProfit === 'true') {
        whereConditions += ` AND lbp.profit_per_lp IS NOT NULL AND lbp.profit_per_lp > 0`;
      }

      // 重新构建完整查询
      let query = `
        SELECT 
          lo.type_id,
          t.name as type_name,
          MAX(lbp.profit_per_lp) as profit_per_lp,
          MAX(lbp.total_profit) as total_profit,
          MAX(lbp.updated_at) as profit_updated_at,
          MAX(lbp.buy_profit) as buy_profit,
          MAX(lbp.sell_profit) as sell_profit,
          MAX(lbp.profit_per_lp_buy) as profit_per_lp_buy,
          MAX(lbp.profit_per_lp_sell) as profit_per_lp_sell,
          MAX(lbp.product_buy_price) as product_buy_price,
          MAX(lbp.product_sell_price) as product_sell_price,
          MAX(lbp.total_cost) as total_cost,
          MAX(lbp.material_cost) as material_cost,
          -- 取第一个出现的offer信息
          MIN(lo.offer_id) as offer_id,
          MIN(lo.corporation_id) as corporation_id,
          MIN(lo.quantity) as quantity,
          MIN(lo.lp_cost) as lp_cost,
          MIN(lo.isk_cost) as isk_cost,
          MIN(lo.ak_cost) as ak_cost
        FROM loyalty_offers lo
        LEFT JOIN types t ON lo.type_id = t.id
        LEFT JOIN lp_blueprint_profits lbp ON lbp.type_id = lo.type_id AND lbp.region_id = ? AND lbp.datasource = ?
        WHERE ${whereConditions}
        GROUP BY lo.type_id, t.name
        ORDER BY profit_per_lp DESC, t.name ASC
      `;
      
      // 构建参数数组
      const params = [regionId, datasource, datasource];
      if (corporationId) params.push(corporationId);
      if (trimmedSearch) params.push(`%${trimmedSearch}%`);
      if (hasBuyOrder === 'true') params.push(regionId, datasource);

      // 移除原有的ORDER BY，因为主查询中已经有ORDER BY
      // query += ` ORDER BY lbp.profit_per_lp DESC, t.name ASC`;
      
      // 调试日志：显示最终SQL和参数
      console.log('最终SQL查询:', query);
      console.log('SQL参数:', params);

      const [rows] = await pool.execute(query, params);
      res.status(200).json(rows);
    } catch (error) {
      console.error('Error getting loyalty blueprints:', error);
      res.status(500).json({ message: 'Failed to get loyalty blueprints', error: error.message });
    }
  }
}

module.exports = LoyaltyController;