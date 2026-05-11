const pool = require('../config/database');
const LpBlueprintProfit = require('../models/LpBlueprintProfit');

// 默认区域ID
const DEFAULT_REGION_ID = 10000002;
const DEFAULT_DATASOURCE = 'serenity';

// LP兑换比例（可配置）
const LP_TO_ISK_RATIO = 1300;

// 定时器状态
let schedulerInterval = null;
let isCalculating = false;

/**
 * 获取有收购订单的蓝图列表
 */
async function getBlueprintsWithBuyOrders(regionId, datasource) {
  const [rows] = await pool.execute(`
    SELECT DISTINCT lo.offer_id, lo.corporation_id, lo.type_id, lo.quantity, lo.lp_cost, lo.isk_cost, t.name as type_name
    FROM loyalty_offers lo
    LEFT JOIN types t ON lo.type_id = t.id
    WHERE lo.datasource = ?
      AND lo.type_id IN (SELECT DISTINCT blueprint_type_id FROM blueprint_products)
      AND lo.lp_cost > 0
      AND lo.isk_cost > 0
      AND lo.type_id NOT IN (SELECT DISTINCT lor.type_id FROM loyalty_offer_required_items lor)
      AND lo.type_id IN (
        SELECT bp.blueprint_type_id 
        FROM blueprint_products bp 
        JOIN region_types rt ON rt.type_id = bp.product_type_id 
        WHERE rt.region_id = ? AND rt.datasource = ?
      )
  `, [datasource, regionId, datasource]);
  return rows;
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

  // 2. 计算材料成本
  let materialCost = 0;
  for (const mat of materials) {
    const [orders] = await pool.execute(
      `SELECT price FROM orders WHERE type_id = ? AND region_id = ? AND datasource = ? AND is_buy_order = 0 ORDER BY price ASC LIMIT 1`,
      [mat.material_type_id, regionId, datasource]
    );
    if (orders.length > 0) {
      materialCost += orders[0].price * mat.quantity;
    }
  }

  // 3. LP兑换成本
  const lpToIskCost = lp_cost * LP_TO_ISK_RATIO;
  const totalCost = materialCost + lpToIskCost + isk_cost;

  // 4. 获取制造产品
  const [products] = await pool.execute(
    `SELECT product_type_id, quantity FROM blueprint_products WHERE blueprint_type_id = ? AND activity_type = 'manufacturing'`,
    [type_id]
  );

  let productTypeId = null;
  let productBuyPrice = 0;
  let productSellPrice = 0;

  if (products.length > 0) {
    productTypeId = products[0].product_type_id;
    const productQuantity = products[0].quantity;

    // 获取产品最高买价
    const [buyOrders] = await pool.execute(
      `SELECT price FROM orders WHERE type_id = ? AND region_id = ? AND datasource = ? AND is_buy_order = 1 ORDER BY price DESC LIMIT 1`,
      [productTypeId, regionId, datasource]
    );
    if (buyOrders.length > 0) {
      productBuyPrice = buyOrders[0].price;
    }

    // 获取产品最低卖价
    const [sellOrders] = await pool.execute(
      `SELECT price FROM orders WHERE type_id = ? AND region_id = ? AND datasource = ? AND is_buy_order = 0 ORDER BY price ASC LIMIT 1`,
      [productTypeId, regionId, datasource]
    );
    if (sellOrders.length > 0) {
      productSellPrice = sellOrders[0].price;
    }
  }

  // 5. 计算收益
  const totalProfit = productBuyPrice - totalCost;
  const profitPerLp = lp_cost > 0 ? totalProfit / lp_cost : 0;

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
    total_profit: totalProfit,
    profit_per_lp: profitPerLp,
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
    const regionId = DEFAULT_REGION_ID;
    const datasource = DEFAULT_DATASOURCE;

    // 获取有收购订单的蓝图列表
    const blueprints = await getBlueprintsWithBuyOrders(regionId, datasource);
    if (blueprints.length === 0) {
      console.log('[LP Blueprint Scheduler] No blueprints with buy orders found');
      return;
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
      console.log(`[LP Blueprint Scheduler] Calculating new blueprint: ${targetBlueprint.type_name || targetBlueprint.type_id}`);
    } else {
      // 所有蓝图都已计算，更新最老的记录（排除负收益且未过期7天的）
      const oldest = await LpBlueprintProfit.getOldestRecord(regionId, datasource);
      if (oldest) {
        targetBlueprint = blueprints.find(bp => bp.type_id === oldest.type_id);
        console.log(`[LP Blueprint Scheduler] Updating oldest blueprint: ${targetBlueprint?.type_name || oldest.type_id}`);
      } else {
        console.log('[LP Blueprint Scheduler] All blueprints are negative profit and not expired');
      }
    }

    if (!targetBlueprint) {
      console.log('[LP Blueprint Scheduler] No blueprint to calculate');
      return;
    }

    // 计算收益
    const profitData = await calculateBlueprintProfit(targetBlueprint, regionId, datasource);

    // 保存到数据库
    await LpBlueprintProfit.upsert(profitData);

    console.log(`[LP Blueprint Scheduler] Calculated: ${targetBlueprint.type_name || targetBlueprint.type_id}, profit_per_lp: ${profitData.profit_per_lp.toFixed(2)}`);
  } catch (error) {
    console.error('[LP Blueprint Scheduler] Error:', error.message);
  } finally {
    isCalculating = false;
  }
}

/**
 * 启动定时器
 */
function startScheduler() {
  console.log('[LP Blueprint Scheduler] Starting...');
  
  // 创建表
  LpBlueprintProfit.createTable().catch(err => {
    console.error('[LP Blueprint Scheduler] Failed to create table:', err.message);
  });

  // 延迟5秒后执行一次
  setTimeout(() => {
    runCalculation();
  }, 5000);

  // 每5分钟执行一次
  schedulerInterval = setInterval(runCalculation, 5 * 60 * 1000);
}

/**
 * 停止定时器
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
  runCalculation
};
