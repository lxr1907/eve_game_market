const pool = require('../config/database');

class Corporation {
  // 创建corporations表
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS corporations (
        id BIGINT PRIMARY KEY,
        name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        ticker VARCHAR(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        description TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        member_count INT,
        tax_rate DECIMAL(5,2),
        date_founded DATETIME,
        ceo_id BIGINT,
        creator_id BIGINT,
        faction_id BIGINT,
        home_station_id BIGINT,
        shares BIGINT,
        url VARCHAR(255),
        datasource VARCHAR(20) NOT NULL DEFAULT 'serenity',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_name (name),
        INDEX idx_ticker (ticker),
        INDEX idx_datasource (datasource)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    await pool.execute(query);
  }

  // 插入或更新corporation信息
  static async insertOrUpdate(corporationData, datasource = 'serenity') {
    const {
      corporation_id: id,
      name,
      ticker,
      description,
      member_count,
      tax_rate,
      date_founded,
      ceo_id,
      creator_id,
      faction_id,
      home_station_id,
      shares,
      url
    } = corporationData;

    const query = `
      INSERT INTO corporations (
        id, name, ticker, description, member_count, tax_rate,
        date_founded, ceo_id, creator_id, faction_id, home_station_id,
        shares, url, datasource
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        ticker = VALUES(ticker),
        description = VALUES(description),
        member_count = VALUES(member_count),
        tax_rate = VALUES(tax_rate),
        date_founded = VALUES(date_founded),
        ceo_id = VALUES(ceo_id),
        creator_id = VALUES(creator_id),
        faction_id = VALUES(faction_id),
        home_station_id = VALUES(home_station_id),
        shares = VALUES(shares),
        url = VALUES(url),
        updated_at = CURRENT_TIMESTAMP
    `;

    const values = [
      id, name, ticker, description, member_count, tax_rate,
      date_founded ? new Date(date_founded) : null,
      ceo_id, creator_id, faction_id, home_station_id,
      shares, url, datasource
    ];

    await pool.execute(query, values);
  }

  // 根据ID获取corporation信息
  static async findById(corporationId, datasource = 'serenity') {
    const query = `
      SELECT * FROM corporations 
      WHERE id = ? AND datasource = ?
    `;
    const [rows] = await pool.execute(query, [corporationId, datasource]);
    return rows[0] || null;
  }

  // 根据ID列表获取多个corporation信息
  static async findByIds(corporationIds, datasource = 'serenity') {
    if (!corporationIds || corporationIds.length === 0) {
      return [];
    }

    const placeholders = corporationIds.map(() => '?').join(',');
    const query = `
      SELECT * FROM corporations 
      WHERE id IN (${placeholders}) AND datasource = ?
    `;

    const values = [...corporationIds, datasource];
    const [rows] = await pool.execute(query, values);

    // 创建ID到corporation的映射
    const map = {};
    rows.forEach(corp => {
      map[corp.id] = corp;
    });

    return map;
  }
}

module.exports = Corporation;