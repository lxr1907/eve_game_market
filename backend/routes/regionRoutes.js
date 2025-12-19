const express = require('express');
const RegionController = require('../controllers/regionController');
const router = express.Router();

// Region Routes
router.get('/regions', RegionController.getRegions);
router.get('/regions/sync-ids', RegionController.syncRegionIds);
router.get('/regions/sync-details', RegionController.syncRegionDetails);
router.get('/regions/:id', RegionController.getRegionById);
router.post('/regions', RegionController.createRegion);
router.put('/regions/:id', RegionController.updateRegion);
router.delete('/regions/:id', RegionController.deleteRegion);

module.exports = router;