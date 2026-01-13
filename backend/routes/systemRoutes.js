const express = require('express');
const SystemController = require('../controllers/SystemController');
const router = express.Router();

// System Routes
router.get('/systems', SystemController.getSystems);
router.get('/systems/sync-ids', SystemController.syncSystemIds);
router.get('/systems/sync-details', SystemController.syncSystemDetails);
router.get('/systems/sync-all', SystemController.syncAllSystems);
router.get('/systems/:id', SystemController.getSystemById);
router.post('/systems', SystemController.createSystem);
router.put('/systems/:id', SystemController.updateSystem);
router.delete('/systems/:id', SystemController.deleteSystem);

module.exports = router;
