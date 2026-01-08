const express = require('express');
const OnlinePlayerStatsController = require('../controllers/OnlinePlayerStatsController');
const router = express.Router();

// Online Player Stats Routes
router.post('/online-player-stats/record', OnlinePlayerStatsController.recordStats);
router.get('/online-player-stats', OnlinePlayerStatsController.getAllStats);
router.get('/online-player-stats/by-date-range', OnlinePlayerStatsController.getStatsByDateRange);
router.get('/online-player-stats/latest', OnlinePlayerStatsController.getLatestStats);

module.exports = router;