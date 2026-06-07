const express = require('express');
const router = express.Router();
const upload = require('../middlewares/uploadMiddleware');
const { getAdmins, addAdmin, deleteAdmin, getSetupPasswordPage, setupPassword, uploadProfileImage } = require('../controllers/adminController');

// URL: /api/admins/setup-password
router.get('/setup-password', getSetupPasswordPage);
router.post('/setup-password', setupPassword);

router.get('/', getAdmins);
router.post('/', addAdmin);
router.delete('/:id', deleteAdmin);

// Upload profile image
router.post('/upload-profile-image', upload.single('image'), uploadProfileImage);

module.exports = router;