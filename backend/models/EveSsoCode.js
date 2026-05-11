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
        INDEX idx_code (code),
        INDEX idx_state (state),
        INDEX idx_character_id (character_id),
        UNIQUE KEY idx_character_datasource (character_id, datasource)
      )
    `;
    await pool.execute(query);
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
    const query = `
      UPDATE eve_sso_codes
      SET access_token = ?,
          refresh_token = ?,
          expires_at = ?,
          token_type = ?,
          scopes = ?,
          character_id = ?,
          character_name = ?,
          datasource = ?
      WHERE code = ?
    `;
    const [result] = await pool.execute(query, [
      tokenData.access_token,
      tokenData.refresh_token,
      tokenData.expires_at,
      tokenData.token_type || 'Bearer',
      tokenData.scopes || null,
      tokenData.character_id || null,
      tokenData.character_name || null,
      tokenData.datasource || 'serenity',
      code
    ]);
    return result.affectedRows > 0;
  }

  static async getByState(state) {
    const query = `SELECT * FROM eve_sso_codes WHERE state = ? ORDER BY created_at DESC LIMIT 1`;
    const [rows] = await pool.execute(query, [state]);
    return rows[0];
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
}

module.exports = EveSsoCode;
