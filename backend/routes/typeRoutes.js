const express = require('express');
const TypeController = require('../controllers/TypeController');
const router = express.Router();

// Type Routes
router.get('/types/hierarchy', TypeController.getHierarchy);
router.get('/types', TypeController.getTypes);
router.get('/types/sync-ids', TypeController.syncTypeIds);
router.get('/types/sync-details', TypeController.syncTypeDetails);
// 获取name不为null的数据总数（放在动态路由之前）
router.get('/types/count-with-name-not-null', TypeController.getCountWithNameNotNull);
router.get('/types/:id', TypeController.getTypeById);
router.get('/types/:id/blueprint-materials', TypeController.getBlueprintMaterials);
router.get('/types/:id/blueprint-cost', TypeController.getBlueprintCost);
router.get('/types/:id/blueprint-products', TypeController.getBlueprintProducts);
router.post('/types', TypeController.createType);
router.put('/types/:id', TypeController.updateType);
router.put('/types/:id/update-status', TypeController.updateStatus);
router.delete('/types/:id', TypeController.deleteType);

module.exports = router;
