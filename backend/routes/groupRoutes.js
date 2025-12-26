const express = require('express');
const GroupController = require('../controllers/GroupController');
const router = express.Router();

// Group Routes
router.get('/groups', GroupController.getGroups);
router.get('/groups/sync-all', GroupController.syncAllGroupsFromTypes);
router.get('/groups/:id', GroupController.getGroupById);
router.get('/groups/:id/sync', GroupController.syncGroup);

module.exports = router;