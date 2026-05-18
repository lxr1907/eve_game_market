const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

const VALID_CATEGORIES = ['势力战', '深渊', '扫描', '其他'];

/**
 * 检查表是否存在
 */
async function tableExists(tableName) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) as count FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ?`,
    [tableName]
  );
  return rows[0].count > 0;
}

/**
 * 检查表中的数据量
 */
async function getTableRowCount(tableName) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) as count FROM \`${tableName}\``
  );
  return rows[0].count;
}

/**
 * 初始化 bilibili_videos 表（如果不存在则导入，或表为空则重新导入）
 */
async function initTable(forceReimport = false) {
  const tableName = 'bilibili_videos';

  const exists = await tableExists(tableName);

  if (!exists) {
    // 表不存在，创建表并导入数据
    console.log(`Table ${tableName} not found, importing from SQL file...`);
    const sqlPath = path.join(__dirname, '../static_data/bilibili/bilibili_videos.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    const statements = sql.split(/;\s*\n/).filter(s => s.trim());

    for (const stmt of statements) {
      if (stmt.trim()) {
        await pool.query(stmt);
      }
    }
    console.log(`Table ${tableName} imported successfully`);
  } else {
    // 表已存在，检查数据量
    const rowCount = await getTableRowCount(tableName);
    console.log(`Table ${tableName} exists with ${rowCount} rows`);

    if (rowCount === 0 || forceReimport) {
      // 表为空或强制重新导入，清空并重新导入
      console.log(`Table ${tableName} is empty or reimport requested, importing from SQL file...`);

      // 先清空表
      await pool.query(`DELETE FROM \`${tableName}\``);

      const sqlPath = path.join(__dirname, '../static_data/bilibili/bilibili_videos.sql');
      const sql = fs.readFileSync(sqlPath, 'utf8');

      // 分割 SQL 语句并执行（跳过 CREATE TABLE 语句）
      const statements = sql.split(/;\s*\n/).filter(s => s.trim());

      for (const stmt of statements) {
        if (stmt.trim() && !stmt.trim().toUpperCase().startsWith('CREATE TABLE')) {
          await pool.query(stmt);
        }
      }
      console.log(`Table ${tableName} data reimported successfully`);
    } else {
      console.log(`Table ${tableName} already has data, skipping import`);
    }
  }
}

/**
 * 按分类分页获取视频列表
 * @param {string} category - 分类名称
 * @param {number} page    - 页码（从1开始）
 * @param {number} pageSize - 每页数量（默认1）
 * @returns {{ videos: Array, total: number }}
 */
async function getVideosByCategory(category, offset = 0, limit = 10) {
  if (!VALID_CATEGORIES.includes(category)) {
    throw new Error(`无效的分类: ${category}，可选值: ${VALID_CATEGORIES.join(', ')}`);
  }

  const [rows] = await pool.query(
    `SELECT bvid, title, uid, aid, pic, duration, play, pubdate, description, category
     FROM bilibili_videos
     WHERE category = ?
     ORDER BY pubdate DESC, bvid DESC
     LIMIT ? OFFSET ?`,
    [category, limit, offset]
  );

  const [[{ total }]] = await pool.query(
    'SELECT COUNT(*) AS total FROM bilibili_videos WHERE category = ?',
    [category]
  );

  return { videos: rows, total };
}

/**
 * 获取所有可用分类及其视频数量
 * @returns {Array<{category: string, count: number}>}
 */
async function getCategorySummary() {
  const [rows] = await pool.query(
    `SELECT category, COUNT(*) AS count
     FROM bilibili_videos
     GROUP BY category
     ORDER BY FIELD(category, '势力战', '深渊', '扫描', '其他')`
  );
  return rows;
}

module.exports = { getVideosByCategory, getCategorySummary, VALID_CATEGORIES, initTable };
