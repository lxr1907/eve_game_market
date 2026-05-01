const pool = require('../config/database');

class RegionType {
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS region_types (
        region_id INT,
        type_id INT,
        datasource VARCHAR(20) NOT NULL DEFAULT 'serenity',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (region_id, type_id, datasource)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    await pool.execute(query);
  }

  static async insertOrUpdate(regionId, typeIds, datasource = 'serenity') {
    if (!typeIds || typeIds.length === 0) {
      return;
    }

    // 构建批量插入语句
    const values = typeIds.map(typeId => `(${regionId}, ${typeId}, '${datasource}')`).join(', ');
    const query = `
      INSERT INTO region_types (region_id, type_id, datasource)
      VALUES ${values}
      ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP
    `;

    try {
      await pool.query(query);
      return true;
    } catch (error) {
      console.error('Error inserting/updating region types:', error);
      throw error;
    }
  }

  static async findByRegionId(regionId, datasource = 'serenity', page = 1, limit = 10) {
    const pageInt = parseInt(page) || 1;
    const limitInt = parseInt(limit) || 10;
    const offset = (pageInt - 1) * limitInt;

    const query = `
      SELECT rt.region_id, rt.type_id, t.name as type_name
      FROM region_types rt
      LEFT JOIN types t ON rt.type_id = t.id
      WHERE rt.region_id = ? AND rt.datasource = ?
      ORDER BY rt.type_id
      LIMIT ${limitInt} OFFSET ${offset}
    `;

    const [rows] = await pool.execute(query, [regionId, datasource]);
    return rows;
  }

  static async countByRegionId(regionId, datasource = 'serenity') {
    const query = `
      SELECT COUNT(*) as count
      FROM region_types
      WHERE region_id = ? AND datasource = ?
    `;

    const [rows] = await pool.execute(query, [regionId, datasource]);
    return rows[0].count;
  }

  static async findAll(page = 1, limit = 10) {
    const pageInt = parseInt(page) || 1;
    const limitInt = parseInt(limit) || 10;
    const offset = (pageInt - 1) * limitInt;

    const query = `
      SELECT rt.region_id, rt.type_id, r.name as region_name, t.name as type_name
      FROM region_types rt
      LEFT JOIN regions r ON rt.region_id = r.id
      LEFT JOIN types t ON rt.type_id = t.id
      ORDER BY rt.region_id, rt.type_id
      LIMIT ${limitInt} OFFSET ${offset}
    `;

    const [rows] = await pool.query(query);
    return rows;
  }

  static async count() {
    const query = `SELECT COUNT(*) as count FROM region_types`;
    const [rows] = await pool.execute(query);
    return rows[0].count;
  }

  static async deleteByRegionId(regionId, datasource = 'serenity') {
    const query = `DELETE FROM region_types WHERE region_id = ? AND datasource = ?`;
    const [result] = await pool.execute(query, [regionId, datasource]);
    return result.affectedRows;
  }
}

module.exports = RegionType;