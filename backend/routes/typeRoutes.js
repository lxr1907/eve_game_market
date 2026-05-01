const express = require('express');
const TypeController = require('../controllers/TypeController');
const router = express.Router();

// Type Routes
router.get('/types/hierarchy', TypeController.getHierarchy);
// 懒加载相关路由（支持区域过滤）
router.get('/types/categories', TypeController.getCategories);
router.get('/types/categories-by-region', TypeController.getCategoriesByRegion);
router.get('/types/groups-by-category', TypeController.getGroupsByCategory);
router.get('/types/groups-by-category-region', TypeController.getGroupsByCategoryAndRegion);
router.get('/types/types-by-group', TypeController.getTypesByGroup);
router.get('/types/types-by-group-region', TypeController.getTypesByGroupAndRegion);
router.get('/types', TypeController.getTypes);
router.get('/types/sync-ids', TypeController.syncTypeIds);
router.get('/types/sync-details', TypeController.syncTypeDetails);
router.post('/types/sync-one', TypeController.syncOneType);
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
