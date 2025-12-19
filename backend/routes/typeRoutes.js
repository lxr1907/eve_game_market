const express = require('express');
const TypeController = require('../controllers/typeController');
const router = express.Router();

// Type Routes
router.get('/types', TypeController.getTypes);
router.get('/types/sync', TypeController.syncTypes);
router.get('/types/:id', TypeController.getTypeById);
router.post('/types', TypeController.createType);
router.put('/types/:id', TypeController.updateType);
router.put('/types/:id/update-status', TypeController.updateStatus);
router.delete('/types/:id', TypeController.deleteType);

module.exports = router;