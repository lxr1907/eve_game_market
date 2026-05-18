const express = require('express');
const router = express.Router();
const BilibiliController = require('../controllers/BilibiliController');

router.get('/videos', BilibiliController.getVideos);
router.get('/categories', BilibiliController.getCategories);

module.exports = router;
