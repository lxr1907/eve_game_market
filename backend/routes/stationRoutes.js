const express = require('express');
const router = express.Router();
const StationController = require('../controllers/StationController');

// 获取空间站信息（自动从ESI同步）
router.get('/stations/:stationId', StationController.getStation);

// 批量获取空间站名称
router.get('/stations/names/list', StationController.getStationNames);

module.exports = router;
