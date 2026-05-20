const Station = require('../models/Station');
const Type = require('../models/Type');
const eveApiService = require('../services/eveApiService');

// ESI 同步后，通过 type_id 查询 types 表更新中文名
async function updateStationChineseName(stationId, typeId, datasource) {
  if (!typeId) return;
  try {
    const typeInfo = await Type.findById(typeId);
    if (typeInfo && typeInfo.name) {
      const pool = require('../config/database');
      await pool.execute(
        'UPDATE stations SET name = ? WHERE station_id = ? AND datasource = ?',
        [typeInfo.name, stationId, datasource]
      );
    }
  } catch (err) {
    console.error(`Error updating station Chinese name for ${stationId}:`, err.message);
  }
}

class StationController {
  // 获取空间站信息（从ESI同步）
  static async getStation(req, res) {
    try {
      const stationId = parseInt(req.params.stationId);
      const datasource = req.query.datasource || 'serenity';

      if (!stationId) {
        return res.status(400).json({ message: 'stationId is required' });
      }

      // 先查本地数据库
      const localStation = await Station.findByStationId(stationId, datasource);
      if (localStation) {
        // 如果中文名等于英文名，尝试从 types 表更新中文名
        if (localStation.name === localStation.name_en && localStation.type_id) {
          await updateStationChineseName(stationId, localStation.type_id, datasource);
          const updated = await Station.findByStationId(stationId, datasource);
          return res.status(200).json({ data: updated, source: 'local' });
        }
        return res.status(200).json({ data: localStation, source: 'local' });
      }

      // 本地没有，从ESI同步
      try {
        const stationData = await eveApiService.getStation(stationId, datasource);
        if (stationData) {
          await Station.insertOrUpdate(stationData, datasource);
          await updateStationChineseName(stationId, stationData.type_id, datasource);
          const saved = await Station.findByStationId(stationId, datasource);
          return res.status(200).json({ data: saved, source: 'esi' });
        }
      } catch (esiError) {
        console.error(`ESI station fetch failed for ${stationId} (${datasource}): ${esiError.message}`);
        // ESI 获取失败（如该站在该服不存在），返回默认数据
      }

      // ESI 获取失败，尝试用其他数据源的缓存数据（站ID跨服一致）
      const fallbackDatasources = datasource === 'serenity' 
        ? ['infinity', 'tranquility'] 
        : ['serenity'];
      for (const fbDs of fallbackDatasources) {
        const fallbackStation = await Station.findByStationId(stationId, fbDs);
        if (fallbackStation) {
          return res.status(200).json({ data: fallbackStation, source: 'local' });
        }
      }

      // 缓存也没有，尝试用 serenity ESI 抓取（跨服站ID一致）
      if (datasource !== 'serenity') {
        try {
          const stationData = await eveApiService.getStation(stationId, 'serenity');
          if (stationData) {
            await Station.insertOrUpdate(stationData, datasource);
            await updateStationChineseName(stationId, stationData.type_id, datasource);
            const saved = await Station.findByStationId(stationId, datasource);
            if (saved) {
              return res.status(200).json({ data: saved, source: 'esi' });
            }
          }
        } catch (fallbackError) {
          console.error(`Fallback ESI fetch failed for ${stationId}: ${fallbackError.message}`);
        }
      }

      // 无任何数据，返回只含 ID 的默认数据（前端仍能展示 ID）
      return res.status(200).json({
        data: { station_id: stationId, name: null, name_en: null, datasource },
        source: 'none'
      });
    } catch (error) {
      console.error('Error getting station:', error.message);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // 批量获取空间站名称（用于前端展示）
  static async getStationNames(req, res) {
    try {
      const { stationIds, datasource = 'serenity' } = req.query;
      if (!stationIds) {
        return res.status(400).json({ message: 'stationIds is required' });
      }

      const ids = stationIds.split(',').map(Number).filter(Boolean);
      const names = await Station.findByIds(ids, datasource);
      res.status(200).json({ data: names });
    } catch (error) {
      console.error('Error getting station names:', error.message);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}

module.exports = StationController;
