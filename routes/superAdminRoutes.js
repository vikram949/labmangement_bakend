const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');

router.get('/stats', superAdminController.getStats);
router.get('/workspaces', superAdminController.getWorkspaces);
router.get('/admins-list', superAdminController.getAdminsList);
router.get('/workspace-details/:workspaceId', superAdminController.getWorkspaceDetails);
router.post('/delete-workspace', superAdminController.deleteWorkspace);
router.post('/announcement', superAdminController.postGlobalAnnouncement);
router.get('/announcement', superAdminController.getActiveAnnouncement);

module.exports = router;
