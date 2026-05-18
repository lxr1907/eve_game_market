const Killmail = require('../models/Killmail');
const EveSsoCode = require('../models/EveSsoCode');
const { getValidTokenWithRefresh } = require('./EveSsoController');
const pool = require('../config/database');

// 默认使用吉他海空间站所在区域（The Forge）
const DEFAULT_REGION_ID = 10000002;

// 根据数据源获取对应的ESI基础URL
const getEsiBaseUrl = (datasource) => {
  if (datasource.toLowerCase() === 'tranquility') {
    return 'https://esi.evetech.net/latest';
  }
  return 'https://ali-esi.evepc.163.com/latest';
};

// 从orders表获取物品价格
const getItemPriceFromOrders = async (typeId, regionId = DEFAULT_REGION_ID, datasource = 'serenity') => {
  try {
    // 查询最低卖单 (is_buy_order = 0 表示卖单)
    const [sellOrders] = await pool.execute(
      `SELECT MIN(price) as min_sell FROM orders
       WHERE type_id = ? AND region_id = ? AND datasource = ? AND is_buy_order = 0`,
      [typeId, regionId, datasource]
    );

    // 查询最高买单 (is_buy_order = 1 表示买单)
    const [buyOrders] = await pool.execute(
      `SELECT MAX(price) as max_buy FROM orders
       WHERE type_id = ? AND region_id = ? AND datasource = ? AND is_buy_order = 1`,
      [typeId, regionId, datasource]
    );
    
    // 确保转换为数字（MySQL DECIMAL 返回字符串）
    const minSell = sellOrders[0]?.min_sell ? parseFloat(sellOrders[0].min_sell) : null;
    const maxBuy = buyOrders[0]?.max_buy ? parseFloat(buyOrders[0].max_buy) : null;
    
    console.log(`[Price] type ${typeId} in region ${regionId}: minSell=${minSell}, maxBuy=${maxBuy}`);
    
    return { minSell, maxBuy };
  } catch (error) {
    console.error(`Error getting price for type ${typeId}:`, error.message);
    return { minSell: null, maxBuy: null };
  }
};

// 从ESI同步指定物品的订单数据
const syncOrdersForType = async (typeId, regionId = DEFAULT_REGION_ID, datasource = 'serenity') => {
  try {
    console.log(`Syncing orders for type ${typeId} in region ${regionId}...`);
    
    const esiBaseUrl = getEsiBaseUrl(datasource);
    const url = `${esiBaseUrl}/markets/${regionId}/orders/?datasource=${datasource}&type_id=${typeId}`;
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch orders: ${response.status}`);
    }
    
    const orders = await response.json();
    
    // 保存订单到数据库
    for (const order of orders) {
      // 确保 is_buy_order 是数字 0 或 1
      const isBuyOrder = order.is_buy_order ? 1 : 0;

      await pool.execute(
        `INSERT INTO orders (
          order_id, region_id, type_id, is_buy_order, price,
          volume_remaining, volume_total, minimum_volume, order_range,
          location_id, duration, is_active, datasource
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          price = VALUES(price),
          volume_remaining = VALUES(volume_remaining),
          location_id = VALUES(location_id),
          is_buy_order = VALUES(is_buy_order),
          is_active = VALUES(is_active)`,
        [
          order.order_id,
          regionId,
          order.type_id,
          isBuyOrder,
          order.price,
          order.volume_remain,
          order.volume_total,
          order.min_volume || 1,
          order.range || 'region',
          order.location_id,
          order.duration || 90,
          1, // is_active = 1
          datasource
        ]
      );
    }
    
    console.log(`Synced ${orders.length} orders for type ${typeId}`);
    return orders.length;
  } catch (error) {
    console.error(`Error syncing orders for type ${typeId}:`, error.message);
    return 0;
  }
};

// 计算单个物品的估值
const calculateItemValue = async (item, regionId = DEFAULT_REGION_ID, datasource = 'serenity') => {
  const typeId = item.item_type_id;
  if (!typeId) return { value: 0, unitPrice: 0 };
  
  let { minSell, maxBuy } = await getItemPriceFromOrders(typeId, regionId, datasource);
  
  // 如果没有订单数据，尝试同步
  if (minSell === null && maxBuy === null) {
    console.log(`No orders found for type ${typeId}, syncing...`);
    const syncedCount = await syncOrdersForType(typeId, regionId, datasource);
    console.log(`Synced ${syncedCount} orders for type ${typeId}`);
    // 重新查询
    ({ minSell, maxBuy } = await getItemPriceFromOrders(typeId, regionId, datasource));
    console.log(`After sync, type ${typeId}: minSell=${minSell}, maxBuy=${maxBuy}`);
  }
  
  let unitPrice = 0;
  
  if (minSell !== null && maxBuy !== null) {
    // 有买卖单：(最低卖单 + 最高买单) / 2
    unitPrice = (minSell + maxBuy) / 2;
  } else if (minSell !== null) {
    // 只有卖单：最低卖单
    unitPrice = minSell;
  } else if (maxBuy !== null) {
    // 只有买单：最高买单 * 2
    unitPrice = maxBuy * 2;
  } else {
    // 仍然没有订单，返回0
    console.log(`No orders available for type ${typeId} after sync`);
    return { value: 0, unitPrice: 0 };
  }
  
  // 计算总价值（掉落 + 摧毁）
  const totalQuantity = (item.quantity_dropped || 0) + (item.quantity_destroyed || 0);
  const value = unitPrice * totalQuantity;
  
  return { value, unitPrice, minSell, maxBuy };
};

// 计算所有物品的估值
const calculateItemsValue = async (items, regionId = DEFAULT_REGION_ID, datasource = 'serenity') => {
  let totalValue = 0;
  const itemsWithValue = [];
  
  for (const item of items) {
    const { value, unitPrice, minSell, maxBuy } = await calculateItemValue(item, regionId, datasource);
    
    // 处理嵌套items（集装箱内的物品）
    let nestedItemsWithValue = [];
    let nestedValue = 0;
    if (item.items && item.items.length > 0) {
      for (const nestedItem of item.items) {
        const nestedResult = await calculateItemValue(nestedItem, regionId, datasource);
        nestedItemsWithValue.push({
          ...nestedItem,
          unit_price: nestedResult.unitPrice,
          value: nestedResult.value
        });
        nestedValue += nestedResult.value;
      }
    }
    
    const itemTotalValue = value + nestedValue;
    totalValue += itemTotalValue;
    
    itemsWithValue.push({
      ...item,
      unit_price: parseFloat(unitPrice.toFixed(2)),
      value: parseFloat(itemTotalValue.toFixed(2)),
      item_value: parseFloat(value.toFixed(2)),
      nested_value: parseFloat(nestedValue.toFixed(2)),
      items: nestedItemsWithValue,
      price_info: { minSell, maxBuy }
    });
  }
  
  return { totalValue: parseFloat(totalValue.toFixed(2)), itemsWithValue };
};

// 从ESI获取角色最近击毁记录
const fetchRecentKillmails = async (characterId, accessToken, datasource = 'serenity') => {
  const ESI_BASE_URL = getEsiBaseUrl(datasource);
  const url = `${ESI_BASE_URL}/characters/${characterId}/killmails/recent/?datasource=${datasource}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch killmails: ${response.status}`);
  }
  
  return await response.json();
};

// 从ESI获取击毁详情
const fetchKillmailDetail = async (killmailId, killmailHash, datasource = 'serenity') => {
  const esiBaseUrl = getEsiBaseUrl(datasource);
  const url = `${esiBaseUrl}/killmails/${killmailId}/${killmailHash}/?datasource=${datasource}`;
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch killmail detail: ${response.status}`);
  }
  
  return await response.json();
};

// 同步角色KB数据
const syncCharacterKB = async (req, res) => {
  try {
    const { character_id } = req.params;
    const datasource = req.query.datasource || 'serenity';
    
    // 获取有效的token（自动刷新如果需要）
    const tokenData = await getValidTokenWithRefresh(character_id, datasource);
    
    if (!tokenData || !tokenData.access_token) {
      return res.status(401).json({ 
        success: false, 
        error: '未找到有效的授权令牌，请重新登录授权' 
      });
    }
    
    console.log(`Syncing KB for character ${character_id} on ${datasource}`);
    
    // 获取最近击毁记录列表
    const killmailsList = await fetchRecentKillmails(character_id, tokenData.access_token, datasource);
    
    console.log(`Found ${killmailsList.length} killmails`);
    
    let savedCount = 0;
    let errorCount = 0;
    
    // 逐个获取详情并保存
    for (const km of killmailsList) {
      try {
        const detail = await fetchKillmailDetail(km.killmail_id, km.killmail_hash, datasource);
        
        // 解析击毁数据（带估值计算）
        const killmailData = await parseKillmailDetail(detail, km.killmail_hash, datasource);
        
        console.log(`Killmail ${km.killmail_id}: calculated value = ${killmailData.total_value.toLocaleString()} ISK`);
        
        // 保存到数据库
        try {
          await Killmail.saveKillmail(killmailData, datasource);
          savedCount++;
        } catch (dbErr) {
          console.error(`DB error for killmail ${km.killmail_id}:`, dbErr.message, dbErr.sql || '');
          console.error('killmailData keys:', Object.keys(killmailData));
          throw dbErr;
        }
        
        // 避免请求过快
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (e) {
        console.error(`Error saving killmail ${km.killmail_id}:`, e.message, e.sql || '');
        errorCount++;
      }
    }
    
    // 更新统计
    const stats = await Killmail.updateCharacterStats(character_id, datasource);
    
    res.json({
      success: true,
      character_id,
      datasource,
      total_found: killmailsList.length,
      saved: savedCount,
      errors: errorCount,
      stats
    });
    
  } catch (error) {
    console.error('Sync KB error:', error);
    res.status(500).json({ 
      success: false, 
      error: '同步KB数据失败', 
      message: error.message 
    });
  }
};

// 解析击毁详情（基础数据）
const parseKillmailDetailBasic = (detail, killmailHash) => {
  const victim = detail.victim || {};
  const attackers = detail.attackers || [];
  
  // 找到最后一击的攻击者
  const finalBlow = attackers.find(a => a.final_blow === true) || attackers[0] || {};
  
  // victim items（原始数据）
  const victimItems = (victim.items || []).map(item => ({
    item_type_id: item.item_type_id || null,
    quantity_dropped: item.quantity_dropped || 0,
    quantity_destroyed: item.quantity_destroyed || 0,
    flag: item.flag || null,
    singleton: item.singleton || 0,
    // 嵌套items（集装箱内的物品）
    items: (item.items || []).map(nestedItem => ({
      item_type_id: nestedItem.item_type_id || null,
      quantity_dropped: nestedItem.quantity_dropped || 0,
      quantity_destroyed: nestedItem.quantity_destroyed || 0,
      flag: nestedItem.flag || null,
      singleton: nestedItem.singleton || 0
    }))
  }));
  
  // 所有攻击者完整数据
  const attackersData = attackers.map(attacker => ({
    character_id: attacker.character_id || null,
    corporation_id: attacker.corporation_id || null,
    alliance_id: attacker.alliance_id || null,
    faction_id: attacker.faction_id || null,
    ship_type_id: attacker.ship_type_id || null,
    weapon_type_id: attacker.weapon_type_id || null,
    damage_done: attacker.damage_done || 0,
    final_blow: attacker.final_blow || false,
    security_status: attacker.security_status || null
  }));
  
  return {
    killmail_id: detail.killmail_id,
    killmail_hash: killmailHash || detail.killmail_hash || null,
    killmail_time: detail.killmail_time,
    solar_system_id: detail.solar_system_id,
    solar_system_name: null,
    victim_character_id: victim.character_id || null,
    victim_character_name: null,
    victim_corporation_id: victim.corporation_id || null,
    victim_corporation_name: null,
    victim_alliance_id: victim.alliance_id || null,
    victim_alliance_name: null,
    victim_ship_type_id: victim.ship_type_id || null,
    victim_ship_name: null,
    victim_damage_taken: victim.damage_taken || 0,
    final_blow_character_id: finalBlow.character_id || null,
    final_blow_character_name: null,
    final_blow_corporation_id: finalBlow.corporation_id || null,
    final_blow_corporation_name: null,
    final_blow_alliance_id: finalBlow.alliance_id || null,
    final_blow_alliance_name: null,
    final_blow_ship_type_id: finalBlow.ship_type_id || null,
    final_blow_ship_name: null,
    final_blow_damage_done: finalBlow.damage_done || 0,
    attackers_count: attackers.length,
    victim_items: victimItems,
    attackers: attackersData,
    is_npc: !finalBlow.character_id && attackers.every(a => !a.character_id)
  };
};

// 计算舰船估值
const calculateShipValue = async (shipTypeId, regionId = DEFAULT_REGION_ID, datasource = 'serenity') => {
  if (!shipTypeId) return { value: 0, unitPrice: 0 };
  
  let { minSell, maxBuy } = await getItemPriceFromOrders(shipTypeId, regionId, datasource);
  
  // 如果没有订单数据，尝试同步
  if (minSell === null && maxBuy === null) {
    console.log(`No orders found for ship type ${shipTypeId}, syncing...`);
    const syncedCount = await syncOrdersForType(shipTypeId, regionId, datasource);
    console.log(`Synced ${syncedCount} orders for ship type ${shipTypeId}`);
    // 重新查询
    ({ minSell, maxBuy } = await getItemPriceFromOrders(shipTypeId, regionId, datasource));
    console.log(`After sync, ship type ${shipTypeId}: minSell=${minSell}, maxBuy=${maxBuy}`);
  }
  
  let unitPrice = 0;
  
  if (minSell !== null && maxBuy !== null) {
    // 有买卖单：(最低卖单 + 最高买单) / 2
    unitPrice = (minSell + maxBuy) / 2;
  } else if (minSell !== null) {
    // 只有卖单：最低卖单
    unitPrice = minSell;
  } else if (maxBuy !== null) {
    // 只有买单：最高买单 * 2
    unitPrice = maxBuy * 2;
  } else {
    // 仍然没有订单，返回0
    console.log(`No orders available for ship type ${shipTypeId} after sync`);
    return { value: 0, unitPrice: 0 };
  }
  
  // 舰船损失按1艘计算
  const value = unitPrice * 1;
  
  return { value: parseFloat(value.toFixed(2)), unitPrice: parseFloat(unitPrice.toFixed(2)), minSell, maxBuy };
};

// 解析击毁详情（带估值）
const parseKillmailDetail = async (detail, killmailHash, datasource = 'serenity') => {
  const basicData = parseKillmailDetailBasic(detail, killmailHash);
  
  // 计算物品估值
  const { totalValue, itemsWithValue } = await calculateItemsValue(
    basicData.victim_items, 
    DEFAULT_REGION_ID, 
    datasource
  );
  
  // 计算舰船估值
  const shipValueResult = await calculateShipValue(
    basicData.victim_ship_type_id, 
    DEFAULT_REGION_ID, 
    datasource
  );
  
  // 总损失 = 物品损失 + 舰船损失
  const totalLossValue = parseFloat((totalValue + shipValueResult.value).toFixed(2));
  
  return {
    ...basicData,
    victim_items: itemsWithValue,
    total_value: totalLossValue,
    calculated_value: totalLossValue, // 标记为计算得出的估值
    ship_value: shipValueResult.value,
    items_value: totalValue,
    ship_price_info: shipValueResult,
    zkb_value: detail.zkb?.totalValue || null // 保留zkb的估值用于对比
  };
};

// 获取角色KB数据
const getCharacterKB = async (req, res) => {
  try {
    const { character_id } = req.params;
    const datasource = req.query.datasource || 'serenity';
    const type = req.query.type || 'all'; // kills, losses, all
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    let kills = [];
    let losses = [];
    
    if (type === 'kills' || type === 'all') {
      kills = await Killmail.getCharacterKills(character_id, datasource, limit, offset);
    }
    
    if (type === 'losses' || type === 'all') {
      losses = await Killmail.getCharacterLosses(character_id, datasource, limit, offset);
    }
    
    // 获取统计
    const stats = await Killmail.getCharacterStats(character_id, datasource);
    
    res.json({
      success: true,
      character_id,
      datasource,
      kills,
      losses,
      stats
    });
    
  } catch (error) {
    console.error('Get KB error:', error);
    res.status(500).json({ 
      success: false, 
      error: '获取KB数据失败', 
      message: error.message 
    });
  }
};

// 获取当前登录用户的KB
const getMyKB = async (req, res) => {
  try {
    // 从localStorage获取的角色信息需要前端传递
    const { character_id, datasource = 'serenity' } = req.query;
    
    if (!character_id) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少角色ID' 
      });
    }
    
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    const kills = await Killmail.getCharacterKills(character_id, datasource, limit, offset);
    const losses = await Killmail.getCharacterLosses(character_id, datasource, limit, offset);
    const stats = await Killmail.getCharacterStats(character_id, datasource);
    
    res.json({
      success: true,
      character_id,
      datasource,
      kills,
      losses,
      stats
    });
    
  } catch (error) {
    console.error('Get my KB error:', error);
    res.status(500).json({ 
      success: false, 
      error: '获取KB数据失败', 
      message: error.message 
    });
  }
};

// 获取最近击毁（公共）
const getRecentKills = async (req, res) => {
  try {
    const datasource = req.query.datasource || 'serenity';
    const limit = parseInt(req.query.limit) || 100;
    
    const kills = await Killmail.getRecentKills(datasource, limit);
    
    res.json({
      success: true,
      datasource,
      kills
    });
    
  } catch (error) {
    console.error('Get recent kills error:', error);
    res.status(500).json({ 
      success: false, 
      error: '获取最近击毁失败', 
      message: error.message 
    });
  }
};

// 批量查询type名称
const batchGetTypeNames = async (typeIds) => {
  if (!typeIds || typeIds.length === 0) return {};
  const uniqueIds = [...new Set(typeIds.filter(id => id != null))];
  if (uniqueIds.length === 0) return {};
  
  const placeholders = uniqueIds.map(() => '?').join(',');
  const [rows] = await pool.execute(
    `SELECT id, name FROM types WHERE id IN (${placeholders})`,
    uniqueIds
  );
  
  const map = {};
  for (const row of rows) {
    map[row.id] = row.name;
  }
  return map;
};

// 批量查询槽位信息
const batchGetSlotFlags = async (flagIds) => {
  if (!flagIds || flagIds.length === 0) return {};
  const uniqueIds = [...new Set(flagIds.filter(id => id != null))];
  if (uniqueIds.length === 0) return {};
  
  const placeholders = uniqueIds.map(() => '?').join(',');
  const [rows] = await pool.execute(
    `SELECT flag_id, flag_text FROM eve_slot_flags WHERE flag_id IN (${placeholders})`,
    uniqueIds
  );
  
  const map = {};
  for (const row of rows) {
    map[row.flag_id] = row.flag_text;
  }
  return map;
};

// 获取killmail完整详情（直接查数据库）
const getKillmailDetail = async (req, res) => {
  try {
    const { killmail_id } = req.params;
    const datasource = req.query.datasource || 'serenity';
    
    // 1. 从数据库获取killmail记录，关联eve_sso_codes获取最后一击角色名称，关联corporations获取公司名称
    const [rows] = await pool.execute(
      `SELECT k.*, 
        COALESCE(k.final_blow_character_name, sso.character_name) as final_blow_character_name,
        sso.character_id as final_blow_character_id,
        COALESCE(k.final_blow_corporation_name, fc.name) as final_blow_corporation_name,
        COALESCE(k.victim_corporation_name, vc.name) as victim_corporation_name
       FROM killmails k
       LEFT JOIN eve_sso_codes sso ON k.final_blow_character_id = sso.character_id AND k.datasource COLLATE utf8mb4_unicode_ci = sso.datasource COLLATE utf8mb4_unicode_ci
       LEFT JOIN corporations fc ON k.final_blow_corporation_id = fc.id AND k.datasource COLLATE utf8mb4_unicode_ci = fc.datasource COLLATE utf8mb4_unicode_ci
       LEFT JOIN corporations vc ON k.victim_corporation_id = vc.id AND k.datasource COLLATE utf8mb4_unicode_ci = vc.datasource COLLATE utf8mb4_unicode_ci
       WHERE k.killmail_id = ? AND k.datasource = ?`,
      [killmail_id, datasource]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: '未找到该killmail记录' });
    }
    
    const km = rows[0];
    
    // 2. 收集所有type_id用于批量查询名称
    const typeIds = [];
    const flagIds = [];
    
    // victim ship
    if (km.victim_ship_type_id) typeIds.push(km.victim_ship_type_id);
    // victim items
    if (km.victim_items) {
      const victimItemsRaw = typeof km.victim_items === 'string' ? JSON.parse(km.victim_items) : km.victim_items;
      for (const item of victimItemsRaw) {
        // 使用 item_type_id 而不是 type_id
        if (item.item_type_id) typeIds.push(item.item_type_id);
        if (item.flag) flagIds.push(item.flag);
        // 嵌套items（集装箱内的物品）
        if (item.items) {
          for (const nestedItem of item.items) {
            if (nestedItem.item_type_id) typeIds.push(nestedItem.item_type_id);
            if (nestedItem.flag) flagIds.push(nestedItem.flag);
          }
        }
      }
    }
    // attackers
    if (km.attackers) {
      const attackersRaw = typeof km.attackers === 'string' ? JSON.parse(km.attackers) : km.attackers;
      for (const attacker of attackersRaw) {
        if (attacker.ship_type_id) typeIds.push(attacker.ship_type_id);
        if (attacker.weapon_type_id) typeIds.push(attacker.weapon_type_id);
      }
    }
    
    // 3. 批量查询type名称和槽位信息
    const [typeNames, slotFlags] = await Promise.all([
      batchGetTypeNames(typeIds),
      batchGetSlotFlags(flagIds)
    ]);
    
    // 4. 解析JSON字段
    const victimItems = km.victim_items 
      ? (typeof km.victim_items === 'string' ? JSON.parse(km.victim_items) : km.victim_items) 
      : [];
    const attackers = km.attackers 
      ? (typeof km.attackers === 'string' ? JSON.parse(km.attackers) : km.attackers) 
      : [];
    
    // 5. 处理victim items（使用 item_type_id）
    const items = victimItems.map(item => ({
      ...item,
      type_name: typeNames[item.item_type_id] || null,
      flag_text: slotFlags[item.flag] ? `${slotFlags[item.flag]} (${item.flag})` : item.flag ? `未知槽位 (${item.flag})` : '无槽位',
      // 处理嵌套items
      items: (item.items || []).map(nestedItem => ({
        ...nestedItem,
        type_name: typeNames[nestedItem.item_type_id] || null,
        flag_text: slotFlags[nestedItem.flag] ? `${slotFlags[nestedItem.flag]} (${nestedItem.flag})` : nestedItem.flag ? `未知槽位 (${nestedItem.flag})` : '无槽位'
      }))
    }));
    
    // 6. 处理attackers
    let attackerList = attackers.map(attacker => ({
      ...attacker,
      ship_type_name: typeNames[attacker.ship_type_id] || null,
      weapon_type_name: typeNames[attacker.weapon_type_id] || null,
      // 如果有角色名称，添加到攻击者信息中
      character_name: attacker.character_id === km.final_blow_character_id ? km.final_blow_character_name : null
    }));
    
    // 7. 区分main_attacker和supporters
    let mainAttacker = attackerList.find(a => a.final_blow) || null;
    
    // 8. 为最后一击攻击者添加舰船估值
    if (mainAttacker && mainAttacker.ship_type_id) {
      // 初始化舰船价值为0（数据库中无此字段）
      let shipValue = 0;
      
      // 实时计算攻击者舰船价值
      if (!shipValue) {
        console.log(`Calculating ship value for attacker ship type ${mainAttacker.ship_type_id}...`);
        const calculated = await calculateShipValue(mainAttacker.ship_type_id, DEFAULT_REGION_ID, datasource);
        shipValue = calculated.value;
        console.log(`Calculated attacker ship value: ${shipValue} ISK`);
      }
      
      mainAttacker = {
        ...mainAttacker,
        ship_value: shipValue
      };
      // 更新attackerList中的mainAttacker
      const mainAttackerIndex = attackerList.findIndex(a => a.final_blow);
      if (mainAttackerIndex !== -1) {
        attackerList[mainAttackerIndex] = mainAttacker;
      }
    }
    
    // 9. 为所有攻击者舰船添加估值字段（兼容前端显示）
    attackerList = attackerList.map(attacker => ({
      ...attacker,
      ship_value: attacker.ship_value || 0 // 保留mainAttacker的估值，其他默认0
    }));
    
    // 如果main_attacker存在且没有character_name，但我们有final_blow_character_name，补充上
    if (mainAttacker && !mainAttacker.character_name && km.final_blow_character_name) {
      mainAttacker = {
        ...mainAttacker,
        character_name: km.final_blow_character_name
      };
    }
    const supporters = attackerList.filter(a => !a.final_blow);
    
    // 8. 计算物品总价值
    const itemsValue = items.reduce((sum, item) => {
      const itemValue = parseFloat(item.value) || 0;
      const nestedValue = (item.items || []).reduce((nSum, nested) => nSum + (parseFloat(nested.value) || 0), 0);
      return sum + itemValue + nestedValue;
    }, 0);
    
    // 9. 获取/计算舰船价值
    let shipValue = 0;
    
    // 如果数据库中没有舰船估值，实时计算
    if (!shipValue && km.victim_ship_type_id) {
      console.log(`Calculating ship value for victim ship type ${km.victim_ship_type_id}...`);
      const calculated = await calculateShipValue(km.victim_ship_type_id, DEFAULT_REGION_ID, datasource);
      shipValue = calculated.value;
      console.log(`Calculated ship value: ${shipValue} ISK`);
    }
    
    // 10. 计算总损失价值：物品价值 + 舰船价值
    const totalLossValue = parseFloat(km.total_value) || (itemsValue + shipValue);
    const supportersWithShipValue = supporters.map(supporter => {
      if (supporter.ship_type_id) {
        // 这里可以添加攻击者舰船估值的计算逻辑
        // 目前先返回0，后续可以优化为从数据库获取或实时计算
        return {
          ...supporter,
          ship_value: 0
        };
      }
      return supporter;
    });
    
    // 构造受害者信息
    const victim = {
      character_id: km.victim_character_id,
      corporation_id: km.victim_corporation_id,
      corporation_name: km.victim_corporation_name || null,
      alliance_id: km.victim_alliance_id,
      faction_id: null,
      ship_type_id: km.victim_ship_type_id,
      ship_type_name: typeNames[km.victim_ship_type_id] || null,
      damage_taken: km.victim_damage_taken,
      items: items,
      items_value: parseFloat(km.items_value) || itemsValue,
      ship_value: shipValue,
      total_loss_value: totalLossValue
    };
    
    // 补充最后一击公司名称
    const mainAttackerWithCorpName = mainAttacker ? {
      ...mainAttacker,
      corporation_name: km.final_blow_corporation_name || null
    } : null;
    
    res.json({
      success: true,
      killmail_id: km.killmail_id,
      killmail_time: km.killmail_time,
      solar_system_id: km.solar_system_id,
      total_value: totalLossValue,
      attackers_count: km.attackers_count,
      is_npc: km.is_npc,
      victim: victim,
      main_attacker: mainAttackerWithCorpName,
      supporters: supportersWithShipValue
    });
    
  } catch (error) {
    console.error('Get killmail detail error:', error);
    res.status(500).json({
      success: false,
      error: '获取killmail详情失败',
      message: error.message
    });
  }
};

// 获取KB榜单数据
const getKBRanking = async (req, res) => {
  try {
    const { type = 'single', limit = 50, datasource = 'serenity' } = req.query;
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const oneMonthAgoStr = oneMonthAgo.toISOString().slice(0, 19).replace('T', ' ');
    
    // 确保 limit 是安全的整数
    const safeLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 100);

    let result = [];

    if (type === 'single') {
      // 单次KB击毁估值排行（按最后一击角色）
      const [rows] = await pool.execute(
        `SELECT 
          k.killmail_id,
          k.killmail_time,
          k.final_blow_character_id,
          COALESCE(k.final_blow_character_name, sso.character_name) as final_blow_character_name,
          k.final_blow_corporation_id,
          COALESCE(k.final_blow_corporation_name, fc.name) as final_blow_corporation_name,
          k.victim_character_id,
          COALESCE(k.victim_character_name, sso_victim.character_name) as victim_character_name,
          k.victim_corporation_id,
          COALESCE(k.victim_corporation_name, vc.name) as victim_corporation_name,
          k.victim_ship_type_id,
          vt.name as victim_ship_name,
          k.solar_system_id,
          s.name as solar_system_name,
          k.total_value
        FROM killmails k
        LEFT JOIN types vt ON k.victim_ship_type_id = vt.id
        LEFT JOIN systems s ON k.solar_system_id = s.system_id AND k.datasource COLLATE utf8mb4_unicode_ci = s.datasource COLLATE utf8mb4_unicode_ci
        LEFT JOIN eve_sso_codes sso ON k.final_blow_character_id = sso.character_id AND k.datasource COLLATE utf8mb4_unicode_ci = sso.datasource COLLATE utf8mb4_unicode_ci
        LEFT JOIN eve_sso_codes sso_victim ON k.victim_character_id = sso_victim.character_id AND k.datasource COLLATE utf8mb4_unicode_ci = sso_victim.datasource COLLATE utf8mb4_unicode_ci
        LEFT JOIN corporations fc ON k.final_blow_corporation_id = fc.id AND k.datasource COLLATE utf8mb4_unicode_ci = fc.datasource COLLATE utf8mb4_unicode_ci
        LEFT JOIN corporations vc ON k.victim_corporation_id = vc.id AND k.datasource COLLATE utf8mb4_unicode_ci = vc.datasource COLLATE utf8mb4_unicode_ci
        WHERE k.killmail_time >= ? AND k.datasource = ?
          AND k.final_blow_character_id IS NOT NULL
        ORDER BY k.total_value DESC
        LIMIT ${safeLimit}`,
        [oneMonthAgoStr, datasource]
      );
      result = rows.map(km => ({
        ...km,
        ship_value: 0
      }));

    } else if (type === 'kills') {
      // 角色击毁总估值排行（作为攻击者）
      const [rows] = await pool.execute(
        `SELECT 
          k.final_blow_character_id as character_id,
          COALESCE(k.final_blow_character_name, sso.character_name) as character_name,
          k.final_blow_corporation_id as corporation_id,
          COALESCE(k.final_blow_corporation_name, c.name) as corporation_name,
          COUNT(*) as kill_count,
          SUM(k.total_value) as total_value
        FROM killmails k
        LEFT JOIN eve_sso_codes sso ON k.final_blow_character_id = sso.character_id AND k.datasource COLLATE utf8mb4_unicode_ci = sso.datasource COLLATE utf8mb4_unicode_ci
        LEFT JOIN corporations c ON k.final_blow_corporation_id = c.id AND k.datasource COLLATE utf8mb4_unicode_ci = c.datasource COLLATE utf8mb4_unicode_ci
        WHERE k.killmail_time >= ? AND k.datasource = ?
          AND k.final_blow_character_id IS NOT NULL
        GROUP BY k.final_blow_character_id, k.final_blow_character_name,
                 k.final_blow_corporation_id, k.final_blow_corporation_name,
                 sso.character_name, c.name
        ORDER BY total_value DESC
        LIMIT ${safeLimit}`,
        [oneMonthAgoStr, datasource]
      );
      result = rows;

    } else if (type === 'losses') {
      // 角色损失总估值排行（作为受害者）
      const [rows] = await pool.execute(
        `SELECT 
          k.victim_character_id as character_id,
          COALESCE(k.victim_character_name, sso.character_name) as character_name,
          k.victim_corporation_id as corporation_id,
          COALESCE(k.victim_corporation_name, c.name) as corporation_name,
          COUNT(*) as loss_count,
          SUM(k.total_value) as total_value
        FROM killmails k
        LEFT JOIN eve_sso_codes sso ON k.victim_character_id = sso.character_id AND k.datasource COLLATE utf8mb4_unicode_ci = sso.datasource COLLATE utf8mb4_unicode_ci
        LEFT JOIN corporations c ON k.victim_corporation_id = c.id AND k.datasource COLLATE utf8mb4_unicode_ci = c.datasource COLLATE utf8mb4_unicode_ci
        WHERE k.killmail_time >= ? AND k.datasource = ?
          AND k.victim_character_id IS NOT NULL
        GROUP BY k.victim_character_id, k.victim_character_name,
                 k.victim_corporation_id, k.victim_corporation_name,
                 sso.character_name, c.name
        ORDER BY total_value DESC
        LIMIT ${safeLimit}`,
        [oneMonthAgoStr, datasource]
      );
      result = rows;
    }

    res.json({
      success: true,
      type,
      data: result
    });

  } catch (error) {
    console.error('Get KB ranking error:', error);
    res.status(500).json({
      success: false,
      error: '获取KB榜单失败',
      message: error.message
    });
  }
};

module.exports = {
  syncCharacterKB,
  getCharacterKB,
  getMyKB,
  getRecentKills,
  getKillmailDetail,
  getKBRanking
};
