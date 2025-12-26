const Group = require('../models/Group');
const Type = require('../models/Type');
const eveApiService = require('../services/eveApiService');

class GroupController {
  // 获取所有Group
  static async getGroups(req, res) {
    try {
      const { page = 1, limit = 10, search = '' } = req.query;
      const groups = await Group.findAll(parseInt(page), parseInt(limit), search);
      const total = await Group.count(search);

      res.status(200).json({
        groups,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error getting groups:', error);
      res.status(500).json({ message: 'Failed to get groups', error: error.message });
    }
  }

  // 根据ID获取Group
  static async getGroupById(req, res) {
    try {
      const groupId = parseInt(req.params.id);
      const group = await Group.findById(groupId);

      if (!group) {
        // 如果group不存在，尝试从API获取
        const groupDetails = await eveApiService.getGroupDetails(groupId);
        if (groupDetails) {
          // 保存到数据库
          await Group.insertOrUpdate({
            group_id: groupDetails.group_id,
            category_id: groupDetails.category_id,
            name: groupDetails.name || '',
            published: groupDetails.published
          });
          // 返回新保存的group
          res.status(200).json(groupDetails);
        } else {
          res.status(404).json({ message: 'Group not found' });
        }
      } else {
        res.status(200).json(group);
      }
    } catch (error) {
      console.error(`Error getting group with ID ${req.params.id}:`, error);
      res.status(500).json({ message: 'Failed to get group', error: error.message });
    }
  }

  // 同步单个Group
  static async syncGroup(req, res) {
    try {
      const groupId = parseInt(req.params.id);
      const groupDetails = await eveApiService.getGroupDetails(groupId);

      if (groupDetails) {
        // 保存到数据库
        await Group.insertOrUpdate({
          group_id: groupDetails.group_id,
          category_id: groupDetails.category_id,
          name: groupDetails.name || '',
          published: groupDetails.published
        });
        res.status(200).json({ message: 'Group synced successfully', group: groupDetails });
      } else {
        res.status(404).json({ message: 'Group not found in EVE API' });
      }
    } catch (error) {
      console.error(`Error syncing group with ID ${req.params.id}:`, error);
      res.status(500).json({ message: 'Failed to sync group', error: error.message });
    }
  }

  // 同步types表中所有不重复的groupId
  static async syncAllGroupsFromTypes(req, res) {
    try {
      // 获取types表中不重复的groupId列表
      const groupIds = await Type.findDistinctGroupIds();
      
      if (!groupIds || groupIds.length === 0) {
        return res.status(200).json({ message: 'No group IDs found in types table' });
      }
      
      // 同步每个groupId
      const syncedGroups = [];
      const failedGroups = [];
      
      for (const groupId of groupIds) {
        try {
          // 从EVE Online API获取group详情
          const groupData = await eveApiService.getGroupDetails(groupId);
          
          if (groupData) {
            // 将group数据保存到数据库
            await Group.insertOrUpdate({
              group_id: groupData.group_id,
              category_id: groupData.category_id,
              name: groupData.name || '',
              published: groupData.published
            });
            syncedGroups.push(groupId);
          } else {
            failedGroups.push({ id: groupId, reason: 'Group not found in EVE API' });
          }
        } catch (error) {
          console.error(`Error syncing group ${groupId}:`, error);
          failedGroups.push({ id: groupId, reason: error.message });
        }
      }
      
      res.status(200).json({
        message: 'Group sync completed',
        total: groupIds.length,
        synced: syncedGroups.length,
        failed: failedGroups.length,
        syncedGroupIds: syncedGroups,
        failedGroups: failedGroups
      });
    } catch (error) {
      console.error('Error syncing all groups from types:', error);
      res.status(500).json({ error: 'Error syncing groups' });
    }
  }
}

module.exports = GroupController;