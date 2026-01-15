const express = require('express');
const router = express.Router();
const starMapController = require('../controllers/StarMapController');

// 获取星图数据
router.get('/star-map', starMapController.getStarMapData);

module.exports = router;