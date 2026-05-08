const express = require('express');
const router = express.Router();
const EveSsoController = require('../controllers/EveSsoController');

router.post('/save-code', EveSsoController.saveSsoCode);
router.get('/codes', EveSsoController.getSsoCodes);

module.exports = router;
