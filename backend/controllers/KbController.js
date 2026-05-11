const Killmail = require('../models/Killmail');
const EveSsoCode = require('../models/EveSsoCode');
const pool = require('../config/database');

// ESI基础URL
const ESI_BASE_URL = 'https://ali-esi.evepc.163.com/latest';

// 从ESI获取角色最近击毁记录
const fetchRecentKillmails = async (characterId, accessToken, datasource = 'serenity') => {
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
  const url = `${ESI_BASE_URL}/killmails/${killmailId}/${killmailHash}/?datasource=${datasource}`;
  
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
    const { code } = req.query;
    
    let tokenData = null;
    
    // 如果前端传了code，优先使用code获取token
    if (code) {
      tokenData = await EveSsoCode.getByCode(code);
    }
    
    // 如果没有code或code无效，尝试用character_id获取
    if (!tokenData || !tokenData.access_token) {
      tokenData = await EveSsoCode.getValidToken(character_id, datasource);
    }
    
    if (!tokenData || !tokenData.access_token) {
      return res.status(401).json({ 
        success: false, 
        error: '未找到有效的授权令牌，请重新登录' 
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
        
        // 解析击毁数据（hash只在列表接口中返回，需要传入）
        const killmailData = parseKillmailDetail(detail, km.killmail_hash);
        
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

// 解析击毁详情
const parseKillmailDetail = (detail, killmailHash) => {
  const victim = detail.victim || {};
  const attackers = detail.attackers || [];
  
  // 找到最后一击的攻击者
  const finalBlow = attackers.find(a => a.final_blow === true) || attackers[0] || {};
  
  // victim items
  const victimItems = (victim.items || []).map(item => ({
    item_id: item.item_id || null,
    type_id: item.type_id || null,
    quantity_dropped: item.quantity_dropped || 0,
    quantity_destroyed: item.quantity_destroyed || 0,
    flag: item.flag || null,
    singleton: item.singleton || 0
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
    solar_system_name: null, // 需要额外查询
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
    total_value: detail.zkb?.totalValue || 0,
    attackers_count: attackers.length,
    victim_items: victimItems,
    attackers: attackersData,
    is_npc: !finalBlow.character_id && attackers.every(a => !a.character_id)
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

// 获取killmail完整详情（直接查数据库）
const getKillmailDetail = async (req, res) => {
  try {
    const { killmail_id } = req.params;
    const datasource = req.query.datasource || 'serenity';
    
    // 1. 从数据库获取killmail记录
    const [rows] = await pool.execute(
      'SELECT * FROM killmails WHERE killmail_id = ? AND datasource = ?',
      [killmail_id, datasource]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: '未找到该killmail记录' });
    }
    
    const km = rows[0];
    
    // 2. 收集所有type_id用于批量查询名称
    const typeIds = [];
    
    // victim ship
    if (km.victim_ship_type_id) typeIds.push(km.victim_ship_type_id);
    // victim items
    if (km.victim_items) {
      const victimItems = typeof km.victim_items === 'string' ? JSON.parse(km.victim_items) : km.victim_items;
      for (const item of victimItems) {
        if (item.type_id) typeIds.push(item.type_id);
      }
    }
    // attackers
    if (km.attackers) {
      const attackers = typeof km.attackers === 'string' ? JSON.parse(km.attackers) : km.attackers;
      for (const attacker of attackers) {
        if (attacker.ship_type_id) typeIds.push(attacker.ship_type_id);
        if (attacker.weapon_type_id) typeIds.push(attacker.weapon_type_id);
      }
    }
    
    // 3. 批量查询type名称
    const typeNames = await batchGetTypeNames(typeIds);
    
    // 4. 解析JSON字段
    const victimItems = km.victim_items 
      ? (typeof km.victim_items === 'string' ? JSON.parse(km.victim_items) : km.victim_items) 
      : [];
    const attackers = km.attackers 
      ? (typeof km.attackers === 'string' ? JSON.parse(km.attackers) : km.attackers) 
      : [];
    
    // 5. 处理victim items
    const items = victimItems.map(item => ({
      ...item,
      type_name: typeNames[item.type_id] || null
    }));
    
    // 6. 处理attackers
    const attackerList = attackers.map(attacker => ({
      ...attacker,
      ship_type_name: typeNames[attacker.ship_type_id] || null,
      weapon_type_name: typeNames[attacker.weapon_type_id] || null
    }));
    
    // 7. 区分main_attacker和supporters
    const mainAttacker = attackerList.find(a => a.final_blow) || null;
    const supporters = attackerList.filter(a => !a.final_blow);
    
    res.json({
      success: true,
      killmail_id: km.killmail_id,
      killmail_time: km.killmail_time,
      solar_system_id: km.solar_system_id,
      total_value: km.total_value,
      attackers_count: km.attackers_count,
      is_npc: km.is_npc,
      victim: {
        character_id: km.victim_character_id,
        corporation_id: km.victim_corporation_id,
        alliance_id: km.victim_alliance_id,
        faction_id: null,
        ship_type_id: km.victim_ship_type_id,
        ship_type_name: typeNames[km.victim_ship_type_id] || null,
        damage_taken: km.victim_damage_taken,
        items: items
      },
      main_attacker: mainAttacker,
      supporters: supporters
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

module.exports = {
  syncCharacterKB,
  getCharacterKB,
  getMyKB,
  getRecentKills,
  getKillmailDetail
};
