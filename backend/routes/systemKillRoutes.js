const express = require('express');
const SystemKillController = require('../controllers/SystemKillController');
const router = express.Router();

// System Kill Routes
router.get('/system-kills', SystemKillController.getSystemKills);
router.get('/system-kills/sync', SystemKillController.syncSystemKills);
router.get('/system-kills/latest-update', SystemKillController.getLatestUpdate);
router.get('/system-kills/:id', SystemKillController.getSystemKillById);

module.exports = router;