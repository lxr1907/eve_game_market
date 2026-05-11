const pool = require('../config/database');

class Killmail {
  static async createTables() {
    // 击毁记录主表
    const killmailsTable = `
      CREATE TABLE IF NOT EXISTS killmails (
        id INT AUTO_INCREMENT PRIMARY KEY,
        killmail_id BIGINT NOT NULL,
        killmail_hash VARCHAR(255) NOT NULL,
        datasource VARCHAR(50) DEFAULT 'serenity',
        
        -- 时间
        killmail_time DATETIME NOT NULL,
        
        -- 太阳系
        solar_system_id INT,
        solar_system_name VARCHAR(255),
        
        -- 受害者信息
        victim_character_id INT,
        victim_character_name VARCHAR(255),
        victim_corporation_id INT,
        victim_corporation_name VARCHAR(255),
        victim_alliance_id INT,
        victim_alliance_name VARCHAR(255),
        victim_ship_type_id INT,
        victim_ship_name VARCHAR(255),
        victim_damage_taken DOUBLE,
        
        -- 攻击者信息（最后一击）
        final_blow_character_id INT,
        final_blow_character_name VARCHAR(255),
        final_blow_corporation_id INT,
        final_blow_corporation_name VARCHAR(255),
        final_blow_alliance_id INT,
        final_blow_alliance_name VARCHAR(255),
        final_blow_ship_type_id INT,
        final_blow_ship_name VARCHAR(255),
        final_blow_damage_done DOUBLE,
        
        -- 总伤害
        total_value DOUBLE DEFAULT 0,
        attackers_count INT DEFAULT 0,
        
        -- 元数据
        war_id INT,
        is_npc BOOLEAN DEFAULT FALSE,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        UNIQUE KEY idx_killmail_datasource (killmail_id, datasource),
        INDEX idx_killmail_time (killmail_time),
        INDEX idx_victim_character (victim_character_id),
        INDEX idx_final_blow_character (final_blow_character_id),
        INDEX idx_victim_corporation (victim_corporation_id),
        INDEX idx_final_blow_corporation (final_blow_corporation_id)
      )
    `;
    
    // KB统计表（按角色）
    const kbStatsTable = `
      CREATE TABLE IF NOT EXISTS kb_character_stats (
        id INT AUTO_INCREMENT PRIMARY KEY,
        character_id INT NOT NULL,
        datasource VARCHAR(50) DEFAULT 'serenity',
        
        -- 击毁统计
        kills_count INT DEFAULT 0,
        kills_isk DOUBLE DEFAULT 0,
        
        -- 损失统计
        losses_count INT DEFAULT 0,
        losses_isk DOUBLE DEFAULT 0,
        
        -- 效率
        efficiency DOUBLE DEFAULT 0,
        
        -- 最后更新
        last_sync_at DATETIME,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        UNIQUE KEY idx_character_datasource (character_id, datasource)
      )
    `;
    
    // KB统计表（按公司）
    const kbCorpStatsTable = `
      CREATE TABLE IF NOT EXISTS kb_corporation_stats (
        id INT AUTO_INCREMENT PRIMARY KEY,
        corporation_id INT NOT NULL,
        datasource VARCHAR(50) DEFAULT 'serenity',
        
        -- 击毁统计
        kills_count INT DEFAULT 0,
        kills_isk DOUBLE DEFAULT 0,
        
        -- 损失统计
        losses_count INT DEFAULT 0,
        losses_isk DOUBLE DEFAULT 0,
        
        -- 效率
        efficiency DOUBLE DEFAULT 0,
        
        -- 最后更新
        last_sync_at DATETIME,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        UNIQUE KEY idx_corporation_datasource (corporation_id, datasource)
      )
    `;
    
    await pool.execute(killmailsTable);
    await pool.execute(kbStatsTable);
    await pool.execute(kbCorpStatsTable);
  }
  
  // 保存击毁记录
  static async saveKillmail(killmailData, datasource = 'serenity') {
    // 将所有 undefined 转为 null，mysql2 不接受 undefined 参数
    const d = {};
    for (const [k, v] of Object.entries(killmailData)) {
      d[k] = v === undefined ? null : v;
    }
    // 将ISO时间字符串转为MySQL兼容的DATETIME格式
    if (d.killmail_time) {
      d.killmail_time = new Date(d.killmail_time).toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    }

    const query = `
      INSERT INTO killmails (
        killmail_id, killmail_hash, datasource, killmail_time,
        solar_system_id, solar_system_name,
        victim_character_id, victim_character_name, victim_corporation_id, victim_corporation_name,
        victim_alliance_id, victim_alliance_name, victim_ship_type_id, victim_ship_name, victim_damage_taken,
        final_blow_character_id, final_blow_character_name, final_blow_corporation_id, final_blow_corporation_name,
        final_blow_alliance_id, final_blow_alliance_name, final_blow_ship_type_id, final_blow_ship_name, final_blow_damage_done,
        total_value, attackers_count, is_npc
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        killmail_time = VALUES(killmail_time),
        total_value = VALUES(total_value),
        updated_at = CURRENT_TIMESTAMP
    `;
    
    const [result] = await pool.execute(query, [
      d.killmail_id,
      d.killmail_hash,
      datasource,
      d.killmail_time,
      d.solar_system_id,
      d.solar_system_name,
      d.victim_character_id,
      d.victim_character_name,
      d.victim_corporation_id,
      d.victim_corporation_name,
      d.victim_alliance_id,
      d.victim_alliance_name,
      d.victim_ship_type_id,
      d.victim_ship_name,
      d.victim_damage_taken,
      d.final_blow_character_id,
      d.final_blow_character_name,
      d.final_blow_corporation_id,
      d.final_blow_corporation_name,
      d.final_blow_alliance_id,
      d.final_blow_alliance_name,
      d.final_blow_ship_type_id,
      d.final_blow_ship_name,
      d.final_blow_damage_done,
      d.total_value || 0,
      d.attackers_count || 1,
      d.is_npc || false
    ]);
    
    return result.insertId || result.affectedRows;
  }
  
  // 获取角色击毁记录
  static async getCharacterKills(characterId, datasource = 'serenity', limit = 50, offset = 0) {
    const safeLimit = Math.max(1, Math.min(parseInt(limit) || 50, 500));
    const safeOffset = Math.max(0, parseInt(offset) || 0);
    const query = `
      SELECT k.*,
        vt.name AS victim_ship_name,
        ft.name AS final_blow_ship_name
      FROM killmails k
      LEFT JOIN types vt ON k.victim_ship_type_id = vt.id
      LEFT JOIN types ft ON k.final_blow_ship_type_id = ft.id
      WHERE k.final_blow_character_id = ? AND k.datasource = ?
      ORDER BY k.killmail_time DESC
      LIMIT ${safeLimit} OFFSET ${safeOffset}
    `;
    const [rows] = await pool.execute(query, [characterId, datasource]);
    return rows;
  }
  
  // 获取角色损失记录
  static async getCharacterLosses(characterId, datasource = 'serenity', limit = 50, offset = 0) {
    const safeLimit = Math.max(1, Math.min(parseInt(limit) || 50, 500));
    const safeOffset = Math.max(0, parseInt(offset) || 0);
    const query = `
      SELECT k.*,
        vt.name AS victim_ship_name,
        ft.name AS final_blow_ship_name
      FROM killmails k
      LEFT JOIN types vt ON k.victim_ship_type_id = vt.id
      LEFT JOIN types ft ON k.final_blow_ship_type_id = ft.id
      WHERE k.victim_character_id = ? AND k.datasource = ?
      ORDER BY k.killmail_time DESC
      LIMIT ${safeLimit} OFFSET ${safeOffset}
    `;
    const [rows] = await pool.execute(query, [characterId, datasource]);
    return rows;
  }
  
  // 更新角色统计
  static async updateCharacterStats(characterId, datasource = 'serenity') {
    // 计算击毁统计
    const [killsResult] = await pool.execute(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_value), 0) as total_isk
      FROM killmails
      WHERE final_blow_character_id = ? AND datasource = ?
    `, [characterId, datasource]);
    
    // 计算损失统计
    const [lossesResult] = await pool.execute(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_value), 0) as total_isk
      FROM killmails
      WHERE victim_character_id = ? AND datasource = ?
    `, [characterId, datasource]);
    
    const kills = killsResult[0] || { count: 0, total_isk: 0 };
    const losses = lossesResult[0] || { count: 0, total_isk: 0 };
    
    // 计算效率
    const efficiency = (kills.count + losses.count) > 0 
      ? (kills.count / (kills.count + losses.count) * 100).toFixed(2)
      : 0;
    
    // 更新或插入统计
    const query = `
      INSERT INTO kb_character_stats (character_id, datasource, kills_count, kills_isk, losses_count, losses_isk, efficiency, last_sync_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        kills_count = VALUES(kills_count),
        kills_isk = VALUES(kills_isk),
        losses_count = VALUES(losses_count),
        losses_isk = VALUES(losses_isk),
        efficiency = VALUES(efficiency),
        last_sync_at = NOW()
    `;
    
    await pool.execute(query, [
      characterId, datasource,
      kills.count, kills.total_isk,
      losses.count, losses.total_isk,
      efficiency
    ]);
    
    return { kills, losses, efficiency };
  }
  
  // 获取角色统计
  static async getCharacterStats(characterId, datasource = 'serenity') {
    const query = `
      SELECT * FROM kb_character_stats
      WHERE character_id = ? AND datasource = ?
    `;
    const [rows] = await pool.execute(query, [characterId, datasource]);
    return rows[0] || null;
  }
  
  // 批量获取最近击毁
  static async getRecentKills(datasource = 'serenity', limit = 100) {
    const safeLimit = Math.max(1, Math.min(parseInt(limit) || 100, 500));
    const query = `
      SELECT k.*,
        vt.name AS victim_ship_name,
        ft.name AS final_blow_ship_name
      FROM killmails k
      LEFT JOIN types vt ON k.victim_ship_type_id = vt.id
      LEFT JOIN types ft ON k.final_blow_ship_type_id = ft.id
      WHERE k.datasource = ?
      ORDER BY k.killmail_time DESC
      LIMIT ${safeLimit}
    `;
    const [rows] = await pool.execute(query, [datasource]);
    return rows;
  }
}

module.exports = Killmail;
