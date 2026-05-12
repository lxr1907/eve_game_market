const pool = require('../config/database');

class EveSsoCode {
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS eve_sso_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(255) NOT NULL,
        state VARCHAR(255),
        access_token TEXT,
        refresh_token TEXT,
        expires_at BIGINT,
        character_id INT,
        character_name VARCHAR(255),
        scopes TEXT,
        token_type VARCHAR(50),
        datasource VARCHAR(50) DEFAULT 'serenity',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY idx_code (code),
        INDEX idx_state (state),
        INDEX idx_character_id (character_id),
        UNIQUE KEY idx_character_datasource (character_id, datasource)
      )
    `;
    await pool.execute(query);
  }

  // 迁移：添加code唯一索引（如果表已存在）
  static async migrateAddCodeUniqueIndex() {
    try {
      // 检查是否已存在唯一索引
      const [rows] = await pool.execute(`
        SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'eve_sso_codes'
        AND INDEX_NAME = 'idx_code'
        AND NON_UNIQUE = 0
      `);
      
      if (rows[0].cnt === 0) {
        // 删除旧的普通索引（如果存在）
        try {
          await pool.execute('DROP INDEX idx_code ON eve_sso_codes');
        } catch (e) {
          // 索引可能不存在，忽略错误
        }
        
        // 添加唯一索引
        await pool.execute('ALTER TABLE eve_sso_codes ADD UNIQUE KEY idx_code (code)');
        console.log('Added unique index on code column');
      }
    } catch (error) {
      console.error('Migration error:', error.message);
    }
  }

  static async saveCode(code, state, datasource = 'serenity') {
    const query = `
      INSERT INTO eve_sso_codes (code, state, datasource)
      VALUES (?, ?, ?)
    `;
    const [result] = await pool.execute(query, [code, state, datasource]);
    return result.insertId;
  }

  static async saveToken(code, tokenData) {
    // 如果 character_id 为 null，只能通过 code 来查找/更新
    if (!tokenData.character_id) {
      // 尝试通过 code 查找现有记录
      const [existingRows] = await pool.execute(
        'SELECT * FROM eve_sso_codes WHERE code = ? ORDER BY created_at DESC LIMIT 1',
        [code]
      );
      
      if (existingRows.length > 0) {
        // 更新现有记录
        const query = `
          UPDATE eve_sso_codes SET
            access_token = ?,
            refresh_token = ?,
            expires_at = ?,
            token_type = ?,
            scopes = ?,
            character_name = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE code = ?
        `;
        const [result] = await pool.execute(query, [
          tokenData.access_token,
          tokenData.refresh_token,
          tokenData.expires_at,
          tokenData.token_type || 'Bearer',
          tokenData.scopes || null,
          tokenData.character_name || null,
          code
        ]);
        return result.affectedRows > 0;
      }
    }
    
    // 先检查该角色是否已有记录
    const existingRecord = tokenData.character_id 
      ? await this.getLatestToken(tokenData.character_id, tokenData.datasource || 'serenity')
      : null;
    
    if (existingRecord) {
      // 更新现有记录
      const query = `
        UPDATE eve_sso_codes SET
          code = ?,
          access_token = ?,
          refresh_token = ?,
          expires_at = ?,
          token_type = ?,
          scopes = ?,
          character_name = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE character_id = ? AND datasource = ?
      `;
      const [result] = await pool.execute(query, [
        code,
        tokenData.access_token,
        tokenData.refresh_token,
        tokenData.expires_at,
        tokenData.token_type || 'Bearer',
        tokenData.scopes || null,
        tokenData.character_name || null,
        tokenData.character_id,
        tokenData.datasource || 'serenity'
      ]);
      return result.affectedRows > 0;
    } else {
      // 插入新记录
      const query = `
        INSERT INTO eve_sso_codes (
          code, access_token, refresh_token, expires_at,
          token_type, scopes, character_id, character_name, datasource
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const [result] = await pool.execute(query, [
        code,
        tokenData.access_token,
        tokenData.refresh_token,
        tokenData.expires_at,
        tokenData.token_type || 'Bearer',
        tokenData.scopes || null,
        tokenData.character_id || null,
        tokenData.character_name || null,
        tokenData.datasource || 'serenity'
      ]);
      return result.insertId > 0;
    }
  }

  static async updateToken(characterId, tokenData, datasource = 'serenity') {
    const query = `
      UPDATE eve_sso_codes SET
        access_token = ?,
        refresh_token = ?,
        expires_at = ?,
        token_type = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE character_id = ? AND datasource = ?
    `;
    const [result] = await pool.execute(query, [
      tokenData.access_token,
      tokenData.refresh_token,
      tokenData.expires_at,
      tokenData.token_type || 'Bearer',
      characterId,
      datasource
    ]);
    return result.affectedRows > 0;
  }

  static async getByState(state) {
    const query = `SELECT * FROM eve_sso_codes WHERE state = ? ORDER BY created_at DESC LIMIT 1`;
    const [rows] = await pool.execute(query, [state]);
    return rows[0];
  }

  static async getByCode(code) {
    const query = `SELECT * FROM eve_sso_codes WHERE code = ? ORDER BY created_at DESC LIMIT 1`;
    const [rows] = await pool.execute(query, [code]);
    return rows[0];
  }

  static async getLatestToken(characterId, datasource = 'serenity') {
    const query = `
      SELECT * FROM eve_sso_codes
      WHERE character_id = ? AND datasource = ?
      ORDER BY updated_at DESC LIMIT 1
    `;
    const [rows] = await pool.execute(query, [characterId, datasource]);
    return rows[0] || null;
  }

  static async getValidToken(characterId, datasource = 'serenity') {
    const query = `
      SELECT * FROM eve_sso_codes
      WHERE character_id = ? AND datasource = ? AND expires_at > ?
      ORDER BY expires_at DESC LIMIT 1
    `;
    const now = Date.now();
    const [rows] = await pool.execute(query, [characterId, datasource, now]);
    return rows[0];
  }

  static async isTokenExpiringSoon(characterId, datasource = 'serenity', thresholdMs = 5 * 60 * 1000) {
    const record = await this.getLatestToken(characterId, datasource);
    if (!record) return false;
    return record.expires_at - Date.now() < thresholdMs;
  }
}

module.exports = EveSsoCode;
