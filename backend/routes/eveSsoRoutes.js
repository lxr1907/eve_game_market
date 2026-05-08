const express = require('express');
const router = express.Router();
const EveSsoController = require('../controllers/EveSsoController');

router.post('/eve-sso/save-code', EveSsoController.saveSsoCode);
router.get('/eve-sso/codes', EveSsoController.getSsoCodes);

module.exports = router;
