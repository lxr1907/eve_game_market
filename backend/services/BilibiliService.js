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
 * 初始化 bilibili_videos 表（如果不存在则导入）
 */
async function initTable() {
  const tableName = 'bilibili_videos';
  
  if (await tableExists(tableName)) {
    console.log(`Table ${tableName} already exists, skipping import`);
    return;
  }
  
  console.log(`Table ${tableName} not found, importing from SQL file...`);
  
  const sqlPath = path.join(__dirname, '../static_data/bilibili/bilibili_videos.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  // 分割 SQL 语句并执行
  const statements = sql.split(/;\s*\n/).filter(s => s.trim());
  
  for (const stmt of statements) {
    if (stmt.trim()) {
      await pool.query(stmt);
    }
  }
  
  console.log(`Table ${tableName} imported successfully`);
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
