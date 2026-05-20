const pool = require('../config/database');

class Station {
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS stations (
        station_id BIGINT NOT NULL,
        name VARCHAR(255) NOT NULL COMMENT '中文名称',
        name_en VARCHAR(255) COMMENT '英文名称',
        system_id INT,
        type_id INT,
        owner INT,
        max_dockable_ship_volume DECIMAL(20,4),
        office_rental_cost DECIMAL(20,4),
        race_id INT,
        reprocessing_efficiency DECIMAL(10,4),
        reprocessing_stations_take DECIMAL(10,4),
        services JSON,
        position JSON,
        datasource VARCHAR(20) NOT NULL DEFAULT 'serenity',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_station_datasource (station_id, datasource)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    await pool.execute(query);
  }

  static async insertOrUpdate(data, datasource = 'serenity') {
    const query = `
      INSERT INTO stations (
        station_id, name, name_en, system_id, type_id, owner,
        max_dockable_ship_volume, office_rental_cost, race_id,
        reprocessing_efficiency, reprocessing_stations_take,
        services, position, datasource
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        name_en = VALUES(name_en),
        system_id = VALUES(system_id),
        type_id = VALUES(type_id),
        owner = VALUES(owner),
        max_dockable_ship_volume = VALUES(max_dockable_ship_volume),
        office_rental_cost = VALUES(office_rental_cost),
        race_id = VALUES(race_id),
        reprocessing_efficiency = VALUES(reprocessing_efficiency),
        reprocessing_stations_take = VALUES(reprocessing_stations_take),
        services = VALUES(services),
        position = VALUES(position),
        updated_at = CURRENT_TIMESTAMP
    `;

    try {
      await pool.execute(query, [
        data.station_id,
        data.name,
        data.name_en || data.name,
        data.system_id || null,
        data.type_id || null,
        data.owner || null,
        data.max_dockable_ship_volume || null,
        data.office_rental_cost || null,
        data.race_id || null,
        data.reprocessing_efficiency || null,
        data.reprocessing_stations_take || null,
        data.services ? JSON.stringify(data.services) : null,
        data.position ? JSON.stringify(data.position) : null,
        datasource
      ]);
      return true;
    } catch (error) {
      console.error('Error inserting/updating station:', error);
      return false;
    }
  }

  static async findByStationId(stationId, datasource = 'serenity') {
    const query = `SELECT * FROM stations WHERE station_id = ? AND datasource = ?`;
    const [rows] = await pool.execute(query, [stationId, datasource]);
    return rows[0] || null;
  }

  static async findByIds(stationIds, datasource = 'serenity') {
    if (!stationIds || stationIds.length === 0) return {};
    const placeholders = stationIds.map(() => '?').join(',');
    const query = `SELECT station_id, name, name_en FROM stations WHERE station_id IN (${placeholders}) AND datasource = ?`;
    const params = [...stationIds, datasource];
    const [rows] = await pool.execute(query, params);
    const map = {};
    rows.forEach(row => {
      map[row.station_id] = { cn: row.name, en: row.name_en || null };
    });
    return map;
  }
}

module.exports = Station;
