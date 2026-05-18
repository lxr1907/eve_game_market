const BilibiliService = require('../services/BilibiliService');

/**
 * GET /api/bilibili/videos
 * Query: category, page, pageSize
 */
const getVideos = async (req, res) => {
  try {
    const {
      category = '势力战',
      offset = '0',
      limit = '10',
    } = req.query;

    const result = await BilibiliService.getVideosByCategory(
      category,
      parseInt(offset, 10),
      parseInt(limit, 10)
    );

    res.json({
      success: true,
      data: result.videos,
      total: result.total,
    });
  } catch (error) {
    console.error('[BilibiliController] getVideos error:', error);
    res.status(500).json({
      success: false,
      error: '获取视频列表失败',
      message: error.message,
    });
  }
};

/**
 * GET /api/bilibili/categories
 * 返回所有分类及数量
 */
const getCategories = async (req, res) => {
  try {
    const summary = await BilibiliService.getCategorySummary();
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('[BilibiliController] getCategories error:', error);
    res.status(500).json({
      success: false,
      error: '获取分类失败',
      message: error.message,
    });
  }
};

module.exports = { getVideos, getCategories };
