const pool = require('../config/database');
const LpBlueprintProfit = require('../models/LpBlueprintProfit');
const Order = require('../models/Order');
const LoyaltySkipItem = require('../models/LoyaltySkipItem');
const eveApiService = require('../services/eveApiService');

// 默认区域ID
const DEFAULT_REGION_ID = 10000002;
const DEFAULT_DATASOURCE = 'serenity';

// LP兑换比例（可配置）
const LP_TO_ISK_RATIO = 1300;

// 订单缓存时间（毫秒）2小时
const ORDER_CACHE_TIME = 2 * 60 * 60 * 1000;

// 定时器状态
let schedulerInterval = null;
let isCalculating = false;

/**
 * 获取有收购订单的蓝图列表
 */
async function getBlueprintsWithBuyOrders(regionId, datasource) {
  // 1. 获取所有符合基本条件的蓝图
  const [allBlueprints] = await pool.execute(`
    SELECT DISTINCT lo.offer_id, lo.corporation_id, lo.type_id, lo.quantity, lo.lp_cost, lo.isk_cost, t.name as type_name
    FROM loyalty_offers lo
    LEFT JOIN types t ON lo.type_id = t.id
    WHERE lo.datasource = ?
      AND lo.type_id IN (SELECT DISTINCT blueprint_type_id FROM blueprint_products)
      AND lo.lp_cost > 0
      AND lo.isk_cost > 0
    `, [datasource]);

  if (allBlueprints.length === 0) {
    return [];
  }

  // 2. 获取每个蓝图的产品类型
  const blueprintProductMap = new Map();
  for (const bp of allBlueprints) {
    const [products] = await pool.execute(
      `SELECT product_type_id FROM blueprint_products WHERE blueprint_type_id = ? AND activity_type = 'manufacturing' LIMIT 1`,
      [bp.type_id]
    );
    if (products.length > 0) {
      blueprintProductMap.set(bp.type_id, products[0].product_type_id);
    }
  }

  // 3. 检查每个产品是否有区域市场数据，没有则尝试从ESI同步
  const validBlueprints = [];
  for (const bp of allBlueprints) {
    const productTypeId = blueprintProductMap.get(bp.type_id);
    if (!productTypeId) {
      console.log(`[LP Scheduler] Skip blueprint ${bp.type_name || bp.type_id} (no product)`);
      continue;
    }

    // 先检查本地是否有该产品的区域数据
    const [hasLocalData] = await pool.execute(
      `SELECT 1 FROM region_types WHERE region_id = ? AND type_id = ? AND datasource = ? LIMIT 1`,
      [regionId, productTypeId, datasource]
    );

    if (hasLocalData.length > 0) {
      validBlueprints.push(bp);
      continue;
    }

    // 本地没有数据，尝试从ESI同步该产品的订单
    console.log(`[LP Scheduler] Syncing product ${productTypeId} for blueprint ${bp.type_name || bp.type_id}...`);
    try {
      // 同步订单数据
      await syncOrdersFromESI(productTypeId, regionId, datasource);
      
      // 检查同步后是否有订单数据
      const [hasOrders] = await pool.execute(
        `SELECT 1 FROM orders WHERE region_id = ? AND type_id = ? AND datasource = ? LIMIT 1`,
        [regionId, productTypeId, datasource]
      );
      
      if (hasOrders.length > 0) {
        // 如果同步到了订单数据，添加到region_types表
        await pool.execute(
          `INSERT IGNORE INTO region_types (region_id, type_id, datasource, updated_at) VALUES (?, ?, ?, NOW())`,
          [regionId, productTypeId, datasource]
        );
        validBlueprints.push(bp);
        console.log(`[LP Scheduler] Added blueprint ${bp.type_name || bp.type_id} (synced from ESI)`);
      } else {
        console.log(`[LP Scheduler] Skip blueprint ${bp.type_name || bp.type_id} (no orders found after sync)`);
      }
    } catch (error) {
      console.error(`[LP Scheduler] Failed to sync product ${productTypeId} for blueprint ${bp.type_name || bp.type_id}:`, error.message);
    }
  }

  console.log(`[LP Scheduler] Found ${validBlueprints.length} valid blueprints with market data`);
  return validBlueprints;
}

/**
 * 检查本地订单是否存在且有效
 * @param {number} typeId - 物品类型ID
 * @param {number} regionId - 区域ID
 * @param {string} datasource - 数据源
 * @param {boolean} isBuyOrder - 是否为买单
 * @returns {Object} { hasOrder, price, needRefresh }
 */
async function checkLocalOrder(typeId, regionId, datasource, isBuyOrder) {
  const orderType = isBuyOrder ? 1 : 0;
  const orderTypeStr = isBuyOrder ? 'buy' : 'sell';
  
  // 查询最新订单
  let query, params;
  if (isBuyOrder) {
    query = `SELECT price, updated_at FROM orders WHERE type_id = ? AND region_id = ? AND datasource = ? AND is_buy_order = 1 ORDER BY price DESC LIMIT 1`;
  } else {
    query = `SELECT price, updated_at FROM orders WHERE type_id = ? AND region_id = ? AND datasource = ? AND is_buy_order = 0 ORDER BY price ASC LIMIT 1`;
  }
  
  const [orders] = await pool.execute(query, [typeId, regionId, datasource]);
  
  if (orders.length === 0) {
    return { hasOrder: false, price: 0, needRefresh: true };
  }
  
  const order = orders[0];
  const now = Date.now();
  const orderTime = new Date(order.updated_at).getTime();
  const needRefresh = (now - orderTime) > ORDER_CACHE_TIME;
  
  return {
    hasOrder: true,
    price: parseFloat(order.price),
    needRefresh
  };
}

/**
 * 从ESI同步订单数据
 */
async function syncOrdersFromESI(typeId, regionId, datasource) {
  try {
    console.log(`[LP Scheduler] Syncing orders for type ${typeId}...`);
    
    // 删除该区域和类型的1小时之前的订单数据
    const deletedCount = await Order.deleteOlderThanOneHourByRegionAndType(regionId, typeId, datasource);
    console.log(`[LP Scheduler] Deleted ${deletedCount} outdated orders for type ${typeId}`);
    
    // 定义处理订单数据的回调函数
    const processOrders = async (orders, page) => {
      console.log(`[LP Scheduler] Processing page ${page} with ${orders.length} orders for type ${typeId}`);
      
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
    await eveApiService.getAllMarketOrdersByRegionAndType(
      regionId, 
      typeId, 
      'buy', 
      1,
      processOrders,
      datasource
    );

    // 获取卖出订单
    await eveApiService.getAllMarketOrdersByRegionAndType(
      regionId, 
      typeId, 
      'sell', 
      1,
      processOrders,
      datasource
    );

    console.log(`[LP Scheduler] Order sync completed for type ${typeId}`);
  } catch (error) {
    console.error(`[LP Scheduler] Failed to sync orders for type ${typeId}:`, error.message);
    throw error;
  }
}

/**
 * 获取订单价格（优先本地，必要时从ESI同步，最后回退到类型平均价格）
 */
async function getOrderPrice(typeId, regionId, datasource, isBuyOrder) {
  const checkResult = await checkLocalOrder(typeId, regionId, datasource, isBuyOrder);
  
  if (checkResult.hasOrder && !checkResult.needRefresh) {
    // 使用本地缓存数据
    return checkResult.price;
  }
  
  // 尝试从ESI同步订单数据
  try {
    console.log(`[LP Scheduler] Syncing orders from ESI for type ${typeId}...`);
    await syncOrdersFromESI(typeId, regionId, datasource);
    
    // 重新查询本地数据
    const refreshResult = await checkLocalOrder(typeId, regionId, datasource, isBuyOrder);
    if (refreshResult.hasOrder) {
      console.log(`[LP Scheduler] Got price from ESI for type ${typeId}: ${refreshResult.price}`);
      return refreshResult.price;
    }
  } catch (error) {
    console.error(`[LP Scheduler] Failed to sync orders for type ${typeId}:`, error.message);
    // 如果同步失败但有旧数据，返回旧数据
    if (checkResult.hasOrder) {
      console.log(`[LP Scheduler] Using stale data for type ${typeId}: ${checkResult.price}`);
      return checkResult.price;
    }
  }
  
  // 最后回退到使用类型的平均价格
  try {
    const [typeInfo] = await pool.execute(
      `SELECT average_price FROM types WHERE id = ?`,
      [typeId]
    );
    
    if (typeInfo.length > 0 && typeInfo[0].average_price > 0) {
      const averagePrice = typeInfo[0].average_price;
      console.log(`[LP Scheduler] Using average price for type ${typeId}: ${averagePrice}`);
      return averagePrice;
    }
  } catch (error) {
    console.error(`[LP Scheduler] Failed to get average price for type ${typeId}:`, error.message);
  }
  
  // 所有方法都失败，返回0
  console.warn(`[LP Scheduler] No price available for type ${typeId}, returning 0`);
  return 0;
}

/**
 * 计算单个蓝图的收益
 */
async function calculateBlueprintProfit(blueprint, regionId, datasource) {
  const { type_id, offer_id, corporation_id, lp_cost, isk_cost } = blueprint;

  // 1. 获取蓝图制造材料
  const [materials] = await pool.execute(
    `SELECT material_type_id, quantity FROM blueprint_materials WHERE blueprint_type_id = ? AND activity_type = 'manufacturing'`,
    [type_id]
  );

  // 2. 计算材料成本（使用本地订单或从ESI同步）
  let materialCost = 0;
  for (const mat of materials) {
    const price = await getOrderPrice(mat.material_type_id, regionId, datasource, false); // 使用卖价（最低价）
    if (price > 0) {
      materialCost += price * mat.quantity;
    }
  }

  // 3. 计算LP兑换ISK成本
  const lpTotalCost = lp_cost * LP_TO_ISK_RATIO;
  const totalCost = materialCost + lpTotalCost;

  // 4. 获取产品类型
  const [products] = await pool.execute(
    `SELECT product_type_id, quantity FROM blueprint_products WHERE blueprint_type_id = ? AND activity_type = 'manufacturing' LIMIT 1`,
    [type_id]
  );

  if (products.length === 0) {
    return null; // 没有制造产品
  }

  const productTypeId = products[0].product_type_id;
  const productQuantity = products[0].quantity;

  // 5. 获取产品最高买价和最低卖价
  const productBuyPrice = await getOrderPrice(productTypeId, regionId, datasource, true);
  const productSellPrice = await getOrderPrice(productTypeId, regionId, datasource, false);

  // 6. 计算买单和卖单各自的收益（用于详情展示）
  const buyProfit = productBuyPrice - totalCost;
  const sellProfit = productSellPrice - totalCost;
  const profitPerLpBuy = lp_cost > 0 ? buyProfit / lp_cost : 0;
  const profitPerLpSell = lp_cost > 0 ? sellProfit / lp_cost : 0;

  // 7. 计算列表展示用的收益，根据不同情况使用不同逻辑
  let totalProfit, profitPerLp;
  
  // 情况1：无订单（买价和卖价都为0）
  if (productBuyPrice === 0 && productSellPrice === 0) {
    totalProfit = -10000 * lp_cost; // 固定每LP收益-10000
    profitPerLp = -10000;
  }
  // 情况2：买单收益小于0
  else if (profitPerLpBuy < 0) {
    totalProfit = buyProfit;
    profitPerLp = profitPerLpBuy;
  }
  // 情况3：买单和卖单收益都大于0，使用中间价
  else {
    const midPrice = (productBuyPrice + productSellPrice) / 2;
    totalProfit = midPrice - totalCost;
    profitPerLp = lp_cost > 0 ? totalProfit / lp_cost : 0;
  }

  return {
    type_id,
    offer_id,
    corporation_id,
    region_id: regionId,
    lp_cost,
    isk_cost,
    material_cost: materialCost,
    total_cost: totalCost,
    product_type_id: productTypeId,
    product_buy_price: productBuyPrice,
    product_sell_price: productSellPrice,
    // 列表展示用的中间价收益
    total_profit: totalProfit,
    profit_per_lp: profitPerLp,
    // 详情展示用的分开收益
    buy_profit: buyProfit,
    sell_profit: sellProfit,
    profit_per_lp_buy: profitPerLpBuy,
    profit_per_lp_sell: profitPerLpSell,
    datasource
  };
}

/**
 * 执行一次计算
 */
async function runCalculation() {
  if (isCalculating) {
    console.log('[LP Blueprint Scheduler] Already calculating, skip...');
    return;
  }

  isCalculating = true;
  try {
    console.log(`[LP Blueprint Scheduler] Starting calculation...`);

    const regionId = DEFAULT_REGION_ID;
    const datasources = ['serenity', 'infinity', 'tranquility'];

    for (const datasource of datasources) {
      try {
        console.log(`\n[LP Blueprint Scheduler] Processing datasource: ${datasource} >>>`);

        // 删除超过1天的跳过记录
        await LoyaltySkipItem.deleteOldSkipItems(datasource);

        // 获取有收购订单的蓝图列表
        const blueprints = await getBlueprintsWithBuyOrders(regionId, datasource);
        if (blueprints.length === 0) {
          console.log(`[LP Blueprint Scheduler] No blueprints with buy orders found for ${datasource}`);
          continue;
        }

        // 获取已计算的蓝图（包含收益信息）
        const calculatedList = await LpBlueprintProfit.getAllCalculated(regionId, datasource);
        const calculatedMap = new Map(calculatedList.map(r => [r.type_id, r]));

        // 找出未计算的蓝图
        const uncalculated = blueprints.filter(bp => !calculatedMap.has(bp.type_id));

        let targetBlueprint = null;

        if (uncalculated.length > 0) {
          // 优先计算未计算的蓝图
          targetBlueprint = uncalculated[0];
          console.log(`[LP Blueprint Scheduler] Calculating new blueprint for ${datasource}: ${targetBlueprint.type_name || targetBlueprint.type_id}`);
        } else {
          // 所有蓝图都已计算，更新最老的记录（排除负收益且未过期7天的）
          const oldest = await LpBlueprintProfit.getOldestRecord(regionId, datasource);
          if (oldest) {
            targetBlueprint = blueprints.find(bp => bp.type_id === oldest.type_id);
            if (targetBlueprint) {
              console.log(`[LP Blueprint Scheduler] Updating oldest record for ${datasource}: ${targetBlueprint.type_name || targetBlueprint.type_id}`);
            } else {
              console.log(`[LP Blueprint Scheduler] Blueprint with type_id ${oldest.type_id} not found in blueprints list for ${datasource}, skipping...`);
            }
          }
        }

        if (targetBlueprint) {
          const profitData = await calculateBlueprintProfit(targetBlueprint, regionId, datasource);
          if (profitData) {
            await LpBlueprintProfit.upsert(profitData);
            console.log(`[LP Blueprint Scheduler] Calculated for ${datasource}: ${targetBlueprint.type_name || targetBlueprint.type_id}, profit_per_lp: ${profitData.profit_per_lp.toFixed(2)}`);
          } else {
            // 如果没有计算出收益数据（可能是因为无订单），插入保底数据
            console.log(`[LP Blueprint Scheduler] Inserting fallback data for blueprint: ${targetBlueprint.type_name || targetBlueprint.type_id}`);
            
            // 插入保底数据（收益为0，status标记为'no_orders'）
            const fallbackData = {
              type_id: targetBlueprint.type_id,
              offer_id: targetBlueprint.offer_id,
              corporation_id: targetBlueprint.corporation_id,
              region_id: regionId,
              lp_cost: targetBlueprint.lp_cost,
              isk_cost: targetBlueprint.isk_cost,
              material_cost: 0,
              total_cost: targetBlueprint.lp_cost * LP_TO_ISK_RATIO + targetBlueprint.isk_cost,
              product_type_id: null,
              product_buy_price: 0,
              product_sell_price: 0,
              total_profit: 0,
              profit_per_lp: 0,
              buy_profit: 0,
              sell_profit: 0,
              profit_per_lp_buy: 0,
              profit_per_lp_sell: 0,
              status: 'no_orders',
              datasource: datasource
            };
            
            await LpBlueprintProfit.upsert(fallbackData);
            console.log(`[LP Blueprint Scheduler] Fallback data inserted for blueprint: ${targetBlueprint.type_name || targetBlueprint.type_id}`);
          }
        } else {
          console.log(`[LP Blueprint Scheduler] No valid blueprint to calculate for ${datasource}`);
        }

        console.log(`[LP Blueprint Scheduler] Completed datasource: ${datasource} <<<\n`);
      } catch (error) {
        console.error(`[LP Blueprint Scheduler] Error processing datasource ${datasource}:`, error.message);
      }
    }

  } catch (error) {
    console.error('[LP Blueprint Scheduler] Error during calculation:', error);
  } finally {
    isCalculating = false;
  }
}

/**
 * 启动定时任务
 */
function startScheduler() {
  // 立即执行一次
  runCalculation().catch(console.error);

  // 每5分钟执行一次
  schedulerInterval = setInterval(() => {
    runCalculation().catch(console.error);
  }, 5 * 60 * 1000);

  console.log('[LP Blueprint Scheduler] Started');
}

/**
 * 停止定时任务
 */
function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[LP Blueprint Scheduler] Stopped');
  }
}

module.exports = {
  startScheduler,
  stopScheduler,
  runCalculation,
  calculateBlueprintProfit,
  checkLocalOrder,
  getOrderPrice,
  syncOrdersFromESI,
  getBlueprintsWithBuyOrders
};
