const express = require('express');
const router = express.Router();
const KbController = require('../controllers/KbController');

// 同步角色KB数据
router.post('/sync/:character_id', KbController.syncCharacterKB);

// 获取角色KB数据
router.get('/character/:character_id', KbController.getCharacterKB);

// 获取当前登录用户的KB
router.get('/my', KbController.getMyKB);

// 获取最近击毁（公共）
router.get('/recent', KbController.getRecentKills);

module.exports = router;
