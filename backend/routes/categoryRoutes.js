const express = require('express');
const CategoryController = require('../controllers/CategoryController');
const router = express.Router();

// Category Routes
router.get('/categories', CategoryController.getCategories);
router.get('/categories/sync-all', CategoryController.syncAllCategoriesFromGroups);
router.get('/categories/:id', CategoryController.getCategoryById);
router.get('/categories/:id/sync', CategoryController.syncCategory);

module.exports = router;