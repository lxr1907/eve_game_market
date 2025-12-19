const express = require('express');
const router = express.Router();
const OrderController = require('../controllers/OrderController');

// 同步订单数据
router.post('/orders/:regionId/:typeId/sync', OrderController.syncOrders);

// 查询订单数据
router.get('/orders', OrderController.getOrders);

// 根据区域获取可用类型
router.get('/regions/:regionId/types', OrderController.getAvailableTypesByRegion);

module.exports = router;